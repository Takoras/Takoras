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
  opening.classList.remove('hold', 'rare', 'revealed', 'fancy');
  opCoin.className = 'op-coin';
  opCoin.style.setProperty('--boost', 0);
  opCoin.innerHTML = '<div class="zoom"><div class="spin"><img src="img/jetons/mystere.png" alt="Jeton mystère"></div></div>';
  $('op-hint').textContent = 'Clique sur le jeton';
  $('op-stats').innerHTML = '';
}

function setTier(v) {
  opening.style.setProperty('--tier', tierOf(v));
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
function flash() {
  opening.querySelectorAll('.op-flash').forEach(f => f.remove());
  const f = document.createElement('div');
  f.className = 'op-flash';
  f.style.cssText = 'position:absolute;inset:0;background:#fff;pointer-events:none';
  opening.appendChild(f);
  f.animate([{ opacity: .45 }, { opacity: 0 }], { duration: 500, easing: 'ease-out' }).finished.then(() => f.remove());
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
  $('op-hint').textContent = 'Clique pour révéler';
  setTimeout(() => { if (run === r) r.canReveal = true; }, 450); // évite de révéler par accident en spammant
}

// Révélation : le jeton tourne en se penchant, la face change à mi-chemin, puis il glisse à gauche et la fiche arrive
async function reveal(fast) {
  const r = run, j = r.result;
  r.done = true;
  const spin = opCoin.querySelector('.spin'), rare = j.odds >= RARE;
  opening.classList.remove('hold');
  opCoin.classList.add('done');
  $('op-hint').textContent = '';
  const swap = () => {
    if (run !== r) return;
    opening.style.setProperty('--tier', hexRGB(j.glow));
    spin.innerHTML = `<img src="${TEMPLATE}" alt="${j.name}" style="filter:drop-shadow(0 0 18px ${j.glow})">`;
  };
  if (fast) {
    await spin.animate([{ transform: 'rotateY(0)' }, { transform: 'rotateY(90deg)' }], { duration: 110, easing: 'ease-in' }).finished;
    swap();
    await spin.animate([{ transform: 'rotateY(-90deg)' }, { transform: 'rotateY(0)' }], { duration: 150, easing: 'ease-out' }).finished;
  } else {
    await spin.animate([{ transform: 'rotateZ(0) rotateY(0)' }, { transform: 'rotateZ(-8deg) rotateY(90deg)' }], { duration: rare ? 420 : 300, easing: 'ease-in' }).finished;
    swap();
    if (rare) { flash(); shake(1.2); }
    burst(rare ? 18 : 10);
    await spin.animate([
      { transform: 'rotateZ(-8deg) rotateY(90deg) scale(1)' },
      { transform: 'rotateZ(-6deg) rotateY(360deg) scale(1.12)', offset: .75 },
      { transform: 'rotateZ(-6deg) rotateY(360deg) scale(1)' },
    ], { duration: rare ? 900 : 650, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' }).finished;
  }
  if (run !== r) return;
  fillInfo(j);
  opening.classList.toggle('fancy', j.odds >= FAST);
  opening.classList.add('revealed');
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
  if (run.holding) { if (run.canReveal) reveal(false); return; }
  if (!run.queue.length) return; // entre le dernier palier et la pause
  const next = run.queue.shift();
  countTo(run.shown, next);
  run.shown = next;
  setTier(next);
  opCoin.classList.remove('hit'); void opCoin.offsetWidth; opCoin.classList.add('hit');
  effects(next);
  $('op-hint').textContent = '';
  if (!run.queue.length) {
    if (run.result.odds < FAST) { run.done = true; setTimeout(() => reveal(true), 120); }
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
