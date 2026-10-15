// Ouverture d'un pull : le jeton « ? » et le compteur de chance qui monte à chaque clic (1/1 → 1/X).
// Le résultat est tiré dès l'ouverture ; les clics ne font que le révéler. On peut spammer pour aller vite.

// Jetons de la série Takoras — PROVISOIRES : même texture (template), seule la couleur du glow change.
const TEMPLATE = 'img/jetons/template.png';
const SERIES = {
  Takoras: [
    { name: 'Poussière', odds: 2, glow: '#9ca3af' },
    { name: 'Galet', odds: 4, glow: '#a8a29e' },
    { name: 'Bronze', odds: 10, glow: '#c2703d' },
    { name: 'Argent', odds: 25, glow: '#cbd5e1' },
    { name: 'Or', odds: 60, glow: '#f59e0b' },
    { name: 'Saphir', odds: 150, glow: '#0ea5e9' },
    { name: 'Rubis', odds: 400, glow: '#e11d48' },
    { name: 'Améthyste', odds: 1000, glow: '#a855f7' },
    { name: 'Aurore', odds: 2500, glow: '#ec4899' },
    { name: 'Néant', odds: 5000, glow: '#6366f1' },
    { name: 'Comète', odds: 10000, glow: '#22d3ee' },
    { name: 'Abysse', odds: 25000, glow: '#2563eb' },
    { name: 'Éternité', odds: 50000, glow: '#facc15' },
    { name: 'Takoras Prime', odds: 100000, glow: '#f0abfc' },
  ],
};
const SKIP = 1 / 5; // environ 1 clic sur 5 saute discrètement une étape

// Couleur du compteur selon la rareté atteinte
const TIERS = [[10, '200, 200, 210'], [50, '74, 222, 128'], [200, '56, 189, 248'], [1000, '167, 139, 250'], [5000, '251, 191, 36'], [25000, '244, 114, 182'], [Infinity, '240, 240, 255']];
const FAST = 60;   // en dessous de 1/60 : retournement direct, pas de pause
const RARE = 1000; // à partir de 1/1000 : zoom plus fort et révélation plus spectaculaire
const tierOf = v => TIERS.find(([max]) => v < max)[1];
const hexRGB = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).join(', ');
const jetonHTML = (j, size) =>
  `<img class="jeton" src="${TEMPLATE}" alt="${j.name}" style="width:${size}px;height:${size}px;filter:drop-shadow(0 0 ${Math.max(4, size / 8)}px ${j.glow})">`;

// Réglages de test (menu debug)
const debug = { luck: 1, force: '' };

// Tirage « 1 chance sur X », du plus rare au plus commun. La luck multiplie chaque chance.
function draw(list) {
  if (debug.force) return list.find(j => j.name === debug.force);
  const byRarity = [...list].sort((a, b) => b.odds - a.odds);
  return byRarity.find(j => Math.random() < debug.luck / j.odds) || byRarity[byRarity.length - 1];
}

// Valeurs affichées à chaque clic : monte doucement puis accélère (8 à 15 clics pour les jetons rares).
function steps(X) {
  if (X <= 1) return [];
  const n = Math.min(X - 1, Math.min(15, Math.round(4 + Math.log2(X) * .9)));
  const out = [];
  for (let i = 1; i <= n; i++) {
    const v = i === n ? X : Math.round(1 + (X - 1) * (i / n) ** 2.2 * (.9 + Math.random() * .2));
    out.push(Math.min(X, Math.max(v, (out[out.length - 1] || 1) + 1)));
  }
  return out.filter((v, i) => i === out.length - 1 || i === 0 || Math.random() > SKIP);
}

let run = null;
const opCoin = $('op-coin');

function startOpening() {
  const p = PULLS[current];
  const result = draw(SERIES[p.name] || SERIES.Takoras);
  run = { result, queue: steps(result.odds), shown: 1, done: false };
  $('op-tag').textContent = 'Pull ' + p.name;
  $('op-odds').classList.remove('bump');
  $('op-price').textContent = p.price;
  $('op-odds').textContent = '1/1';
  setTier(1);
  opening.classList.remove('hold', 'rare', 'revealed');
  opCoin.className = 'op-coin';
  opCoin.style.setProperty('--boost', 0);
  opCoin.innerHTML = '<div class="zoom"><div class="spin"><img src="img/jetons/mystere.png" alt="Jeton mystère"></div></div>';
  $('op-hint').textContent = 'Clique sur le jeton';
  $('op-stats').innerHTML = '';
}

function setTier(v) {
  opening.style.setProperty('--tier', tierOf(v));
  // Dès 1/2500 pendant le compteur : rayons pixel + poussière derrière le jeton
  if (v >= 2500 && bg.mode !== 'hold' && !opening.classList.contains('revealed')) {
    const [r, g, b] = tierOf(v).split(', ').map(Number);
    startBg({ odds: RARE, glow: '#' + [r, g, b].map(n => n.toString(16).padStart(2, '0')).join('') }, 'hold');
  }
  if (v < 2500 && bg.mode === 'hold') { stopBg(); bg.mode = ''; }
  opening.classList.toggle('t1000', v >= 1000);
  opening.classList.toggle('t2500', v >= 2500);
  opCoin.style.setProperty('--boost', v >= 1000 ? Math.min(1, .5 + Math.log10(v / 1000) * .7) : 0);
}

// Le compteur roule vite vers la nouvelle valeur ; un nouveau clic reprend là où il en est
let countAnim = 0;
function countTo(from, to, ms = 110) {
  const t0 = performance.now(), el = $('op-odds'), id = ++countAnim;
  el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
  (function step(t) {
    if (id !== countAnim) return;
    const k = Math.min(1, (t - t0) / ms);
    el.textContent = '1/' + Math.round(from + (to - from) * k).toLocaleString('fr');
    if (k < 1) requestAnimationFrame(step);
  })(t0);
}

// Tremblement très rapide qui s'amortit (à partir de 1/500)
function shake(power = 1) {
  const a = 9 * power, f = [1, -.8, .6, -.45, .3, -.18, .08, 0];
  opening.animate(f.map((k, i) => ({ transform: `translate(${a * k}px, ${a * k * (i % 2 ? .6 : -.6)}px)` })), { duration: 260, easing: 'ease-in' });
}

// Flash blanc doux (à partir de 1/5000)
function flash(power = .45, ms = 500) {
  opening.querySelectorAll('.op-flash').forEach(f => f.remove());
  const f = document.createElement('div');
  f.className = 'op-flash';
  f.style.cssText = 'position:absolute;inset:0;background:#fff;pointer-events:none';
  opening.appendChild(f);
  f.animate([{ opacity: power }, { opacity: 0 }], { duration: ms, easing: 'ease-out' }).finished.then(() => f.remove());
}

function burst(n = 5) {
  const r = opCoin.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
  const col = `rgb(${getComputedStyle(opening).getPropertyValue('--tier')})`;
  for (let i = 0; i < n; i++) {
    const s = document.createElement('i'), a = Math.random() * Math.PI * 2, d = r.width * (.55 + Math.random() * .3);
    s.className = 'op-spark';
    s.style.cssText = `left:${x}px;top:${y}px;background:${col}`;
    opening.appendChild(s);
    s.animate([{ transform: 'translate(-50%,-50%)', opacity: 1 }, { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d}px)) scale(.3)`, opacity: 0 }],
      { duration: 380, easing: 'cubic-bezier(.2,.7,.3,1)' }).finished.then(() => s.remove());
  }
}

// Effets selon le palier atteint par le clic
function effects(v) {
  if (v >= 500) shake(v >= 2500 ? 1.4 : 1);
  if (v >= 5000 && !run.flashed) { run.flashed = true; flash(); } // une seule fois par ouverture
  burst(v >= 1000 ? 9 : v >= 200 ? 6 : 4);
}

// Fiche du jeton (stats provisoires : plus il est rare, plus elles sont hautes)
function fillInfo(j) {
  const lvl = Math.log10(j.odds) / 5; // 0 → 1 pour 1/1 → 1/100 000
  const stat = (n, base) => { const v = Math.round(base * (.35 + lvl * .65) * (.85 + Math.random() * .3)); return [n, v, Math.min(100, v / base * 100)]; };
  $('op-name').textContent = j.name;
  $('op-rarity').textContent = '1/' + j.odds.toLocaleString('fr');
  $('op-stats').innerHTML = [stat('PV', 500), stat('Attaque', 120), stat('Défense', 120), stat('Vitesse', 100)]
    .map(([n, v, w]) => `<div class="stat"><span class="muted">${n}</span><div class="bar"><i data-w="${w}"></i></div><b>${v}</b></div>`).join('');
  requestAnimationFrame(() => requestAnimationFrame(() => $('op-stats').querySelectorAll('i').forEach(i => { i.style.width = i.dataset.w + '%'; })));
}

// Pause finale : le haut disparaît, zoom sur le jeton qui tremble, on clique pour révéler
function hold() {
  const r = run;
  r.holding = true;
  opening.classList.add('hold');
  opening.classList.toggle('rare', r.result.odds >= RARE);
  opCoin.classList.remove('hit');
  flash(.18, 260); // mini flash : le compteur ne montera plus
  $('op-hint').textContent = 'Clique pour révéler';
  setTimeout(() => { if (run === r) r.canReveal = true; }, 450); // évite de révéler par accident en spammant
}

// Révélation : le jeton tourne en se penchant, la face change à mi-chemin, puis il glisse à gauche et la fiche arrive
// Fond de la révélation, dessiné en pixel art en direct sur un petit canvas agrandi sans lissage.
// Plus le jeton est rare, plus le fond est chargé : bandes → rayons + poussière → étoiles + reflets.
const bg = { canvas: null, ctx: null, raf: 0, level: 0, rgb: [255, 255, 255], dust: [], stars: [] };
const PX = 6; // taille d'un « pixel » du fond à l'écran
function bgLevel(odds) { return odds >= 10000 ? 3 : odds >= RARE ? 2 : odds >= FAST ? 1 : 0; }

function startBg(j, mode = 'reveal') {
  bg.mode = mode;
  if (!bg.canvas) {
    bg.canvas = document.createElement('canvas');
    $('op-bg').appendChild(bg.canvas);
    bg.ctx = bg.canvas.getContext('2d');
  }
  bg.canvas.width = Math.ceil(innerWidth / PX);
  bg.canvas.height = Math.ceil(innerHeight / PX);
  bg.level = bgLevel(j.odds);
  bg.rgb = hexRGB(j.glow).split(', ').map(Number);
  const W = bg.canvas.width, H = bg.canvas.height;
  bg.dust = Array.from({ length: [0, 0, 26, 50][bg.level] }, () => ({ x: Math.random() * W, y: Math.random() * H, v: .04 + Math.random() * .1, a: Math.random() }));
  bg.stars = Array.from({ length: bg.level >= 3 ? 40 : 0 }, () => ({ x: Math.random() * W | 0, y: Math.random() * H | 0, p: Math.random() * 6 }));
  cancelAnimationFrame(bg.raf);
  const t0 = performance.now();
  const loop = t => { drawBg((t - t0) / 1000); bg.raf = requestAnimationFrame(loop); };
  bg.raf = requestAnimationFrame(loop);
}
function stopBg() { cancelAnimationFrame(bg.raf); bg.mode = ''; }

function drawBg(t) {
  const { ctx, level } = bg, W = bg.canvas.width, H = bg.canvas.height, [r, g, b] = bg.rgb;
  const col = a => `rgba(${r},${g},${b},${a})`;
  ctx.fillStyle = 'rgb(35,32,52)';
  ctx.fillRect(0, 0, W, H);

  // Centre des rayons : le jeton (il est à gauche une fois révélé)
  const c = opCoin.getBoundingClientRect(), cx = (c.left + c.width / 2) / PX, cy = (c.top + c.height / 2) / PX;

  // Rayons de lumière qui tournent lentement (à partir de 1/1000)
  if (level >= 2) {
    const n = 12, R = Math.hypot(W, H), turn = t * .08;
    for (let i = 0; i < n; i++) {
      const a0 = turn + i / n * Math.PI * 2, a1 = a0 + Math.PI / n * .55;
      ctx.fillStyle = col(level >= 3 ? .10 + .05 * Math.sin(t * 2 + i) : .08);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a0) * R, cy + Math.sin(a0) * R);
      ctx.lineTo(cx + Math.cos(a1) * R, cy + Math.sin(a1) * R);
      ctx.fill();
    }
  }

  // Bandes en escalier qui glissent doucement (l'escalier vient de l'agrandissement sans lissage)
  const slope = -.1, thick = Math.max(10, H * .09);
  const bands = level === 0 ? [[.2, .35]] : level >= 3 ? [[.16, 1], [.86, 1], [.5, .25], [.03, .3]] : [[.18, 1], [.84, 1]];
  if (bg.mode !== 'hold') bands.forEach(([pos, alpha], k) => {
    const shift = Math.sin(t * .35 + k) * 3;
    const y0 = H * pos + shift - slope * W / 2;
    ctx.fillStyle = col(alpha * (level === 0 ? 1 : .95));
    ctx.beginPath();
    ctx.moveTo(0, y0); ctx.lineTo(W, y0 + slope * W); ctx.lineTo(W, y0 + slope * W + thick); ctx.lineTo(0, y0 + thick);
    ctx.fill();
    // Reflet blanc qui parcourt la bande (à partir de 1/10 000)
    if (level >= 3 && alpha === 1) {
      const x = ((t * 40 + k * W / 2) % (W + 60)) - 30;
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      ctx.beginPath();
      ctx.moveTo(x, y0 + slope * x); ctx.lineTo(x + 8, y0 + slope * (x + 8)); ctx.lineTo(x + 2, y0 + slope * (x + 2) + thick); ctx.lineTo(x - 6, y0 + slope * (x - 6) + thick);
      ctx.fill();
    }
  });

  // Poussière de pixels qui monte (à partir de 1/1000)
  bg.dust.forEach(d => {
    d.y -= d.v; if (d.y < -2) { d.y = H + 2; d.x = Math.random() * W; }
    ctx.fillStyle = col(.35 + .35 * Math.sin(t * 2 + d.a * 6));
    ctx.fillRect(d.x | 0, d.y | 0, 1, 1);
  });

  // Étoiles qui scintillent en croix (à partir de 1/10 000)
  bg.stars.forEach(s => {
    const k = Math.max(0, Math.sin(t * 1.6 + s.p));
    if (k < .3) return;
    ctx.fillStyle = `rgba(255,255,255,${k})`;
    ctx.fillRect(s.x, s.y, 1, 1);
    if (k > .85) { ctx.fillRect(s.x - 1, s.y, 3, 1); ctx.fillRect(s.x, s.y - 1, 1, 3); }
  });
}

// Révélation : clic → la face change direct, le jeton part à gauche d'un coup sec, la fiche apparaît à droite
function reveal() {
  const r = run, j = r.result;
  r.done = true;
  opening.classList.remove('hold');
  opCoin.classList.add('done');
  $('op-hint').textContent = '';
  opening.style.setProperty('--tier', hexRGB(j.glow));
  startBg(j);
  opCoin.querySelector('.spin').innerHTML = `<img src="${TEMPLATE}" alt="${j.name}" style="filter:drop-shadow(0 0 18px ${j.glow})">`;
  fillInfo(j);
  opening.classList.toggle('rare', j.odds >= RARE);
  opening.classList.add('revealed');
  burst(j.odds >= RARE ? 14 : 8);
  if (j.odds >= RARE) flash(.3, 350);
  setTimeout(() => { if (run === r) shake(j.odds >= RARE ? .8 : .45); }, 300); // impact à l'arrivée
  addToHistory(j);
}

function addToHistory(j) {
  const row = document.createElement('div');
  row.className = 'h-row';
  row.innerHTML = `${jetonHTML(j, 26)}<div>${j.name}<small>à l'instant</small></div><span class="muted">1/${j.odds.toLocaleString('fr')}</span>`;
  $('hist').prepend(row);
  while ($('hist').children.length > 6) $('hist').lastElementChild.remove();
}

function tap() {
  if (!run || run.done) return;
  if (run.holding) { if (run.canReveal) reveal(); return; }
  if (!run.queue.length) return; // entre le dernier palier et la pause
  const next = run.queue.shift();
  countTo(run.shown, next);
  run.shown = next;
  setTier(next);
  opCoin.classList.remove('hit'); void opCoin.offsetWidth; opCoin.classList.add('hit');
  effects(next);
  $('op-hint').textContent = '';
  if (!run.queue.length) {
    if (run.result.odds < FAST) { run.done = true; setTimeout(reveal, 120); }
    else setTimeout(hold, 200);
  }
}

opCoin.addEventListener('pointerdown', e => { e.preventDefault(); tap(); }); // pointerdown = réagit dès l'appui, idéal pour spammer
addEventListener('keydown', e => {
  if (!opening.classList.contains('on') || (e.key !== ' ' && e.key !== 'Enter') || e.target.closest('button:not(#op-coin), select')) return;
  e.preventDefault();
  tap();
});
$('op-again').addEventListener('click', () => { closeOpening(); runTransition(); });

// Menu debug
const LUCKS = [1, 2, 5, 10, 100, 1000];
const FX = [['Shake', () => shake()], ['Vignette', () => opening.classList.toggle('t1000')], ['Rayons', () => opening.classList.toggle('t2500')], ['Flash', flash]];
function renderDebug() {
  $('dbg-luck').innerHTML = LUCKS.map(l => `<button class="${l === debug.luck ? 'on' : ''}" data-l="${l}">×${l}</button>`).join('');
  $('dbg-force').innerHTML = '<option value="">Aléatoire</option>' + SERIES.Takoras.map(j =>
    `<option value="${j.name}"${j.name === debug.force ? ' selected' : ''}>${j.name} · 1/${j.odds.toLocaleString('fr')}</option>`).join('');
  $('dbg-fx').innerHTML = FX.map(([n], i) => `<button data-f="${i}">${n}</button>`).join('');
}
$('dbg-luck').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { debug.luck = +b.dataset.l; renderDebug(); } });
$('dbg-force').addEventListener('change', e => { debug.force = e.target.value; });
$('dbg-fx').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (!opening.classList.contains('on')) { startOpening(); opening.classList.add('on'); }
  FX[+b.dataset.f][1]();
});
$('dbg-open').addEventListener('click', () => { closeOpening(); runTransition(); });
