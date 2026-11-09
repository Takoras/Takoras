// Point d'entrée. En développement seulement, « ?demo » dans l'adresse branche un faux Supabase
// (le même que les tests) : on voit tout le site connecté avec un compte test, sans toucher à la vraie base.
// En production cette branche est retirée du code au build (import.meta.env.DEV vaut false).
import { isStaleChunk, reloadOnce } from './lib/staleReload';

// ancien morceau de code introuvable (le site a été mis à jour pendant que l'onglet était ouvert) : on recharge
addEventListener('vite:preloadError', (e) => {
  if (reloadOnce()) e.preventDefault();
});

const start = async () => {
  if (import.meta.env.DEV && new URLSearchParams(location.search).has('demo')) {
    const { installDemo } = await import('./dev/demo');
    await installDemo();
  }
  await import('./boot');
};
start().catch((e: unknown) => {
  if (!isStaleChunk(e) || !reloadOnce()) throw e;
});
