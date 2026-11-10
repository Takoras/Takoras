import { useLayoutEffect, type RefObject } from 'react';
import { reducedFx } from '@/lib/settings';

// Apparition des blocs d'une page, l'un après l'autre (comme les jetons de l'inventaire).
// Tant que `ready` est faux (données pas encore arrivées), la page reste invisible : rien ne s'affiche à moitié
// pour ensuite sauter en place. Dès qu'elle est prête, chaque bloc arrive vite, avec un petit décalage.
// L'animation joue une seule fois par visite de la page (par élément racine).
export function useStaggerIn(root: RefObject<HTMLElement | null>, selector: string, ready: boolean) {
  useLayoutEffect(() => stagger(root.current, selector, ready), [root, selector, ready]);
}

const played = new WeakSet<HTMLElement>();
function stagger(el: HTMLElement | null, selector: string, ready: boolean) {
  if (!el || played.has(el)) return;
  if (!ready) {
    el.style.visibility = 'hidden';
    return;
  }
  played.add(el);
  el.style.visibility = '';
  if (reducedFx() || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const boxes = [...el.querySelectorAll<HTMLElement>(selector)].filter((b) => b.offsetParent !== null);
  boxes.forEach((b, i) =>
    b.animate(
      [
        { opacity: 0, scale: '0.9' },
        { opacity: 1, scale: '1.02', offset: 0.7 },
        { opacity: 1, scale: '1' },
      ],
      { duration: 380, delay: i * 60, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'backwards' },
    ),
  );
}
