// Point d'entrée. En développement seulement, « ?demo » dans l'adresse branche un faux Supabase
// (le même que les tests) : on voit tout le site connecté avec un compte test, sans toucher à la vraie base.
// En production cette branche est retirée du code au build (import.meta.env.DEV vaut false).
const start = async () => {
  if (import.meta.env.DEV && new URLSearchParams(location.search).has('demo')) {
    const { installDemo } = await import('./dev/demo');
    await installDemo();
  }
  await import('./boot');
};
void start();
