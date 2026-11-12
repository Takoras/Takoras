import { lazy, Suspense } from 'react';
import { useMe } from '@/api/queries';
import NotFound from '@/pages/NotFound';

// Le panel admin est un fichier à part : il n'est téléchargé QUE pour un compte admin ou modo
// (le contrôle se fait ici, avant même de demander le fichier). Le serveur revérifie chaque action.
const Admin = lazy(() => import('./Admin'));

export default function AdminGate() {
  const me = useMe();
  if (me.isPending)
    return (
      <p className="muted" aria-busy>
        …
      </p>
    );
  if (!me.data?.admin && !me.data?.mod) return <NotFound />;
  return (
    <Suspense
      fallback={
        <p className="muted" aria-busy>
          …
        </p>
      }
    >
      <Admin />
    </Suspense>
  );
}
