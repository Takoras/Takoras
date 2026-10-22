import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router';
import Home from '@/features/home/Home';
import Shop from '@/features/shop/Shop';
import Bestiary from '@/features/inventory/Bestiary';
import Items from '@/features/inventory/Items';
import Profile from '@/features/profile/Profile';
import Friends from '@/features/social/Friends';
import Board from '@/features/board/Board';
import AdminGate from '@/features/admin/AdminGate';
import NotFound from '@/pages/NotFound';
import { Layout } from './Layout';

// Combat : chargé seulement quand on ouvre la page (le Ring, lui, au lancement d'une partie)
const Combat = lazy(() => import('@/features/combat/Combat'));

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
      { path: '/classement', element: <Board /> },
      {
        path: '/combat',
        element: (
          <Suspense
            fallback={
              <p className="muted" aria-busy>
                …
              </p>
            }
          >
            <Combat />
          </Suspense>
        ),
      },
      { path: '/amis', element: <Friends /> },
      { path: '/profil', element: <Profile /> },
      { path: '/profil/:pseudo', element: <Profile /> },
      { path: '/admin', element: <AdminGate /> },
      ...(Lab ? [{ path: '/__lab', element: <Lab /> }] : []),
      { path: '*', element: <NotFound /> },
    ],
  },
]);
