import { useEffect } from 'react';

// Monte un moteur porté (canvas, overlay plein écran) quand le composant apparaît et l'arrête quand il disparaît
// (changement de page, fermeture) : plus de boucle d'animation, d'écouteur ni de son qui traîne.
export function useEngine(start: () => (() => void) | undefined, stop?: () => void, deps: unknown[] = []) {
  useEffect(() => {
    const cleanup = start();
    return () => {
      if (typeof cleanup === 'function') cleanup();
      stop?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps fournis par l'appelant
  }, deps);
}
