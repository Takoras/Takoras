import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import s from './Landing.module.css';

// Une vignette collée dans l'album : elle a du poids. Quand le doigt ou la souris passe dessus,
// elle se décolle un peu et se balance sur un ressort, puis revient se poser (pas de saut, pas de boucle infinie).
export function Sticker({
  tilt,
  big,
  label,
  children,
}: {
  tilt: number;
  big?: boolean;
  label: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const sim = useRef({ a: 0, v: 0, raf: 0, last: 0, lastX: 0, lastT: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const st = sim.current;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

    const step = (now: number) => {
      const dt = st.last ? Math.min(0.034, (now - st.last) / 1000) : 1 / 60;
      st.last = now;
      // ressort amorti : raideur 120, amortissement ~0,35 (quelques balancements puis arrêt)
      st.v += (-120 * st.a - 7.5 * st.v) * dt;
      st.a += st.v * dt;
      el.style.setProperty('--swing', `${st.a.toFixed(2)}deg`);
      if (Math.abs(st.a) < 0.02 && Math.abs(st.v) < 0.05) {
        st.a = 0;
        st.v = 0;
        st.raf = 0;
        st.last = 0;
        el.style.setProperty('--swing', '0deg');
        return;
      }
      st.raf = requestAnimationFrame(step);
    };
    const push = (amount: number) => {
      if (reduced) return;
      st.v += Math.max(-90, Math.min(90, amount));
      if (!st.raf) st.raf = requestAnimationFrame(step);
    };
    const onEnter = (e: PointerEvent) => {
      st.lastX = e.clientX;
      st.lastT = performance.now();
      push(e.clientX < el.getBoundingClientRect().left + el.offsetWidth / 2 ? 40 : -40);
    };
    const onMove = (e: PointerEvent) => {
      const now = performance.now();
      const vx = (e.clientX - st.lastX) / Math.max(8, now - st.lastT);
      st.lastX = e.clientX;
      st.lastT = now;
      push(vx * 14);
    };
    el.addEventListener('pointerenter', onEnter);
    el.addEventListener('pointermove', onMove);
    return () => {
      el.removeEventListener('pointerenter', onEnter);
      el.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(st.raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`${s.sticker} ${big ? s.big : ''}`}
      style={{ '--tilt': `${tilt}deg` } as CSSProperties}
      role="img"
      aria-label={label}
    >
      {children}
    </div>
  );
}
