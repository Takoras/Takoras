import { useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { Link } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { bourseApi, errorText } from '@/api';
import { NeedLogin } from '@/app/NeedLogin';
import { jetonOf, MYSTERE, texOf } from '@/data/jetons';
import { sfx } from '@/engines/sound.js';
import { useT } from '@/i18n/useT';
import type { Key } from '@/i18n';
import { useAuth } from '@/lib/auth';
import { burstAt } from '@/lib/pfx';
import { locale, potatoFx, useSettings } from '@/lib/settings';
import { Avatar } from '@/ui/Avatar';
import { Button } from '@/ui/Button';
import { Skeleton, useFlip } from '@/ui/motion';
import { Segmented } from '@/ui/Segmented';
import { Swap } from '@/ui/Swap';
import { toast } from '@/ui/toast';
import { Tween } from '@/ui/Tween';
import { useStaggerIn } from '@/ui/useStaggerIn';
import s from './Bourse.module.css';

type Asset = {
  id: number;
  name: string | null;
  odds: number | null;
  price: number;
  p0: number;
  shares: number;
  k: number;
  share: number;
  own: number;
  h: number[];
};
type State = {
  season: { id: number; serie: string; ends_at: string };
  me: {
    koo: number;
    paid: number;
    divs: number;
    value: number;
    score: number;
    rank: number | null;
    elo: number;
    players: number;
  };
  quests: { pulls: number; sold: number; quest: number; paid: boolean };
  assets: Asset[];
  feed: { at: string; pseudo: string; buy: boolean; shares: number; jeton: string | null }[];
};
type Row = { pseudo: string; rank: number; score: number; value: number; elo: number; delta: number; me: boolean };

const FEE = 0.01;
const MAX_ORDER = 0.1; // part de la réserve par ordre (le serveur vérifie aussi)
const buyCost = (a: Asset, q: number) => (a.k / (a.shares - q) - a.k / a.shares) * (1 + FEE);
const sellGain = (a: Asset, q: number) => (a.k / a.shares - a.k / (a.shares + q)) * (1 - FEE);
const floor3 = (n: number) => Math.max(0, Math.floor(n * 1000) / 1000);
const maxBuy = (a: Asset, koo: number) =>
  floor3(Math.min(a.shares * MAX_ORDER, a.shares - a.k / (a.k / a.shares + koo / (1 + FEE))));
const maxSell = (a: Asset) => floor3(Math.min(a.own, a.shares * MAX_ORDER));

const TIERS: [Key, number, string][] = [
  ['ui.bs_t_bronze', 0, '#c98a5b'],
  ['ui.bs_t_silver', 1000, '#b8c4d0'],
  ['ui.bs_t_gold', 1200, '#f2c230'],
  ['ui.bs_t_plat', 1400, '#7dd3c8'],
  ['ui.bs_t_diamond', 1600, '#7db8f7'],
  ['ui.bs_t_legend', 1800, '#f0abfc'],
];
const tierIdx = (elo: number) => TIERS.reduce((b, x, i) => (elo >= x[1] ? i : b), 0);

// La pièce de la Bourse
function Koo({ size = 16 }: { size?: number }) {
  return <img className={`px ${s.koo}`} src="/img/koo.png" alt="" width={size} height={size} />;
}

function Spark({ a }: { a: Asset }) {
  const pts = [a.p0, ...a.h.slice(-14), a.price];
  const lo = Math.min(...pts, a.p0 * 0.98),
    hi = Math.max(...pts, a.p0 * 1.02);
  const d = pts
    .map((p, i) => `${(i / Math.max(1, pts.length - 1)) * 56},${17 - ((p - lo) / (hi - lo)) * 16}`)
    .join(' ');
  return (
    <svg className={s.spark} viewBox="0 0 56 18" aria-hidden>
      <polyline points={d} className={a.price >= a.p0 ? s.lineUp : s.lineDown} />
    </svg>
  );
}

// Graphique : axe des prix à droite, dernier prix marqué, réticule sous la souris
function Chart({ a, fmt }: { a: Asset; fmt: (v: number) => string }) {
  const box = useRef<HTMLDivElement>(null);
  const tip = useRef<HTMLElement>(null);
  const pts = [a.p0, ...a.h, a.price];
  const lo = Math.min(...pts, a.p0 * 0.97),
    hi = Math.max(...pts, a.p0 * 1.03);
  const X = (i: number) => (i / Math.max(1, pts.length - 1)) * 300;
  const Y = (p: number) => 6 + ((hi - p) / (hi - lo)) * 108;
  const line = pts.reduce(
    (d, p, i) => (i ? `${d}H${X(i).toFixed(1)}V${Y(p).toFixed(1)}` : `M0 ${Y(p).toFixed(1)}`),
    '',
  );
  const up = a.price >= a.p0;
  const ticks = [0, 1, 2, 3, 4].map((i) => hi - ((hi - lo) * i) / 4);
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const el = box.current;
    if (!el) return;
    const r = el.getBoundingClientRect(),
      y = e.clientY - r.top;
    el.style.setProperty('--cx', `${e.clientX - r.left}px`);
    el.style.setProperty('--cy', `${y}px`);
    if (tip.current) tip.current.textContent = fmt(hi - (((y / r.height) * 120 - 6) / 108) * (hi - lo));
  };
  return (
    <div className={s.plot}>
      <div className={s.plotArea} ref={box} onPointerMove={move}>
        <svg viewBox="0 0 300 120" preserveAspectRatio="none" aria-hidden>
          {ticks.map((p) => (
            <line key={p} x1="0" x2="300" y1={Y(p)} y2={Y(p)} className={s.grid} />
          ))}
          <path d={`${line}V120H0Z`} className={up ? s.areaUp : s.areaDown} />
          <path d={line} className={up ? s.lineUp : s.lineDown} />
        </svg>
        <i className={s.crossX} />
        <i className={s.crossY} />
        <b className={s.crossTip} ref={tip} />
      </div>
      <div className={s.axis} aria-hidden>
        {ticks.map((p) => (
          <span key={p} style={{ top: `${(Y(p) / 120) * 100}%` }}>
            {fmt(p)}
          </span>
        ))}
        <b className={up ? s.lastUp : s.lastDown} style={{ top: `${(Y(a.price) / 120) * 100}%` }}>
          {fmt(a.price)}
        </b>
      </div>
    </div>
  );
}

export default function Bourse() {
  const t = useT();
  const lang = useSettings((x) => x.lang);
  const uid = useAuth((x) => x.user?.id);
  const qc = useQueryClient();
  const pageRef = useRef<HTMLElement>(null);
  const [tab, setTab] = useState<'market' | 'ranks'>('market');
  const [sel, setSel] = useState<number | null>(null);
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [qty, setQty] = useState('10');
  const [busy, setBusy] = useState(false);
  const key = useMemo(() => ['bourse', uid], [uid]);
  const q = useQuery({
    queryKey: key,
    enabled: !!uid,
    queryFn: async () => (await bourseApi.state()) as State,
    refetchInterval: potatoFx() ? 15_000 : 5_000,
  });
  useBoard(false); // le classement est prêt avant d'ouvrir l'onglet : rien n'arrive après coup
  const d = q.data;
  useStaggerIn(pageRef, `.${s.bar}, .${s.term} > *`, !!d);
  if (!uid) return <NeedLogin title={t('ui.nav_bourse')} />;
  if (!d)
    return (
      <section className={s.page}>
        {q.isError ? <p className="muted">{t('ui.err_generic')}</p> : <Skeleton n={6} h={120} min={220} />}
      </section>
    );

  const loc = locale(lang);
  const n0 = (v: number) => Math.round(v).toLocaleString(loc);
  const n2 = (v: number) => v.toLocaleString(loc, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const pct = (v: number) =>
    `${v >= 0 ? '+' : ''}${v.toLocaleString(loc, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
  const cl = (v: number) => (v >= 0 ? s.up : s.down);
  const change = (a: Asset) => (a.price / a.p0 - 1) * 100;
  const label = (a: Asset) => a.name ?? '???';
  const img = (a: Asset) => (a.name ? texOf(jetonOf(a.name, d.season.serie)) : MYSTERE);
  const cur = d.assets.find((a) => a.id === sel) ?? d.assets[0];
  if (!cur) return null;
  const days = Math.max(1, Math.ceil((new Date(d.season.ends_at).getTime() - q.dataUpdatedAt) / 86_400_000));
  const buying = side === 'buy';
  const amount = floor3(Number(qty.replace(',', '.')) || 0);
  const limit = buying ? maxBuy(cur, d.me.koo) : maxSell(cur);
  const valid = amount > 0 && amount <= limit;
  const total = amount > 0 && amount < cur.shares ? (buying ? buyCost(cur, amount) : sellGain(cur, amount)) : 0;
  const t1 = cur.shares + (buying ? -amount : amount);
  const impact = valid ? (cur.k / t1 / t1 / cur.price - 1) * 100 : 0;
  const pts = [cur.p0, ...cur.h, cur.price];
  const pnl = d.me.value - d.me.paid - 1000;
  const held = d.assets.filter((a) => a.own > 0);
  const heldValue = held.reduce((v, a) => v + sellGain(a, a.own), 0);
  const trade = async (el: HTMLElement) => {
    setBusy(true);
    try {
      qc.setQueryData(key, await bourseApi.trade(cur.id, buying, amount));
      burstAt(el, buying ? '#4ade80' : '#f87171', 0.5);
      sfx.upgrade();
      void qc.invalidateQueries({ queryKey: ['bourse-board'] });
    } catch (e) {
      sfx.deny();
      toast(errorText(e, lang), true);
    } finally {
      setBusy(false);
    }
  };
  const claimPay = async (el: HTMLElement) => {
    try {
      qc.setQueryData(key, await bourseApi.claimPay());
      burstAt(el, '#2fa66f', 0.6);
      sfx.upgrade();
    } catch (e) {
      sfx.deny();
      toast(errorText(e, lang), true);
    }
  };
  const missions: [string, number, number][] = [
    [t('ui.bs_q_pulls'), d.quests.pulls, 3],
    [t('ui.bs_q_sell'), d.quests.sold, 1],
    [t('ui.bs_q_quest'), d.quests.quest, 1],
  ];
  const ready = missions.every(([, v, m]) => v >= m);
  const stats: [string, React.ReactNode, string?][] = [
    [t('ui.bs_wallet'), <Tween key="v" value={d.me.value} ms={350} format={n2} />],
    [t('ui.bs_pnl'), `${pnl >= 0 ? '+' : ''}${n2(pnl)} (${pct(d.me.score)})`, cl(pnl)],
    [t('ui.bs_avail'), <Tween key="k" value={d.me.koo} ms={350} format={n2} />],
    [t('ui.bs_divs'), n2(d.me.divs)],
    [t('ui.bs_place'), d.me.rank ? `#${d.me.rank}` : '-'],
    [t('ui.bs_ends'), t('ui.bs_days', { n: days })],
  ];

  return (
    <section ref={pageRef} className={s.page}>
      <header className={s.bar}>
        <div className={s.brand}>
          <h1>{t('ui.nav_bourse')}</h1>
          <span>{d.season.serie}</span>
        </div>
        <dl className={s.strip}>
          {stats.map(([l, v, c]) => (
            <div key={l}>
              <dt>{l}</dt>
              <dd className={c}>{v}</dd>
            </div>
          ))}
        </dl>
        <Segmented
          value={tab}
          onChange={setTab}
          label={t('ui.nav_bourse')}
          options={[
            ['market', t('ui.bs_market')],
            ['ranks', t('ui.bs_ranks')],
          ]}
        />
      </header>

      <Swap k={tab}>
        {tab === 'market' ? (
          <div className={s.term}>
            <section className={`${s.box} ${s.watch}`}>
              <div className={s.watchHead}>
                <span>{t('ui.bs_token')}</span>
                <span>{t('ui.bs_price')}</span>
                <span>{t('ui.bs_change')}</span>
              </div>
              <div className={s.watchList} role="listbox" aria-label={t('ui.bs_market')}>
                {d.assets.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    role="option"
                    aria-selected={a.id === cur.id}
                    className={`${s.tok} ${a.id === cur.id ? s.on : ''}`}
                    onClick={() => (sfx.click(), setSel(a.id))}
                  >
                    <span className={s.tokName}>
                      <img className="px" src={img(a)} alt="" width={28} height={28} />
                      <b>{label(a)}</b>
                    </span>
                    <Spark a={a} />
                    <span className={s.num}>
                      <Tween value={a.price} ms={350} format={n2} />
                    </span>
                    <span className={`${s.num} ${cl(change(a))}`}>{pct(change(a))}</span>
                  </button>
                ))}
              </div>
            </section>

            <div className={s.mid}>
              <section className={`${s.box} ${s.chartBox}`}>
                <div className={s.quote}>
                  <img className="px" src={img(cur)} alt="" width={36} height={36} />
                  <h2>{label(cur)}</h2>
                  {cur.odds ? <small>1/{cur.odds.toLocaleString(loc)}</small> : null}
                  <b className={s.last}>
                    <Tween value={cur.price} ms={350} format={n2} />
                    <Koo size={20} />
                  </b>
                  <span className={cl(change(cur))}>{pct(change(cur))}</span>
                  <dl className={s.mini}>
                    <div>
                      <dt>{t('ui.bs_high')}</dt>
                      <dd>{n2(Math.max(...pts))}</dd>
                    </div>
                    <div>
                      <dt>{t('ui.bs_low')}</dt>
                      <dd>{n2(Math.min(...pts))}</dd>
                    </div>
                    <div>
                      <dt>{t('ui.bs_activity')}</dt>
                      <dd>{Math.round(cur.share * 100)} %</dd>
                    </div>
                  </dl>
                </div>
                <Swap k={cur.id} className={s.chartSwap}>
                  <Chart a={cur} fmt={n2} />
                </Swap>
              </section>
              <section className={`${s.box} ${s.positions}`}>
                <h2>{t('ui.bs_positions')}</h2>
                {held.length ? (
                  <table>
                    <thead>
                      <tr>
                        <th>{t('ui.bs_token')}</th>
                        <th>{t('ui.bs_qty')}</th>
                        <th>{t('ui.bs_price')}</th>
                        <th>{t('ui.bs_value')}</th>
                        <th>{t('ui.bs_weight')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {held.map((a) => {
                        const v = sellGain(a, a.own);
                        return (
                          <tr
                            key={a.id}
                            onClick={() => {
                              setSel(a.id);
                              setSide('sell');
                            }}
                          >
                            <td>
                              <img className="px" src={img(a)} alt="" width={20} height={20} /> {label(a)}
                            </td>
                            <td>{a.own.toLocaleString(loc)}</td>
                            <td>{n2(a.price)}</td>
                            <td>{n2(v)}</td>
                            <td>{Math.round((v / heldValue) * 100)} %</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <p className={s.none}>{t('ui.bs_no_pos')}</p>
                )}
              </section>
            </div>

            <aside className={s.right}>
              <section className={`${s.box} ${s.ticket}`}>
                <div className={s.sides} role="group" aria-label={t('ui.bs_order')}>
                  <button
                    type="button"
                    aria-pressed={buying}
                    className={buying ? s.sideBuy : ''}
                    onClick={() => setSide('buy')}
                  >
                    {t('ui.bs_buy_tab')}
                  </button>
                  <button
                    type="button"
                    aria-pressed={!buying}
                    className={buying ? '' : s.sideSell}
                    onClick={() => setSide('sell')}
                  >
                    {t('ui.bs_sell_tab')}
                  </button>
                </div>
                <label className={s.qty}>
                  <span>{t('ui.bs_qty')}</span>
                  <input inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} />
                </label>
                <div className={s.presets}>
                  {[25, 50, 75, 100].map((p) => (
                    <button
                      key={p}
                      type="button"
                      disabled={!limit}
                      onClick={() => setQty(String(floor3((limit * p) / 100)))}
                    >
                      {p} %
                    </button>
                  ))}
                </div>
                <dl className={s.rows}>
                  <div>
                    <dt>{t('ui.bs_avg')}</dt>
                    <dd>{valid ? n2(total / amount) : '-'}</dd>
                  </div>
                  <div>
                    <dt>{t('ui.bs_impact')}</dt>
                    <dd className={valid ? cl(impact) : ''}>{valid ? pct(impact) : '-'}</dd>
                  </div>
                  <div>
                    <dt>{t('ui.bs_fee')}</dt>
                    <dd>1 %</dd>
                  </div>
                  <div className={s.totalRow}>
                    <dt>{t('ui.bs_total')}</dt>
                    <dd>
                      {n2(total)} <Koo size={14} />
                    </dd>
                  </div>
                </dl>
                <button
                  type="button"
                  className={`${s.submit} ${buying ? s.submitBuy : s.submitSell}`}
                  disabled={busy || !valid}
                  onClick={(e) => void trade(e.currentTarget)}
                >
                  {t(buying ? 'ui.bs_buy' : 'ui.bs_sell')} {label(cur)}
                </button>
              </section>
              <section className={`${s.box} ${s.pay}`}>
                <h2>
                  {t('ui.bs_pay')}
                  <span>
                    +25 <Koo size={14} />
                  </span>
                </h2>
                <ul>
                  {missions.map(([l, v, m]) => (
                    <li key={l} className={v >= m ? s.up : ''}>
                      <span>{l}</span>
                      <b>{v >= m ? '✓' : `${v}/${m}`}</b>
                    </li>
                  ))}
                </ul>
                {d.quests.paid ? (
                  <p className={s.paid}>{t('ui.bs_paid')}</p>
                ) : (
                  <Button
                    variant="gold"
                    size="sm"
                    block
                    disabled={!ready}
                    onClick={(e) => void claimPay(e.currentTarget)}
                  >
                    {t('ui.q_claim')}
                  </Button>
                )}
              </section>
              <section className={`${s.box} ${s.tape}`}>
                <h2>{t('ui.bs_trades')}</h2>
                {d.feed.length ? (
                  <ul>
                    {d.feed.map((f) => (
                      <li key={`${f.at}${f.pseudo}${f.shares}`}>
                        <time>{new Date(f.at).toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' })}</time>
                        <Link to={`/profile/${encodeURIComponent(f.pseudo)}`}>{f.pseudo}</Link>
                        <span className={f.buy ? s.up : s.down}>{t(f.buy ? 'ui.bs_bought' : 'ui.bs_sold')}</span>
                        <span>
                          {f.shares.toLocaleString(loc)} {f.jeton ?? '???'}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={s.none}>{t('ui.bs_quiet')}</p>
                )}
              </section>
            </aside>
          </div>
        ) : (
          <Ranks me={d.me} pct={pct} cl={cl} n0={n0} />
        )}
      </Swap>
      <Link className={s.legal} to="/terms">
        {t('ui.bs_legal')}
      </Link>
    </section>
  );
}

function useBoard(live: boolean) {
  const uid = useAuth((x) => x.user?.id);
  return useQuery({
    queryKey: ['bourse-board', uid],
    enabled: !!uid,
    queryFn: async () => (await bourseApi.board()) as Row[],
    refetchInterval: live ? 20_000 : false,
  });
}

function Tag({ elo }: { elo: number }) {
  const t = useT();
  const x = TIERS[tierIdx(elo)];
  return x ? (
    <span className={s.tag} style={{ '--c': x[2] } as CSSProperties}>
      {t(x[0])}
    </span>
  ) : null;
}

function Ranks({
  me,
  pct,
  cl,
  n0,
}: {
  me: State['me'];
  pct: (v: number) => string;
  cl: (v: number) => string | undefined;
  n0: (v: number) => string;
}) {
  const t = useT();
  const root = useRef<HTMLDivElement>(null);
  const q = useBoard(true);
  const rows = q.data ?? [];
  useFlip(root, rows.map((r) => r.pseudo).join());
  const mine = rows.find((r) => r.me);
  const ti = tierIdx(me.elo),
    tier = TIERS[ti],
    next = TIERS[ti + 1];
  const delta = (v: number) => `${v >= 0 ? '+' : ''}${v}`;
  return (
    <div className={s.ranks} ref={root}>
      <aside className={`${s.box} ${s.meCard}`}>
        <Tag elo={me.elo} />
        <div className={s.elo}>
          <b>{n0(me.elo)}</b> Elo
        </div>
        <div className={s.eloBar}>
          <i style={{ width: `${tier && next ? ((me.elo - tier[1]) / (next[1] - tier[1])) * 100 : 100}%` }} />
        </div>
        {next ? <small className="muted">{t('ui.bs_next', { n: next[1] - me.elo, r: t(next[0]) })}</small> : null}
        <dl className={s.meStats}>
          <div>
            <dt>{t('ui.bs_place')}</dt>
            <dd>{me.rank ? `#${me.rank}` : '-'}</dd>
          </div>
          <div>
            <dt>{t('ui.bs_score')}</dt>
            <dd className={cl(me.score)}>{pct(me.score)}</dd>
          </div>
          <div>
            <dt>{t('ui.bs_end')}</dt>
            <dd>{mine ? `${delta(mine.delta)} Elo` : '-'}</dd>
          </div>
          <div>
            <dt>{t('ui.bs_payout')}</dt>
            <dd>{n0(me.paid)}</dd>
          </div>
        </dl>
      </aside>
      <div className={s.boardCol}>
        {q.isLoading ? <Skeleton n={3} h={140} min={160} /> : null}
        {rows.length >= 3 ? (
          <div className={s.podium}>
            {[1, 0, 2].map((i) => {
              const r = rows[i];
              return r ? (
                <Link
                  key={r.pseudo}
                  data-flip={r.pseudo}
                  to={`/profile/${encodeURIComponent(r.pseudo)}`}
                  className={`${s.pod} ${s[`p${i + 1}`] ?? ''} ${r.me ? s.mine : ''}`}
                >
                  <b className={s.podN}>{i + 1}</b>
                  <Avatar pseudo={r.pseudo} size={i ? 52 : 68} />
                  <b>{r.pseudo}</b>
                  <Tag elo={r.elo} />
                  <small>{n0(r.elo)} Elo</small>
                  <b className={cl(r.score)}>{pct(r.score)}</b>
                </Link>
              ) : null;
            })}
          </div>
        ) : null}
        {!q.isLoading && !rows.length ? <p className="muted">{t('ui.bs_empty')}</p> : null}
        <ol className={s.list}>
          {rows.slice(rows.length >= 3 ? 3 : 0).map((r) => (
            <li key={r.pseudo} data-flip={r.pseudo} className={r.me ? s.mine : ''}>
              <b>{r.rank}</b>
              <Link to={`/profile/${encodeURIComponent(r.pseudo)}`}>
                <Avatar pseudo={r.pseudo} size={30} /> {r.pseudo}
              </Link>
              <Tag elo={r.elo} />
              <span>{n0(r.elo)}</span>
              <small>{delta(r.delta)}</small>
              <b className={cl(r.score)}>{pct(r.score)}</b>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
