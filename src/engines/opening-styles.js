// Ouverture « Coquille » : chaque clic frappe le jeton mystère (il part en apesanteur et sa coque se fissure),
// la lumière passe par les fentes, et à la révélation la coque éclate en morceaux.
// Le déroulé reste celui d'opening.js (clics → compteur 1/X → pause → révélation) ; ce fichier fait le spectacle.
import { sfx } from './env';

// Une seule ouverture maintenant : la Coquille (les essais Boing, Roulette, Combo et Cadeau ont été retirés)
export const currentStyle = () => 'crack';

// ------------------------------------------------------------------ outils communs
const R = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const rect = (el) => el.getBoundingClientRect();
const mid = (el) => {
  const r = rect(el);
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height, r };
};

// Sons propres aux styles (même sortie que les autres sons du site)
function A() {
  const a = sfx.audio();
  return a.ok ? a : null;
}
function tone(type, f, { dur = 0.2, vol = 0.1, to, delay = 0, attack = 0.005, vib = 0 } = {}) {
  const a = A();
  if (!a) return;
  const { ctx, out } = a,
    t = ctx.currentTime + delay,
    o = ctx.createOscillator(),
    g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  if (vib) {
    const l = ctx.createOscillator(),
      lg = ctx.createGain();
    l.frequency.value = 14;
    lg.gain.value = vib;
    l.connect(lg).connect(o.frequency);
    l.start(t);
    l.stop(t + dur + 0.05);
  }
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + dur + 0.05);
}
function noise({ dur = 0.15, vol = 0.1, type = 'bandpass', f = 1200, to, q = 1, delay = 0 } = {}) {
  const a = A();
  if (!a) return;
  const { ctx, out } = a,
    t = ctx.currentTime + delay,
    len = Math.ceil(ctx.sampleRate * dur),
    b = ctx.createBuffer(1, len, ctx.sampleRate),
    d = b.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const s = ctx.createBufferSource(),
    fl = ctx.createBiquadFilter(),
    g = ctx.createGain();
  s.buffer = b;
  fl.type = type;
  fl.Q.value = q;
  fl.frequency.setValueAtTime(f, t);
  if (to) fl.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(fl).connect(g).connect(out);
  s.start(t);
  s.stop(t + dur);
}
// gamme majeure pentatonique : chaque clic monte d'une note
const NOTE = (n) => 262 * 2 ** ([0, 2, 4, 7, 9][((n % 5) + 5) % 5] / 12 + Math.floor(n / 5));
const arp = (from, n, { type = 'square', gap = 0.06, vol = 0.05, dur = 0.25, delay = 0 } = {}) => {
  for (let i = 0; i < n; i++) tone(type, NOTE(from + i), { dur, vol, delay: delay + i * gap });
};


// ------------------------------------------------------------------ les 5 styles
// Chaque style : start (le « ? » est prêt), tap (un clic, k = avancée 0 → 1, i = numéro du clic), hold (pause avant la
// révélation), reveal (révélation ; renvoie { noSpin } pour remplacer la rotation habituelle), clean (on repart à zéro).
const S = {};

// 2. COQUILLE : chaque clic frappe le jeton (il part et tourne un peu, comme sous un coup) et fissure la coque ;
// les fissures sont dessinées en vrais pixels (grille 64 × 64 du jeton) avec de la lumière qui passe par les fentes.
// À la fin, la coque éclate.
const G = 64; // grille du dessin des jetons
const DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
// les fissures courent sur tout le dessin du « ? » (ses pixels non transparents), jusqu'au bord
const MASK = new Uint8Array(G * G).fill(1);
{
  const im = new Image();
  im.onload = () => {
    try {
      const cv = document.createElement('canvas');
      cv.width = cv.height = G;
      const x = cv.getContext('2d', { willReadFrequently: true });
      x.imageSmoothingEnabled = false;
      x.drawImage(im, 0, 0, G, G);
      const d = x.getImageData(0, 0, G, G).data;
      for (let n = 0; n < G * G; n++) MASK[n] = d[n * 4 + 3] > 40 ? 1 : 0;
    } catch {
      // image illisible : on garde tout le carré
    }
  };
  im.src = '/img/jetons/mystere.png';
}
const inCoin = (x, y) => x >= 0 && y >= 0 && x < G && y < G && MASK[y * G + x] === 1;
// une fissure : marche en escalier (pas de diagonale lisse) qui part d'un point et peut se diviser
function grow(cr, from, dir, len) {
  let [x, y] = from,
    d = dir;
  const out = [];
  const put = (nx, ny) => {
    if (!inCoin(nx, ny)) return false;
    x = nx;
    y = ny;
    out.push([x, y]);
    return true;
  };
  for (let s = 0; s < len; s++) {
    if (Math.random() < 0.35) d = (d + (Math.random() < 0.5 ? 1 : 7)) % 8;
    const [dx, dy] = DIRS[d];
    // diagonale = deux pas en escalier (pas de trait lisse : look pixel art)
    const ok = dx && dy ? (Math.random() < 0.5 ? put(x + dx, y) && put(x, y + dy) : put(x, y + dy) && put(x + dx, y)) : put(x + dx, y + dy);
    if (!ok) break;
    if (s > 3 && Math.random() < 0.12) cr.tips.push({ p: [x, y], d: (d + (Math.random() < 0.5 ? 2 : 6)) % 8 });
  }
  if (out.length) cr.tips.push({ p: out.at(-1), d });
  return out;
}
function drawCracks(c) {
  const { cx, cells, k } = c.cr;
  cx.clearRect(0, 0, G, G);
  const glow = c.cr.rgb;
  // halo : les pixels autour de la fente, couleur de la lumière, de plus en plus forts
  const near = new Map();
  for (const [x, y] of cells)
    for (let ox = -2; ox <= 2; ox++)
      for (let oy = -2; oy <= 2; oy++) {
        const dd = Math.abs(ox) + Math.abs(oy);
        if (!dd || dd > 3) continue;
        const key = `${x + ox},${y + oy}`;
        near.set(key, Math.min(near.get(key) ?? 9, dd));
      }
  for (const [key, dd] of near) {
    const [x, y] = key.split(',').map(Number);
    if (!inCoin(x, y)) continue;
    cx.fillStyle = `rgba(${glow}, ${(dd === 1 ? 0.75 : dd === 2 ? 0.38 : 0.16) * (0.5 + k * 0.5)})`;
    cx.fillRect(x, y, 1, 1);
  }
  // la fente : bord sombre puis cœur blanc
  for (const [x, y] of cells) {
    cx.fillStyle = '#ffffff';
    cx.fillRect(x, y, 1, 1);
  }
  // quelques pixels très chauds qui scintillent
  cx.fillStyle = `rgb(${glow})`;
  for (const [x, y] of cells) if ((x * 7 + y * 13 + c.cr.t) % 11 === 0) cx.fillRect(x, y, 1, 1);
}
// Le jeton qui flotte : vitesse et rotation qui s'amortissent lentement (espace), un léger rappel vers le centre
// pour ne jamais sortir de l'écran, et un rebond doux sur les bords de la zone.
function floatLoop(c) {
  if (c.ph.raf) return;
  let last = performance.now();
  const tick = (now) => {
    const ph = c.ph,
      dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const lim = Math.min(40, innerWidth * 0.05);
    ph.vx += -ph.x * 14 * dt; // revient vite au centre
    ph.vy += -ph.y * 14 * dt;
    ph.va += -ph.a * 12 * dt; // et se remet droit
    const damp = Math.pow(0.02, dt); // freine fort : vif au départ, puis revient en douceur
    ph.vx *= damp;
    ph.vy *= damp;
    ph.va *= Math.pow(0.05, dt);
    ph.x += ph.vx * dt;
    ph.y += ph.vy * dt;
    ph.a += ph.va * dt;
    for (const ax of ['x', 'y']) {
      const v = ax === 'x' ? 'vx' : 'vy';
      if (Math.abs(ph[ax]) > lim) {
        ph[ax] = Math.sign(ph[ax]) * lim;
        ph[v] *= -0.55;
        ph.va += R(-8, 8);
      }
    }
    ph.sq = Math.max(0, ph.sq - dt * 6);
    const sq = 1 - ph.sq * 0.1;
    c.box.style.transform = `translate(${ph.x.toFixed(1)}px,${ph.y.toFixed(1)}px) rotate(${ph.a.toFixed(1)}deg) scale(${sq.toFixed(3)})`;
    const moving = Math.abs(ph.vx) + Math.abs(ph.vy) + Math.abs(ph.va) > 2 || Math.abs(ph.x) + Math.abs(ph.y) > 0.5;
    ph.raf = moving ? requestAnimationFrame(tick) : 0;
  };
  c.ph.raf = requestAnimationFrame(tick);
}
S.crack = {
  start(c) {
    c.ph = { x: 0, y: 0, vx: 0, vy: 0, a: 0, va: 0, sq: 0, raf: 0 };
    const cv = document.createElement('canvas');
    cv.width = cv.height = G;
    cv.className = 'sty-cracks';
    c.box.appendChild(cv);
    const tier = getComputedStyle(c.opening).getPropertyValue('--tier').trim() || '235, 235, 255';
    c.cr = { cv, cx: cv.getContext('2d'), cells: [], tips: [], k: 0, t: 0, rgb: tier };
    // d'où vient le clic (pour pousser le jeton dans l'autre sens)
    c.onPtr = (e) => {
      c.px = e.clientX;
      c.py = e.clientY;
    };
    c.opening.addEventListener('pointerdown', c.onPtr, true);
  },
  tap(c, k, i) {
    const cr = c.cr;
    cr.k = k;
    cr.rgb = getComputedStyle(c.opening).getPropertyValue('--tier').trim() || cr.rgb;
    // premier clic : impact au centre ; ensuite on prolonge les fissures et on en ouvre de nouvelles
    const add = [];
    if (i === 1 || !cr.tips.length) {
      const o = [32 + Math.round(R(-5, 5)), 32 + Math.round(R(-5, 5))];
      add.push(o);
      for (let q = 0; q < 3; q++) add.push(...grow(cr, o, Math.floor(R(0, 8)), 5 + Math.round(R(0, 4))));
    } else {
      const tips = cr.tips.splice(0, Math.min(cr.tips.length, 2 + Math.round(k * 3)));
      for (const tp of tips) add.push(...grow(cr, tp.p, tp.d, 3 + Math.round(R(2, 4) + k * 5)));
      if (Math.random() < 0.5) {
        const o = pick(cr.cells.length ? cr.cells : [[32, 32]]);
        add.push(...grow(cr, o, Math.floor(R(0, 8)), 4 + Math.round(k * 6)));
      }
    }
    // la fissure s'ouvre en une fraction de seconde (pixel par pixel)
    let n = 0;
    const step = () => {
      const m = Math.ceil(add.length / 5);
      cr.cells.push(...add.slice(n, n + m));
      n += m;
      cr.t++;
      drawCracks(c);
      if (n < add.length) requestAnimationFrame(step);
    };
    step();
    c.box.style.setProperty('--glow', String(1 + k * 6));
    c.box.style.setProperty('--crk', String(0.5 + k * 0.5));
    // le coup : le jeton est projeté à l'opposé du clic et part en tournant, comme en apesanteur ;
    // il dérive doucement (il ne revient pas d'un coup) jusqu'au coup suivant
    const m = mid(c.box);
    let dx = m.x - (c.px ?? m.x + R(-1, 1)),
      dy = m.y - (c.py ?? m.y + R(-1, 1));
    const L = Math.hypot(dx, dy) || 1;
    if (L < 8) {
      const a = R(0, Math.PI * 2);
      dx = Math.cos(a);
      dy = Math.sin(a);
    } else {
      dx /= L;
      dy /= L;
    }
    // départ vif puis ça freine vite : ~40 à 60 px de course, quelques degrés de rotation seulement
    const ph = c.ph,
      imp = 120 + k * 50;
    ph.vx = ph.vx * 0.2 + dx * imp;
    ph.vy = ph.vy * 0.2 + dy * imp;
    ph.va = ph.va * 0.2 + (dx >= 0 ? 1 : -1) * R(18, 32);
    ph.sq = 1; // petit écrasement au moment du coup
    floatLoop(c);
    c.box.animate([{ filter: 'brightness(2.2)' }, { filter: 'none' }], { duration: 160, easing: 'ease-out' });
    noise({ dur: 0.07, vol: 0.2 + k * 0.1, type: 'highpass', f: 2400 - k * 900, q: 0.8 });
    noise({ dur: 0.12, vol: 0.09, type: 'bandpass', f: 600 + i * 40, q: 3, delay: 0.02 });
    tone('sine', 180 - k * 60, { dur: 0.14, vol: 0.22, to: 60 });
    tone('triangle', 900 + k * 700, { dur: 0.05, vol: 0.05, to: 400 });
  },
  hold(c) {
    c.box.classList.add('sty-crk-hold');
    let n = 0;
    c.holdT = setInterval(() => {
      c.cr.t++;
      drawCracks(c);
      if (n++ % 2 === 0) noise({ dur: 0.05, vol: 0.05, type: 'highpass', f: R(2000, 4000) });
    }, 130);
  },
  // révélation : celle d'origine (petite onde, le jeton tourne) ; la Coquille range juste ses fissures
  reveal() {
    return null;
  },
  clean(c) {
    clearInterval(c.holdT);
    if (c.ph) cancelAnimationFrame(c.ph.raf);
    c.box.style.transform = '';
    c.box.classList.remove('sty-crk-hold');
    c.box.style.removeProperty('--glow');
    c.box.style.removeProperty('--crk');
    c.opening.removeEventListener('pointerdown', c.onPtr, true);
    c.cr?.cv.remove();
  },
};

// ------------------------------------------------------------------ branchement sur l'écran d'ouverture
let cur = null; // { id, ...état du style pour le jeton en cours }
// Filet de sécurité : si un style plante, on range son décor et l'ouverture continue en mode normal
function safe(fn, fallback = undefined) {
  try {
    return fn();
  } catch (e) {
    console.error('[style d\'ouverture]', e);
    styleClean();
    return fallback;
  }
}
export function styleStart(env) {
  styleClean();
  const id = currentStyle();
  if (!id || !S[id]) return;
  const box = env.coin.querySelector('.tilt3d');
  if (!box) return;
  cur = { id, box, ...env, spin: env.coin.querySelector('.spin') };
  env.opening.classList.add('op-sty-' + id);
  safe(() => S[id].start(cur));
}
export const styleActive = () => !!cur;
export function styleTap(k, i) {
  if (cur) safe(() => S[cur.id].tap(cur, k, i));
}
export function styleHold() {
  if (cur) safe(() => S[cur.id].hold?.(cur));
}
// quiet : après une cinématique (le film a déjà fait la révélation) → on range juste le décor
export function styleReveal(j, lv, quiet) {
  if (!cur) return null;
  const c = cur;
  if (quiet) {
    styleClean();
    return null;
  }
  const own = safe(() => S[c.id].reveal(c, j, lv), null);
  if (!own) styleClean(); // révélation classique d'opening.js
  return own || null;
}
export function styleClean() {
  if (!cur) return;
  try {
    S[cur.id].clean?.(cur);
  } catch {
    // rien : on repart de zéro de toute façon
  }
  const c = cur;
  cur = null;
  c.opening.classList.remove('op-sty-' + c.id);
  c.coin.querySelectorAll('.sty-cracks').forEach((n) => n.remove());
  c.box.style.transformOrigin = '';
  c.box.getAnimations().forEach((a) => a.cancel());
  if (c.spin) c.spin.style.opacity = '';
}
