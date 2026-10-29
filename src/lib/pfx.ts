import { reducedFx } from '@/lib/settings';

// Petit éclat de carrés pixel (dessinés par le code) autour d'un élément : récompense, révélation…
// (les particules en images ont été retirées : pas assez propres)
export function burstAt(el: Element | null, color = '#ffffff', power = 1) {
  if (!el || reducedFx() || typeof document === 'undefined') return;
  const r = el.getBoundingClientRect(),
    x = r.left + r.width / 2,
    y = r.top + r.height / 2,
    reach = Math.max(r.width, r.height) * 0.6 * power + 20,
    n = Math.round(10 + 6 * power);
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i'),
      a = (i / n) * Math.PI * 2 + Math.random() * 0.4,
      d = reach * (0.6 + Math.random() * 0.6),
      s = Math.random() < 0.3 ? 6 : 4;
    p.style.cssText = `position:fixed;pointer-events:none;z-index:120;left:${x - s / 2}px;top:${y - s / 2}px;width:${s}px;height:${s}px;background:${i % 3 ? color : '#fff'}`;
    document.body.appendChild(p);
    p.animate(
      [
        { transform: 'translate(0,0)', opacity: 1 },
        { transform: `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d}px)`, opacity: 0 },
      ],
      { duration: 420 + Math.random() * 200, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'forwards' },
    ).finished.then(
      () => p.remove(),
      () => p.remove(),
    );
  }
}
