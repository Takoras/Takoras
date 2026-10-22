import { lazy, Suspense } from 'react';
import { useInfo } from './store';

const InfoModal = lazy(() => import('./InfoModal'));

// « Probas & infos » : la fenêtre n'est téléchargée qu'à la première ouverture
export function InfoGate() {
  const open = useInfo((x) => x.open);
  if (!open) return null;
  return (
    <Suspense fallback={null}>
      <InfoModal />
    </Suspense>
  );
}
