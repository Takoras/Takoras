// Ouverture « Coquille » : chaque clic frappe le jeton mystère (il part en apesanteur et sa coque se fissure),
// la lumière passe par les fentes, et à la révélation la coque éclate en morceaux.
// Le déroulé reste celui d'opening.js (clics → compteur 1/X → pause → révélation) ; ce fichier fait le spectacle.
import { reducedFx, sfx } from './env';

// Une seule ouverture maintenant : la Coquille (les essais Boing, Roulette, Combo et Cadeau ont été retirés)
export const currentStyle = () => 'crack';

// ------------------------------------------------------------------ outils communs
const R = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const fewer = (n) => (reducedFx() ? Math.ceil(n / 3) : n);
const rect = (el) => el.getBoundingClientRect();
const mid = (el) => {
  const r = rect(el);
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height, r };
};

// Particules carrées (pixel art) sur un seul canvas : gravité, rebond sur un sol, fondu
const P = { cv: null, cx: null, list: [], raf: 0 };
function particles(host) {
  if (!P.cv || !P.cv.isConnected) {
    P.cv = document.createElement('canvas');
    P.cv.className = 'sty-pfx';
    host.appendChild(P.cv);
    P.cx = P.cv.getContext('2d');
  }
  if (P.cv.width !== innerWidth || P.cv.height !== innerHeight) {
    P.cv.width = innerWidth;
    P.cv.height = innerHeight;
  }
  return P;
}
function emit(host, list) {
  particles(host);
  P.list.push(...list.map((p) => ({ life: 1, g: 0, floor: Infinity, bounce: 0.45, drag: 0.985, s: 6, ...p, t0: performance.now() })));
  if (!P.raf) P.raf = requestAnimationFrame(stepP);
}
function stepP(now) {
  const { cx, cv } = P;
  cx.clearRect(0, 0, cv.width, cv.height);
  P.list = P.list.filter((p) => {
    const age = (now - p.t0) / 1000;
    if (age > p.life) return false;
    p.vx *= p.drag;
    p.vy = p.vy * p.drag + p.g / 60;
    p.x += p.vx / 60;
    p.y += p.vy / 60;
    if (p.y > p.floor) {
      p.y = p.floor;
      p.vy *= -p.bounce;
      p.vx *= 0.8;
    }
    const a = Math.min(1, (p.life - age) / Math.min(0.35, p.life * 0.5));
    cx.globalAlpha = a;
    if (p.kind === 'shard') {
      drawShard(cx, p, age);
      return true;
    }
    if (p.kind === 'star') {
      drawStar(cx, p, age);
      return true;
    }
    const s = Math.round(p.s * (p.shrink ? 0.4 + 0.6 * (1 - age / p.life) : 1));
    if (p.edge) {
      cx.fillStyle = p.edge;
      cx.fillRect(Math.round(p.x - s / 2) - 2, Math.round(p.y - s / 2) - 2, s + 4, s + 4);
    }
    cx.fillStyle = p.c;
    cx.fillRect(Math.round(p.x - s / 2), Math.round(p.y - s / 2), s, s);
    return true;
  });
  cx.globalAlpha = 1;
  P.raf = P.list.length ? requestAnimationFrame(stepP) : 0;
  if (!P.raf) cx.clearRect(0, 0, cv.width, cv.height);
}
// Éclat de coque : un vrai morceau de la texture du « ? » (triangle), qui tourne en volant
function drawShard(cx, p, age) {
  p.rot += p.vr / 60;
  cx.save();
  cx.translate(Math.round(p.x), Math.round(p.y));
  cx.rotate(p.rot);
  cx.imageSmoothingEnabled = false;
  cx.beginPath();
  p.poly.forEach(([x, y], n) => (n ? cx.lineTo(x * p.k, y * p.k) : cx.moveTo(x * p.k, y * p.k)));
  cx.closePath();
  cx.save();
  cx.clip();
  // le morceau de texture, placé pour que le triangle tombe pile sur sa partie de l'image
  cx.drawImage(p.img, -p.ox * p.k, -p.oy * p.k, 64 * p.k, 64 * p.k);
  cx.restore();
  // liseré lumineux sur la cassure (couleur du jeton), qui s'éteint
  cx.globalAlpha *= Math.max(0, 1 - age * 1.6);
  cx.strokeStyle = p.c;
  cx.lineWidth = Math.max(2, Math.round(p.k));
  cx.stroke();
  cx.restore();
}
// Étincelle en étoile à 4 branches, en pixels, qui scintille
function drawStar(cx, p, age) {
  const k = Math.round(p.s),
    tw = 0.55 + 0.45 * Math.sin(age * p.tw + p.ph),
    arm = Math.max(1, Math.round((2 + p.arm * tw) * (1 - age / p.life * 0.5)));
  const x = Math.round(p.x),
    y = Math.round(p.y);
  cx.fillStyle = p.c;
  cx.fillRect(x - k * arm, y - k / 2, k * (2 * arm + 1) - k + k, k);
  cx.fillRect(x - k / 2, y - k * arm, k, k * (2 * arm + 1) - k + k);
  cx.fillStyle = '#ffffff';
  cx.fillRect(x - k / 2, y - k / 2, k, k);
}
// La coque se brise en morceaux de texture : grille de cellules coupées en deux triangles (bords un peu de travers)
const MYST_IMG = Object.assign(new Image(), { src: '/img/jetons/mystere.png' });
function shards(m, col, { n = 5, up = 300, sp = [250, 650] } = {}) {
  const k = m.w / 64,
    cell = 64 / n,
    out = [];
  const jit = () => R(-cell * 0.22, cell * 0.22);
  const pts = [];
  for (let gy = 0; gy <= n; gy++) for (let gx = 0; gx <= n; gx++) pts.push([gx * cell + (gx % n ? jit() : 0), gy * cell + (gy % n ? jit() : 0)]);
  const P2 = (gx, gy) => pts[gy * (n + 1) + gx];
  for (let gy = 0; gy < n; gy++)
    for (let gx = 0; gx < n; gx++) {
      const a = P2(gx, gy),
        b = P2(gx + 1, gy),
        c2 = P2(gx + 1, gy + 1),
        d = P2(gx, gy + 1);
      const tris = Math.random() < 0.5 ? [[a, b, c2], [a, c2, d]] : [[a, b, d], [b, c2, d]];
      for (const t of tris) {
        const ox = (t[0][0] + t[1][0] + t[2][0]) / 3,
          oy = (t[0][1] + t[1][1] + t[2][1]) / 3;
        // hors du disque du jeton : pas de morceau (le « ? » est rond)
        if ((ox - 32) ** 2 + (oy - 32) ** 2 > 31 ** 2) continue;
        const dx = ox - 32,
          dy = oy - 32,
          L = Math.hypot(dx, dy) || 1,
          v = R(sp[0], sp[1]);
        out.push({
          kind: 'shard',
          img: MYST_IMG,
          k,
          ox,
          oy,
          poly: t.map(([x, y]) => [x - ox, y - oy]),
          x: m.r.left + ox * k,
          y: m.r.top + oy * k,
          vx: (dx / L) * v + R(-60, 60),
          vy: (dy / L) * v - up * R(0.6, 1.2),
          rot: 0,
          vr: R(-12, 12),
          g: 1500,
          life: R(1.1, 1.7),
          c: col,
          drag: 0.99,
          floor: innerHeight + 200,
        });
      }
    }
  return out;
}
function stars(c, n, cols, { sp = [120, 420], life = [0.6, 1.2], g = -60 } = {}) {
  return Array.from({ length: fewer(n) }, () => {
    const a = R(0, Math.PI * 2),
      v = R(sp[0], sp[1]);
    return { kind: 'star', x: c.x + Math.cos(a) * R(10, 40), y: c.y + Math.sin(a) * R(10, 40), vx: Math.cos(a) * v, vy: Math.sin(a) * v, c: pick(cols), s: pick([3, 4]), arm: pick([2, 3, 4]), tw: R(10, 22), ph: R(0, 6), g, life: R(life[0], life[1]), drag: 0.96 };
  });
}
function radial(c, n, { sp = [300, 700], cols, g = 0, life = [0.5, 0.9], s = [4, 8], up = 0, floor, shrink = true, edge } = {}) {
  return Array.from({ length: fewer(n) }, () => {
    const a = R(0, Math.PI * 2),
      v = R(sp[0], sp[1]);
    return { x: c.x, y: c.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - up, c: pick(cols), g, life: R(life[0], life[1]), s: Math.round(R(s[0], s[1]) / 2) * 2, floor, shrink, edge };
  });
}
// onde de choc (anneau pixel qui s'agrandit)
function ring(host, c, col, size = 2.4, ms = 520, w = 6) {
  if (reducedFx()) return;
  const d = document.createElement('div');
  d.className = 'sty-ring';
  d.style.cssText = `left:${c.x}px;top:${c.y}px;width:${c.w}px;height:${c.w}px;border-width:${w}px;border-color:${col}`;
  host.appendChild(d);
  d.animate([{ transform: 'translate(-50%,-50%) scale(.4)', opacity: 1 }, { transform: `translate(-50%,-50%) scale(${size})`, opacity: 0 }], { duration: ms, easing: 'cubic-bezier(.1,.7,.3,1)' }).finished.then(() => d.remove());
}

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

// couleurs de la série du mystère et du jeton
const MYST = ['#2d2547', '#4b3f75', '#7d6fb3', '#b8aee6'];
const CONF = ['#ff5d8f', '#ffd23f', '#3ee0a0', '#47b8ff', '#b07cff', '#ffffff'];

// ------------------------------------------------------------------ les 5 styles
// Chaque style : start (le « ? » est prêt), tap (un clic, k = avancée 0 → 1, i = numéro du clic), hold (pause avant la
// révélation), reveal (révélation ; renvoie { noSpin } pour remplacer la rotation habituelle), clean (on repart à zéro).
const S = {};

// 2. COQUILLE : chaque clic frappe le jeton (il part et tourne un peu, comme sous un coup) et fissure la coque ;
// les fissures sont dessinées en vrais pixels (grille 64 × 64 du jeton) avec de la lumière qui passe par les fentes.
// À la fin, la coque éclate.
const G = 64; // grille du dessin des jetons
const DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
const inCoin = (x, y) => (x - 31.5) ** 2 + (y - 31.5) ** 2 < 27 ** 2;
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
    const lim = Math.min(80, innerWidth * 0.08);
    ph.vx += -ph.x * 3 * dt;
    ph.vy += -ph.y * 3 * dt;
    ph.va += -ph.a * 2.5 * dt; // il se remet doucement droit
    const damp = Math.pow(0.03, dt); // freine fort : vif au départ, puis glisse doucement
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
        ph.va += R(-20, 20);
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
      imp = 170 + k * 90;
    ph.vx = ph.vx * 0.2 + dx * imp;
    ph.vy = ph.vy * 0.2 + dy * imp;
    ph.va = ph.va * 0.2 + (dx >= 0 ? 1 : -1) * R(40, 70) * (0.8 + k * 0.4);
    ph.sq = 1; // petit écrasement au moment du coup
    floatLoop(c);
    c.box.animate([{ filter: 'brightness(2.2)' }, { filter: 'none' }], { duration: 160, easing: 'ease-out' });
    // éclats de coque qui sautent du côté frappé
    emit(c.host, Array.from({ length: fewer(4 + Math.round(k * 8)) }, () => ({ x: m.x - dx * m.w * 0.35 + R(-12, 12), y: m.y - dy * m.w * 0.35 + R(-12, 12), vx: -dx * R(150, 420) + R(-120, 120), vy: -dy * R(150, 420) - R(80, 260), c: pick(MYST), g: 1400, life: R(0.6, 1.1), s: pick([4, 6, 8]), floor: m.r.bottom + 60, bounce: 0.3, edge: '#120e1f' })));
    emit(c.host, Array.from({ length: fewer(3 + Math.round(k * 4)) }, () => ({ x: m.x + R(-10, 10), y: m.y + R(-10, 10), vx: R(-260, 260), vy: R(-260, 260), c: '#ffffff', life: R(0.15, 0.3), s: 4 })));
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
  reveal(c, j, lv) {
    clearInterval(c.holdT);
    c.box.classList.remove('sty-crk-hold');
    cancelAnimationFrame(c.ph.raf);
    c.ph.raf = 0;
    const from = c.box.style.transform || 'none';
    c.box.style.transform = '';
    const m = mid(c.box);
    c.cr.cv.remove();
    // la coque se brise en vrais morceaux (texture du « ? ») qui tournent et retombent, et des étoiles scintillent
    emit(c.host, shards(m, j.glow, { n: 5, up: 260, sp: [260, 720] }));
    emit(c.host, stars(m, 26, [j.glow, '#ffffff', '#fff3b0'], { sp: [140, 520], life: [0.7, 1.4] }));
    ring(c.host, m, '#ffffff', 2.8, 450, 10);
    ring(c.host, m, j.glow, 4, 800, 6);
    c.fx.flash(0.6, 420);
    c.fx.shake(1.3);
    c.box.animate(
      [
        { transform: `${from} scale(.4)`, filter: 'brightness(4)' },
        { transform: 'scale(1.22)', filter: 'brightness(1.6)', offset: 0.4 },
        { transform: 'scale(.95)', filter: 'brightness(1.1)', offset: 0.7 },
        { transform: 'none', filter: 'none' },
      ],
      { duration: 600, easing: 'cubic-bezier(.2,.8,.3,1)' },
    );
    noise({ dur: 0.5, vol: 0.4, type: 'lowpass', f: 5000, to: 300, q: 0.5 });
    noise({ dur: 0.25, vol: 0.2, type: 'highpass', f: 3000 });
    tone('sine', 110, { dur: 0.5, vol: 0.35, to: 40 });
    arp(4, 5 + Math.round(lv * 2), { type: 'triangle', vol: 0.06, gap: 0.05 });
    return { noSpin: true, lock: 500 };
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
  return safe(() => S[c.id].reveal(c, j, lv) || {}, null);
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
