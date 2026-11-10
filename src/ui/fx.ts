// Effets posés par-dessus la page (calque fixe) : rien n'est coupé par les cases, rien ne pousse la mise en page.

// Onde de choc : un contour arrondi qui part du bord de la case et s'élargit en s'effaçant.
export function shockwave(r: DOMRect, color: string, radius = 16, delay = 0, grow = 28) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  const pad = 2;
  svg.setAttribute('width', String(r.width + pad * 2));
  svg.setAttribute('height', String(r.height + pad * 2));
  Object.assign(svg.style, {
    position: 'fixed',
    left: `${r.left - pad}px`,
    top: `${r.top - pad}px`,
    pointerEvents: 'none',
    zIndex: '60',
    overflow: 'visible',
    opacity: '0',
  });
  const rect = document.createElementNS(ns, 'rect');
  rect.setAttribute('x', String(pad));
  rect.setAttribute('y', String(pad));
  rect.setAttribute('width', String(r.width));
  rect.setAttribute('height', String(r.height));
  rect.setAttribute('rx', String(radius));
  rect.setAttribute('fill', 'none');
  rect.setAttribute('stroke', color);
  rect.setAttribute('stroke-width', '3');
  rect.setAttribute('vector-effect', 'non-scaling-stroke');
  svg.appendChild(rect);
  svg.style.filter = `drop-shadow(0 0 8px ${color})`;
  document.body.appendChild(svg);
  // s'éloigne du bord de « grow » px de chaque côté (même écart en largeur et en hauteur)
  const kx = 1 + (2 * grow) / r.width;
  const ky = 1 + (2 * grow) / r.height;
  svg
    .animate(
      [
        { transform: 'scale(1)', opacity: 1 },
        { transform: `scale(${kx}, ${ky})`, opacity: 0 },
      ],
      { duration: 700, delay, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' },
    )
    .finished.finally(() => svg.remove());
}

// Pièces qui jaillissent de la case et s'envolent vers le solde (en haut à droite), en ralentissant à l'arrivée.
export function flyCoins(from: DOMRect, n: number, onLand: (i: number) => void) {
  flyIcons(from, '/img/piece.png', n, '[data-coin-target]', onLand);
}

// Même vol pour n'importe quelle image (ex. un objet gagné qui file vers l'inventaire)
export function flyIcons(from: DOMRect, src: string, n: number, sel: string, onLand: (i: number) => void, size = 30) {
  const target = [...document.querySelectorAll<HTMLElement>(sel)].find((x) => x.getClientRects().length);
  const t = target?.getBoundingClientRect();
  const ex = t ? t.left + Math.min(22, t.width / 2) : innerWidth - 120;
  const ey = t ? t.top + t.height / 2 : 28;
  const sx = from.left + from.width / 2;
  const sy = from.top + from.height / 2;
  for (let i = 0; i < n; i++) {
    const img = document.createElement('img');
    img.src = src;
    img.alt = '';
    img.width = size;
    img.height = size;
    img.className = 'px';
    Object.assign(img.style, {
      position: 'fixed',
      left: `${sx - size / 2}px`,
      top: `${sy - size / 2}px`,
      width: `${size}px`,
      height: `${size}px`,
      imageRendering: 'pixelated',
      objectFit: 'contain',
      pointerEvents: 'none',
      zIndex: '61',
      opacity: '0',
    });
    document.body.appendChild(img);
    // 1) elle jaillit en éventail (vers le haut), 2) elle part en courbe vers le solde
    const ang = -Math.PI / 2 + (i - (n - 1) / 2) * 0.75 + (Math.random() - 0.5) * 0.3;
    const dist = 60 + Math.random() * 30;
    const bx = Math.cos(ang) * dist;
    const by = Math.sin(ang) * dist;
    const dx = ex - sx;
    const dy = ey - sy;
    // point de contrôle de la courbe : un peu au-delà du jaillissement, pour un bel arc
    const cx = bx * 2.2;
    const cy = by * 2.2 + Math.min(0, dy) * 0.15;
    const frames: Keyframe[] = [];
    const N = 28;
    for (let k = 0; k <= N; k++) {
      const u = k / N;
      const x = (1 - u) ** 2 * bx + 2 * (1 - u) * u * cx + u * u * dx;
      const y = (1 - u) ** 2 * by + 2 * (1 - u) * u * cy + u * u * dy;
      const sc = 1 - 0.35 * u;
      frames.push({ transform: `translate(${x}px, ${y}px) scale(${sc}) rotate(${u * 200 * (i % 2 ? -1 : 1)}deg)` });
    }
    frames[N] = { ...frames[N], opacity: 1 };
    const burst = img.animate(
      [
        { transform: 'translate(0, 0) scale(.3)', opacity: 0 },
        { transform: `translate(${bx}px, ${by}px) scale(1)`, opacity: 1 },
      ],
      { duration: 380, delay: i * 70, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' },
    );
    void burst.finished
      .then(
        () =>
          img.animate(frames, {
            duration: 760,
            delay: 40 + i * 60,
            // départ franc, arrivée tout en douceur dans le compteur
            easing: 'cubic-bezier(.5,0,.15,1)',
            fill: 'both',
          }).finished,
      )
      .then(() => {
        onLand(i);
        if (target)
          target.animate([{ scale: '1' }, { scale: '1.14' }, { scale: '1' }], { duration: 280, easing: 'ease-out' });
        return img.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, fill: 'forwards' }).finished;
      })
      .catch(() => onLand(i))
      .finally(() => img.remove());
  }
}
