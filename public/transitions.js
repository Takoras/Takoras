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

// Transition « Pixels · Onde » : de petits pixels naissent en vague depuis le jeton et grossissent
// jusqu'à couvrir l'écran, l'ouverture apparaît dessous, puis ils rapetissent et disparaissent.
const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

function grid(cols) {
  const w = Math.ceil(innerWidth / cols), rows = Math.ceil(innerHeight / w);
  const tints = [css('--hi'), css('--mid'), css('--lo')];
  const cells = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const d = el(`left:${x * w}px;top:${y * w}px;width:${w + 1}px;height:${w + 1}px;transform:scale(0);background:${tints[Math.floor(Math.random() * 3)]}`);
    cells.push({ d, cx: x * w + w / 2, cy: y * w + w / 2 });
  }
  return cells;
}

// Petits carrés qui jaillissent du jeton (peu nombreux, sans glow)
function sparks(n = 12) {
  const o = origin(), tints = [css('--hi'), css('--mid')];
  for (let i = 0; i < n; i++) {
    const s = 5 + Math.random() * 6, a = Math.random() * Math.PI * 2, r = o.r * (1.2 + Math.random() * 1.4);
    el(`left:${o.x - s / 2}px;top:${o.y - s / 2}px;width:${s}px;height:${s}px;background:${tints[i % 2]};z-index:2`).animate([
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: `translate(${Math.cos(a) * r}px,${Math.sin(a) * r}px) scale(.3)`, opacity: 0 },
    ], { duration: 380 + Math.random() * 80, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' });
  }
}

const GROW = 80, SPREAD = 120; // 80 + 120 = 200 ms par phase
async function onde() {
  sparks();
  const o = origin(), R = far(o);
  const cells = grid(innerWidth < 640 ? 10 : 18);
  const delay = c => Math.min(1, Math.hypot(c.cx - o.x, c.cy - o.y) / R) * SPREAD;
  await Promise.all(cells.map(c => c.d.animate([{ transform: 'scale(0)' }, { transform: 'scale(1)' }],
    { duration: GROW, delay: delay(c), easing: 'ease-out', fill: 'forwards' }).finished));
  showOpening();
  await Promise.all(cells.map(c => c.d.animate([{ transform: 'scale(1)' }, { transform: 'scale(0)' }],
    { duration: GROW, delay: delay(c), easing: 'ease-in', fill: 'forwards' }).finished));
  return 0;
}

const TRANSITIONS = [
  ['Pixels · Onde', 'Petits pixels qui grossissent en vague depuis le jeton', onde],
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
