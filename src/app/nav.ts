import type { Key } from '@/i18n';

// Pages du site. `tab` = présente dans la barre d'onglets du téléphone tenu debout
// (Accueil, Inventaire, Boutique, Passe ; le reste est dans « Plus »).
// short : nom court dans la barre du bas du téléphone
export const NAV: { to: string; key: Key; icon: string; tab?: boolean; short?: Key }[] = [
  { to: '/', key: 'ui.nav_home', icon: 'home', tab: true },
  { to: '/inventory', key: 'ui.nav_inv', icon: 'bag', tab: true },
  { to: '/shop', key: 'ui.nav_shop', icon: 'shop', tab: true },
  { to: '/pass', key: 'ui.bp_title', icon: 'star', tab: true, short: 'ui.tab_pass' },
  { to: '/market', key: 'ui.nav_bourse', icon: 'chart' },
  { to: '/achievements', key: 'ui.nav_ach', icon: 'trophy' },
  { to: '/friends', key: 'ui.nav_friends', icon: 'users' },
];
