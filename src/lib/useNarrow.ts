import { useSyncExternalStore } from 'react';

// Téléphone tenu debout (mise en page dédiée, < 760 px) : pour retirer ce qui est lourd ou inutile sur un petit écran
const Q = '(max-width: 760px)';
const sub = (cb: () => void) => {
  const m = matchMedia(Q);
  m.addEventListener('change', cb);
  return () => m.removeEventListener('change', cb);
};
export const isNarrow = () => typeof matchMedia === 'function' && matchMedia(Q).matches;
export const useNarrow = () => useSyncExternalStore(sub, isNarrow, () => false);
