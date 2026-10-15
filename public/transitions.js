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

// Transition « Pixels » : de petits pixels naissent sur les bords et grossissent vers le jeton
// jusqu'à couvrir l'écran, l'ouverture apparaît dessous, puis ils s'effacent depuis le centre :
// vite au centre, de plus en plus lentement vers les bords.
const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

function grid(cols) {
  const w = Math.ceil(innerWidth / cols), rows = Math.ceil(innerHeight / w);
  const color = css('--mid');
  const cells = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const d = el(`left:${x * w}px;top:${y * w}px;width:${w + 1}px;height:${w + 1}px;transform:scale(0);background:${color}`);
    cells.push({ d, cx: x * w + w / 2, cy: y * w + w / 2 });
  }
  return cells;
}

// Petits carrés qui jaillissent du jeton (peu nombreux, sans glow)
function sparks(n = 12) {
  const o = center(), tints = [css('--hi'), css('--mid')];
  for (let i = 0; i < n; i++) {
    const s = 5 + Math.random() * 6, a = Math.random() * Math.PI * 2, r = o.r * (1.2 + Math.random() * 1.4);
    el(`left:${o.x - s / 2}px;top:${o.y - s / 2}px;width:${s}px;height:${s}px;background:${tints[i % 2]};z-index:2`).animate([
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: `translate(${Math.cos(a) * r}px,${Math.sin(a) * r}px) scale(.3)`, opacity: 0 },
    ], { duration: 380 + Math.random() * 80, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' });
  }
}

// Centre exact de l'écran : la transition part du milieu, là où le jeton de l'ouverture apparaît
const center = () => ({ x: innerWidth / 2, y: innerHeight / 2, r: Math.min(120, innerWidth * .13) });

async function onde() {
  sparks();
  const o = center(), R = far(o);
  const cells = grid(innerWidth < 640 ? 10 : 18);
  const d = c => Math.min(1, Math.hypot(c.cx - o.x, c.cy - o.y) / R); // 0 = jeton, 1 = bord
  // Entrée : des bords vers le centre (170 ms max)
  await Promise.all(cells.map(c => c.d.animate([{ transform: 'scale(0)' }, { transform: 'scale(1)' }],
    { duration: 60, delay: (1 - d(c)) * 110, easing: 'ease-out', fill: 'forwards' }).finished));
  showOpening();
  sfx.evaporate();
  // Sortie : désintégration. Les pixels passent sur une couche à part (qui se nettoie seule)
  // pour que l'ouverture soit déjà utilisable : instantané au centre, jusqu'à ~3 s sur les bords.
  const layer = document.createElement('div');
  layer.className = 'fx dust';
  document.body.appendChild(layer);
  cells.forEach(c => layer.appendChild(c.d));
  Promise.all(cells.map(c => {
    const k = d(c), r = Math.random();
    return c.d.animate([
      { opacity: 1, transform: 'translate(0,0) scale(1)' },
      { opacity: 0, transform: `translate(${(r - .5) * 16 * k}px,${-r * 24 * k}px) scale(${.5 + r * .3})` },
    ], { duration: 120 + k ** 1.5 * 1400 + r * 300 * k, delay: k * k * 900 + Math.random() * 250 * k, easing: 'ease-out', fill: 'forwards' }).finished;
  })).finally(() => layer.remove());
  return 0;
}

const TRANSITIONS = [
  ['Pixels', 'Des bords vers le jeton, puis se désintègre du centre vers les bords', onde],
];

let choice = 0;

function showOpening(fade = 0) {
  if (opening.classList.contains('on')) return;
  startOpening();
  document.documentElement.classList.add('lock'); // la page derrière ne défile plus
  opening.classList.add('on');
  opening.setAttribute('aria-hidden', 'false');
  if (fade) opening.animate([{ opacity: 0 }, { opacity: 1 }], { duration: fade });
}
function closeOpening() {
  document.querySelectorAll('.dust').forEach(l => l.remove());
  if (typeof stopBg === 'function') stopBg();
  if (typeof endSession === 'function') endSession();
  document.documentElement.classList.remove('lock');
  opening.classList.remove('on');
  opening.setAttribute('aria-hidden', 'true');
  $('coin').style.visibility = '';
}

let busy = false;
async function runTransition() {
  if (busy) return;
  busy = true;
  if (SETTINGS.speed === 'instant') { showOpening(); busy = false; return; } // pas de transition en instantané
  sfx.corrupt();
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

['wheel', 'touchmove'].forEach(t => opening.addEventListener(t, e => { if (!opening.classList.contains('recap')) e.preventDefault(); }, { passive: false })); // pas de défilement derrière
addEventListener('keydown', e => { if (e.key === 'Escape') leave(); });

// Menu debug : taper « debug » n'importe où sur la page (le contenu est géré dans opening.js)
$('debug-close').addEventListener('click', () => { $('debug').hidden = true; });
let typed = '';
addEventListener('keydown', e => {
  if (e.key.length !== 1 || e.target.closest?.('input, textarea, select')) return;
  typed = (typed + e.key.toLowerCase()).slice(-5);
  if (typed === 'debug') { $('debug').hidden = !$('debug').hidden; renderDebug(); typed = ''; }
});
