import { useState } from 'react';
import { Players } from './Players';
import { Global } from './Global';
import { ShopAdmin } from './ShopAdmin';
import { Announce } from './Announce';
import { Codes } from './Codes';
import { FeedbackAdmin } from './FeedbackAdmin';
import { PatchnotesAdmin } from './PatchnotesAdmin';
import { Tests } from './Tests';
import s from './Admin.module.css';

// Panel admin : 8 onglets (comme l'ancien site). Réservé aux admins, en français (outil interne).
const TABS = [
  ['players', '👥 Joueurs'],
  ['global', '🌍 Global'],
  ['shop', '🛒 Boutique'],
  ['ann', '📢 Annonces'],
  ['codes', '🎟️ Codes promo'],
  ['fb', '💡 Retours'],
  ['pn', '📜 Patch notes'],
  ['tests', '🧪 Tests'],
] as const;
type Tab = (typeof TABS)[number][0];

export default function Admin() {
  const [tab, setTab] = useState<Tab>('players');
  return (
    <section className={s.page}>
      <header className={s.head}>
        <p className="eyebrow">Admin</p>
        <h1>Panel admin</h1>
      </header>
      <div className={s.tabs} role="tablist" aria-label="Onglets admin">
        {TABS.map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>
            {l}
          </button>
        ))}
      </div>
      <div role="tabpanel">
        {tab === 'players' ? <Players /> : null}
        {tab === 'global' ? <Global /> : null}
        {tab === 'shop' ? <ShopAdmin /> : null}
        {tab === 'ann' ? <Announce /> : null}
        {tab === 'codes' ? <Codes /> : null}
        {tab === 'fb' ? <FeedbackAdmin /> : null}
        {tab === 'pn' ? <PatchnotesAdmin /> : null}
        {tab === 'tests' ? <Tests /> : null}
      </div>
    </section>
  );
}
