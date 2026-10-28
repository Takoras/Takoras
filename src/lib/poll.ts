import { useEffect, useEffectEvent } from 'react';

// Appelle `fn` tout de suite puis toutes les `ms`, seulement quand l'onglet est visible (et dès qu'il le redevient).
// Remplace les connexions en direct (Realtime) pour tout ce qui peut attendre une minute : ça économise les connexions.
export function usePoll(fn: () => void | Promise<void>, ms: number, on = true) {
  const run = useEffectEvent(() => void Promise.resolve(fn()).catch(() => undefined));
  useEffect(() => {
    if (!on) return;
    let t = 0;
    const tick = () => {
      if (document.visibilityState === 'visible') run();
    };
    const vis = () => {
      if (document.visibilityState === 'visible') run();
    };
    tick();
    t = window.setInterval(tick, ms);
    document.addEventListener('visibilitychange', vis);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', vis);
    };
  }, [ms, on]);
}
