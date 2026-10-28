import { reducedFx } from '@/lib/settings';

// Particules pixel art dessinées à la main (public/img/fx/burst-N.png = bandes d'images) :
// 1 étoile qui éclate · 2 éclats · 3 cercle de points · 4 onde. Elles sont blanches : on les colore avec `color`.
const FRAMES: Record<number, number> = { 1: 6, 2: 6, 3: 5, 4: 6 };

export function pixelBurst(
  x: number,
  y: number,
  {
    kind = 1,
    size = 120,
    color = '#ffffff',
    ms = 420,
    rotate = 0,
  }: { kind?: 1 | 2 | 3 | 4; size?: number; color?: string; ms?: number; rotate?: number } = {},
) {
  if (reducedFx() || typeof document === 'undefined') return;
  const n = FRAMES[kind] ?? 6,
    el = document.createElement('i');
  const src = `url(/img/fx/burst-${kind}.png)`;
  el.style.cssText = [
    'position:fixed;pointer-events:none;z-index:120',
    `left:${x - size / 2}px;top:${y - size / 2}px;width:${size}px;height:${size}px`,
    `background:${color};image-rendering:pixelated`,
    `-webkit-mask-image:${src};mask-image:${src}`,
    `-webkit-mask-size:${n * 100}% 100%;mask-size:${n * 100}% 100%`,
    `-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat`,
    `rotate:${rotate}deg`,
  ].join(';');
  document.body.appendChild(el);
  // une image après l'autre (steps), comme le GIF d'origine
  el.animate(
    [
      { maskPosition: '0% 0', WebkitMaskPosition: '0% 0' },
      { maskPosition: '100% 0', WebkitMaskPosition: '100% 0' },
    ] as Keyframe[],
    { duration: ms, easing: `steps(${n - 1}, jump-none)`, fill: 'forwards' },
  ).finished.then(
    () => el.remove(),
    () => el.remove(),
  );
}

// Plusieurs particules d'un coup autour d'un élément (récompense, révélation…)
export function burstAt(el: Element | null, color = '#ffffff', power = 1) {
  if (!el) return;
  const r = el.getBoundingClientRect(),
    x = r.left + r.width / 2,
    y = r.top + r.height / 2,
    s = Math.max(r.width, r.height);
  pixelBurst(x, y, { kind: 4, size: s * 1.6 * power, color, ms: 380 });
  pixelBurst(x, y, { kind: 1, size: s * 1.2 * power, color: '#ffffff', ms: 420 });
  setTimeout(
    () => pixelBurst(x, y, { kind: 2, size: s * 1.4 * power, color, ms: 420, rotate: Math.random() * 90 }),
    90,
  );
}
