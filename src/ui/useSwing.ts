import { useEffect, type RefObject } from 'react';
import { reducedFx } from '@/lib/settings';

// Balancement physique (ressort amorti) : quand le pointeur passe sur l'élément, il prend un élan et se balance
// comme un post-it épinglé en haut, puis se repose. Écrit la variable CSS --swing (en degrés) : à ajouter à la rotation.
// Rien ne tourne en continu : la boucle s'arrête dès que l'élément est immobile.
export function useSwing(ref: RefObject<HTMLElement | null>, strength = 1) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return attachSwing(el, strength);
  }, [ref, strength]);
}

// Même balancement pour chaque élément d'un groupe (boutons, onglets…) qui correspond au sélecteur
// `kick` : élan donné au clic (degrés/s, 0 = rien), pour un balancement franc d'environ une demi-seconde
export function useSwingAll(
  ref: RefObject<HTMLElement | null>,
  selector: string,
  strength = 1,
  key: unknown = 0,
  kick = 0,
) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const offs = [...root.querySelectorAll<HTMLElement>(selector)].map((el) => attachSwing(el, strength, kick));
    return () => offs.forEach((f) => f());
  }, [ref, selector, strength, key, kick]);
}

export function attachSwing(el: HTMLElement, strength = 1, kick = 0) {
  {
    const st = { a: 0, v: 0, raf: 0, last: 0, lastX: 0, lastT: 0 };

    const step = (now: number) => {
      const dt = st.last ? Math.min(0.034, (now - st.last) / 1000) : 1 / 60;
      st.last = now;
      st.v += (-120 * st.a - 7.5 * st.v) * dt;
      st.a += st.v * dt;
      el.style.setProperty('--swing', `${st.a.toFixed(2)}deg`);
      if (Math.abs(st.a) < 0.02 && Math.abs(st.v) < 0.05) {
        st.a = st.v = st.last = st.raf = 0;
        el.style.setProperty('--swing', '0deg');
        return;
      }
      st.raf = requestAnimationFrame(step);
    };
    const push = (amount: number, raw = false) => {
      if (reducedFx() || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      st.v += raw ? amount : Math.max(-90, Math.min(90, amount * strength));
      if (!st.raf) st.raf = requestAnimationFrame(step);
    };
    const onEnter = (e: PointerEvent) => {
      st.lastX = e.clientX;
      st.lastT = performance.now();
      const r = el.getBoundingClientRect();
      push(e.clientX < r.left + r.width / 2 ? 40 : -40);
    };
    const onMove = (e: PointerEvent) => {
      const now = performance.now();
      const vx = (e.clientX - st.lastX) / Math.max(8, now - st.lastT);
      st.lastX = e.clientX;
      st.lastT = now;
      push(vx * 14);
    };
    // clic : un bon coup, du côté opposé à l'endroit touché (comme une pichenette)
    const onDown = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      push(e.clientX < r.left + r.width / 2 ? kick : -kick, true);
    };
    el.addEventListener('pointerenter', onEnter);
    el.addEventListener('pointermove', onMove);
    if (kick) el.addEventListener('pointerdown', onDown);
    return () => {
      el.removeEventListener('pointerenter', onEnter);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerdown', onDown);
      cancelAnimationFrame(st.raf);
    };
  }
}
