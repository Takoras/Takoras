import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router';
import Home from '@/features/home/Home';
import AdminGate from '@/features/admin/AdminGate';
import NotFound from '@/pages/NotFound';
import { Layout } from './Layout';

// Pages chargées à la demande (seul l'accueil est dans le premier téléchargement)
const page = (load: () => Promise<{ default: React.ComponentType }>) => async () => ({
  Component: (await load()).default,
});
const bestiary = page(() => import('@/features/inventory/Bestiary'));
const profile = page(() => import('@/features/profile/Profile'));

// Combat : chargé seulement quand on ouvre la page (le Ring, lui, au lancement d'une partie)
const Combat = lazy(() => import('@/features/combat/Combat'));

// Labo des moteurs : seulement en développement (absent du site en ligne)
const Lab = import.meta.env.DEV ? lazy(() => import('@/pages/Lab')) : null;

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/inventaire', lazy: bestiary },
      { path: '/bestiaire', lazy: bestiary },
      { path: '/inventaire/objets', lazy: page(() => import('@/features/inventory/Items')) },
      { path: '/boutique', lazy: page(() => import('@/features/shop/Shop')) },
      { path: '/classement', lazy: page(() => import('@/features/board/Board')) },
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
      { path: '/amis', lazy: page(() => import('@/features/social/Friends')) },
      { path: '/passe', lazy: page(() => import('@/features/pass/Pass')) },
      { path: '/profil', lazy: profile },
      { path: '/profil/:pseudo', lazy: profile },
      { path: '/admin', element: <AdminGate /> },
      ...(Lab ? [{ path: '/__lab', element: <Lab /> }] : []),
      { path: '*', element: <NotFound /> },
    ],
  },
]);
