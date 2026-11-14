import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { reducedFx } from '@/lib/settings';
import s from './Swap.module.css';

// Changement de contenu sans coupure, réutilisable partout (onglets, séries, grilles…) : quand `k` change, l'ancien
// contenu s'efface pendant que le nouveau arrive (fondu croisé + petit glissement), et la hauteur du bloc passe de
// l'ancienne à la nouvelle en douceur (plus de saut de page). `k` vide/null = rien d'affiché (le bloc se replie).
const MS = 280;
export function Swap({ k, children, className }: { k: string | number | null; children: ReactNode; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [cur, setCur] = useState({ k, node: children });
  const [old, setOld] = useState<{ k: string | number | null; node: ReactNode; n: number } | null>(null);
  // hauteur du bloc avant le changement (tenue à jour par un ResizeObserver, lue après le changement)
  const lastH = useRef<number | null>(null);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      if (!el.getAnimations().length) lastH.current = el.offsetHeight;
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  if (k !== cur.k) {
    setOld({ k: cur.k, node: cur.node, n: (old?.n ?? 0) + 1 });
    setCur({ k, node: children });
  } else if (children !== cur.node) setCur({ k, node: children });
  // la hauteur suit en douceur
  useLayoutEffect(() => {
    const el = box.current,
      h0 = lastH.current;
    if (!el) return;
    const h1 = el.querySelector<HTMLElement>(`.${s.cur}`)?.offsetHeight ?? 0;
    lastH.current = h1;
    if (h0 == null || reducedFx() || Math.abs(h1 - h0) < 2) return;
    el.style.overflow = 'hidden';
    el.animate([{ height: `${h0}px` }, { height: `${h1}px` }], {
      duration: MS + 60,
      easing: 'cubic-bezier(.2,.8,.2,1)',
    }).onfinish = () => el.style.removeProperty('overflow');
  }, [cur.k]);
  // l'ancien contenu part une fois son fondu fini
  useLayoutEffect(() => {
    if (!old) return;
    const id = setTimeout(() => setOld(null), reducedFx() ? 0 : MS);
    return () => clearTimeout(id);
  }, [old]);
  return (
    <div ref={box} className={`${s.swap} ${className ?? ''}`}>
      {old && !reducedFx() ? (
        <div key={`o${old.n}`} className={s.out} aria-hidden inert>
          {old.node}
        </div>
      ) : null}
      {cur.k != null ? (
        <div key={`c${String(cur.k)}`} className={`${s.cur} ${old ? s.in : ''}`}>
          {cur.node}
        </div>
      ) : null}
    </div>
  );
}
