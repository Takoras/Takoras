// Généré par scripts/port/canvas.mjs depuis legacy/motion.js — ne pas modifier ici, modifier legacy/ puis relancer.
import { reducedFx } from './env';
import './motion.css';

// Animations fluides des listes (inventaire, vitrine, deck, boutique, objets) :
// - les cartes qui restent glissent jusqu'à leur nouvelle place (technique « FLIP »)
// - les nouvelles apparaissent en douceur
// - celles qui partent (vendues, retirées) se dissolvent en pixels : chaque pixel du dessin s'envole avec sa vraie couleur
// Usage : const s = moSnap(boite, '.carte') ; …on redessine… ; moPlay(s, boite, '.carte', { dissolve: true })
// Chaque carte a un data-key (qui elle est) et un data-sig (son contenu : quantité, verrou…) pour savoir ce qui a changé.

const MO = { parts: [], raf: 0, last: 0, cv: null };
function moCtx() {
  if (!MO.cv) { MO.cv = document.createElement('canvas'); MO.cv.className = 'mo-fx'; document.body.appendChild(MO.cv); }
  const c = MO.cv, d = devicePixelRatio || 1;
  if (c.width !== innerWidth * d || c.height !== innerHeight * d) { c.width = innerWidth * d; c.height = innerHeight * d; }
  const x = c.getContext('2d'); x.setTransform(d, 0, 0, d, 0, 0); x.imageSmoothingEnabled = false;
  return x;
}
function moLoop(now) {
  const dt = Math.min(50, now - (MO.last || now)); MO.last = now;
  const x = moCtx(), k = dt / 16;
  x.clearRect(0, 0, innerWidth, innerHeight);
  MO.parts = MO.parts.filter(p => {
    if (p.delay > 0) { p.delay -= dt; x.globalAlpha = 1; x.fillStyle = p.color; x.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size); return true; } // en attente : le pixel reste en place
    p.age += dt;
    if (p.age >= p.life) return false;
    p.vx *= Math.pow(.97, k); p.vy = p.vy * Math.pow(.97, k) + p.grav * k;
    p.x += p.vx * k; p.y += p.vy * k;
    const t = p.age / p.life;
    x.globalAlpha = Math.min(1, (1 - t) * 1.8);
    x.fillStyle = p.color;
    const s = Math.max(1, Math.round(p.size * (1 - t * .5)));
    x.fillRect(Math.round(p.x), Math.round(p.y), s, s);
    return true;
  });
  x.globalAlpha = 1;
  MO.raf = MO.parts.length ? requestAnimationFrame(moLoop) : 0;
  if (!MO.raf) MO.last = 0;
}
function moEmit(p) {
  MO.parts.push({ vx: 0, vy: 0, grav: -.02, age: 0, delay: 0, life: 900, size: 3, ...p });
  if (!MO.raf) MO.raf = requestAnimationFrame(moLoop);
}

// Dissout une image en pixels. part = proportion de pixels (1 = tout le dessin, .25 = petite « bouffée »)
const MO_GRID = 24;
function moDissolve(img, rect, part = 1, fallback = '139, 92, 246') {
  if (reducedFx() || !rect || !rect.width) return;
  const n = MO_GRID, cell = Math.max(rect.width, rect.height) / n;
  let px = null;
  try {
    if (img && img.complete && img.naturalWidth) {
      const c = document.createElement('canvas'); c.width = c.height = n;
      const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
      x.drawImage(img, 0, 0, n, n);
      px = x.getImageData(0, 0, n, n).data;
    }
  } catch { px = null; }
  const ox = rect.left + (rect.width - cell * n) / 2, oy = rect.top + (rect.height - cell * n) / 2;
  for (let y = 0; y < n; y++) for (let i = 0; i < n; i++) {
    let color;
    if (px) { const o = (y * n + i) * 4; if (px[o + 3] < 90) continue; color = `rgb(${px[o]},${px[o + 1]},${px[o + 2]})`; }
    else { const dx = i - n / 2, dy = y - n / 2; if (dx * dx + dy * dy > n * n / 4.4) continue; color = `rgb(${fallback})`; }
    if (Math.random() > part) continue;
    const a = Math.atan2(y - n / 2, i - n / 2) + (Math.random() - .5);
    moEmit({
      x: ox + i * cell, y: oy + y * cell, size: Math.max(2, Math.ceil(cell)), color,
      vx: Math.cos(a) * (1 + Math.random() * 2.5), vy: Math.sin(a) * (1 + Math.random() * 2) - 1.6,
      // le dessin part en « balayage » : de haut en bas, avec un peu de hasard
      delay: part >= 1 ? y * 14 + Math.random() * 90 : Math.random() * 60, life: 700 + Math.random() * 500, grav: -.035,
    });
  }
}

// Photo de la liste avant de la redessiner
function moSnap(root, sel) {
  const m = new Map();
  if (!root) return m;
  root.querySelectorAll(sel).forEach(el => {
    if (!el.dataset.key) return;
    const img = el.querySelector('img');
    m.set(el.dataset.key, { r: el.getBoundingClientRect(), sig: el.dataset.sig, el, img, ir: img?.getBoundingClientRect(), g: getComputedStyle(el).getPropertyValue('--g').trim() });
  });
  return m;
}

// Après le nouveau rendu : glissements, apparitions, dissolutions
function moPlay(old, root, sel, { dissolve = false, appear = true } = {}) {
  if (!root || !old) return;
  const fx = !reducedFx(), seen = new Set(), news = [];
  root.querySelectorAll(sel).forEach(el => {
    const k = el.dataset.key; if (!k) return;
    const o = old.get(k);
    if (!o) { news.push(el); return; }
    seen.add(k);
    const r = el.getBoundingClientRect(), dx = o.r.left - r.left, dy = o.r.top - r.top;
    if (fx && (Math.abs(dx) > 1 || Math.abs(dy) > 1)) el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 480, easing: 'cubic-bezier(.2, .9, .3, 1)' });
    if (o.sig !== el.dataset.sig) {
      el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.06)' }, { transform: 'scale(1)' }], { duration: 380, easing: 'cubic-bezier(.2, 1.4, .4, 1)', composite: 'add' });
      // il en reste moins (vendu, utilisé) : une petite bouffée de pixels sort du dessin
      const before = +(o.sig || '').split('|')[0], after = +(el.dataset.sig || '').split('|')[0];
      if (dissolve && after < before && o.img) moDissolve(o.img, o.ir, .3, o.g);
    }
  });
  // nouvelles cartes : elles poussent doucement (sauf au tout premier affichage)
  if (appear && old.size && fx) news.forEach((el, i) => el.animate([{ opacity: 0, transform: 'scale(.7) translateY(10px)' }, { opacity: 1, transform: 'none' }],
    { duration: 460, delay: Math.min(i, 8) * 35, easing: 'cubic-bezier(.2, 1.3, .4, 1)', fill: 'backwards' }));
  // cartes parties : un fantôme de la carte s'efface pendant que le dessin se dissout en pixels
  for (const [k, o] of old) {
    if (seen.has(k) || !fx) continue;
    const ghost = o.el.cloneNode(true);
    Object.assign(ghost.style, { position: 'fixed', left: o.r.left + 'px', top: o.r.top + 'px', width: o.r.width + 'px', height: o.r.height + 'px', margin: 0, zIndex: 299, pointerEvents: 'none' });
    ghost.classList.add('mo-ghost');
    if (dissolve) ghost.querySelectorAll('img').forEach(i => { i.style.visibility = 'hidden'; });
    document.body.appendChild(ghost);
    ghost.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: dissolve ? 'scale(.92)' : 'scale(.85)' }], { duration: dissolve ? 520 : 260, easing: 'ease-out', fill: 'forwards' }).finished.then(() => ghost.remove(), () => ghost.remove());
    if (dissolve) moDissolve(o.img, o.ir, 1, o.g);
  }
}

export { MO, moDissolve, moEmit, moSnap, moPlay };
