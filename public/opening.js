// Ouverture d'un pull : le jeton « ? » et le compteur de chance qui monte à chaque clic (1/1 → 1/X).
// Le résultat est tiré dès l'ouverture ; les clics ne font que le révéler petit à petit.

// Jetons de la série Takoras — PROVISOIRES (noms, chances et couleurs à remplacer par les vrais dessins)
const SERIES = {
  Takoras: [
    { name: 'Poussière', odds: 2, c: ['#e5e7eb', '#9ca3af', '#374151'] },
    { name: 'Galet', odds: 4, c: ['#e7e5e4', '#a8a29e', '#44403c'] },
    { name: 'Bronze', odds: 10, c: ['#fed7aa', '#c2703d', '#5c2a0e'] },
    { name: 'Argent', odds: 25, c: ['#f8fafc', '#cbd5e1', '#475569'] },
    { name: 'Or', odds: 60, c: ['#fef3c7', '#f59e0b', '#78350f'] },
    { name: 'Saphir', odds: 150, c: ['#bae6fd', '#0ea5e9', '#0c4a6e'] },
    { name: 'Rubis', odds: 400, c: ['#fecaca', '#e11d48', '#4c0519'] },
    { name: 'Améthyste', odds: 1000, c: ['#e9d5ff', '#a855f7', '#3b0764'] },
    { name: 'Aurore', odds: 2500, c: ['#fbcfe8', '#ec4899', '#500724'] },
    { name: 'Néant', odds: 5000, c: ['#c7d2fe', '#312e81', '#020617'] },
  ],
};

// Couleur du compteur selon la rareté atteinte
const TIERS = [[10, '200, 200, 210'], [50, '74, 222, 128'], [200, '56, 189, 248'], [1000, '167, 139, 250'], [5000, '251, 191, 36'], [Infinity, '244, 114, 182']];
const tierOf = v => TIERS.find(([max]) => v < max)[1];

// Tirage façon « 1 chance sur X » : on teste du plus rare au plus commun
function draw(list) {
  const byRarity = [...list].sort((a, b) => b.odds - a.odds);
  return byRarity.find(j => Math.random() < 1 / j.odds) || byRarity[byRarity.length - 1];
}

// Les valeurs affichées à chaque clic : monte doucement puis accélère (8 à 15 clics pour les jetons rares).
// 1 clic sur 10 environ saute discrètement une étape, juste pour casser la monotonie (n'influe pas sur le résultat).
function steps(X) {
  if (X <= 1) return [];
  const n = Math.min(X - 1, Math.min(15, Math.round(4 + Math.log2(X) * .9)));
  const out = [];
  for (let i = 1; i <= n; i++) {
    const v = i === n ? X : Math.round(1 + (X - 1) * (i / n) ** 2.2 * (.9 + Math.random() * .2));
    out.push(Math.min(X, Math.max(v, (out[out.length - 1] || 1) + 1)));
  }
  return out.filter((v, i) => i === out.length - 1 || i === 0 || Math.random() > .1);
}

const jetonHTML = (j, size) => `<i class="coin" style="--hi:${j.c[0]};--mid:${j.c[1]};--lo:${j.c[2]};--glow:${hexRGB(j.c[1])};--s:${size}px"></i>`;
const hexRGB = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).join(', ');

let run = null; // { result, queue, shown, done }
const opCoin = $('op-coin');

function startOpening() {
  const p = PULLS[current];
  const result = draw(SERIES[p.name] || SERIES.Takoras);
  run = { result, queue: steps(result.odds), shown: 1, done: false };
  $('op-tag').textContent = 'Pull ' + p.name;
  $('op-price').textContent = p.price;
  $('op-odds').textContent = '1/1';
  opening.style.setProperty('--tier', tierOf(1));
  opCoin.className = 'op-coin';
  opCoin.innerHTML = '<div class="spin"><img src="img/jetons/mystere.png" alt="Jeton mystère"></div>';
  $('op-hint').textContent = 'Clique sur le jeton';
  $('op-name').textContent = '';
  $('op-actions').hidden = true;
}

function countTo(from, to, ms = 160) {
  const t0 = performance.now(), el = $('op-odds');
  el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
  (function step(t) {
    const k = Math.min(1, (t - t0) / ms);
    el.textContent = '1/' + Math.round(from + (to - from) * k).toLocaleString('fr');
    if (k < 1) requestAnimationFrame(step);
  })(t0);
  opening.style.setProperty('--tier', tierOf(to));
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
      { duration: 420, easing: 'cubic-bezier(.2,.7,.3,1)' }).finished.then(() => s.remove());
  }
}

function reveal() {
  run.done = true;
  const r = run;
  const j = run.result, size = opCoin.getBoundingClientRect().width;
  opCoin.classList.remove('hit');
  opCoin.classList.add('flip', 'done');
  setTimeout(() => { opCoin.querySelector('.spin').innerHTML = jetonHTML(j, size); burst(12); }, 250);
  setTimeout(() => {
    if (run !== r) return; // l'ouverture a été fermée entre-temps
    $('op-name').textContent = j.name;
    $('op-hint').textContent = 'Ajouté à ta collection';
    $('op-actions').hidden = false;
    addToHistory(j);
  }, 500);
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
  if (!run.queue.length) return reveal();
  const next = run.queue.shift();
  countTo(run.shown, next);
  run.shown = next;
  opCoin.classList.remove('hit'); void opCoin.offsetWidth; opCoin.classList.add('hit');
  burst(next >= 200 ? 7 : 4);
  $('op-hint').textContent = '';
  if (!run.queue.length) { run.done = true; setTimeout(reveal, 450); }
}

opCoin.addEventListener('click', tap);
addEventListener('keydown', e => {
  if (!opening.classList.contains('on') || (e.key !== ' ' && e.key !== 'Enter') || e.target.closest('button:not(#op-coin)')) return;
  e.preventDefault();
  tap();
});
$('op-again').addEventListener('click', () => { closeOpening(); runTransition(); });
