import { useLayoutEffect, type RefObject } from 'react';
import { reducedFx } from '@/lib/settings';

// Apparition d'une page, la même partout (accueil, inventaire, combat) : exactement le mouvement des jetons de
// l'inventaire (ils montent un peu, penchent, se redressent), bloc après bloc.
// La page reste invisible (et ses animations en pause) tant que :
//  - ses données ne sont pas là (`ready`),
//  - ses images et ses polices ne sont pas chargées (sinon elles arrivent après et décalent tout d'un coup).
// L'animation joue une seule fois par visite (par élément racine).
export function useStaggerIn(root: RefObject<HTMLElement | null>, selector: string, ready: boolean) {
  useLayoutEffect(() => stagger(root.current, selector, ready), [root, selector, ready]);
}

// même mouvement que @keyframes cardIn (Inventory.module.css), en « transform » pour ne pas gêner
// les propriétés translate / rotate que les blocs utilisent déjà (souris, balancement)
export const SPAWN: Keyframe[] = [
  { opacity: 0, transform: 'translateY(14px) rotate(-7deg)' },
  { opacity: 1, transform: 'translateY(0) rotate(4deg)', offset: 0.4 },
  { transform: 'rotate(-1.5deg)', offset: 0.7 },
  { transform: 'none' },
];
export const SPAWN_MS = 750;
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
    el.classList.remove('stg-wait');
    if (reducedFx() || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    [...el.querySelectorAll<HTMLElement>(selector)]
      .filter((b) => b.offsetParent !== null)
      .forEach((b, i) => b.animate(SPAWN, { duration: SPAWN_MS, delay: i * SPAWN_STEP * 2, easing: 'ease-out', fill: 'backwards' }));
  });
}
