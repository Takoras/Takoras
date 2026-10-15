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

// Chaque transition couvre l'écran, l'écran d'ouverture apparaît dessous, puis la couche disparaît.
const TRANSITIONS = [
  ['Zoom dans le jeton', 'Le jeton fonce vers toi et remplit l\'écran', async () => {
    const o = origin(), img = $('coin').querySelector('img');
    const c = el(`left:${o.x - o.r}px;top:${o.y - o.r}px;width:${o.r * 2}px;height:${o.r * 2}px;border-radius:50%;background:rgb(${glowRGB()})`,
      img ? `<img src="${img.src}" style="width:100%;height:100%;image-rendering:pixelated">` : '');
    if (img) c.style.background = 'none';
    const s = far(o) / o.r * 1.4;
    await c.animate([{ transform: 'scale(1)' }, { transform: `scale(${s})` }], { duration: 280, easing: 'cubic-bezier(.6,0,.9,.4)', fill: 'forwards' }).finished;
    return 160;
  }],
  ['Flash blanc', 'Un éclair blanc très rapide', async () => {
    const f = el('inset:0;background:#fff;opacity:0');
    await f.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 120, easing: 'ease-in', fill: 'forwards' }).finished;
    return 320;
  }],
  ['Iris', 'Un cercle de couleur s\'ouvre depuis le jeton', async () => {
    const o = origin(), R = far(o);
    const c = el(`inset:0;background:radial-gradient(circle at ${o.x}px ${o.y}px, rgb(${glowRGB()}), #0d0d12 ${R}px)`);
    await c.animate([{ clipPath: `circle(0px at ${o.x}px ${o.y}px)` }, { clipPath: `circle(${R}px at ${o.x}px ${o.y}px)` }], { duration: 260, easing: 'cubic-bezier(.7,0,.3,1)', fill: 'forwards' }).finished;
    return 180;
  }],
  ['Rideau', 'Deux panneaux se ferment au centre puis s\'ouvrent', async () => {
    const col = `rgb(${glowRGB()})`;
    const l = el(`left:0;top:0;bottom:0;width:50%;background:${col}`), r = el(`right:0;top:0;bottom:0;width:50%;background:${col}`);
    const o = { duration: 220, easing: 'cubic-bezier(.7,0,.3,1)', fill: 'forwards' };
    await Promise.all([l.animate([{ transform: 'translateX(-100%)' }, { transform: 'none' }], o).finished, r.animate([{ transform: 'translateX(100%)' }, { transform: 'none' }], o).finished]);
    showOpening();
    await Promise.all([l.animate([{ transform: 'none' }, { transform: 'translateX(-100%)' }], o).finished, r.animate([{ transform: 'none' }, { transform: 'translateX(100%)' }], o).finished]);
    return 0;
  }],
  ['Balayage diagonal', 'Une bande en biais traverse l\'écran', async () => {
    const b = el(`top:-50%;left:-50%;width:200%;height:200%;background:linear-gradient(90deg, transparent 0 20%, #fff 20% 22%, rgb(${glowRGB()}) 22% 78%, #fff 78% 80%, transparent 80%);transform:rotate(-20deg)`);
    const a = b.animate([{ translate: '-100% 0' }, { translate: '0 0' }, { translate: '100% 0' }], { duration: 460, easing: 'cubic-bezier(.7,0,.3,1)', fill: 'forwards' });
    await done(230); showOpening(); await a.finished;
    return 0;
  }],
  ['Pixels', 'L\'écran se remplit de gros pixels (clin d\'œil au pixel art)', async () => {
    const n = 12, w = innerWidth / n, rows = Math.ceil(innerHeight / w), col = `rgb(${glowRGB()})`;
    const cells = [];
    for (let y = 0; y < rows; y++) for (let x = 0; x < n; x++) cells.push(el(`left:${x * w}px;top:${y * w}px;width:${w + 1}px;height:${w + 1}px;background:${col};opacity:0`));
    await Promise.all(cells.map(c => c.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 60, delay: Math.random() * 150, fill: 'forwards' }).finished));
    showOpening();
    await Promise.all(cells.map(c => c.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 60, delay: Math.random() * 150, fill: 'forwards' }).finished));
    return 0;
  }],
  ['Onde de choc', 'Un anneau part du jeton et l\'écran tremble', async () => {
    const o = origin(), R = far(o) * 2.2;
    const ring = el(`left:${o.x - R / 2}px;top:${o.y - R / 2}px;width:${R}px;height:${R}px;border-radius:50%;border:${R * .2}px solid rgb(${glowRGB()});box-shadow:0 0 80px rgb(${glowRGB()}) inset`);
    document.body.animate([{ transform: 'none' }, { transform: 'translate(6px,-4px)' }, { transform: 'translate(-6px,3px)' }, { transform: 'translate(4px,2px)' }, { transform: 'none' }], { duration: 200 });
    await ring.animate([{ transform: 'scale(0)', borderWidth: '2px' }, { transform: 'scale(1)', borderWidth: `${R * .5}px` }], { duration: 270, easing: 'cubic-bezier(.3,.7,.4,1)', fill: 'forwards' }).finished;
    return 180;
  }],
  ['Flou + zoom', 'La page se floute et avance, l\'ouverture apparaît en fondu', async () => {
    const page = document.querySelector('main');
    const a = page.animate([{ filter: 'blur(0)', transform: 'scale(1)' }, { filter: 'blur(14px)', transform: 'scale(1.12)' }], { duration: 230, easing: 'ease-in', fill: 'forwards' });
    await a.finished;
    showOpening(220);
    await done(220); a.cancel();
    return 0;
  }],
  ['Bandes', 'Des bandes horizontales glissent une à une', async () => {
    const n = 7, h = innerHeight / n, col = `rgb(${glowRGB()})`;
    const bars = Array.from({ length: n }, (_, i) => el(`left:0;right:0;top:${i * h}px;height:${h + 1}px;background:${col}`));
    await Promise.all(bars.map((b, i) => b.animate([{ transform: `translateX(${i % 2 ? '' : '-'}100%)` }, { transform: 'none' }], { duration: 140, delay: i * 14, easing: 'cubic-bezier(.7,0,.3,1)', fill: 'forwards' }).finished));
    showOpening();
    await Promise.all(bars.map((b, i) => b.animate([{ transform: 'none' }, { transform: `translateX(${i % 2 ? '-' : ''}100%)` }], { duration: 140, delay: i * 14, easing: 'cubic-bezier(.7,0,.3,1)', fill: 'forwards' }).finished));
    return 0;
  }],
  ['Pièce lancée', 'Le jeton fait un flip rapide et grossit avant de s\'ouvrir', async () => {
    const o = origin(), img = $('coin').querySelector('img');
    const c = el(`left:${o.x - o.r}px;top:${o.y - o.r}px;width:${o.r * 2}px;height:${o.r * 2}px`,
      img ? `<img src="${img.src}" style="width:100%;height:100%;image-rendering:pixelated">` : `<i class="coin" style="--s:${o.r * 2}px"></i>`);
    $('coin').style.visibility = 'hidden';
    const back = el(`inset:0;background:radial-gradient(circle at ${o.x}px ${o.y}px, rgba(${glowRGB()},.9), #0d0d12 70%);opacity:0`);
    fx.appendChild(c);
    back.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, fill: 'forwards' });
    await c.animate([
      { transform: 'perspective(600px) rotateY(0) scale(1)' },
      { transform: 'perspective(600px) rotateY(360deg) scale(1.6) translateY(-30px)', offset: .6 },
      { transform: 'perspective(600px) rotateY(540deg) scale(1.3)' },
    ], { duration: 340, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' }).finished;
    return 110;
  }],
];

let choice = 0;
try { choice = Math.min(+localStorage.getItem('takoras-transition') || 0, TRANSITIONS.length - 1); } catch {}

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
  try { localStorage.setItem('takoras-transition', choice); } catch {}
  renderDebug();
});
$('debug-close').addEventListener('click', () => { $('debug').hidden = true; });
let typed = '';
addEventListener('keydown', e => {
  if (e.key.length !== 1 || e.target.closest('input, textarea')) return;
  typed = (typed + e.key.toLowerCase()).slice(-5);
  if (typed === 'debug') { $('debug').hidden = !$('debug').hidden; renderDebug(); typed = ''; }
});
