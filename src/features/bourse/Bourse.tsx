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
import { Presence, Skeleton, useFlip } from '@/ui/motion';
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
  own: number;
  cost: number;
  h: number[];
};
// jeton jamais obtenu : à sa place dans la liste, sans nom ni prix
type Hidden = { id: number; name: null; price: null; own: 0; h: [] };
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
  assets: (Asset | Hidden)[] | null;
  feed: {
    at: string;
    pseudo: string;
    kind: 'buy' | 'sell' | 'pull' | 'sold';
    shares: number | null;
    jeton: string;
    pct: number | null;
  }[];
};
type Locked = { locked: true; have: number; need: number; season: State['season'] };
type Row = { pseudo: string; rank: number; score: number; value: number; elo: number; me: boolean };

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
  const [qty, setQty] = useState('10');
  const [busy, setBusy] = useState(false);
  const key = useMemo(() => ['bourse', uid], [uid]);
  const q = useQuery({
    queryKey: key,
    enabled: !!uid,
    queryFn: async () => (await bourseApi.state()) as State | Locked,
    refetchInterval: potatoFx() ? 15_000 : 4_000,
  });
  const d = q.data;
  useBoard(false, !!d && !('locked' in d)); // le classement est prêt avant d'ouvrir l'onglet : rien n'arrive après coup
  useStaggerIn(pageRef, `.${s.bar}, .${s.term} > *`, !!d);
  // seuls les petits blocs bougent, à peine : sur le grand graphique ou le bandeau, le moindre angle se voit trop
  useSwingAll(pageRef, `.${s.watch}, .${s.pay}, .${s.tape}`, 0.035, `${tab}|${d ? 1 : 0}`);
  if (!uid) return <NeedLogin title={t('ui.nav_bourse')} />;
  if (!d)
    return (
      <section className={s.page}>
        {q.isError ? <p className="muted">{t('ui.err_generic')}</p> : <Skeleton n={6} h={120} min={220} />}
      </section>
    );
  if ('locked' in d) return <Gate serie={d.season.serie} have={d.have} need={d.need} />;
  const assets = d.assets ?? [];
  const open = assets.filter((a): a is Asset => a.price !== null);
  const cur = open.find((a) => a.id === sel) ?? open[0];
  if (!cur) return <Gate serie={d.season.serie} />;

  const loc = locale(lang);
  const n0 = (v: number) => Math.round(v).toLocaleString(loc);
  const n2 = (v: number) => v.toLocaleString(loc, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const pct = (v: number) =>
    `${v >= 0 ? '+' : ''}${v.toLocaleString(loc, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
  const cl = (v: number) => (v >= 0 ? s.up : s.down);
  const change = (a: Asset) => (a.price / a.p0 - 1) * 100;
  const label = (a: Asset) => a.name ?? '???';
  const img = (a: Asset) => (a.name ? texOf(jetonOf(a.name, d.season.serie)) : MYSTERE);
  // ce que rapporterait ou coûterait la position si on vendait tout maintenant (frais compris)
  const result = (a: Asset) => {
    const gain = sellGain(a, a.own) - a.cost;
    return { gain, pct: a.cost > 0 ? (gain / a.cost) * 100 : 0 };
  };
  const mine = result(cur);
  const days = Math.max(1, Math.ceil((new Date(d.season.ends_at).getTime() - q.dataUpdatedAt) / 86_400_000));
  const amount = floor3(Number(qty.replace(',', '.')) || 0);
  const bMax = maxBuy(cur, d.me.koo);
  const toSell = Math.min(amount, maxSell(cur)); // « Vendre » vend au plus ce que tu as
  const cost = amount > 0 && amount < cur.shares ? buyCost(cur, amount) : 0;
  const gain = toSell > 0 ? sellGain(cur, toSell) : 0;
  const pnl = d.me.value - d.me.paid - 1000;
  const step = (by: number) => setQty(String(Math.max(1, Math.floor(amount) + by)));
  const trade = async (buy: boolean, el: HTMLElement) => {
    setBusy(true);
    try {
      qc.setQueryData(key, await bourseApi.trade(cur.id, buy, buy ? amount : toSell));
      burstAt(el, buy ? '#4ade80' : '#f87171', 0.5);
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
  const logo = SERIE_LOGO[d.season.serie];
  const feedText = (f: State['feed'][number]) => {
    if (f.kind === 'pull') return t('ui.bs_pulled');
    if (f.kind === 'sold') return t('ui.bs_shop_sold');
    return t(f.kind === 'buy' ? 'ui.bs_bought' : 'ui.bs_sold');
  };

  return (
    <section ref={pageRef} className={s.page}>
      <header className={s.bar} data-depth>
        <div className={s.brand}>
          <h1>{t('ui.nav_bourse')}</h1>
          {logo ? <img className={`px ${s.serie}`} src={logo} alt={d.season.serie} /> : <span>{d.season.serie}</span>}
        </div>
        <dl className={s.strip}>
          <div>
            <dt>{t('ui.bs_pnl')}</dt>
            <dd>
              <Roll text={`${pnl >= 0 ? '+' : ''}${n2(pnl)}`} className={cl(pnl)} />
            </dd>
          </div>
          <div>
            <dt>{t('ui.bs_ends')}</dt>
            <dd>{t('ui.bs_days', { n: days })}</dd>
          </div>
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
              <div className={s.watchList} role="listbox" aria-label={t('ui.bs_market')}>
                {assets.map((a) =>
                  a.price === null ? (
                    <div
                      key={a.id}
                      role="option"
                      aria-selected={false}
                      aria-disabled
                      className={`${s.tok} ${s.hidden}`}
                    >
                      <img className="px" src={MYSTERE} alt="" width={36} height={36} />
                      <b>???</b>
                    </div>
                  ) : (
                    <button
                      key={a.id}
                      type="button"
                      role="option"
                      aria-selected={a.id === cur.id}
                      className={`${s.tok} ${a.id === cur.id ? s.on : ''}`}
                      onClick={() => (sfx.click(), setSel(a.id))}
                    >
                      <img className="px" src={img(a)} alt="" width={36} height={36} />
                      <span className={s.tokName}>
                        <b>{label(a)}</b>
                        {a.own > 0 ? (
                          <small>
                            ×{a.own.toLocaleString(loc)}{' '}
                            <span className={cl(result(a).gain)}>{pct(result(a).pct)}</span>
                          </small>
                        ) : null}
                      </span>
                      <span className={s.tokPrice}>
                        <b>
                          <Tween value={a.price} ms={350} format={n2} />
                        </b>
                        <small className={cl(change(a))}>{pct(change(a))}</small>
                      </span>
                    </button>
                  ),
                )}
              </div>
            </section>

            <section className={`${s.box} ${s.chartBox}`}>
              <div className={s.quote}>
                <img key={cur.id} className={`px ${s.quoteImg}`} src={img(cur)} alt="" width={44} height={44} />
                <div className={s.quoteName}>
                  <h2>
                    <Fade text={label(cur)} />
                  </h2>
                  <small>
                    <Fade text={cur.odds ? `1/${cur.odds.toLocaleString(loc)}` : ''} />
                  </small>
                </div>
                <Presence show={cur.own > 0}>
                  <div className={`${s.result} ${mine.gain >= 0 ? s.resultUp : s.resultDown}`}>
                    <Fade text={t(mine.gain >= 0 ? 'ui.bs_win' : 'ui.bs_lose')} />
                    <b>
                      <Roll text={n2(Math.abs(mine.gain))} />
                    </b>
                    <Koo size={16} />
                  </div>
                </Presence>
                <div className={s.last}>
                  <b>
                    <Roll text={n2(cur.price)} />
                  </b>
                  <Koo size={22} />
                  <Roll text={pct(change(cur))} className={cl(change(cur))} />
                </div>
              </div>
              <Swap k={cur.id} className={s.chartSwap}>
                <Chart a={cur} loc={loc} />
              </Swap>
              <div className={s.order}>
                <div className={s.stepper}>
                  <button type="button" aria-label="-1" onClick={() => step(-1)}>
                    -
                  </button>
                  <input
                    aria-label={t('ui.bs_qty')}
                    inputMode="decimal"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                  />
                  <button type="button" aria-label="+1" onClick={() => step(1)}>
                    +
                  </button>
                  <button type="button" className={s.max} disabled={!bMax} onClick={() => setQty(String(bMax))}>
                    {t('ui.bs_max')}
                  </button>
                </div>
                <button
                  type="button"
                  className={`${s.submit} ${s.submitBuy}`}
                  disabled={busy || amount <= 0 || amount > bMax}
                  onClick={(e) => void trade(true, e.currentTarget)}
                >
                  {t('ui.bs_buy')} <Roll text={n2(cost)} />
                </button>
                <button
                  type="button"
                  className={`${s.submit} ${s.submitSell}`}
                  disabled={busy || toSell <= 0}
                  onClick={(e) => void trade(false, e.currentTarget)}
                >
                  {t('ui.bs_sell')} <Roll text={n2(gain)} />
                </button>
              </div>
            </section>

            <aside className={s.right}>
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
                ) : ready ? (
                  <Button variant="gold" size="sm" block onClick={(e) => void claimPay(e.currentTarget)}>
                    {t('ui.q_claim')}
                  </Button>
                ) : null}
              </section>
              <section className={`${s.box} ${s.tape}`}>
                <h2>{t('ui.bs_live')}</h2>
                {d.feed.length ? (
                  <ul>
                    {d.feed.map((f) => (
                      <li key={`${f.at}${f.pseudo}${f.kind}${f.jeton}`}>
                        <Link to={`/profile/${encodeURIComponent(f.pseudo)}`}>{f.pseudo}</Link>{' '}
                        <span className={f.kind === 'buy' || f.kind === 'pull' ? s.up : s.down}>{feedText(f)}</span>{' '}
                        {f.shares ? `${f.shares.toLocaleString(loc)} ` : ''}
                        {f.jeton}
                        {f.pct !== null ? <b className={cl(f.pct)}> {pct(f.pct)}</b> : null}
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

function useBoard(live: boolean, ready = true) {
  const uid = useAuth((x) => x.user?.id);
  return useQuery({
    queryKey: ['bourse-board', uid],
    enabled: !!uid && ready,
    queryFn: async () => (await bourseApi.board()) as Row[],
    refetchInterval: live ? 20_000 : false,
  });
}

// Bourse fermée : pas encore 10 jetons différents, ou aucun jeton de la série du mois
function Gate({ serie, have, need }: { serie: string; have?: number; need?: number }) {
  const t = useT();
  const logo = SERIE_LOGO[serie];
  return (
    <section className={s.page}>
      <div className={`${s.box} ${s.gate}`}>
        <img className="px" src="/img/koo.png" alt="" width={72} height={72} />
        <h1>{t('ui.nav_bourse')}</h1>
        {logo ? <img className={`px ${s.serie}`} src={logo} alt={serie} /> : <b>{serie}</b>}
        {need ? (
          <>
            <div className={s.blocks} role="img" aria-label={`${have ?? 0}/${need}`}>
              {Array.from({ length: need }, (_, i) => (
                <i key={i} className={i < (have ?? 0) ? s.blockOn : ''} />
              ))}
            </div>
            <p>{t('ui.bs_need', { n: have ?? 0, m: need })}</p>
            <Link className={s.gateGo} to="/">
              {t('ui.bs_go_pull')}
            </Link>
          </>
        ) : (
          <p>{t('ui.bs_no_token')}</p>
        )}
      </div>
    </section>
  );
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
  const k = rankOf(me.elo);
  const name = (r: number) => `${t(TIERS[Math.floor(r / 3)] ?? 'ui.bs_t_bronze')} ${'I'.repeat((r % 3) + 1)}`;
  const floorElo = ELO_0 + k.r * ELO_STEP;
  const top = k.r === 17;
  const filled = top ? 10 : Math.max(0, Math.floor(((me.elo - floorElo) / ELO_STEP) * 10));
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
              <b className={cl(r.score)}>{pct(r.score)}</b>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
