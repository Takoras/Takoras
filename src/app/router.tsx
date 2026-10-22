import { lazy } from 'react';
import { createBrowserRouter } from 'react-router';
import { SoonPage } from '@/pages/Soon';
import Home from '@/features/home/Home';
import Shop from '@/features/shop/Shop';
import Bestiary from '@/features/inventory/Bestiary';
import Items from '@/features/inventory/Items';
import NotFound from '@/pages/NotFound';
import { Layout } from './Layout';

// Labo des moteurs : seulement en développement (absent du site en ligne)
const Lab = import.meta.env.DEV ? lazy(() => import('@/pages/Lab')) : null;

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/inventaire', element: <Bestiary /> },
      { path: '/bestiaire', element: <Bestiary /> },
      { path: '/inventaire/objets', element: <Items /> },
      { path: '/boutique', element: <Shop /> },
      { path: '/classement', element: <SoonPage k="ui.nav_board" /> },
      { path: '/combat', element: <SoonPage k="ui.nav_combat" /> },
      { path: '/amis', element: <SoonPage k="ui.nav_friends" /> },
      { path: '/profil', element: <SoonPage k="app.account" /> },
      { path: '/profil/:pseudo', element: <SoonPage k="app.account" /> },
      ...(Lab ? [{ path: '/__lab', element: <Lab /> }] : []),
      { path: '*', element: <NotFound /> },
    ],
  },
]);
