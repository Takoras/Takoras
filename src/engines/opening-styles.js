// Styles d'ouverture à l'essai (réservés aux admins) : 5 façons très différentes d'ouvrir un tirage.
// Le déroulé reste le même (clics → compteur 1/X → pause → révélation) ; chaque style change ce qu'on voit et ce qu'on
// entend à chaque clic, pendant la pause et à la révélation. Choix gardé dans le navigateur (takoras-op-style).
import { SERIES, texOf } from '@/data/jetons';
import { qc } from '@/lib/queryClient';
import { reducedFx, sfx } from './env';

// admin : on retient la dernière valeur connue. Après un tirage, l'état du compte est remplacé par la réponse du
// serveur, qui ne contient pas « admin » : sans ça, le sélecteur disparaissait dès la première ouverture.
let admin = false;
const readAdmin = () => {
  for (const [, d] of qc.getQueriesData({ queryKey: ['me'] })) if (d && typeof d.admin === 'boolean') admin = d.admin;
  return admin;
};
qc.getQueryCache().subscribe(readAdmin);
const isAdmin = readAdmin;

export const STYLES = [
  ['', 'Normal'],
  ['boing', 'Boing'],
  ['crack', 'Coquille'],
  ['slot', 'Roulette'],
  ['combo', 'Combo'],
  ['gift', 'Cadeau'],
];
const KEY = 'takoras-op-style';
export function currentStyle() {
  if (!isAdmin()) return '';
  try {
    const s = localStorage.getItem(KEY) || '';
    return STYLES.some(([id]) => id === s) ? s : '';
  } catch {
    return '';
  }
}
export function setStyle(s) {
  try {
    localStorage.setItem(KEY, s);
  } catch {
    // stockage bloqué : le choix ne sera pas gardé
  }
}

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

// 1. BOING : le jeton est en gelée, il saute de plus en plus haut, s'écrase et rebondit ; à la fin, méga saut
S.boing = {
  start(c) {
    c.box.style.transformOrigin = '50% 100%';
  },
  tap(c, k, i) {
    const h = 18 + k * 90;
    c.box.getAnimations().forEach((a) => a.cancel());
    c.box.animate(
      [
        { transform: 'translateY(0) scale(1.25,.72)' },
        { transform: `translateY(${-h}px) scale(.82,1.22)`, offset: 0.3 },
        { transform: `translateY(${-h * 1.04}px) scale(1,1)`, offset: 0.45 },
        { transform: 'translateY(0) scale(1.32,.68)', offset: 0.75 },
        { transform: 'translateY(0) scale(.92,1.08)', offset: 0.87 },
        { transform: 'translateY(0) scale(1.03,.97)', offset: 0.95 },
        { transform: 'none' },
      ],
      { duration: 420 + k * 120, easing: 'cubic-bezier(.3,.6,.4,1)' },
    );
    const f = NOTE(i + 2);
    tone('sine', f * 0.6, { dur: 0.32, vol: 0.16, to: f * 1.6, vib: 18 });
    setTimeout(() => {
      const m = mid(c.coin);
      emit(c.host, [-1, 1].flatMap((dir) => Array.from({ length: fewer(4) }, () => ({ x: m.x + dir * m.w * 0.3, y: m.r.bottom - 6, vx: dir * R(80, 220), vy: R(-120, -40), c: pick(['#ffffff', '#cfc8f0']), g: 300, life: R(0.3, 0.5), s: 6 }))));
      tone('sine', 120, { dur: 0.12, vol: 0.12, to: 60 });
    }, (420 + k * 120) * 0.72);
  },
  hold(c) {
    c.holdAnim = c.box.animate([{ transform: 'scale(1.1,.9)' }, { transform: 'scale(.9,1.1)' }], { duration: 160, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' });
    c.holdSnd = setInterval(() => tone('sine', R(300, 380), { dur: 0.1, vol: 0.04, to: R(500, 600) }), 320);
  },
  reveal(c, j, lv) {
    c.holdAnim?.cancel();
    clearInterval(c.holdSnd);
    const H = Math.min(innerHeight * 0.55, 420);
    c.box.animate(
      [
        { transform: 'none' },
        { transform: 'translateY(0) scale(1.45,.55)', offset: 0.14 },
        { transform: `translateY(${-H}px) scale(.7,1.4)`, offset: 0.42 },
        { transform: `translateY(${-H * 1.05}px) scale(1,1)`, offset: 0.52 },
        { transform: 'translateY(0) scale(.85,1.2)', offset: 0.72 },
        { transform: 'translateY(0) scale(1.6,.5)', offset: 0.78 },
        { transform: 'translateY(-30px) scale(.9,1.12)', offset: 0.86 },
        { transform: 'translateY(0) scale(1.15,.88)', offset: 0.93 },
        { transform: 'none' },
      ],
      { duration: 1300, easing: 'linear' },
    );
    tone('sine', 160, { dur: 0.5, vol: 0.18, to: 900, delay: 0.18, vib: 30 });
    setTimeout(() => {
      const m = mid(c.coin);
      c.fx.shake(1.4);
      ring(c.host, { ...m, y: m.r.bottom - 10 }, j.glow, 3.2, 600, 8);
      emit(c.host, radial({ x: m.x, y: m.r.bottom - 10 }, 70, { sp: [350, 900], up: 500, cols: [j.glow, ...CONF], g: 1400, life: [0.9, 1.6], floor: innerHeight - 8 }));
      tone('sine', 90, { dur: 0.4, vol: 0.35, to: 40 });
      tone('sine', 200, { dur: 0.6, vol: 0.14, to: 700, vib: 40, delay: 0.05 });
      arp(5, 4 + Math.round(lv * 2), { type: 'triangle', vol: 0.06, delay: 0.1 });
      c.fx.tint(0.3 + lv * 0.2, 500);
    }, 1300 * 0.78);
    return { lock: 1300 };
  },
  clean(c) {
    c.holdAnim?.cancel();
    clearInterval(c.holdSnd);
  },
};

// 2. COQUILLE : chaque clic fissure la coque (de la lumière passe par les fentes, des éclats tombent) ; à la fin elle éclate
function crackPath(cx, cy, len, ang) {
  let x = cx,
    y = cy,
    pts = [`${x},${y}`];
  for (let s = 0; s < len; s += 4) {
    ang += R(-0.7, 0.7);
    x = Math.round(x + Math.cos(ang) * 4);
    y = Math.round(y + Math.sin(ang) * 4);
    pts.push(`${x},${y}`);
  }
  return pts.join(' ');
}
S.crack = {
  start(c) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 64 64');
    svg.setAttribute('class', 'sty-cracks');
    c.box.appendChild(svg);
    c.svg = svg;
    c.ang = R(0, 6.28);
  },
  tap(c, k, i) {
    const n = i === 1 ? 1 : 2;
    for (let q = 0; q < n; q++) {
      c.ang += R(1.2, 2.6);
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      p.setAttribute('points', crackPath(32 + R(-6, 6), 32 + R(-6, 6), 12 + k * 22, c.ang));
      c.svg.appendChild(p);
      const L = p.getTotalLength?.() || 40;
      p.style.strokeDasharray = `${L}`;
      p.animate([{ strokeDashoffset: L }, { strokeDashoffset: 0 }], { duration: 120, easing: 'ease-out', fill: 'forwards' });
    }
    c.svg.style.setProperty('--glow', String(2 + k * 10));
    c.svg.style.opacity = String(0.7 + k * 0.3);
    c.box.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${R(4, 8) * (i % 2 ? 1 : -1)}px) rotate(${R(-4, 4)}deg)` }, { transform: 'none' }], { duration: 140, easing: 'ease-out' });
    const m = mid(c.coin);
    emit(c.host, Array.from({ length: fewer(3 + Math.round(k * 6)) }, () => ({ x: m.x + R(-m.w * 0.35, m.w * 0.35), y: m.y + R(-m.w * 0.3, m.w * 0.2), vx: R(-160, 160), vy: R(-260, -60), c: pick(MYST), g: 1300, life: R(0.6, 1), s: pick([4, 6, 8]), floor: m.r.bottom + 40, bounce: 0.3, edge: '#120e1f' })));
    noise({ dur: 0.07, vol: 0.18 + k * 0.1, type: 'highpass', f: 2200 - k * 900, q: 0.8 });
    noise({ dur: 0.12, vol: 0.08, type: 'bandpass', f: 600 + i * 40, q: 3, delay: 0.02 });
    tone('triangle', 900 + k * 700, { dur: 0.05, vol: 0.05, to: 400 });
  },
  hold(c) {
    c.svg.classList.add('pulse');
    c.holdSnd = setInterval(() => noise({ dur: 0.05, vol: 0.05, type: 'highpass', f: R(2000, 4000) }), 260);
  },
  reveal(c, j, lv) {
    clearInterval(c.holdSnd);
    const m = mid(c.coin);
    c.svg.remove();
    // éclats de coque qui partent dans tous les sens, puis retombent
    emit(c.host, radial(m, 60, { sp: [400, 1100], up: 250, cols: MYST, g: 1600, life: [0.9, 1.5], s: [6, 14], floor: innerHeight - 6, shrink: false, edge: '#120e1f' }));
    emit(c.host, radial(m, 30, { sp: [200, 600], cols: [j.glow, '#ffffff'], life: [0.4, 0.8], s: [4, 6] }));
    ring(c.host, m, '#ffffff', 2.8, 450, 10);
    ring(c.host, m, j.glow, 4, 800, 6);
    c.fx.flash(0.6, 420);
    c.fx.shake(1.3);
    c.box.animate(
      [
        { transform: 'scale(.4)', filter: 'brightness(4)' },
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
    clearInterval(c.holdSnd);
  },
};

// 3. ROULETTE : une fenêtre de machine à sous ; chaque clic fait tourner le rouleau d'un cran, puis il s'emballe et s'arrête pile
S.slot = {
  start(c) {
    const list = Object.values(SERIES).flat().filter((j) => j.img);
    const imgs = Array.from({ length: 90 }, () => texOf(pick(list)));
    const w = document.createElement('div');
    w.className = 'sty-slot';
    w.innerHTML = `<div class="sty-win"><div class="sty-strip">${imgs.map((s) => `<img class="px" src="${s}" alt="">`).join('')}</div></div>${'<i class="sty-bulb"></i>'.repeat(14)}`;
    c.box.appendChild(w);
    c.slot = w;
    c.strip = w.querySelector('.sty-strip');
    c.pos = 0;
    c.spin.style.opacity = '0';
    w.querySelectorAll('.sty-bulb').forEach((b, n) => {
      const a = (n / 14) * Math.PI * 2;
      b.style.left = `${50 + Math.cos(a) * 54}%`;
      b.style.top = `${50 + Math.sin(a) * 54}%`;
    });
    c.bulbs = [...w.querySelectorAll('.sty-bulb')];
  },
  lights(c, step) {
    c.bulbs.forEach((b, n) => b.classList.toggle('on', (n + step) % 3 === 0));
  },
  cell: (c) => c.strip.parentElement.offsetHeight || 200,
  tap(c, k, i) {
    const h = S.slot.cell(c),
      from = c.pos;
    c.pos = Math.min(80, c.pos + 1 + Math.round(k * 2));
    c.strip.getAnimations().forEach((a) => a.cancel());
    c.strip.animate([{ transform: `translateY(${-from * h}px)` }, { transform: `translateY(${-c.pos * h - h * 0.12}px)`, offset: 0.7 }, { transform: `translateY(${-c.pos * h}px)` }], { duration: 260, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'forwards' });
    S.slot.lights(c, i);
    c.slot.animate([{ transform: 'scale(1.06)' }, { transform: 'none' }], { duration: 160, easing: 'ease-out' });
    for (let q = 0; q < 1 + Math.round(k * 2); q++) tone('square', 1300 + q * 120, { dur: 0.03, vol: 0.035, delay: q * 0.05 });
    tone('triangle', NOTE(i + 3), { dur: 0.18, vol: 0.07, delay: 0.06 });
  },
  hold(c) {
    c.slot.classList.add('fast');
    const h = S.slot.cell(c);
    c.strip.getAnimations().forEach((a) => a.cancel());
    c.strip.animate([{ transform: `translateY(${-c.pos * h}px)` }, { transform: `translateY(${-(c.pos + 6) * h}px)` }], { duration: 360, iterations: Infinity, easing: 'linear' });
    let n = 0;
    c.holdSnd = setInterval(() => {
      S.slot.lights(c, n++);
      tone('square', 1500, { dur: 0.02, vol: 0.025 });
    }, 70);
  },
  reveal(c, j, lv) {
    clearInterval(c.holdSnd);
    c.slot.classList.remove('fast');
    const img = document.createElement('img');
    img.className = 'px';
    img.src = texOf(j);
    img.alt = '';
    const cells = c.strip.children.length;
    c.strip.appendChild(img);
    const h = S.slot.cell(c),
      from = c.pos,
      to = cells;
    const D = 1100 + lv * 300;
    c.strip.getAnimations().forEach((a) => a.cancel());
    c.strip.animate([{ transform: `translateY(${-from * h}px)` }, { transform: `translateY(${-to * h - h * 0.18}px)`, offset: 0.86 }, { transform: `translateY(${-to * h}px)` }], { duration: D, easing: 'cubic-bezier(.12,.75,.2,1)', fill: 'forwards' });
    // cliquetis qui ralentit
    const ticks = 18;
    for (let q = 0; q < ticks; q++) {
      const t = (D * 0.86 * (1 - (1 - q / ticks) ** 2.2)) / 1000;
      tone('square', 1400, { dur: 0.025, vol: 0.04, delay: t });
    }
    let n = 0;
    const lt = setInterval(() => S.slot.lights(c, n++), 90);
    setTimeout(() => {
      clearInterval(lt);
      c.bulbs.forEach((b) => b.classList.add('on'));
      c.slot.classList.add('win');
      const m = mid(c.coin);
      c.fx.shake(1);
      ring(c.host, m, '#ffd23f', 3, 600, 8);
      emit(c.host, radial(m, 60, { sp: [300, 800], up: 700, cols: ['#ffd23f', '#ffb000', '#fff3b0'], g: 1500, life: [1, 1.7], s: [8, 10], floor: innerHeight - 8, shrink: false, edge: '#7a4a00' }));
      tone('sine', 100, { dur: 0.4, vol: 0.3, to: 45 });
      [0, 2, 4, 5, 7].forEach((n2, q) => tone('square', NOTE(n2 + 5), { dur: 0.22, vol: 0.05, delay: 0.05 + q * 0.07 }));
      c.fx.tint(0.3 + lv * 0.2, 500);
      // la machine s'efface, le vrai jeton reste
      setTimeout(() => {
        c.spin.style.opacity = '';
        c.slot.animate([{ opacity: 1 }, { opacity: 0, transform: 'scale(1.15)' }], { duration: 300, fill: 'forwards' }).finished.then(() => c.slot.remove());
      }, 700);
    }, D * 0.86);
    return { noSpin: true, lock: D };
  },
  clean(c) {
    clearInterval(c.holdSnd);
    c.spin.style.opacity = '';
  },
};

// 4. COMBO : chaque clic est un coup de poing (gros « ×N », arrêt sur image, l'écran zoome) ; à la fin, pluie de pièces
S.combo = {
  start(c) {
    const b = document.createElement('div');
    b.className = 'sty-combo';
    c.host.appendChild(b);
    c.combo = b;
    c.zoom0 = 1;
  },
  tap(c, k, i) {
    const cols = ['#ffffff', '#ffe066', '#ffb347', '#ff6b6b', '#ff4fd8', '#9d7bff'];
    const col = cols[Math.min(cols.length - 1, Math.floor(k * cols.length))];
    c.combo.innerHTML = `<b style="color:${col}">×${i}</b>`;
    const m = mid(c.coin);
    c.combo.style.left = `${m.x + m.w * 0.55}px`;
    c.combo.style.top = `${m.y - m.w * 0.45}px`;
    c.combo.firstChild.animate([{ transform: `scale(2.4) rotate(${R(-14, 14)}deg)`, opacity: 0 }, { transform: 'scale(.9) rotate(-6deg)', opacity: 1, offset: 0.4 }, { transform: 'scale(1) rotate(-6deg)' }], { duration: 220, easing: 'cubic-bezier(.2,.9,.3,1.4)', fill: 'forwards' });
    // arrêt sur image : le jeton blanchit, l'écran fait un « punch »
    c.box.animate([{ filter: 'brightness(4) saturate(0)', transform: 'scale(.9)' }, { filter: 'brightness(4) saturate(0)', transform: 'scale(.9)', offset: 0.35 }, { filter: 'none', transform: 'scale(1.08)', offset: 0.6 }, { filter: 'none', transform: 'none' }], { duration: 200, easing: 'linear' });
    c.zoom0 = 1 + k * 0.1;
    c.main.animate([{ transform: `scale(${c.zoom0 + 0.05})` }, { transform: `scale(${c.zoom0})` }], { duration: 160, easing: 'ease-out', fill: 'forwards' });
    emit(c.host, radial(m, 10 + Math.round(k * 10), { sp: [500, 1100], cols: ['#ffffff', col], life: [0.18, 0.32], s: [4, 6] }));
    ring(c.host, m, col, 1.8 + k, 260, 5);
    c.fx.shake(0.4 + k * 0.6);
    tone('sine', 140, { dur: 0.16, vol: 0.32, to: 50 });
    noise({ dur: 0.08, vol: 0.2, type: 'lowpass', f: 3000, to: 400 });
    tone('square', NOTE(i + 4), { dur: 0.12, vol: 0.05 });
  },
  hold(c) {
    c.combo.classList.add('max');
    c.holdSnd = setInterval(() => tone('square', NOTE(12), { dur: 0.06, vol: 0.03 }), 240);
  },
  reveal(c, j, lv) {
    clearInterval(c.holdSnd);
    const m = mid(c.coin);
    // gros arrêt sur image, puis tout part
    c.main.animate([{ transform: `scale(${c.zoom0 + 0.12})` }, { transform: `scale(${c.zoom0 + 0.12})`, offset: 0.4 }, { transform: 'scale(1)' }], { duration: 520, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'forwards' });
    c.combo.firstChild?.animate([{ transform: 'scale(1) rotate(-6deg)' }, { transform: 'scale(1.8) rotate(-6deg)', opacity: 1, offset: 0.3 }, { transform: 'scale(2.2) rotate(-6deg)', opacity: 0 }], { duration: 700, fill: 'forwards' });
    c.fx.flash(0.75, 380);
    tone('sine', 70, { dur: 0.6, vol: 0.45, to: 30 });
    noise({ dur: 0.35, vol: 0.3, type: 'lowpass', f: 4000, to: 200 });
    setTimeout(() => {
      c.fx.shake(1.5);
      ring(c.host, m, j.glow, 4.5, 700, 10);
      // pluie de pièces depuis le haut de l'écran
      emit(c.host, Array.from({ length: fewer(70) }, () => ({ x: R(0, innerWidth), y: R(-200, -20), vx: R(-60, 60), vy: R(100, 500), c: pick(['#ffd23f', '#ffc400', '#fff1a8']), g: 1700, life: R(1.6, 2.4), s: pick([8, 10, 12]), floor: innerHeight - 10, bounce: 0.5, shrink: false, edge: '#7a4a00' })));
      emit(c.host, radial(m, 40, { sp: [400, 1000], cols: [j.glow, '#ffffff'], life: [0.4, 0.8], s: [4, 8] }));
      [0, 2, 4, 7, 9, 12].forEach((n, q) => tone('square', NOTE(n + 3), { dur: 0.2, vol: 0.05, delay: q * 0.06 }));
      for (let q = 0; q < 10; q++) tone('triangle', R(1800, 2600), { dur: 0.05, vol: 0.03, delay: 0.3 + q * 0.07 });
    }, 200);
    return { lock: 600 };
  },
  clean(c) {
    clearInterval(c.holdSnd);
    c.combo?.remove();
    c.main.getAnimations().forEach((a) => a.cancel());
  },
};

// 5. CADEAU : un paquet en pixel art ; chaque clic le fait sauter, le couvercle se soulève et de la lumière s'échappe
S.gift = {
  start(c) {
    const g = document.createElement('div');
    g.className = 'sty-gift';
    g.innerHTML = '<div class="sty-glowgap"></div><div class="sty-body"><i></i></div><div class="sty-lid"><i></i><b></b><b></b></div>';
    c.box.appendChild(g);
    c.gift = g;
    c.lid = g.querySelector('.sty-lid');
    c.gap = g.querySelector('.sty-glowgap');
    c.spin.style.opacity = '0';
  },
  tap(c, k, i) {
    const up = 6 + k * 34;
    c.gift.animate([{ transform: 'none' }, { transform: `translateY(-14px) rotate(${i % 2 ? 7 : -7}deg) scale(1.06,.94)`, offset: 0.3 }, { transform: `rotate(${i % 2 ? -3 : 3}deg)`, offset: 0.65 }, { transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.3,.7,.4,1)' });
    c.lid.animate([{ transform: 'none' }, { transform: `translateY(${-up}px) rotate(${i % 2 ? -6 : 6}deg)`, offset: 0.35 }, { transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.3,.7,.4,1)' });
    c.gap.style.opacity = String(0.2 + k * 0.8);
    c.gap.animate([{ opacity: 1, transform: 'scaleY(1.6)' }, { opacity: 0.2 + k * 0.8, transform: 'none' }], { duration: 300 });
    const m = mid(c.coin);
    emit(c.host, Array.from({ length: fewer(3 + Math.round(k * 5)) }, () => ({ x: m.x + R(-m.w * 0.3, m.w * 0.3), y: m.y - m.w * 0.12, vx: R(-120, 120), vy: R(-420, -200), c: pick(CONF), g: 900, life: R(0.6, 1), s: 6 })));
    tone('sine', 150, { dur: 0.12, vol: 0.2, to: 70 });
    noise({ dur: 0.1, vol: 0.08, type: 'bandpass', f: 2500, q: 0.6 });
    tone('sine', NOTE(i + 7), { dur: 0.5, vol: 0.06 });
    tone('sine', NOTE(i + 7) * 2.01, { dur: 0.25, vol: 0.02 });
  },
  hold(c) {
    c.gift.classList.add('rattle');
    c.gap.style.opacity = '1';
    c.holdSnd = setInterval(() => tone('sine', R(120, 160), { dur: 0.06, vol: 0.08, to: 80 }), 140);
  },
  reveal(c, j, lv) {
    clearInterval(c.holdSnd);
    c.gift.classList.remove('rattle');
    const m = mid(c.coin);
    c.lid.animate([{ transform: 'none' }, { transform: `translate(${R(-80, 80)}px,${-innerHeight * 0.7}px) rotate(${pick([-1, 1]) * 620}deg)`, opacity: 1, offset: 0.8 }, { transform: `translate(0,${-innerHeight}px) rotate(720deg)`, opacity: 0 }], { duration: 900, easing: 'cubic-bezier(.15,.7,.4,1)', fill: 'forwards' });
    c.gift.querySelector('.sty-body').animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(60%) scale(1.1,.6)', opacity: 0 }], { duration: 420, delay: 120, easing: 'ease-in', fill: 'forwards' });
    c.gap.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(3,6)' }], { duration: 500, fill: 'forwards' });
    c.spin.style.opacity = '';
    c.spin.animate([{ transform: 'translateY(40%) scale(.3)', opacity: 0 }, { transform: 'translateY(-14%) scale(1.15)', opacity: 1, offset: 0.55 }, { transform: 'translateY(3%) scale(.96)', offset: 0.8 }, { transform: 'none' }], { duration: 700, easing: 'cubic-bezier(.2,.8,.3,1)' });
    emit(c.host, radial({ x: m.x, y: m.y + m.w * 0.1 }, 90, { sp: [300, 900], up: 650, cols: CONF, g: 1100, life: [1.2, 2], s: [6, 10], floor: innerHeight - 8, shrink: false }));
    ring(c.host, m, '#ffffff', 2.4, 420, 8);
    c.fx.flash(0.4, 400);
    c.fx.shake(0.8);
    // bouchon qui saute + petite fanfare
    tone('sine', 900, { dur: 0.08, vol: 0.2, to: 300 });
    noise({ dur: 0.2, vol: 0.25, type: 'highpass', f: 1500 });
    [0, 4, 7, 12].forEach((n, q) => tone('triangle', NOTE(0) * 2 ** (n / 12) * 2, { dur: 0.4, vol: 0.07, delay: 0.12 + q * 0.08 }));
    for (let q = 0; q < 6; q++) noise({ dur: 0.04, vol: 0.06, type: 'bandpass', f: R(2000, 5000), q: 2, delay: 0.2 + q * 0.09 });
    setTimeout(() => c.gift.remove(), 1000);
    return { noSpin: true, lock: 700 };
  },
  clean(c) {
    clearInterval(c.holdSnd);
    c.spin.style.opacity = '';
  },
};

// ------------------------------------------------------------------ branchement sur l'écran d'ouverture
let cur = null; // { id, ...état du style pour le jeton en cours }
export function styleStart(env) {
  styleClean();
  const id = currentStyle();
  if (!id || !S[id]) return;
  const box = env.coin.querySelector('.tilt3d');
  if (!box) return;
  cur = { id, box, ...env, spin: env.coin.querySelector('.spin') };
  env.opening.classList.add('sty-' + id);
  S[id].start(cur);
}
export const styleActive = () => !!cur;
export function styleTap(k, i) {
  if (cur) S[cur.id].tap(cur, k, i);
}
export function styleHold() {
  if (cur) S[cur.id].hold?.(cur);
}
// quiet : après une cinématique (le film a déjà fait la révélation) → on range juste le décor
export function styleReveal(j, lv, quiet) {
  if (!cur) return null;
  const c = cur;
  if (quiet) {
    styleClean();
    return null;
  }
  return S[c.id].reveal(c, j, lv) || {};
}
export function styleClean() {
  if (!cur) return;
  try {
    S[cur.id].clean?.(cur);
  } catch {
    // rien : on repart de zéro de toute façon
  }
  cur.opening.classList.remove('sty-' + cur.id);
  cur.coin.querySelectorAll('.sty-cracks, .sty-slot, .sty-gift').forEach((n) => n.remove());
  cur.box.style.transformOrigin = '';
  cur.box.getAnimations().forEach((a) => a.cancel());
  cur = null;
}

// Petit sélecteur en haut à gauche de l'écran d'ouverture (admins seulement)
export function renderPicker(opening) {
  let p = opening.querySelector('.sty-pick');
  if (!isAdmin()) {
    p?.remove();
    return;
  }
  if (!p) {
    p = document.createElement('div');
    p.className = 'sty-pick';
    p.addEventListener('pointerdown', (e) => e.stopPropagation());
    p.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      e.stopPropagation();
      setStyle(b.dataset.s);
      renderPicker(opening);
      p.dispatchEvent(new CustomEvent('sty-change', { bubbles: true }));
    });
    opening.appendChild(p);
  }
  const on = currentStyle();
  p.innerHTML = STYLES.map(([id, name]) => `<button type="button" data-s="${id}" class="${id === on ? 'on' : ''}">${name}</button>`).join('');
}
