import type { Key } from '@/i18n';

// Pages du site (même ordre que l'ancien menu). `tab` = présente dans la barre d'onglets mobile.
export const NAV: { to: string; key: Key; icon: string; tab?: boolean }[] = [
  { to: '/', key: 'ui.nav_home', icon: 'home', tab: true },
  { to: '/inventaire', key: 'ui.nav_inv', icon: 'bag', tab: true },
  { to: '/boutique', key: 'ui.nav_shop', icon: 'shop', tab: true },
  { to: '/classement', key: 'ui.nav_board', icon: 'trophy' },
  { to: '/combat', key: 'ui.nav_combat', icon: 'swords' },
  { to: '/amis', key: 'ui.nav_friends', icon: 'users', tab: true },
];
