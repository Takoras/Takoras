import { useMemo, useRef, useState, type CSSProperties } from 'react';
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
import { Bump, Skeleton, useFlip } from '@/ui/motion';
import { Segmented } from '@/ui/Segmented';
import { Swap } from '@/ui/Swap';
import { toast } from '@/ui/toast';
import { Tween } from '@/ui/Tween';
import { useStaggerIn } from '@/ui/useStaggerIn';
import { useSwingAll } from '@/ui/useSwing';
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

// La pièce Koo, dessinée en pixels
const KOO = ['..####..', '.#oooo#.', '#oKooKo#', '#oKoKoo#', '#oKKooo#', '#oKoKoo#', '.#oooo#.', '..####..'];
const KOO_C: Record<string, string> = { '#': '#1c7f78', o: '#46dcc8', K: '#0d3f3c' };
function Koo({ size = 16 }: { size?: number }) {
  return (
    <svg className={s.koo} width={size} height={size} viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden>
      {KOO.flatMap((l, y) =>
        [...l].map((c, x) =>
          KOO_C[c] ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={KOO_C[c]} /> : null,
        ),
      )}
    </svg>
  );
}

function Chart({ a }: { a: Asset }) {
  const pts = [a.p0, ...a.h, a.price];
  // échelle d'au moins ±3 % : un petit ordre ne ressemble pas à une explosion
  const min = Math.min(...pts, a.p0 * 0.97),
    max = Math.max(...pts, a.p0 * 1.03),
    r = max - min;
  const X = (i: number) => (i / Math.max(1, pts.length - 1)) * 300;
  const Y = (p: number) => 110 - ((p - min) / r) * 100;
  // courbe en marches : le prix ne change qu'à un ordre, et ça reste dans l'esprit pixel
  const line = pts.reduce(
    (d, p, i) => (i ? `${d}H${X(i).toFixed(1)}V${Y(p).toFixed(1)}` : `M0 ${Y(p).toFixed(1)}`),
    '',
  );
  const up = a.price >= a.p0;
  return (
    <svg className={s.chart} viewBox="0 0 300 120" preserveAspectRatio="none" role="img" aria-hidden>
      <line x1="0" x2="300" y1={Y(a.p0)} y2={Y(a.p0)} className={s.base} />
      <path d={`${line}V120H0Z`} className={up ? s.areaUp : s.areaDown} />
      <path d={line} className={up ? s.lineUp : s.lineDown} />
    </svg>
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
  const [qty, setQty] = useState('10');
  const [busy, setBusy] = useState(false);
  const key = useMemo(() => ['bourse', uid], [uid]);
  const q = useQuery({
    queryKey: key,
    enabled: !!uid,
    queryFn: async () => (await bourseApi.state()) as State,
    refetchInterval: potatoFx() ? 15_000 : 5_000,
  });
  const d = q.data;
  useStaggerIn(pageRef, `.${s.head}, .${s.market} > *`, !!d);
  useSwingAll(pageRef, `.${s.tok}`, 0.4, `${tab}|${d?.assets.length ?? 0}`);
  useSwingAll(pageRef, `.${s.panel}`, 0.14, `${tab}|${d ? 1 : 0}`);
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
  const pct = (v: number) => `${v >= 0 ? '+' : ''}${v.toLocaleString(loc, { maximumFractionDigits: 1 })} %`;
  const cl = (v: number) => (v >= 0 ? s.up : s.down);
  const change = (a: Asset) => (a.price / a.p0 - 1) * 100;
  const label = (a: Asset) => a.name ?? '???';
  const img = (a: Asset) => (a.name ? texOf(jetonOf(a.name, d.season.serie)) : MYSTERE);
  const cur = d.assets.find((a) => a.id === sel) ?? d.assets[0];
  if (!cur) return null;
  const days = Math.max(1, Math.ceil((new Date(d.season.ends_at).getTime() - q.dataUpdatedAt) / 86_400_000));
  const amount = floor3(Number(qty.replace(',', '.')) || 0);
  const bMax = maxBuy(cur, d.me.koo),
    sMax = maxSell(cur);
  const cost = amount > 0 && amount < cur.shares ? buyCost(cur, amount) : 0,
    gain = amount > 0 ? sellGain(cur, amount) : 0;
  const trade = async (buy: boolean, el: HTMLElement) => {
    setBusy(true);
    try {
      qc.setQueryData(key, await bourseApi.trade(cur.id, buy, amount));
      burstAt(el, buy ? '#4ade80' : '#f87171', 0.7);
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
      burstAt(el, '#46dcc8');
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

  return (
    <section ref={pageRef} className={s.page}>
      <header className={s.head} data-depth>
        <h1>{t('ui.nav_bourse')}</h1>
        <span className={s.chip}>
          <b>{d.season.serie}</b> · {t('ui.bs_days', { n: days })}
        </span>
        <span className={s.chip}>
          <Koo />
          <b>
            <Tween value={d.me.koo} ms={350} format={n0} />
          </b>
        </span>
        <span className={s.chip}>
          {t('ui.bs_score')} <b className={cl(d.me.score)}>{pct(d.me.score)}</b>
        </span>
        <div className={s.tabs}>
          <Segmented
            value={tab}
            onChange={setTab}
            label={t('ui.nav_bourse')}
            options={[
              ['market', t('ui.bs_market')],
              ['ranks', t('ui.bs_ranks')],
            ]}
          />
        </div>
      </header>

      <Swap k={tab}>
        {tab === 'market' ? (
          <div className={s.market} data-depth>
            <div className={s.tokens} role="listbox" aria-label={t('ui.bs_market')}>
              {d.assets.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  role="option"
                  aria-selected={a.id === cur.id}
                  className={`${s.tok} ${a.id === cur.id ? s.on : ''}`}
                  onClick={() => (sfx.click(), setSel(a.id))}
                >
                  <img className="px" src={img(a)} alt="" width={44} height={44} />
                  <span className={s.tokName}>
                    <b>{label(a)}</b>
                    {a.own > 0 ? <small>{t('ui.bs_owned', { n: a.own.toLocaleString(loc) })}</small> : null}
                  </span>
                  <span className={s.tokPrice}>
                    <b>
                      <Tween value={a.price} ms={350} format={n2} />
                    </b>
                    <small className={cl(change(a))}>{pct(change(a))}</small>
                  </span>
                </button>
              ))}
            </div>

            <div className={s.center}>
              <article className={s.panel}>
                <Swap k={cur.id}>
                  <div className={s.detail}>
                    <div className={s.title}>
                      <img className="px" src={img(cur)} alt="" width={64} height={64} />
                      <div>
                        <h2>{label(cur)}</h2>
                        {cur.odds ? <small className="muted">1/{cur.odds.toLocaleString(loc)}</small> : null}
                      </div>
                      <div className={s.bigPrice}>
                        <Bump as="b" v={cur.price} kind="pop">
                          <Tween value={cur.price} ms={350} format={n2} />
                        </Bump>
                        <Koo size={20} />
                        <span className={cl(change(cur))}>{pct(change(cur))}</span>
                      </div>
                    </div>
                    <Chart a={cur} />
                  </div>
                </Swap>
                <dl className={s.stats}>
                  <div>
                    <dt>{t('ui.bs_own')}</dt>
                    <dd>{cur.own.toLocaleString(loc)}</dd>
                  </div>
                  <div>
                    <dt>{t('ui.bs_activity')}</dt>
                    <dd>{Math.round(cur.share * 100)} %</dd>
                  </div>
                  <div>
                    <dt>{t('ui.bs_divs')}</dt>
                    <dd>{n2(d.me.divs)}</dd>
                  </div>
                </dl>
                <div className={s.order}>
                  <label className={s.qty}>
                    <span>{t('ui.bs_qty')}</span>
                    <input inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} />
                  </label>
                  <div className={s.presets}>
                    {[10, 50].map((v) => (
                      <button key={v} type="button" onClick={() => setQty(String(v))}>
                        {v}
                      </button>
                    ))}
                    <button type="button" disabled={!bMax} onClick={() => setQty(String(bMax))}>
                      {t('ui.bs_max')}
                    </button>
                    <button type="button" disabled={!sMax} onClick={() => setQty(String(sMax))}>
                      {t('ui.bs_all')}
                    </button>
                  </div>
                  <Button
                    variant="primary"
                    className={s.buy}
                    disabled={busy || amount <= 0 || amount > bMax}
                    onClick={(e) => void trade(true, e.currentTarget)}
                  >
                    {t('ui.bs_buy')} · {n2(cost)}
                  </Button>
                  <Button
                    variant="danger"
                    disabled={busy || amount <= 0 || amount > sMax}
                    onClick={(e) => void trade(false, e.currentTarget)}
                  >
                    {t('ui.bs_sell')} · {n2(gain)}
                  </Button>
                </div>
              </article>
            </div>

            <aside className={s.side}>
              <article className={s.panel}>
                <h2>
                  {t('ui.bs_pay')}{' '}
                  <span className={s.payN}>
                    +25 <Koo />
                  </span>
                </h2>
                <ul className={s.quests}>
                  {missions.map(([l, v, m]) => (
                    <li key={l} className={v >= m ? s.qDone : ''}>
                      <span>{l}</span>
                      <b>{v >= m ? '✓' : `${v}/${m}`}</b>
                    </li>
                  ))}
                </ul>
                {d.quests.paid ? (
                  <Bump as="p" v={d.quests.paid} kind="stamp" className={s.paid}>
                    {t('ui.bs_paid')}
                  </Bump>
                ) : (
                  <Button variant="gold" block disabled={!ready} onClick={(e) => void claimPay(e.currentTarget)}>
                    {t('ui.q_claim')}
                  </Button>
                )}
              </article>
              <article className={s.panel}>
                <h2>{t('ui.bs_live')}</h2>
                {d.feed.length ? (
                  <ul className={s.feed}>
                    {d.feed.map((f) => (
                      <li key={`${f.at}${f.pseudo}`}>
                        <Link to={`/profile/${encodeURIComponent(f.pseudo)}`}>{f.pseudo}</Link>{' '}
                        <span className={f.buy ? s.up : s.down}>{t(f.buy ? 'ui.bs_bought' : 'ui.bs_sold')}</span>{' '}
                        {f.shares.toLocaleString(loc)} {f.jeton ?? '???'}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">{t('ui.bs_quiet')}</p>
                )}
              </article>
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
  const uid = useAuth((x) => x.user?.id);
  const root = useRef<HTMLDivElement>(null);
  const q = useQuery({
    queryKey: ['bourse-board', uid],
    enabled: !!uid,
    queryFn: async () => (await bourseApi.board()) as Row[],
    refetchInterval: 20_000,
  });
  const rows = q.data ?? [];
  useFlip(root, rows.map((r) => r.pseudo).join());
  useSwingAll(root, `.${s.pod}`, 0.35, rows.length);
  const mine = rows.find((r) => r.me);
  const ti = tierIdx(me.elo),
    tier = TIERS[ti],
    next = TIERS[ti + 1];
  const delta = (v: number) => `${v >= 0 ? '+' : ''}${v}`;
  return (
    <div className={s.ranks} ref={root} data-depth>
      <aside className={`${s.panel} ${s.meCard}`}>
        <Tag elo={me.elo} />
        <div className={s.elo}>
          <b>{n0(me.elo)}</b> Elo
        </div>
        <div className={s.eloBar}>
          <i style={{ width: `${tier && next ? ((me.elo - tier[1]) / (next[1] - tier[1])) * 100 : 100}%` }} />
        </div>
        {next ? <small className="muted">{t('ui.bs_next', { n: next[1] - me.elo, r: t(next[0]) })}</small> : null}
        <dl className={s.stats}>
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
