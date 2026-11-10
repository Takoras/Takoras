import { useLayoutEffect, type RefObject } from 'react';
import { reducedFx } from '@/lib/settings';
import { snapMouseDepth } from '@/lib/mouseDepth';

// Apparition d'une page, la même partout (accueil, inventaire, combat) : un fondu, bloc après bloc,
// comme les jetons de l'inventaire.
// La page reste invisible (et ses animations en pause) tant que :
//  - ses données ne sont pas là (`ready`),
//  - ses images et ses polices ne sont pas chargées (sinon elles arrivent après et décalent tout d'un coup).
// L'animation joue une seule fois par visite (par élément racine).
export function useStaggerIn(root: RefObject<HTMLElement | null>, selector: string, ready: boolean) {
  useLayoutEffect(() => stagger(root.current, selector, ready), [root, selector, ready]);
}

// un simple fondu (même apparition que les jetons de l'inventaire, @keyframes cardIn) : rien ne bouge ni ne penche
export const SPAWN: Keyframe[] = [{ opacity: 0 }, { opacity: 1 }];
export const SPAWN_MS = 450;
export const SPAWN_STEP = 35;

const played = new WeakSet<HTMLElement>();
const waiting = new WeakSet<HTMLElement>();
const loaded = (img: HTMLImageElement) =>
  img.complete
    ? Promise.resolve()
    : new Promise<void>((r) => {
        img.addEventListener('load', () => r(), { once: true });
        img.addEventListener('error', () => r(), { once: true });
      });

function stagger(el: HTMLElement | null, selector: string, ready: boolean) {
  if (!el || played.has(el)) return;
  el.classList.add('stg-wait');
  if (!ready || waiting.has(el)) return;
  waiting.add(el);
  const imgs = [...el.querySelectorAll<HTMLImageElement>('img')];
  const fonts = (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready ?? Promise.resolve();
  void Promise.race([Promise.all([...imgs.map(loaded), fonts]), new Promise((r) => setTimeout(r, 900))]).then(() => {
    played.add(el);
    snapMouseDepth(); // les blocs sont tout de suite à leur place (pas de glissade après le fondu)
    el.classList.remove('stg-wait');
    if (reducedFx() || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    [...el.querySelectorAll<HTMLElement>(selector)]
      .filter((b) => b.offsetParent !== null)
      .forEach((b, i) => b.animate(SPAWN, { duration: SPAWN_MS, delay: i * SPAWN_STEP * 2, easing: 'ease-out', fill: 'backwards' }));
  });
}
