import { useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
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
import { locale, potatoFx, reducedFx, useSettings } from '@/lib/settings';
import { Avatar } from '@/ui/Avatar';
import { Button } from '@/ui/Button';
import { Skeleton, useFlip } from '@/ui/motion';
import { Segmented } from '@/ui/Segmented';
import { Swap } from '@/ui/Swap';
import { toast } from '@/ui/toast';
import { Fade, Roll } from '@/ui/Roll';
import { Tween } from '@/ui/Tween';
import { useSwingAll } from '@/ui/useSwing';
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

// Les rangs : 6 paliers de 3 divisions (dessins public/img/ranks), 70 Elo par division
const TIERS: Key[] = [
  'ui.bs_t_bronze',
  'ui.bs_t_silver',
  'ui.bs_t_plat',
  'ui.bs_t_gold',
  'ui.bs_t_diamond',
  'ui.bs_t_legend',
];
const ELO_0 = 800,
  ELO_STEP = 70;
const rankOf = (elo: number) => {
  const r = Math.max(0, Math.min(17, Math.floor((elo - ELO_0) / ELO_STEP)));
  return { r, tier: Math.floor(r / 3), div: (r % 3) + 1, img: `/img/ranks/rank${r + 1}.png` };
};
const SERIE_LOGO: Record<string, string> = { Takoras: '/img/logo-takoras.png?v=2', Bodako: '/img/logo-bodako.png?v=2' };

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

// Graphique : axe des prix à droite, dernier prix marqué, réticule sous la souris.
// Quand un ordre arrive, la courbe grandit et l'échelle glisse vers leur nouvelle place.
type View = { pts: number[]; lo: number; hi: number; n: number };
const TICKS = [0, 1, 2, 3, 4];
const yOf = (p: number, v: View) => 6 + ((v.hi - p) / (v.hi - v.lo)) * 108;
function Chart({ a, loc }: { a: Asset; loc: string }) {
  const fmt = useMemo(
    () => (v: number) => v.toLocaleString(loc, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    [loc],
  );
  const box = useRef<HTMLDivElement>(null);
  const tip = useRef<HTMLElement>(null);
  const area = useRef<SVGPathElement>(null);
  const stroke = useRef<SVGPathElement>(null);
  const axis = useRef<HTMLDivElement>(null);
  const last = useRef<HTMLElement>(null);
  const shown = useRef<View | null>(null);
  const series = [a.p0, ...a.h, a.price].join();
  const up = a.price >= a.p0;
  useLayoutEffect(() => {
    const pts = series.split(',').map(Number);
    const start = pts[0] ?? 0;
    const to: View = {
      pts,
      lo: Math.min(...pts, start * 0.97),
      hi: Math.max(...pts, start * 1.03),
      n: pts.length - 1,
    };
    const draw = (v: View) => {
      shown.current = v;
      const X = (i: number) => Math.min(1, i / Math.max(1, v.n)) * 300;
      const d = v.pts.reduce(
        (o, p, i) => (i ? `${o}H${X(i).toFixed(1)}V${yOf(p, v).toFixed(1)}` : `M0 ${yOf(p, v).toFixed(1)}`),
        '',
      );
      stroke.current?.setAttribute('d', d);
      area.current?.setAttribute('d', `${d}H300V120H0Z`);
      axis.current?.querySelectorAll('span').forEach((e, i) => {
        e.textContent = fmt(v.hi - ((v.hi - v.lo) * i) / 4);
      });
      const end = v.pts[v.pts.length - 1] ?? 0;
      if (last.current) {
        last.current.textContent = fmt(end);
        last.current.style.top = `${(yOf(end, v) / 120) * 100}%`;
      }
    };
    const from = shown.current;
    if (!from || reducedFx()) return draw(to);
    const t0 = performance.now();
    const fromEnd = from.pts[from.pts.length - 1] ?? start;
    let raf = 0;
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / 520),
        e = 1 - (1 - k) ** 4,
        mix = (x: number, y: number) => x + (y - x) * e;
      draw({
        pts: pts.map((p, i) => mix(from.pts[i] ?? fromEnd, p)),
        lo: mix(from.lo, to.lo),
        hi: mix(from.hi, to.hi),
        n: mix(from.n, to.n),
      });
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [series, fmt]);
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const el = box.current,
      v = shown.current;
    if (!el || !v) return;
    const r = el.getBoundingClientRect(),
      y = e.clientY - r.top;
    el.style.setProperty('--cx', `${e.clientX - r.left}px`);
    el.style.setProperty('--cy', `${y}px`);
    if (tip.current) tip.current.textContent = fmt(v.hi - (((y / r.height) * 120 - 6) / 108) * (v.hi - v.lo));
  };
  return (
    <div className={s.plot}>
      <div className={s.plotArea} ref={box} onPointerMove={move}>
        <svg viewBox="0 0 300 120" preserveAspectRatio="none" aria-hidden>
          {TICKS.map((i) => (
            <line key={i} x1="0" x2="300" y1={6 + 27 * i} y2={6 + 27 * i} className={s.grid} />
          ))}
          <path ref={area} className={up ? s.areaUp : s.areaDown} />
          <path ref={stroke} className={up ? s.lineUp : s.lineDown} />
        </svg>
        <i className={s.crossX} />
        <i className={s.crossY} />
        <b className={s.crossTip} ref={tip} />
      </div>
      <div className={s.axis} ref={axis} aria-hidden>
        {TICKS.map((i) => (
          <span key={i} style={{ top: `${((6 + 27 * i) / 120) * 100}%` }} />
        ))}
        <b ref={last} className={up ? s.lastUp : s.lastDown} />
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
  // les infos comptent : les blocs ne bougent presque pas au survol
  useSwingAll(pageRef, `.${s.box}, .${s.bar}`, 0.035, `${tab}|${d ? 1 : 0}`);
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
  const stats: [string, string, string?][] = [
    [t('ui.bs_wallet'), n2(d.me.value)],
    [t('ui.bs_pnl'), `${pnl >= 0 ? '+' : ''}${n2(pnl)}`, cl(pnl)],
    [t('ui.bs_ends'), t('ui.bs_days', { n: days })],
  ];
  const logo = SERIE_LOGO[d.season.serie];

  return (
    <section ref={pageRef} className={s.page}>
      <header className={s.bar} data-depth>
        <div className={s.brand}>
          <h1>{t('ui.nav_bourse')}</h1>
          {logo ? <img className={`px ${s.serie}`} src={logo} alt={d.season.serie} /> : <span>{d.season.serie}</span>}
        </div>
        <dl className={s.strip}>
          {stats.map(([l, v, c]) => (
            <div key={l}>
              <dt>{l}</dt>
              <dd>
                <Roll text={v} className={c} />
              </dd>
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
          <div className={s.term} data-depth>
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
                  <img key={cur.id} className={`px ${s.quoteImg}`} src={img(cur)} alt="" width={36} height={36} />
                  <h2>
                    <Fade text={label(cur)} />
                  </h2>
                  <small>
                    <Fade text={cur.odds ? `1/${cur.odds.toLocaleString(loc)}` : ''} />
                  </small>
                  <b className={s.last}>
                    <Roll text={n2(cur.price)} />
                    <Koo size={20} />
                  </b>
                  <Roll text={pct(change(cur))} className={cl(change(cur))} />
                  <dl className={s.mini}>
                    <div>
                      <dt>{t('ui.bs_high')}</dt>
                      <dd>
                        <Roll text={n2(Math.max(...pts))} />
                      </dd>
                    </div>
                    <div>
                      <dt>{t('ui.bs_low')}</dt>
                      <dd>
                        <Roll text={n2(Math.min(...pts))} />
                      </dd>
                    </div>
                    <div>
                      <dt>{t('ui.bs_activity')}</dt>
                      <dd>
                        <Roll text={`${Math.round(cur.share * 100)} %`} />
                      </dd>
                    </div>
                  </dl>
                </div>
                <Swap k={cur.id} className={s.chartSwap}>
                  <Chart a={cur} loc={loc} />
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
                    <dd>
                      <Roll text={valid ? n2(total / amount) : '-'} />
                    </dd>
                  </div>
                  <div>
                    <dt>{t('ui.bs_impact')}</dt>
                    <dd>
                      <Roll text={valid ? pct(impact) : '-'} className={valid ? cl(impact) : ''} />
                    </dd>
                  </div>
                  <div>
                    <dt>{t('ui.bs_fee')}</dt>
                    <dd>1 %</dd>
                  </div>
                  <div className={s.totalRow}>
                    <dt>{t('ui.bs_total')}</dt>
                    <dd>
                      <Roll text={n2(total)} /> <Koo size={14} />
                    </dd>
                  </div>
                </dl>
                <button
                  type="button"
                  className={`${s.submit} ${buying ? s.submitBuy : s.submitSell}`}
                  disabled={busy || !valid}
                  onClick={(e) => void trade(e.currentTarget)}
                >
                  <Fade text={`${t(buying ? 'ui.bs_buy' : 'ui.bs_sell')} ${label(cur)}`} />
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

function RankBadge({ elo, size }: { elo: number; size: number }) {
  const t = useT();
  const k = rankOf(elo);
  return (
    <img
      className="px"
      src={k.img}
      alt={`${t(TIERS[k.tier] ?? 'ui.bs_t_bronze')} ${'I'.repeat(k.div)}`}
      width={size}
      height={size}
    />
  );
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
  useSwingAll(root, `.${s.box}, .${s.pod}`, 0.05, rows.length);
  const mine = rows.find((r) => r.me);
  const k = rankOf(me.elo);
  const name = (r: number) => `${t(TIERS[Math.floor(r / 3)] ?? 'ui.bs_t_bronze')} ${'I'.repeat((r % 3) + 1)}`;
  const floorElo = ELO_0 + k.r * ELO_STEP;
  const top = k.r === 17;
  const filled = top ? 10 : Math.max(0, Math.floor(((me.elo - floorElo) / ELO_STEP) * 10));
  const delta = (v: number) => `${v >= 0 ? '+' : ''}${v}`;
  return (
    <div className={s.ranks} ref={root} data-depth>
      <aside className={`${s.box} ${s.meCard}`}>
        <img className={`px ${s.meRank}`} src={k.img} alt="" width={132} height={132} />
        <b className={s.meName}>{name(k.r)}</b>
        <div className={s.elo}>
          <Roll text={n0(me.elo)} className={s.eloN} /> Elo
        </div>
        <div
          className={s.blocks}
          role="img"
          aria-label={top ? name(k.r) : t('ui.bs_next', { n: floorElo + ELO_STEP - me.elo, r: name(k.r + 1) })}
        >
          {Array.from({ length: 10 }, (_, i) => (
            <i key={i} className={i < filled ? s.blockOn : ''} />
          ))}
        </div>
        {top ? null : (
          <small className={s.next}>
            {t('ui.bs_next', { n: floorElo + ELO_STEP - me.elo, r: name(k.r + 1) })}
            <img className="px" src={`/img/ranks/rank${k.r + 2}.png`} alt="" width={22} height={22} />
          </small>
        )}
        <div className={s.ladder} aria-hidden>
          {TIERS.map((x, i) => (
            <img
              key={x}
              className={`px ${i <= k.tier ? s.reached : ''}`}
              src={`/img/ranks/rank${i * 3 + 1}.png`}
              alt=""
              width={34}
              height={34}
            />
          ))}
        </div>
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
                  <Avatar pseudo={r.pseudo} size={i ? 48 : 60} />
                  <b>{r.pseudo}</b>
                  <RankBadge elo={r.elo} size={i ? 40 : 52} />
                  <small>{n0(r.elo)} Elo</small>
                  <b className={cl(r.score)}>{pct(r.score)}</b>
                </Link>
              ) : null;
            })}
          </div>
        ) : null}
        {!q.isLoading && !rows.length ? <p className={s.none}>{t('ui.bs_empty')}</p> : null}
        <ol className={s.list}>
          {rows.slice(rows.length >= 3 ? 3 : 0).map((r) => (
            <li key={r.pseudo} data-flip={r.pseudo} className={r.me ? s.mine : ''}>
              <b>{r.rank}</b>
              <Link to={`/profile/${encodeURIComponent(r.pseudo)}`}>
                <Avatar pseudo={r.pseudo} size={28} /> {r.pseudo}
              </Link>
              <RankBadge elo={r.elo} size={28} />
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
