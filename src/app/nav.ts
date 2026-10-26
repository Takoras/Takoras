import type { Key } from '@/i18n';

// Pages du site (ordre du cahier de refonte). `tab` = présente dans la barre d'onglets mobile
// (Accueil, Inventaire, Combat, Boutique ; le reste est dans « Plus »).
export const NAV: { to: string; key: Key; icon: string; tab?: boolean }[] = [
  { to: '/', key: 'ui.nav_home', icon: 'home', tab: true },
  { to: '/inventaire', key: 'ui.nav_inv', icon: 'bag', tab: true },
  { to: '/combat', key: 'ui.nav_combat', icon: 'swords', tab: true },
  { to: '/boutique', key: 'ui.nav_shop', icon: 'shop', tab: true },
  { to: '/passe', key: 'ui.bp_title', icon: 'star' },
  { to: '/classement', key: 'ui.nav_board', icon: 'trophy' },
  { to: '/amis', key: 'ui.nav_friends', icon: 'users' },
];
