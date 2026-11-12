import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/api';
import { Dashboard } from './Dashboard';
import { Players } from './Players';
import { Global } from './Global';
import { ShopAdmin } from './ShopAdmin';
import { Announce } from './Announce';
import { Codes } from './Codes';
import { FeedbackAdmin } from './FeedbackAdmin';
import { ReportsAdmin } from './ReportsAdmin';
import { PatchnotesAdmin } from './PatchnotesAdmin';
import { Tests } from './Tests';
import { setPreview } from '@/lib/preview';
import { useMe } from '@/api/queries';
import { Icon } from '@/app/Icon';
import s from './Admin.module.css';

// Panel admin : une colonne de rubriques rangées par thème (tableau de bord d'abord), le contenu à droite.
// Réservé aux admins, en français (outil interne). L'onglet ouvert est retenu d'une visite à l'autre.
const GROUPS = [
  ['Vue d’ensemble', [['dash', 'trophy', 'Tableau de bord']]],
  [
    'Joueurs',
    [
      ['players', 'users', 'Joueurs'],
      ['rep', 'shield', 'Signalements'],
      ['fb', 'bulb', 'Retours'],
    ],
  ],
  [
    'Économie',
    [
      ['shop', 'shop', 'Boutique'],
      ['codes', 'star', 'Codes promo'],
    ],
  ],
  [
    'Communication',
    [
      ['ann', 'bell', 'Annonces'],
      ['pn', 'scroll', 'Patch notes'],
    ],
  ],
  [
    'Outils',
    [
      ['global', 'gear', 'Global'],
      ['tests', 'flask', 'Tests'],
    ],
  ],
] as const;
type Tab = (typeof GROUPS)[number][1][number][0];
type Item = readonly [Tab, string, string];
const ITEMS: Item[] = GROUPS.flatMap(([, l]) => [...l] as Item[]);
const ALL = ITEMS.map(([k]) => k);
const KEY = 'tk-admin-tab';
const saved = (): Tab => {
  try {
    const v = localStorage.getItem(KEY) as Tab | null;
    return v && ALL.includes(v) ? v : 'dash';
  } catch {
    return 'dash';
  }
};

export default function Admin() {
  // le modo ne voit que le tableau de bord et les signalements (le serveur refuse le reste de toute façon)
  const me = useMe();
  const isAdmin = !!me.data?.admin;
  const allowed = (k: Tab) => isAdmin || k === 'dash' || k === 'rep';
  const [tab0, setTabState] = useState<Tab>(saved);
  const tab: Tab = allowed(tab0) ? tab0 : 'dash';
  const setTab = (t: Tab) => {
    setTabState(t);
    try {
      localStorage.setItem(KEY, t);
    } catch {
      /* stockage bloqué : tant pis */
    }
  };
  // pastilles « à traiter » (retours, signalements), prises dans le tableau de bord
  const dash = useQuery({
    queryKey: ['admin', 'dash', 30],
    queryFn: async () => (await adminApi.dashboard(30)) as unknown as { kpi: Record<string, number> },
    refetchInterval: 60_000,
  });
  const badge: Partial<Record<Tab, number>> = { fb: dash.data?.kpi.fb_open, rep: dash.data?.kpi.reports_open };
  const title = ITEMS.find(([k]) => k === tab);
  return (
    <section className={s.page}>
      <nav className={s.side} aria-label="Rubriques admin">
        <div className={s.brand}>
          <b>{isAdmin ? 'Admin' : 'Modération'}</b>
          <small>Takoras</small>
        </div>
        {GROUPS.map(([g, list]) => {
          const mine = (list as readonly Item[]).filter(([k]) => allowed(k));
          return mine.length ? (
            <div key={g} className={s.group}>
              <small>{g}</small>
              {mine.map(([k, ic, l]) => (
                <button key={k} type="button" aria-current={tab === k ? 'page' : undefined} onClick={() => setTab(k)}>
                  <Icon name={ic} size={20} />
                  {l}
                  {badge[k] ? <i className={s.badge}>{badge[k]}</i> : null}
                </button>
              ))}
            </div>
          ) : null;
        })}
        {isAdmin ? (
          <button type="button" className={s.asPlayer} onClick={() => setPreview(true)}>
            Voir comme un joueur
          </button>
        ) : null}
      </nav>
      <div className={s.main}>
        <header className={s.head}>
          <h1>{title?.[2]}</h1>
        </header>
        <div key={tab} className={s.panel}>
          {tab === 'dash' ? <Dashboard /> : null}
          {tab === 'players' ? <Players /> : null}
          {tab === 'global' ? <Global /> : null}
          {tab === 'shop' ? <ShopAdmin /> : null}
          {tab === 'ann' ? <Announce /> : null}
          {tab === 'codes' ? <Codes /> : null}
          {tab === 'fb' ? <FeedbackAdmin /> : null}
          {tab === 'rep' ? <ReportsAdmin /> : null}
          {tab === 'pn' ? <PatchnotesAdmin /> : null}
          {tab === 'tests' ? <Tests /> : null}
        </div>
      </div>
    </section>
  );
}
