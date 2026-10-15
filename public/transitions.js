// Transitions d'ouverture d'un pull (0,5 s max) + menu debug (taper « debug »)
const fx = $('fx'), opening = $('opening');
const DUR = 500;

const el = (css = '', html = '') => { const d = document.createElement('div'); d.style.cssText = css; d.innerHTML = html; fx.appendChild(d); return d; };
const done = ms => new Promise(r => setTimeout(r, ms));
const glowRGB = () => getComputedStyle(document.documentElement).getPropertyValue('--glow').trim() || '139, 92, 246';
function origin() {
  const r = $('coin').getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, r: r.width / 2 };
}
const far = o => Math.hypot(Math.max(o.x, innerWidth - o.x), Math.max(o.y, innerHeight - o.y));

// Transition « Pixels » : 6 versions. La grille couvre l'écran, l'ouverture apparaît dessous, puis la grille s'efface.
const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

function grid(cols) {
  const w = Math.ceil(innerWidth / cols), rows = Math.ceil(innerHeight / w);
  const hi = css('--hi'), mid = css('--mid'), lo = css('--lo'), g = glowRGB();
  const cells = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    // Chaque pixel : dégradé + biseau clair/sombre façon pixel art + halo
    const d = el(`left:${x * w}px;top:${y * w}px;width:${w + 1}px;height:${w + 1}px;opacity:0;
      background:linear-gradient(135deg, ${hi}, ${mid} 55%, ${lo});
      box-shadow:0 0 ${w * .35}px rgba(${g},.75), inset ${w * .08}px ${w * .08}px 0 rgba(255,255,255,.35), inset -${w * .08}px -${w * .08}px 0 rgba(0,0,0,.3)`);
    cells.push({ d, x, y, cx: x * w + w / 2, cy: y * w + w / 2 });
  }
  return { cells, cols, rows, w };
}

// Petites étincelles carrées qui jaillissent du jeton (volontairement peu nombreuses)
function sparks(n = 12) {
  const o = origin(), hi = css('--hi'), g = glowRGB();
  for (let i = 0; i < n; i++) {
    const s = 5 + Math.random() * 6, a = Math.random() * Math.PI * 2, r = o.r * (1.2 + Math.random() * 1.4);
    const p = el(`left:${o.x - s / 2}px;top:${o.y - s / 2}px;width:${s}px;height:${s}px;background:${hi};box-shadow:0 0 ${s * 2}px rgba(${g},.9);z-index:2`);
    p.animate([
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: `translate(${Math.cos(a) * r}px,${Math.sin(a) * r}px) scale(.3) rotate(${Math.random() * 180}deg)`, opacity: 0 },
    ], { duration: 380 + Math.random() * 80, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' });
  }
}

const IN = 70, OUT = 70, SPREAD = 130; // 70 + 130 = 200 ms par phase
// order(c, G) renvoie 0..1 : le moment où le pixel apparaît dans la vague
async function pixels(order, { pop = false, flash = false, fall = false, outOrder } = {}) {
  sparks();
  if (flash) el('inset:0;background:#fff;z-index:3').animate([{ opacity: 0 }, { opacity: .35 }, { opacity: 0 }], { duration: 220, fill: 'forwards' });
  const G = grid(innerWidth < 640 ? 8 : 14);
  const inKF = fall
    ? c => [{ opacity: 0, transform: `translateY(-${G.w * 1.5}px)` }, { opacity: 1, transform: 'none' }]
    : pop
      ? () => [{ opacity: 0, transform: 'scale(0)' }, { opacity: 1, transform: 'scale(1.15)', offset: .7 }, { opacity: 1, transform: 'scale(1)' }]
      : flash
        ? () => [{ opacity: 0, transform: 'scale(1.4)' }, { opacity: 1, transform: 'scale(1)' }]
        : () => [{ opacity: 0, transform: 'scale(.4)' }, { opacity: 1, transform: 'scale(1)' }];
  await Promise.all(G.cells.map(c => c.d.animate(inKF(c), { duration: IN, delay: order(c, G) * SPREAD, easing: 'ease-out', fill: 'forwards' }).finished));
  showOpening();
  const out = outOrder || order;
  await Promise.all(G.cells.map(c => c.d.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.3)' }],
    { duration: OUT, delay: out(c, G) * SPREAD, easing: 'ease-in', fill: 'forwards' }).finished));
  return 0;
}

const dist = (c, G) => { const o = origin(), d = Math.hypot(c.cx - o.x, c.cy - o.y); return Math.min(1, d / far(o)); };
const TRANSITIONS = [
  ['Onde', 'Les pixels s\'allument en vague depuis le jeton, puis s\'éteignent dans le même sens',
    () => pixels(dist)],
  ['Pluie', 'Les pixels tombent colonne par colonne, façon Tetris',
    () => pixels((c, G) => (c.y / G.rows) * .6 + Math.random() * .4, { fall: true })],
  ['Spirale', 'Les pixels tournent autour du jeton en s\'allumant',
    () => pixels((c, G) => { const o = origin(); const a = (Math.atan2(c.cy - o.y, c.cx - o.x) + Math.PI) / (Math.PI * 2); return (a * .7 + dist(c, G) * .3); })],
  ['Scintillement', 'Les pixels s\'allument au hasard avec un éclat blanc',
    () => pixels(() => Math.random(), { flash: true })],
  ['Diagonale pop', 'Les pixels sautent en diagonale avec un petit rebond',
    () => pixels((c, G) => (c.x + c.y) / (G.cols + G.rows), { pop: true })],
  ['Implosion', 'Les pixels arrivent des bords vers le jeton, puis explosent vers l\'extérieur',
    () => pixels((c, G) => 1 - dist(c, G), { pop: true, outOrder: dist })],
];

let choice = 0;
try { choice = Math.min(+localStorage.getItem('takoras-pixel') || 0, TRANSITIONS.length - 1); } catch {}

function showOpening(fade = 0) {
  if (opening.classList.contains('on')) return;
  const p = PULLS[current];
  $('op-coin').innerHTML = p.img ? `<img src="${p.img}" alt="">` : coin(p.color, 200);
  opening.classList.add('on');
  opening.setAttribute('aria-hidden', 'false');
  if (fade) opening.animate([{ opacity: 0 }, { opacity: 1 }], { duration: fade });
}
function closeOpening() {
  opening.classList.remove('on');
  opening.setAttribute('aria-hidden', 'true');
  $('coin').style.visibility = '';
}

let busy = false;
async function runTransition(n) {
  if (busy) return;
  busy = true;
  $('op-tag').textContent = `Pull ${PULLS[current].name} ×${n}`;
  const t0 = performance.now();
  try {
    // Filet de sécurité : si le navigateur ne joue pas l'animation (onglet en arrière-plan…), on ouvre quand même
    const rest = await Promise.race([TRANSITIONS[choice][2](), done(DUR + 200).then(() => 0)]);
    showOpening();
    if (rest) await Promise.race([Promise.all([...fx.children].map(c => c.animate([{ opacity: 1 }, { opacity: 0 }], { duration: rest, fill: 'forwards' }).finished)), done(rest + 200)]);
  } finally {
    fx.innerHTML = '';
    document.querySelector('main').getAnimations().forEach(a => a.cancel());
    busy = false;
    window.lastTransitionMs = Math.round(performance.now() - t0);
  }
}

document.querySelectorAll('.pull-btn').forEach(b => b.addEventListener('click', () => runTransition(+b.dataset.n)));
$('op-back').addEventListener('click', closeOpening);
addEventListener('keydown', e => { if (e.key === 'Escape') closeOpening(); });

// Menu debug : taper « debug » n'importe où sur la page
function renderDebug() {
  $('debug-list').innerHTML = TRANSITIONS.map(([t, d], i) =>
    `<button class="dbg${i === choice ? ' on' : ''}" data-i="${i}"><b>${i + 1}</b><span>${t}<small>${d}</small></span></button>`).join('');
}
$('debug-list').addEventListener('click', e => {
  const b = e.target.closest('.dbg'); if (!b) return;
  choice = +b.dataset.i;
  try { localStorage.setItem('takoras-pixel', choice); } catch {}
  renderDebug();
});
$('debug-close').addEventListener('click', () => { $('debug').hidden = true; });
let typed = '';
addEventListener('keydown', e => {
  if (e.key.length !== 1 || e.target.closest('input, textarea')) return;
  typed = (typed + e.key.toLowerCase()).slice(-5);
  if (typed === 'debug') { $('debug').hidden = !$('debug').hidden; renderDebug(); typed = ''; }
});
