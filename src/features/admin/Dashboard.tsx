import { useQuery } from '@tanstack/react-query';
import { useMemo, useState, type CSSProperties } from 'react';
import { Link } from 'react-router';
import { adminApi } from '@/api';
import { jetonOf, texOf, vImg } from '@/data/jetons';
import { Avatar } from '@/ui/Avatar';
import { Tween } from '@/ui/Tween';
import { VTag } from '@/ui/VTag';
import { fmt } from './shared';
import s from './Dashboard.module.css';

// Tableau de bord admin : tout ce qui se passe sur le site, rafraîchi toutes les 30 s.
// Une seule fonction serveur (admin_dashboard) calcule tout ; ici on ne fait que dessiner.
type Day = {
  d: string;
  signups: number;
  pulls: number;
  active: number;
  rares: number;
  variants: number;
  battles: number;
  hours: number;
  earned: number;
  spent: number;
};
type Pull = {
  pseudo: string;
  jeton: string;
  serie: string;
  odds: number;
  variant: string | null;
  eff: number;
  at: string;
};
type Who = { pseudo: string; avatar?: string };
type Dash = {
  kpi: Record<string, number>;
  days: Day[];
  hours: number[];
  best_today: Pull[];
  best_ever: Pull[];
  top_pullers: (Who & { n: number })[];
  top_rich: (Who & { coins: number })[];
  top_time: (Who & { h: number })[];
  rarity_7d: { k: number; n: number }[] | null;
  variants_7d: { gold: number; celeste: number; ombre: number; none: number };
  series_7d: { serie: string; n: number }[];
  top_jetons_7d: { jeton: string; serie: string; odds: number; n: number }[];
  recent: (Who & { created_at: string })[];
  online_list: Who[];
};

const METRICS: [keyof Day, string][] = [
  ['pulls', 'Tirages'],
  ['active', 'Joueurs actifs'],
  ['signups', 'Inscriptions'],
  ['rares', 'Rares (1/1000+)'],
  ['variants', 'Mutations'],
  ['hours', 'Heures de jeu'],
  ['earned', 'Pièces gagnées'],
  ['spent', 'Pièces dépensées'],
];
const RANGES = [7, 14, 30, 90];
const RARITY = ['< 1/10', '1/10+', '1/100+', '1/1 000+', '1/10 000+', '1/100 000+'];
const VCOL = { none: '#6b7280', gold: '#f2c230', celeste: '#dbe7ff', ombre: '#8b5cf6' };
const VNAME = { none: 'Normal', gold: 'Doré', celeste: 'Céleste', ombre: 'Ombre' };

const short = (n: number) =>
  n >= 1e9
    ? `${(n / 1e9).toFixed(1)} Md`
    : n >= 1e6
      ? `${(n / 1e6).toFixed(1)} M`
      : n >= 1e4
        ? `${Math.round(n / 1e3)} k`
        : fmt(n);
const dShort = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
const ago = (d: string) => {
  const m = Math.round((Date.now() - Date.parse(d)) / 60000);
  return m < 60 ? `il y a ${m} min` : m < 1440 ? `il y a ${Math.round(m / 60)} h` : `il y a ${Math.round(m / 1440)} j`;
};
const pct = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 100) : a ? 100 : 0);

export function Dashboard() {
  const [range, setRange] = useState(30);
  const q = useQuery({
    queryKey: ['admin', 'dash', range],
    queryFn: async () => (await adminApi.dashboard(range)) as unknown as Dash,
    refetchInterval: 30_000,
    placeholderData: (old) => old,
  });
  const d = q.data;
  if (!d) return <p className="muted">{q.isError ? 'Impossible de charger les stats.' : 'Chargement des stats…'}</p>;
  const k = d.kpi;
  const KPIS: [string, number, string?, number?][] = [
    ['En ligne', k.online ?? 0, `${k.online_15 ?? 0} sur 15 min`],
    ['Actifs aujourd’hui', k.active_today ?? 0, `${k.active_7d ?? 0} sur 7 jours`],
    ['Joueurs', k.players ?? 0, `${k.banned ?? 0} banni(s)`],
    ['Inscrits 7 j', k.new_7d ?? 0, `${k.new_today ?? 0} aujourd’hui`, pct(k.new_7d ?? 0, k.new_prev7d ?? 0)],
    [
      'Tirages aujourd’hui',
      k.pulls_today ?? 0,
      `hier ${fmt(k.pulls_yesterday ?? 0)}`,
      pct(k.pulls_today ?? 0, k.pulls_yesterday ?? 0),
    ],
    ['Tirages au total', k.pulls_total ?? 0, `${short(k.owned_tokens ?? 0)} jetons gardés`],
    ['Rares aujourd’hui', k.rares_today ?? 0, '1/1000 et plus'],
    ['Mutations aujourd’hui', k.variants_today ?? 0, 'Doré, Céleste, Ombre'],
    ['Pièces en jeu', k.coins_total ?? 0, `${short(k.coins_avg ?? 0)} en moyenne`],
    ['Heures de jeu', k.hours_total ?? 0, `${k.hours_today ?? 0} h aujourd’hui`],
    ['Matchs classés', k.matches_total ?? 0, `${k.matches_today ?? 0} aujourd’hui`],
    ['Amitiés', k.friendships ?? 0, `${k.cosmetics_owned ?? 0} cosmétiques · ${short(k.items_owned ?? 0)} objets`],
  ];
  return (
    <div className={s.dash}>
      <div className={s.bar}>
        <span className={s.live}>
          <i aria-hidden /> En direct · mis à jour toutes les 30 s
        </span>
        <div className={s.seg} role="group" aria-label="Période">
          {RANGES.map((r) => (
            <button key={r} type="button" aria-pressed={range === r} onClick={() => setRange(r)}>
              {r} j
            </button>
          ))}
        </div>
      </div>

      {(k.fb_open ?? 0) + (k.reports_open ?? 0) > 0 ? (
        <p className={s.alert}>
          {k.fb_open ? `💡 ${k.fb_open} retour(s) à lire` : ''}
          {k.fb_open && k.reports_open ? ' · ' : ''}
          {k.reports_open ? `🚩 ${k.reports_open} signalement(s) à traiter` : ''}
        </p>
      ) : null}

      <ul className={s.kpis}>
        {KPIS.map(([l, v, sub, delta], i) => (
          <li key={l} className={s.kpi} style={{ '--i': i } as CSSProperties}>
            <small>{l}</small>
            <b>
              <Tween value={v} ms={1100} pow={4} format={(n) => (v % 1 ? n.toFixed(1) : short(Math.round(n)))} />
            </b>
            <span>
              {delta !== undefined ? (
                <em className={delta >= 0 ? s.up : s.down}>
                  {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)} %
                </em>
              ) : null}
              {sub}
            </span>
          </li>
        ))}
      </ul>

      <Trend days={d.days} />

      <div className={s.grid}>
        <Panel title="Heures de pointe" sub="tirages par heure, 7 derniers jours">
          <Hours v={d.hours ?? []} />
        </Panel>
        <Panel title="Raretés tirées" sub="7 derniers jours">
          <HBars rows={(d.rarity_7d ?? []).map((r) => [RARITY[r.k] ?? '?', r.n])} />
        </Panel>
        <Panel title="Mutations" sub="7 derniers jours">
          <Variants v={d.variants_7d} />
        </Panel>
        <Panel title="Séries" sub="tirages, 7 derniers jours">
          <HBars rows={d.series_7d.map((r) => [r.serie, r.n])} />
        </Panel>
      </div>

      <div className={s.grid}>
        <Panel title="Meilleurs tirages du jour" wide>
          <Pulls list={d.best_today} empty="Rien de rare aujourd’hui (pour l’instant)." />
        </Panel>
        <Panel title="Meilleurs tirages de tous les temps" wide>
          <Pulls list={d.best_ever} />
        </Panel>
      </div>

      <div className={s.grid}>
        <Panel title="Jetons les plus tirés" sub="7 derniers jours">
          <ol className={s.toks}>
            {d.top_jetons_7d.map((t) => (
              <li key={t.serie + t.jeton}>
                <img className="px" src={texOf(jetonOf(t.jeton, t.serie))} alt="" />
                <b>{t.jeton}</b>
                <small>1/{fmt(t.odds)}</small>
                <span>{fmt(t.n)}</span>
              </li>
            ))}
          </ol>
        </Panel>
        <Panel title="Plus de tirages aujourd’hui">
          <People rows={d.top_pullers.map((p) => [p, fmt(p.n)])} />
        </Panel>
        <Panel title="Plus riches">
          <People rows={d.top_rich.map((p) => [p, short(p.coins)])} />
        </Panel>
        <Panel title="Plus de temps de jeu">
          <People rows={d.top_time.map((p) => [p, `${p.h} h`])} />
        </Panel>
      </div>

      <div className={s.grid}>
        <Panel title={`En ligne (${d.online_list.length})`} sub="actifs ces 5 dernières minutes">
          {d.online_list.length ? (
            <div className={s.online}>
              {d.online_list.map((p) => (
                <Link key={p.pseudo} to={`/profile/${encodeURIComponent(p.pseudo)}`} title={p.pseudo}>
                  <Avatar pseudo={p.pseudo} avatar={p.avatar} size={40} />
                  <small>{p.pseudo}</small>
                </Link>
              ))}
            </div>
          ) : (
            <p className="muted">Personne en ce moment.</p>
          )}
        </Panel>
        <Panel title="Derniers inscrits">
          <People rows={d.recent.map((p) => [p, ago(p.created_at)])} />
        </Panel>
      </div>
    </div>
  );
}

function Panel({
  title,
  sub,
  wide,
  children,
}: {
  title: string;
  sub?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={`${s.panel} ${wide ? s.wide : ''}`}>
      <header>
        <h3>{title}</h3>
        {sub ? <small>{sub}</small> : null}
      </header>
      {children}
    </section>
  );
}

// ---------- la grande courbe : une mesure à la fois (jamais deux échelles), survol jour par jour ----------
const W = 800,
  H = 240,
  PAD = { l: 44, r: 12, t: 14, b: 26 };
function niceMax(v: number) {
  if (v <= 0) return 4;
  const p = 10 ** Math.floor(Math.log10(v));
  const m = [1, 2, 2.5, 5, 10].find((x) => x * p >= v) ?? 10;
  return m * p;
}
function Trend({ days }: { days: Day[] }) {
  const [m, setM] = useState<keyof Day>('pulls');
  const [hov, setHov] = useState<number | null>(null);
  const vals = days.map((x) => Number(x[m]) || 0);
  const max = niceMax(Math.max(...vals, 0));
  const iw = W - PAD.l - PAD.r,
    ih = H - PAD.t - PAD.b;
  const X = (i: number) => PAD.l + (days.length > 1 ? (i / (days.length - 1)) * iw : iw / 2);
  const Y = (v: number) => PAD.t + ih - (v / max) * ih;
  const line = vals.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
  const area = `${line} L${X(vals.length - 1)},${PAD.t + ih} L${X(0)},${PAD.t + ih} Z`;
  const total = vals.reduce((a, b) => a + b, 0);
  const label = METRICS.find(([k]) => k === m)?.[1] ?? '';
  const step = Math.max(1, Math.ceil(days.length / 8));
  const h = hov !== null ? days[hov] : undefined;
  const hv = hov !== null ? (vals[hov] ?? 0) : 0;
  return (
    <section className={`${s.panel} ${s.trend}`}>
      <header>
        <h3>{label}</h3>
        <small>
          {m === 'hours' ? `${total.toFixed(1)} h` : fmt(total)} sur {days.length} jours · moyenne{' '}
          {m === 'hours' ? (total / days.length).toFixed(1) : fmt(Math.round(total / Math.max(1, days.length)))} / jour
        </small>
      </header>
      <div className={s.metrics} role="tablist">
        {METRICS.map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={m === k} onClick={() => setM(k)}>
            {l}
          </button>
        ))}
      </div>
      <div className={s.chart}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${label} par jour`}>
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <g key={f}>
              <line x1={PAD.l} x2={W - PAD.r} y1={Y(max * f)} y2={Y(max * f)} className={s.gridLine} />
              <text x={PAD.l - 8} y={Y(max * f) + 4} className={s.axis} textAnchor="end">
                {short(max * f)}
              </text>
            </g>
          ))}
          {days.map((x, i) =>
            (i % step === 0 && days.length - 1 - i >= step / 2) || i === days.length - 1 ? (
              <text key={x.d} x={X(i)} y={H - 6} className={s.axis} textAnchor="middle">
                {dShort(x.d)}
              </text>
            ) : null,
          )}
          <g key={m + days.length}>
            <path d={area} className={s.area} />
            <path d={line} className={s.line} pathLength={1} />
          </g>
          {hov !== null ? (
            <g>
              <line x1={X(hov)} x2={X(hov)} y1={PAD.t} y2={PAD.t + ih} className={s.cross} />
              <circle cx={X(hov)} cy={Y(hv)} r={5} className={s.dot} />
            </g>
          ) : null}
          {/* zones de survol : une par jour, plus larges que le point */}
          {days.map((x, i) => (
            <rect
              key={x.d}
              x={X(i) - iw / Math.max(1, days.length - 1) / 2}
              y={PAD.t}
              width={iw / Math.max(1, days.length - 1)}
              height={ih}
              fill="transparent"
              onPointerEnter={() => setHov(i)}
              onPointerLeave={() => setHov((c) => (c === i ? null : c))}
            />
          ))}
        </svg>
        {h ? (
          <div
            className={s.tip}
            style={{ left: `${(X(hov ?? 0) / W) * 100}%`, top: `${(Y(hv) / H) * 100}%` } as CSSProperties}
          >
            <small>
              {new Date(h.d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </small>
            <b>
              {m === 'hours' ? hv.toFixed(1) : fmt(hv)} <span>{label.toLowerCase()}</span>
            </b>
            <span>
              {fmt(h.pulls)} tirages · {h.active} actifs · {h.signups} inscrits
            </span>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function Hours({ v }: { v: number[] }) {
  const max = Math.max(1, ...v);
  const peak = v.indexOf(Math.max(...v));
  return (
    <div className={s.hours}>
      {v.map((n, i) => (
        <div key={i} className={s.hour} title={`${i} h : ${fmt(n)} tirages`}>
          <i
            style={{ height: `${(n / max) * 100}%`, '--i': i } as CSSProperties}
            className={i === peak ? s.peak : ''}
          />
          {i % 6 === 0 ? <small>{i} h</small> : null}
        </div>
      ))}
    </div>
  );
}

function HBars({ rows }: { rows: [string, number][] }) {
  const max = Math.max(1, ...rows.map((r) => r[1]));
  const tot = rows.reduce((a, r) => a + r[1], 0) || 1;
  if (!rows.length) return <p className="muted">Rien sur cette période.</p>;
  return (
    <ul className={s.hbars}>
      {rows.map(([l, n], i) => (
        <li key={l}>
          <span>{l}</span>
          <div>
            <i style={{ width: `${(n / max) * 100}%`, '--i': i } as CSSProperties} />
          </div>
          <b>
            {fmt(n)} <small>{Math.round((n / tot) * 100)} %</small>
          </b>
        </li>
      ))}
    </ul>
  );
}

function Variants({ v }: { v: Dash['variants_7d'] }) {
  const keys = ['none', 'gold', 'celeste', 'ombre'] as const;
  const tot = keys.reduce((a, x) => a + (v[x] ?? 0), 0) || 1;
  return (
    <div className={s.vars}>
      <div className={s.stack}>
        {keys.map((x) =>
          v[x] ? (
            <i key={x} style={{ flexGrow: v[x], background: VCOL[x] }} title={`${VNAME[x]} : ${fmt(v[x])}`} />
          ) : null,
        )}
      </div>
      <ul>
        {keys.map((x) => (
          <li key={x}>
            <i style={{ background: VCOL[x] }} />
            {VNAME[x]}
            <b>{fmt(v[x] ?? 0)}</b>
            <small>{(((v[x] ?? 0) / tot) * 100).toFixed(1)} %</small>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Pulls({ list, empty }: { list: Pull[]; empty?: string }) {
  const rows = useMemo(() => list, [list]);
  if (!rows.length) return <p className="muted">{empty ?? 'Rien.'}</p>;
  return (
    <ol className={s.pulls}>
      {rows.map((p, i) => (
        <li key={i} style={{ '--i': i } as CSSProperties}>
          <span className={s.rank}>{i + 1}</span>
          <img className={vImg(p.variant)} src={texOf(jetonOf(p.jeton, p.serie))} alt="" />
          <span className={s.pName}>
            <b>
              {p.jeton} <VTag v={p.variant} />
            </b>
            <small>
              <Link to={`/profile/${encodeURIComponent(p.pseudo)}`}>{p.pseudo}</Link> · {ago(p.at)}
            </small>
          </span>
          <b className={s.odds}>1/{short(p.eff)}</b>
        </li>
      ))}
    </ol>
  );
}

function People({ rows }: { rows: [Who, string][] }) {
  if (!rows.length) return <p className="muted">Personne.</p>;
  return (
    <ol className={s.people}>
      {rows.map(([p, v], i) => (
        <li key={p.pseudo + i}>
          <span className={s.rank}>{i + 1}</span>
          <Link to={`/profile/${encodeURIComponent(p.pseudo)}`}>
            <Avatar pseudo={p.pseudo} avatar={p.avatar} size={28} />
            {p.pseudo}
          </Link>
          <b>{v}</b>
        </li>
      ))}
    </ol>
  );
}
