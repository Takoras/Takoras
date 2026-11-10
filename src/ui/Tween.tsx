import { useEffect, useRef, useState } from 'react';
import { reducedFx } from '@/lib/settings';

// Un nombre qui monte ou descend en douceur jusqu'à sa nouvelle valeur (comme un compteur), au lieu de sauter
// `pow` : plus il est grand, plus ça part vite et plus la fin ralentit (3 = doux, 5 = très marqué)
export function Tween({
  value,
  format,
  ms = 450,
  pow = 3,
}: {
  value: number;
  format: (n: number) => string;
  ms?: number;
  pow?: number;
}) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const a = from.current;
    if (a === value || reducedFx()) {
      from.current = value;
      setShown(value);
      return;
    }
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / ms),
        e = 1 - (1 - k) ** pow; // démarre vite, finit doucement
      const v = a + (value - a) * e;
      from.current = v;
      setShown(v);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, ms, pow]);
  return <>{format(shown)}</>;
}
