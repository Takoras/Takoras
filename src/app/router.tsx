import { createBrowserRouter } from 'react-router';
import { SoonPage } from '@/pages/Soon';
import NotFound from '@/pages/NotFound';
import { Layout } from './Layout';

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <SoonPage k="ui.nav_home" /> },
      { path: '/inventaire', element: <SoonPage k="ui.bestiary" /> },
      { path: '/inventaire/objets', element: <SoonPage k="ui.nav_inv" /> },
      { path: '/boutique', element: <SoonPage k="ui.nav_shop" /> },
      { path: '/classement', element: <SoonPage k="ui.nav_board" /> },
      { path: '/combat', element: <SoonPage k="ui.nav_combat" /> },
      { path: '/amis', element: <SoonPage k="ui.nav_friends" /> },
      { path: '/profil', element: <SoonPage k="app.account" /> },
      { path: '/profil/:pseudo', element: <SoonPage k="app.account" /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
