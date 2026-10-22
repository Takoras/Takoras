import type { Key } from '@/i18n';

// Pages du site (même ordre que l'ancien menu). `tab` = présente dans la barre d'onglets mobile
// (Accueil, Inventaire, Boutique, Combat ; le reste est dans « Plus »).
export const NAV: { to: string; key: Key; icon: string; tab?: boolean }[] = [
  { to: '/', key: 'ui.nav_home', icon: 'home', tab: true },
  { to: '/inventaire', key: 'ui.nav_inv', icon: 'bag', tab: true },
  { to: '/boutique', key: 'ui.nav_shop', icon: 'shop', tab: true },
  { to: '/classement', key: 'ui.nav_board', icon: 'trophy' },
  { to: '/combat', key: 'ui.nav_combat', icon: 'swords', tab: true },
  { to: '/amis', key: 'ui.nav_friends', icon: 'users' },
];
