import { reducedFx } from '@/lib/settings';

// Une fenêtre qui « sort » d'un bouton : elle part de la forme et de la place du bouton (découpe + décalage)
// et s'agrandit jusqu'à sa vraie taille ; `back` fait le chemin inverse avant la fermeture.
export function morph(box: HTMLElement, from: HTMLElement | null, back = false): Promise<void> {
  if (!from || reducedFx()) return Promise.resolve();
  const D = box.getBoundingClientRect();
  const B = from.getBoundingClientRect();
  if (!B.width || !D.width) return Promise.resolve();
  const dx = B.x + B.width / 2 - (D.x + D.width / 2);
  const dy = B.y + B.height / 2 - (D.y + D.height / 2);
  const ix = Math.max(0, (D.width - B.width) / 2);
  const iy = Math.max(0, (D.height - B.height) / 2);
  const r = getComputedStyle(from).borderRadius || '10px';
  const small = {
    transform: `translate(${dx}px, ${dy}px)`,
    clipPath: `inset(${iy}px ${ix}px round ${r})`,
  };
  const big = { transform: 'none', clipPath: `inset(0px 0px round 8px)` };
  const a = box.animate(back ? [big, small] : [small, big], {
    duration: back ? 260 : 420,
    easing: back ? 'cubic-bezier(.5, 0, .75, 0)' : 'cubic-bezier(.2, 1.1, .3, 1)',
  });
  // le contenu apparaît une fois la fenêtre presque ouverte (et disparaît en premier à la fermeture)
  const card = box.firstElementChild;
  for (const el of card ? [...card.children] : [])
    el.animate(
      back ? [{ opacity: 1 }, { opacity: 0 }] : [{ opacity: 0 }, { opacity: 0, offset: 0.3 }, { opacity: 1 }],
      {
        duration: back ? 140 : 420,
        fill: back ? 'forwards' : 'none',
      },
    );
  return a.finished.then(
    () => undefined,
    () => undefined,
  );
}
