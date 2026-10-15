// Données d'exemple : à remplacer par Supabase plus tard
const COLORS = {
  takoras: ['#c7d8ff', '#8ea8f7', '#2a2f6b', '120, 140, 240'],
  violet: ['#ddd6fe', '#8b5cf6', '#3b1a7a', '139, 92, 246'],
  feu:    ['#fed7aa', '#f97316', '#7c2d12', '249, 115, 22'],
  eau:    ['#bae6fd', '#0ea5e9', '#0c4a6e', '14, 165, 233'],
  terre:  ['#d9f99d', '#65a30d', '#365314', '101, 163, 13'],
  foudre: ['#fef3c7', '#f59e0b', '#78350f', '245, 158, 11'],
  rose:   ['#fce7f3', '#ec4899', '#831843', '236, 72, 153'],
};

const hoursFromNow = h => Date.now() + h * 3600e3;
const PULLS = [
  { group: 'Permanents', name: 'Takoras', color: 'takoras', price: 100, img: 'img/jetons/takoras.png' },
  { group: 'Permanents', name: 'Feu', color: 'feu', price: 150 },
  { group: 'Permanents', name: 'Eau', color: 'eau', price: 150 },
  { group: 'Permanents', name: 'Terre', color: 'terre', price: 150 },
  { group: 'Limités', name: 'Éclipse', color: 'rose', price: 250, ends: hoursFromNow(31.4) },
  { group: 'Limités', name: 'Nova', color: 'foudre', price: 300, ends: hoursFromNow(5.2) },
  { group: 'Week-end', name: 'Week-end', color: 'foudre', price: 200, weekend: true },
];

const coinStyle = c => { const [hi, mid, lo, g] = COLORS[c]; return `--hi:${hi};--mid:${mid};--lo:${lo};--glow:${g}`; };
const IMGS = Object.fromEntries(PULLS.filter(p => p.img).map(p => [p.color, p.img]));
const coin = (c, s, t = '') => IMGS[c]
  ? `<img class="coin-img" src="${IMGS[c]}" alt="" style="--glow:${COLORS[c][3]};width:${s}px;height:${s}px">`
  : `<i class="coin" style="${coinStyle(c)};--s:${s}px">${t}</i>`;
const $ = id => document.getElementById(id);

// Types de pull
let current = 0;
function renderTypes() {
  let html = '', last = '';
  PULLS.forEach((p, i) => {
    if (p.group !== last) { html += `<div class="group">${p.group}</div>`; last = p.group; }
    const badge = p.ends ? '<span class="badge lim">Limité</span>' : p.weekend ? '<span class="badge we">Sam–Dim</span>' : '';
    html += `<button class="type${i === current ? ' on' : ''}" data-i="${i}" style="${coinStyle(p.color)}">${coin(p.color, 30)}<div><b>${p.name}</b><small>${p.price} ◆</small></div>${badge}</button>`;
  });
  $('types').innerHTML = html;
}
function select(i) {
  current = i;
  const p = PULLS[i];
  document.documentElement.style.cssText = coinStyle(p.color);
  $('coin').classList.toggle('has-img', !!p.img);
  $('coin').innerHTML = p.img
    ? `<div class="tilt"><img src="${p.img}" alt="Jeton ${p.name}"><i class="glare" style="-webkit-mask-image:url(${p.img});mask-image:url(${p.img})"></i></div>`
    : '<span>T</span>';
  document.querySelectorAll('.float').forEach(f => {
    f.classList.toggle('has-img', !!p.img);
    f.innerHTML = p.img ? `<img src="${p.img}" alt="">` : '';
  });
  $('name').textContent = 'Pull ' + p.name;
  $('tag').textContent = p.ends ? 'Limité' : p.weekend ? 'Week-end' : 'Permanent';
  $('p1').textContent = p.price;
  $('p10').textContent = (p.price * 9).toLocaleString('fr');
  renderTypes();
  tick();
}
// Le jeton regarde la souris + reflet de lumière (tout est lissé image par image)
const hero = $('coin');
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
let over = false, mx = .5, my = .5;
const cur = { rx: 0, ry: 0, s: 1, g: 0 };
hero.addEventListener('pointermove', e => {
  const r = hero.getBoundingClientRect();
  mx = (e.clientX - r.left) / r.width; my = (e.clientY - r.top) / r.height; over = true;
});
hero.addEventListener('pointerleave', () => { over = false; });
function frame(t) {
  const tilt = hero.querySelector('.tilt');
  if (tilt) {
    const wave = still ? 0 : Math.cos(t / 16000 * Math.PI * 2);
    const tgt = over
      ? { rx: (.5 - my) * 40, ry: (mx - .5) * 40, s: 1.05, g: 1 }
      : { rx: 6 * wave, ry: -22 * wave, s: 1, g: 0 };
    const k = over ? .12 : .05;
    for (const key in cur) cur[key] += (tgt[key] - cur[key]) * k;
    tilt.style.transform = `rotateX(${cur.rx.toFixed(2)}deg) rotateY(${cur.ry.toFixed(2)}deg) scale(${cur.s.toFixed(3)})`;
    hero.style.setProperty('--mx', (mx * 100).toFixed(1) + '%');
    hero.style.setProperty('--my', (my * 100).toFixed(1) + '%');
    hero.style.setProperty('--g', cur.g.toFixed(3));
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

$('types').addEventListener('click', e => { const b = e.target.closest('.type'); if (b) select(+b.dataset.i); });

function tick() {
  const p = PULLS[current];
  if (p.ends) {
    const s = Math.max(0, Math.floor((p.ends - Date.now()) / 1000));
    const f = n => String(n).padStart(2, '0');
    $('timer').innerHTML = `Se termine dans <b>${f(Math.floor(s / 3600))}:${f(Math.floor(s / 60) % 60)}:${f(s % 60)}</b>`;
  } else if (p.weekend) {
    $('timer').textContent = 'Disponible seulement le samedi et le dimanche';
  } else {
    $('timer').textContent = 'Toujours disponible';
  }
}
setInterval(tick, 1000);

// Historique perso
const HIST = [['Takoras', 'takoras', 1, 2], ['Feu', 'feu', 10, 7], ['Takoras', 'takoras', 1, 15], ['Eau', 'eau', 1, 42], ['Éclipse', 'rose', 10, 60], ['Takoras', 'takoras', 1, 120]];
$('hist').innerHTML = HIST.map(([n, c, x, m]) =>
  `<div class="h-row">${coin(c, 26)}<div>Pull ${n} ×${x}<small>il y a ${m < 60 ? m + ' min' : Math.round(m / 60) + ' h'}</small></div><span class="muted">?</span></div>`).join('');

// En direct
const NAMES = ['Ryo', 'Kenji', 'Mika', 'Asc', 'Lenn', 'Nova', 'Pharysse', 'Ratek', 'Yuna', 'Sora', 'Kaito', 'Hina'];
const LIVE = NAMES.map((n, i) => { const p = PULLS[i % PULLS.length]; return `<div class="lv"><span class="av">${n[0]}</span><span><b>${n}</b> <span class="muted">a pull</span> ${p.name}</span>${coin(p.color, 24)}</div>`; }).join('');
$('live').innerHTML = LIVE + LIVE;

// Classement
const KINDS = [
  { id: 'pulls', label: 'Pulls ouverts', unit: 'pulls' },
  { id: 'gain', label: 'Meilleur gain', unit: '◆' },
  { id: 'jetons', label: 'Jetons totaux', unit: '◆' },
  { id: 'collec', label: 'Collection', unit: 'objets' },
];
const PLAYERS = ['Pharysse', 'Ratek', 'Shutain', 'Mika', 'Kenji', 'Yuna', 'Sora', 'Lenn', 'Asc', 'Kaito'];
let kind = 0, period = 'week';
const seed = (a, b) => { let x = Math.sin(a * 97 + b * 13) * 1e4; return x - Math.floor(x); };
function rows() {
  const base = { pulls: 900, gain: 12000, jetons: 380000, collec: 140 }[KINDS[kind].id] * (period === 'all' ? 9 : 1);
  return PLAYERS.map((n, i) => ({ n, v: Math.round(base * (1 - i * .08) * (.9 + seed(i, kind + (period === 'all' ? 7 : 0)) * .1)) }))
    .sort((a, b) => b.v - a.v);
}
function renderBoard() {
  $('kinds').innerHTML = KINDS.map((k, i) => `<button class="chip${i === kind ? ' on' : ''}" data-k="${i}">${k.label}</button>`).join('');
  const r = rows(), u = KINDS[kind].unit, fmt = v => v.toLocaleString('fr') + ' ' + u;
  $('podium').innerHTML = [[1, 'p2'], [0, 'p1'], [2, 'p3']].map(([i, c]) =>
    `<div class="pod ${c}"><span class="av">${r[i].n[0]}</span><b>${r[i].n}</b><small>${fmt(r[i].v)}</small><div class="step">${i + 1}</div></div>`).join('');
  $('list').innerHTML = r.slice(3).map((p, i) =>
    `<div class="li"><span class="rank">${i + 4}</span><span class="av">${p.n[0]}</span><span>${p.n}</span><span class="val">${fmt(p.v)}</span></div>`).join('')
    + `<div class="li me"><span class="rank">42</span><span class="av">T</span><span>Toi</span><span class="val">${fmt(Math.round(r[9].v * .3))}</span></div>`;
}
$('kinds').addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) { kind = +b.dataset.k; renderBoard(); } });
$('period').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  period = b.dataset.p;
  [...$('period').children].forEach(x => x.classList.toggle('on', x === b));
  renderBoard();
});

select(0);
renderBoard();
