import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, useLocation } from 'react-router';
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


// Anciennes adresses en français (liens déjà partagés) → nouvelle adresse en anglais, même suite (/profil/Pseudo → /profile/Pseudo)
const OLD: [string, string][] = [
  ['/inventaire/objets', '/inventory/items'],
  ['/inventaire', '/inventory'],
  ['/bestiaire', '/bestiary'],
  ['/boutique', '/shop'],
  ['/classement', '/leaderboard'],
  ['/amis', '/friends'],
  ['/passe', '/pass'],
  ['/profil', '/profile'],
  ['/confidentialite', '/privacy'],
  ['/mentions-legales', '/legal'],
  ['/cgu', '/terms'],
];
function OldPath({ from, to }: { from: string; to: string }) {
  const { pathname, search, hash } = useLocation();
  return <Navigate replace to={to + pathname.slice(from.length) + search + hash} />;
}

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/inventory', lazy: bestiary },
      { path: '/bestiary', lazy: bestiary },
      { path: '/inventory/items', lazy: page(() => import('@/features/inventory/Items')) },
      { path: '/shop', lazy: page(() => import('@/features/shop/Shop')) },
      { path: '/leaderboard', lazy: page(() => import('@/features/board/Board')) },
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
      { path: '/friends', lazy: page(() => import('@/features/social/Friends')) },
      { path: '/pass', lazy: page(() => import('@/features/pass/Pass')) },
      // Duel : nouveau combat au tour par tour (prototype contre l'IA, pas encore dans le menu)
      { path: '/duel', lazy: page(() => import('@/features/duel/Duel')) },
      { path: '/profile', lazy: profile },
      { path: '/profile/:pseudo', lazy: profile },
      { path: '/privacy', lazy: page(() => import('@/pages/Privacy')) },
      { path: '/legal', lazy: page(() => import('@/pages/Legal')) },
      { path: '/terms', lazy: page(() => import('@/pages/Terms')) },
      { path: '/admin', element: <AdminGate /> },
      ...OLD.flatMap(([from, to]) => [
        { path: from, element: <OldPath from={from} to={to} /> },
        { path: `${from}/*`, element: <OldPath from={from} to={to} /> },
      ]),
      { path: '*', element: <NotFound /> },
    ],
  },
]);
