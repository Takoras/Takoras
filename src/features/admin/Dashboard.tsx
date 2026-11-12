import { useQuery } from '@tanstack/react-query';
import { useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router';
import { adminApi } from '@/api';
import { jetonOf, texOf, vImg } from '@/data/jetons';
import { Avatar } from '@/ui/Avatar';
import { Tween } from '@/ui/Tween';
import { VTag } from '@/ui/VTag';
import { fmt } from './shared';
import s from './Dashboard.module.css';

// Tableau de bord (admin et modos) : 6 catégories en onglets, chacune tient sur un écran.
// Aperçu = admin_dashboard ; les autres = admin_stats_cat(catégorie). Rafraîchi toutes les 30 s.
type Day = { d: string } & Record<string, number | string>;
type Who = { pseudo: string; avatar?: string; is_admin?: boolean; tester?: boolean };
type Pull = {
  pseudo: string;
  jeton: string;
  serie: string;
  odds: number;
  variant: string | null;
  eff: number;
  at: string;
};
type J = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any -- JSON du serveur, lu champ par champ

const CATS = [
  ['over', 'Aperçu'],
  ['players', 'Joueurs'],
  ['luck', 'Chance'],
  ['eco', 'Économie'],
  ['social', 'Combat & social'],
  ['alerts', 'Alertes'],
] as const;
type Cat = (typeof CATS)[number][0];
const RANGES = [7, 14, 30, 90];
const RARITY = ['< 1/10', '1/10+', '1/100+', '1/1 000+', '1/10 000+', '1/100 000+'];
const VCOL = { none: '#6b7280', gold: '#f2c230', celeste: '#dbe7ff', ombre: '#8b5cf6' };
const VNAME = { none: 'Normal', gold: 'Doré', celeste: 'Céleste', ombre: 'Ombre' };

const num = (v: unknown) => Number(v ?? 0) || 0;
const short = (n: number) =>
  n >= 1e9
    ? `${(n / 1e9).toFixed(1)} Md`
    : n >= 1e6
      ? `${(n / 1e6).toFixed(1)} M`
      : n >= 1e4
        ? `${Math.round(n / 1e3)} k`
        : fmt(Math.round(n * 10) / 10);
const dShort = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
const ago = (d: string) => {
  const m = Math.round((Date.now() - Date.parse(d)) / 60000);
  return m < 60 ? `il y a ${m} min` : m < 1440 ? `il y a ${Math.round(m / 60)} h` : `il y a ${Math.round(m / 1440)} j`;
};
const pct = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 100) : a ? 100 : 0);
const prof = (p: string) => `/profile/${encodeURIComponent(p)}`;

export function Dashboard() {
  const [cat, setCat] = useState<Cat>('over');
  const [range, setRange] = useState(30);
  return (
    <div className={s.dash}>
      <div className={s.bar}>
        <div className={s.cats} role="tablist" aria-label="Catégories de stats">
          {CATS.map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={cat === k} onClick={() => setCat(k)}>
              {l}
            </button>
          ))}
        </div>
        <div className={s.seg} role="group" aria-label="Période">
          {RANGES.map((r) => (
            <button key={r} type="button" aria-pressed={range === r} onClick={() => setRange(r)}>
              {r} j
            </button>
          ))}
        </div>
      </div>
      <div key={cat} className={s.body}>
        {cat === 'over' ? <Overview range={range} /> : <CatView cat={cat} range={range} />}
      </div>
    </div>
  );
}

function useStats(cat: string, range: number) {
  return useQuery({
    queryKey: ['admin', 'stats', cat, range],
    queryFn: async () =>
      (cat === 'over' ? await adminApi.dashboard(range) : await adminApi.statsCat(cat, range)) as unknown as J,
    refetchInterval: 30_000,
    placeholderData: (old) => old,
  });
}
const Loading = ({ err }: { err?: boolean }) => (
  <p className="muted">{err ? 'Impossible de charger les stats.' : 'Chargement des stats…'}</p>
);

// ======================================================================
// Aperçu
// ======================================================================
function Overview({ range }: { range: number }) {
  const q = useStats('over', range);
  const d = q.data;
  if (!d) return <Loading err={q.isError} />;
  const k = d.kpi as Record<string, number>;
  return (
    <>
      {(k.fb_open ?? 0) + (k.reports_open ?? 0) > 0 ? (
        <p className={s.alert}>
          {k.fb_open ? `${k.fb_open} retour(s) à lire` : ''}
          {k.fb_open && k.reports_open ? ' · ' : ''}
          {k.reports_open ? `${k.reports_open} signalement(s) à traiter` : ''}
        </p>
      ) : null}
      <Kpis
        items={[
          ['En ligne', k.online, `${k.online_15} sur 15 min`],
          ['Actifs du jour', k.active_today, `${k.active_7d} sur 7 jours`],
          ['Joueurs', k.players, `+${k.new_7d} en 7 j`, pct(num(k.new_7d), num(k.new_prev7d))],
          [
            'Tirages du jour',
            k.pulls_today,
            `hier ${fmt(num(k.pulls_yesterday))}`,
            pct(num(k.pulls_today), num(k.pulls_yesterday)),
          ],
          ['Rares du jour', k.rares_today, `${k.variants_today} mutations`],
          ['Pièces en jeu', k.coins_total, `${short(num(k.coins_avg))} / joueur`],
        ]}
      />
      <div className={s.row2}>
        <Trend
          days={d.days as Day[]}
          metrics={[
            ['pulls', 'Tirages'],
            ['active', 'Joueurs actifs'],
            ['signups', 'Inscriptions'],
            ['rares', 'Rares'],
            ['variants', 'Mutations'],
            ['hours', 'Heures de jeu'],
          ]}
        />
        <Panel title="Meilleurs tirages du jour" scroll>
          <Pulls list={d.best_today as Pull[]} empty="Rien de rare aujourd’hui." />
        </Panel>
      </div>
      <div className={s.row3}>
        <Panel title="Heures de pointe" sub="tirages par heure, 7 j">
          <Hours v={(d.hours as number[]) ?? []} />
        </Panel>
        <Panel title="Raretés tirées" sub="7 j">
          <HBars rows={((d.rarity_7d as J[]) ?? []).map((r) => [RARITY[r.k] ?? '?', num(r.n)])} />
        </Panel>
        <Panel title={`En ligne (${(d.online_list as Who[]).length})`} sub="5 dernières minutes" scroll>
          <Faces list={d.online_list as Who[]} />
        </Panel>
      </div>
    </>
  );
}

// ======================================================================
// Catégories détaillées
// ======================================================================
function CatView({ cat, range }: { cat: Exclude<Cat, 'over'>; range: number }) {
  const q = useStats(cat, range);
  const d = q.data;
  if (!d) return <Loading err={q.isError} />;
  if (cat === 'players') return <PlayersCat d={d} />;
  if (cat === 'luck') return <LuckCat d={d} />;
  if (cat === 'eco') return <EcoCat d={d} />;
  if (cat === 'social') return <SocialCat d={d} />;
  return <AlertsCat d={d} />;
}

// ---------- Joueurs : rétention, décrochage, entonnoir ----------
function PlayersCat({ d }: { d: J }) {
  const churn = d.churn as Record<string, number>;
  const b = d.buckets as Record<string, number>;
  const funnel = d.funnel as { k: string; n: number }[];
  const top = Math.max(1, funnel[0]?.n ?? 1);
  return (
    <>
      <Kpis
        items={[
          ['Actifs du jour', d.dau, 'joueurs'],
          ['Actifs 7 j', d.wau, 'joueurs'],
          ['Actifs 30 j', d.mau, 'joueurs'],
          ['Fidélité', d.mau ? Math.round((100 * d.dau) / d.mau) : 0, '% jour ÷ mois'],
          ['Temps moyen', d.playtime?.avg_h, 'heures par joueur'],
          ['Temps médian', d.playtime?.median_h, 'heures'],
        ]}
      />
      <div className={s.row2}>
        <Panel title="Nouveaux et joueurs qui reviennent" sub="par jour">
          <Stacked
            days={d.days as Day[]}
            series={[
              ['revenus', 'Reviennent', '#5b8cff'],
              ['nouveaux', 'Nouveaux', '#4ade80'],
            ]}
          />
        </Panel>
        <Panel title="Entonnoir" sub="combien vont jusqu’où">
          <ul className={s.funnel}>
            {funnel.map((f, i) => (
              <li key={f.k} style={{ '--i': i } as CSSProperties}>
                <span>{f.k}</span>
                <div>
                  <i style={{ width: `${(f.n / top) * 100}%` }} />
                </div>
                <b>
                  {fmt(f.n)} <small>{Math.round((f.n / top) * 100)} %</small>
                </b>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <div className={s.row3}>
        <Panel title="Rétention par semaine d’inscription" sub="% revenus après 1, 7 et 30 jours">
          <table className={s.cohort}>
            <thead>
              <tr>
                <th>Semaine</th>
                <th>Inscrits</th>
                <th>J+1</th>
                <th>J+7</th>
                <th>J+30</th>
              </tr>
            </thead>
            <tbody>
              {((d.cohorts as J[]) ?? []).map((c) => (
                <tr key={c.w}>
                  <td>{dShort(c.w)}</td>
                  <td>{c.taille}</td>
                  {[c.r1, c.r7, c.r30].map((v, i) => (
                    <td key={i} className={s.heat} style={{ '--h': v == null ? 0 : v / 100 } as CSSProperties}>
                      {v == null ? '—' : `${v} %`}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
        <Panel title="Où en sont les joueurs" sub="dernier jour de jeu">
          <Segments
            parts={[
              ['Actifs (< 3 j)', churn.actifs ?? 0, '#4ade80'],
              ['À risque (3-7 j)', churn.risque ?? 0, '#f2c230'],
              ['Décrochés (7-30 j)', churn.decroches ?? 0, '#fb923c'],
              ['Partis (> 30 j)', churn.partis ?? 0, '#fb7185'],
              ['Jamais joué', churn.jamais ?? 0, '#6b7280'],
            ]}
          />
        </Panel>
        <Panel title="Tirages par joueur" sub="depuis le début">
          <HBars
            rows={[
              ['0', b.b0 ?? 0],
              ['1 – 10', b.b1 ?? 0],
              ['11 – 100', b.b2 ?? 0],
              ['101 – 1 000', b.b3 ?? 0],
              ['1 000+', b.b4 ?? 0],
            ]}
          />
        </Panel>
      </div>
    </>
  );
}

// ---------- Chance : le hasard réel comparé à la théorie ----------
function LuckCat({ d }: { d: J }) {
  const tiers = (d.tiers as { k: number; obs: number; exp: number }[]) ?? [];
  const v = d.variants as Record<string, number>;
  const L = d.luck as Record<string, number>;
  const rareObs = tiers.filter((t) => t.k >= 3).reduce((a, t) => a + num(t.obs), 0);
  const rareExp = num(d.expected_rare);
  const vth: ['gold' | 'celeste' | 'ombre', number][] = [
    ['gold', 20],
    ['celeste', 200],
    ['ombre', 500],
  ];
  return (
    <>
      <Kpis
        items={[
          ['Sans potion', d.base, 'tirages comparés'],
          ['Rares obtenus', rareObs, `1/1000+ · ${short(rareExp)} attendus`],
          ['Chance réelle', rareExp ? Math.round((rareObs / rareExp) * 10) / 10 : 0, '× la théorie (1 = normal)'],
          ['Tirages boostés', L.total ? Math.round((100 * num(L.boosted)) / num(L.total)) : 0, '% avec potion'],
          ['Potion moyenne', L.avg, '× de chance'],
          ['Jamais tirés', (d.never as J[]).length, 'jetons'],
        ]}
      />
      <div className={s.row2}>
        <Panel title="Raretés : réel contre théorie" sub="sans potion · ×1 = exactement ce que prévoit le jeu">
          <table className={s.cmp}>
            <thead>
              <tr>
                <th>Rareté</th>
                <th>Obtenus</th>
                <th>Attendus</th>
                <th>Écart</th>
              </tr>
            </thead>
            <tbody>
              {tiers.map((t) => {
                const r = t.exp > 0 ? t.obs / t.exp : t.obs ? 99 : 1;
                return (
                  <tr key={t.k}>
                    <td>{RARITY[t.k]}</td>
                    <td>{fmt(num(t.obs))}</td>
                    <td>{short(num(t.exp))}</td>
                    <td>
                      <Ratio r={r} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className={s.note}>
            Un gros écart sur les raretés hautes vient souvent des tirages de test (forcés) : regarde l’onglet Alertes.
          </p>
        </Panel>
        <Panel title="Mutations : réel contre théorie" sub="sans potion">
          <table className={s.cmp}>
            <thead>
              <tr>
                <th>Mutation</th>
                <th>Taux réel</th>
                <th>Prévu</th>
                <th>Écart</th>
              </tr>
            </thead>
            <tbody>
              {vth.map(([k, o]) => {
                const rate = v.n ? num(v[k]) / v.n : 0;
                return (
                  <tr key={k}>
                    <td>
                      <i className={s.sw} style={{ background: VCOL[k] }} /> {VNAME[k]}
                    </td>
                    <td>{rate ? `1/${fmt(Math.round(1 / rate))}` : '—'}</td>
                    <td>1/{o}</td>
                    <td>
                      <Ratio r={rate * o} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <h4 className={s.h4}>Potions utilisées (tous les tirages)</h4>
          <HBars
            rows={[
              ['Sans', L.l1 ?? 0],
              ['×1,3 – ×2', L.l2 ?? 0],
              ['×5 – ×10', L.l3 ?? 0],
              ['×25 – ×50', L.l4 ?? 0],
              ['×100+', L.l5 ?? 0],
            ]}
          />
        </Panel>
      </div>
      <div className={s.row3}>
        <Panel title="Nouvelles découvertes" sub="jetons obtenus pour la 1re fois par un joueur">
          <Bars days={d.discover as Day[]} k="n" />
        </Panel>
        <Panel title="Les plus chanceux" sub="rares pour 1 000 tirages (50 tirages min.)" scroll>
          <People rows={((d.lucky as J[]) ?? []).map((p) => [p as Who, `${p.ratio} ‰`, `${p.rares}/${fmt(p.n)}`])} />
        </Panel>
        <Panel title="Jamais tirés" sub="du plus rare au moins rare" scroll>
          <ul className={s.never}>
            {((d.never as J[]) ?? []).map((j) => (
              <li key={j.serie + j.name}>
                <img className="px" src={texOf(jetonOf(j.name, j.serie))} alt="" />
                <b>{j.name}</b>
                <small>1/{fmt(j.odds)}</small>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}

// ---------- Économie ----------
function EcoCat({ d }: { d: J }) {
  const sp = d.supply as Record<string, number>;
  const days = d.days as Day[];
  const gain = days.reduce((a, x) => a + num(x.gagne), 0),
    dep = days.reduce((a, x) => a + num(x.depense), 0);
  return (
    <>
      <Kpis
        items={[
          ['Pièces en jeu', sp.total, 'au total'],
          ['Joueur médian', sp.median, 'pièces'],
          ['Top 10 %', d.top10, '% des pièces'],
          ['Inégalité (Gini)', sp.gini, '0 égal · 1 tout à un'],
          ['Créées', gain, 'sur la période'],
          ['Détruites', dep, 'sur la période'],
        ]}
      />
      <div className={s.row2}>
        <Trend
          days={days}
          metrics={[
            ['gagne', 'Pièces gagnées'],
            ['depense', 'Pièces dépensées'],
            ['vendus', 'Jetons vendus'],
          ]}
        />
        <Panel title="Ventes de la boutique" sub="depuis le début" scroll>
          <table className={s.cmp}>
            <thead>
              <tr>
                <th>Objet</th>
                <th>Ventes</th>
                <th>Acheteurs</th>
                <th>Pièces</th>
              </tr>
            </thead>
            <tbody>
              {((d.shop as J[]) ?? []).map((x) => (
                <tr key={x.item}>
                  <td>{x.item}</td>
                  <td>{fmt(x.qty)}</td>
                  <td>{x.buyers}</td>
                  <td>{short(num(x.coins))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>
      <div className={s.row3}>
        <Panel title="Objets en circulation" scroll>
          <HBars rows={((d.items as J[]) ?? []).map((x) => [x.item, num(x.qty)])} />
        </Panel>
        <Panel title="Codes promo" sub="les plus utilisés" scroll>
          <People
            rows={((d.promo as J[]) ?? []).map((x) => [
              { pseudo: x.code },
              `${x.uses}${x.max_uses ? `/${x.max_uses}` : ''}`,
              x.active ? 'actif' : 'coupé',
            ])}
            noLink
          />
        </Panel>
        <Panel title="Lecture rapide">
          <ul className={s.read}>
            <li>
              Sur la période, il s’est créé <b>{short(gain)}</b> pièces et détruit <b>{short(dep)}</b> : la masse{' '}
              {gain >= dep ? 'gonfle' : 'baisse'}.
            </li>
            <li>
              Les 10 % les plus riches ont <b>{d.top10} %</b> des pièces.
            </li>
            <li>
              Gini à <b>{sp.gini}</b>
              {num(sp.gini) > 0.8 ? ' : richesse très concentrée (souvent des comptes de test).' : '.'}
            </li>
          </ul>
        </Panel>
      </div>
    </>
  );
}

// ---------- Combat & social ----------
function SocialCat({ d }: { d: J }) {
  const r = d.ranked as Record<string, number>;
  const f = d.friends as Record<string, number>;
  const p = d.pass as Record<string, number>;
  const c = d.cosmetics as Record<string, number>;
  return (
    <>
      <Kpis
        items={[
          ['Matchs classés', r.total, `${r.finished} terminés`],
          ['Durée d’un match', r.avg_min, `minutes · ${r.avg_turns} tours`],
          [
            'Ont un ami',
            f.players ? Math.round((100 * num(f.with_friend)) / num(f.players)) : 0,
            `% des joueurs · ${f.avg} amis en moy.`,
          ],
          ['Demandes en attente', f.pending, 'd’amis'],
          ['Passe de combat', p.players, `${p.premium} premium · ${fmt(num(p.claims))} récompenses`],
          ['Cosmétiques portés', num(c.name) + num(c.aura) + num(c.bfx), `${c.owners} joueurs en ont`],
        ]}
      />
      <div className={s.row2}>
        <Trend
          days={d.days as Day[]}
          metrics={[
            ['matchs', 'Matchs classés'],
            ['amities', 'Nouvelles amitiés'],
            ['messages', 'Messages'],
          ]}
        />
        <Panel title="Fin des matchs" sub="pourquoi ils s’arrêtent">
          <HBars rows={((d.why as J[]) ?? []).map((x) => [x.k, num(x.n)])} />
        </Panel>
      </div>
      <div className={s.row3}>
        <Panel title="Retours des joueurs" sub="par type (non lus)">
          <HBars rows={((d.feedback as J[]) ?? []).map((x) => [`${x.k}${x.open ? ` (${x.open})` : ''}`, num(x.n)])} />
        </Panel>
        <Panel title="Signalements" sub="par motif (à traiter)">
          <HBars rows={((d.reports as J[]) ?? []).map((x) => [`${x.k}${x.open ? ` (${x.open})` : ''}`, num(x.n)])} />
        </Panel>
        <Panel title="Cosmétiques portés">
          <HBars
            rows={[
              ['Effet de pseudo', num(c.name)],
              ['Contour', num(c.aura)],
              ['Bannière', num(c.bfx)],
            ]}
          />
        </Panel>
      </div>
    </>
  );
}

// ---------- Alertes : triche, abus, comptes à surveiller ----------
function AlertsCat({ d }: { d: J }) {
  const staffTag = (p: J) => (p.is_admin ? 'admin' : p.tester ? 'testeur' : '');
  return (
    <>
      <Kpis
        items={[
          ['En cours', d.pending, 'ouvertures'],
          ['Bannis', (d.banned as J[]).length, 'comptes'],
          ['Équipe', (d.staff as J[]).length, 'admins, modos, testeurs'],
          ['Limites atteintes', ((d.rate as J[]) ?? []).reduce((a, x) => a + num(x.n), 0), 'en 24 h'],
        ]}
      />
      <div className={s.row3}>
        <Panel title="Plus gros gains (24 h)" sub="en rouge : pas de l’équipe, à vérifier" scroll>
          <People rows={((d.gains as J[]) ?? []).map((p) => [p as Who, short(num(p.gain)), staffTag(p)])} flag />
        </Panel>
        <Panel title="Rafales de tirages (24 h)" sub="max de tirages en une heure" scroll>
          <People
            rows={((d.bursts as J[]) ?? []).map((p) => [
              p as Who,
              fmt(num(p.n)),
              `à ${new Date(p.h).getHours()} h${staffTag(p) ? ` · ${staffTag(p)}` : ''}`,
            ])}
            flag
          />
        </Panel>
        <Panel title="Chance suspecte (7 j)" sub="au moins 2 jetons 1/10 000+ sans potion" scroll>
          <People
            rows={((d.lucky_odd as J[]) ?? []).map((p) => [
              p as Who,
              `${p.big} × 1/10k+`,
              `meilleur 1/${short(num(p.best))}`,
            ])}
            flag
          />
        </Panel>
      </div>
      <div className={s.row3}>
        <Panel title="Limites anti-spam (24 h)" sub="action (joueurs touchés)">
          <HBars rows={((d.rate as J[]) ?? []).map((x) => [`${x.k} (${x.users})`, num(x.n)])} />
        </Panel>
        <Panel title="Équipe" scroll>
          <People
            rows={((d.staff as J[]) ?? []).map((p) => [p as Who, p.admin ? 'admin' : p.mod ? 'modo' : 'testeur'])}
          />
        </Panel>
        <Panel title="Bannis" scroll>
          {(d.banned as J[]).length ? <Faces list={d.banned as Who[]} /> : <p className="muted">Personne.</p>}
        </Panel>
      </div>
    </>
  );
}

// ======================================================================
// Briques
// ======================================================================
function Panel({
  title,
  sub,
  scroll,
  children,
}: {
  title: string;
  sub?: string;
  scroll?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={`${s.panel} ${scroll ? s.scroll : ''}`}>
      <header>
        <h3>{title}</h3>
        {sub ? <small>{sub}</small> : null}
      </header>
      <div className={s.pBody}>{children}</div>
    </section>
  );
}

function Kpis({ items }: { items: [string, unknown, string?, number?][] }) {
  return (
    <ul className={s.kpis}>
      {items.map(([l, v0, sub, delta], i) => {
        const v = num(v0);
        return (
          <li key={l} className={s.kpi} style={{ '--i': i } as CSSProperties}>
            <small>{l}</small>
            <b>
              <Tween
                value={v}
                ms={1000}
                pow={4}
                format={(n) => (v % 1 ? n.toFixed(v < 10 ? 2 : 1) : short(Math.round(n)))}
              />
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
        );
      })}
    </ul>
  );
}

// la courbe : une mesure à la fois (jamais deux échelles), survol jour par jour
const W = 760,
  H = 190,
  PAD = { l: 46, r: 12, t: 12, b: 24 };
function niceMax(v: number) {
  if (v <= 0) return 4;
  const p = 10 ** Math.floor(Math.log10(v));
  const m = [1, 2, 2.5, 5, 10].find((x) => x * p >= v) ?? 10;
  return m * p;
}
function Trend({ days, metrics }: { days: Day[]; metrics: [string, string][] }) {
  const [m, setM] = useState(metrics[0]?.[0] ?? '');
  const [hov, setHov] = useState<number | null>(null);
  const vals = days.map((x) => num(x[m]));
  const max = niceMax(Math.max(...vals, 0));
  const iw = W - PAD.l - PAD.r,
    ih = H - PAD.t - PAD.b;
  const X = (i: number) => PAD.l + (days.length > 1 ? (i / (days.length - 1)) * iw : iw / 2);
  const Y = (v: number) => PAD.t + ih - (v / max) * ih;
  const line = vals.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
  const area = `${line} L${X(vals.length - 1)},${PAD.t + ih} L${X(0)},${PAD.t + ih} Z`;
  const total = vals.reduce((a, b) => a + b, 0);
  const label = metrics.find(([k]) => k === m)?.[1] ?? '';
  const step = Math.max(1, Math.ceil(days.length / 7));
  const h = hov !== null ? days[hov] : undefined;
  const hv = hov !== null ? (vals[hov] ?? 0) : 0;
  const slot = iw / Math.max(1, days.length - 1);
  return (
    <section className={s.panel}>
      <header className={s.trendHead}>
        <div>
          <h3>{label}</h3>
          <small>
            {short(total)} sur {days.length} jours · {short(total / Math.max(1, days.length))} / jour
          </small>
        </div>
        <div className={s.metrics} role="tablist">
          {metrics.map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={m === k} onClick={() => setM(k)}>
              {l}
            </button>
          ))}
        </div>
      </header>
      <div className={s.chart}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${label} par jour`}>
          {[0, 0.5, 1].map((f) => (
            <g key={f}>
              <line x1={PAD.l} x2={W - PAD.r} y1={Y(max * f)} y2={Y(max * f)} className={s.gridLine} />
              <text x={PAD.l - 8} y={Y(max * f) + 4} className={s.axis} textAnchor="end">
                {short(max * f)}
              </text>
            </g>
          ))}
          {days.map((x, i) =>
            (i % step === 0 && days.length - 1 - i >= step / 2) || i === days.length - 1 ? (
              <text key={x.d} x={X(i)} y={H - 4} className={s.axis} textAnchor="middle">
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
          {days.map((x, i) => (
            <rect
              key={x.d}
              x={X(i) - slot / 2}
              y={PAD.t}
              width={slot}
              height={ih}
              fill="transparent"
              onPointerEnter={() => setHov(i)}
              onPointerLeave={() => setHov((c) => (c === i ? null : c))}
            />
          ))}
        </svg>
        {h ? (
          <div className={s.tip} style={{ left: `${(X(hov ?? 0) / W) * 100}%`, top: `${(Y(hv) / H) * 100}%` }}>
            <small>
              {new Date(h.d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </small>
            <b>
              {short(hv)} <span>{label.toLowerCase()}</span>
            </b>
          </div>
        ) : null}
      </div>
    </section>
  );
}

// barres empilées par jour (2 séries de même unité), avec légende
function Stacked({ days, series }: { days: Day[]; series: [string, string, string][] }) {
  const tot = days.map((x) => series.reduce((a, [k]) => a + num(x[k]), 0));
  const max = niceMax(Math.max(1, ...tot));
  return (
    <div className={s.stacked}>
      <ul className={s.legend}>
        {series.map(([k, l, c]) => (
          <li key={k}>
            <i style={{ background: c }} /> {l}
          </li>
        ))}
      </ul>
      <div className={s.cols}>
        {days.map((x, i) => (
          <div
            key={x.d}
            className={s.col}
            title={`${dShort(x.d)} · ${series.map(([k, l]) => `${l} ${num(x[k])}`).join(' · ')}`}
            style={{ '--i': i } as CSSProperties}
          >
            {series.map(([k, , c]) => (
              <i key={k} style={{ height: `${(num(x[k]) / max) * 100}%`, background: c }} />
            ))}
          </div>
        ))}
      </div>
      <div className={s.colAxis}>
        <small>{days[0] ? dShort(days[0].d) : ''}</small>
        <small>{days.at(-1) ? dShort(days.at(-1)?.d ?? '') : ''}</small>
      </div>
    </div>
  );
}

function Bars({ days, k }: { days: Day[]; k: string }) {
  const max = Math.max(1, ...days.map((x) => num(x[k])));
  return (
    <div className={s.stacked}>
      <div className={s.cols}>
        {days.map((x, i) => (
          <div
            key={x.d}
            className={s.col}
            title={`${dShort(x.d)} : ${num(x[k])}`}
            style={{ '--i': i } as CSSProperties}
          >
            <i style={{ height: `${(num(x[k]) / max) * 100}%`, background: '#5b8cff' }} />
          </div>
        ))}
      </div>
      <div className={s.colAxis}>
        <small>{days[0] ? dShort(days[0].d) : ''}</small>
        <small>{days.at(-1) ? dShort(days.at(-1)?.d ?? '') : ''}</small>
      </div>
    </div>
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
          <span title={l}>{l}</span>
          <div>
            <i style={{ width: `${(n / max) * 100}%`, '--i': i } as CSSProperties} />
          </div>
          <b>
            {short(n)} <small>{Math.round((n / tot) * 100)} %</small>
          </b>
        </li>
      ))}
    </ul>
  );
}

function Segments({ parts }: { parts: [string, number, string][] }) {
  const tot = parts.reduce((a, p) => a + p[1], 0) || 1;
  return (
    <div className={s.vars}>
      <div className={s.stack}>
        {parts.map(([l, n, c]) =>
          n ? <i key={l} style={{ flexGrow: n, background: c }} title={`${l} : ${n}`} /> : null,
        )}
      </div>
      <ul>
        {parts.map(([l, n, c]) => (
          <li key={l}>
            <i style={{ background: c }} />
            {l}
            <b>{fmt(n)}</b>
            <small>{Math.round((n / tot) * 100)} %</small>
          </li>
        ))}
      </ul>
    </div>
  );
}

// écart à la théorie : ×1 = normal ; la barre part du milieu, à droite si plus que prévu
function Ratio({ r }: { r: number }) {
  const lg = Math.max(-1, Math.min(1, Math.log10(Math.max(r, 0.01)) / 1.5));
  const bad = r > 2 || r < 0.5;
  return (
    <span className={s.ratio}>
      <span className={s.rTrack}>
        <i
          className={bad ? s.rBad : ''}
          style={lg >= 0 ? { left: '50%', width: `${lg * 50}%` } : { right: '50%', width: `${-lg * 50}%` }}
        />
      </span>
      <b className={bad ? s.rBadTxt : ''}>×{r >= 10 ? Math.round(r) : r.toFixed(2)}</b>
    </span>
  );
}

function Pulls({ list, empty }: { list: Pull[]; empty?: string }) {
  if (!list.length) return <p className="muted">{empty ?? 'Rien.'}</p>;
  return (
    <ol className={s.pulls}>
      {list.map((p, i) => (
        <li key={i} style={{ '--i': i } as CSSProperties}>
          <img className={vImg(p.variant)} src={texOf(jetonOf(p.jeton, p.serie))} alt="" />
          <span className={s.pName}>
            <b>
              {p.jeton} <VTag v={p.variant} />
            </b>
            <small>
              <Link to={prof(p.pseudo)}>{p.pseudo}</Link> · {ago(p.at)}
            </small>
          </span>
          <b className={s.odds}>1/{short(p.eff)}</b>
        </li>
      ))}
    </ol>
  );
}

function People({ rows, noLink, flag }: { rows: [Who, string, string?][]; noLink?: boolean; flag?: boolean }) {
  if (!rows.length) return <p className="muted">Personne.</p>;
  return (
    <ol className={s.people}>
      {rows.map(([p, v, sub], i) => (
        <li key={p.pseudo + i} className={flag && !p.is_admin && !p.tester ? s.flag : ''}>
          <span className={s.rank}>{i + 1}</span>
          {noLink ? (
            <span className={s.who}>
              <code>{p.pseudo}</code>
            </span>
          ) : (
            <Link to={prof(p.pseudo)} className={s.who}>
              <Avatar pseudo={p.pseudo} avatar={p.avatar} size={26} />
              {p.pseudo}
            </Link>
          )}
          <b>
            {v}
            {sub ? <small>{sub}</small> : null}
          </b>
        </li>
      ))}
    </ol>
  );
}

function Faces({ list }: { list: Who[] }) {
  if (!list.length) return <p className="muted">Personne en ce moment.</p>;
  return (
    <div className={s.online}>
      {list.map((p) => (
        <Link key={p.pseudo} to={prof(p.pseudo)} title={p.pseudo}>
          <Avatar pseudo={p.pseudo} avatar={p.avatar} size={38} />
          <small>{p.pseudo}</small>
        </Link>
      ))}
    </div>
  );
}
