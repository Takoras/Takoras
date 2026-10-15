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
  { group: t('grp_perm'), name: 'Takoras', color: 'takoras', price: 100, free: true, img: 'img/jetons/takoras.png' },
  { group: t('grp_perm'), name: 'Feu', color: 'feu', price: 150 },
  { group: t('grp_perm'), name: 'Eau', color: 'eau', price: 150 },
  { group: t('grp_perm'), name: 'Terre', color: 'terre', price: 150 },
  { group: t('grp_lim'), name: 'Éclipse', color: 'rose', price: 250, ends: hoursFromNow(31.4) },
  { group: t('grp_lim'), name: 'Nova', color: 'foudre', price: 300, ends: hoursFromNow(5.2) },
  { group: t('grp_we'), name: 'Week-end', color: 'foudre', price: 200, weekend: true },
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
    const badge = p.ends ? `<span class="badge lim">${t('limited')}</span>` : p.weekend ? `<span class="badge we">${t('sat_sun')}</span>` : '';
    html += `<button class="type${i === current ? ' on' : ''}" data-i="${i}" style="${coinStyle(p.color)}">${coin(p.color, 30)}<div><b>${p.name}</b><small>${p.free ? t('free') : p.price + ' ◆'}</small></div>${badge}</button>`;
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
  $('name').textContent = t('pull') + ' ' + p.name;
  $('tag').textContent = p.ends ? t('limited') : p.weekend ? t('grp_we') : t('permanent');
  if ($('p1')) $('p1').textContent = p.price;
  if ($('p10')) $('p10').textContent = (p.price * 10).toLocaleString(LOCALE());
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
    $('timer').innerHTML = `${t('ends_in')} <b>${f(Math.floor(s / 3600))}:${f(Math.floor(s / 60) % 60)}:${f(s % 60)}</b>`;
  } else if (p.weekend) {
    $('timer').textContent = t('weekend_only');
  } else {
    $('timer').textContent = t('always');
  }
}
setInterval(tick, 1000);

// Historique perso : tes vrais pulls, gardés dans le navigateur
function ago(ts) {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return t('just_now');
  return t('ago', { n: m < 60 ? m + ' min' : m < 1440 ? Math.floor(m / 60) + ' h' : Math.floor(m / 1440) + ' j' });
}
// Connecté : tes tirages en ligne (account.js). Sinon : ceux gardés dans le navigateur.
function loadLocalHist() { try { return JSON.parse(localStorage.getItem('takoras-hist')) || []; } catch { return []; } }
const loadHist = () => (typeof ACC !== 'undefined' && ACC.user ? ACC.hist : loadLocalHist());
const esc2 = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
function renderHist() {
  const h = loadHist();
  $('hist').innerHTML = h.length
    ? h.slice(0, 6).map(e => `<div class="h-row"><img class="jeton" src="${e.img}" alt="" style="width:26px;height:26px;filter:drop-shadow(0 0 4px ${e.glow})"><div>${e.name}<small>${ago(e.ts)}</small></div><span class="muted">1/${e.odds.toLocaleString(LOCALE())}</span></div>`).join('')
    : `<p class="empty">${t('hist_empty')}</p>`;
  renderLive();
}
setInterval(renderHist, 60000);

// En direct : les derniers tirages de tous les joueurs (Supabase) + tes tirages locaux si tu n'as pas de compte
let liveRows = [];
async function fetchLive() {
  if (typeof sb === 'undefined' || !sb) return;
  const { data, error } = await sb.rpc('live_feed', { n: 20 });
  if (!error) { liveRows = data.map(rowToHist); drawLive(); }
}
function renderLive() { drawLive(); fetchLive(); }
function drawLive() {
  const mine = typeof ACC !== 'undefined' && ACC.user;
  const local = mine ? [] : loadLocalHist().slice(0, 12);
  const h = [...liveRows, ...local].sort((a, b) => b.ts - a.ts).slice(0, 20);
  const item = e => {
    const me = !e.pseudo || (mine && e.pseudo === ACC.pseudo), who = me ? t('you') : esc2(e.pseudo);
    return `<div class="lv"><span class="av">${who[0].toUpperCase()}</span><span><b>${who}</b> <span class="muted">${t('got')}</span> ${e.name} <span class="muted">· 1/${e.odds.toLocaleString(LOCALE())}</span></span><img class="jeton" src="${e.img}" alt="" style="width:24px;height:24px;filter:drop-shadow(0 0 4px ${e.glow})"></div>`;
  };
  $('live').innerHTML = h.length ? h.map(item).join('').repeat(h.length >= 6 ? 2 : 1) : `<span class="muted live-empty">${t('live_empty')}</span>`;
  $('live').classList.toggle('still', h.length < 6);
}
setInterval(fetchLive, 15000);

// Classement (Supabase) : podium top 3 + liste
const KINDS = [['k_pulls', 'pulls'], ['k_gain', 'gain'], ['k_tokens', 'tokens'], ['k_collec', 'collec']];
let kind = 0, period = 'week', boardReq = 0;
function weekStart() { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return d.toISOString(); }
function boardVal(r) {
  const n = Number(r.value).toLocaleString(LOCALE()), id = KINDS[kind][1];
  if (id === 'gain') {
    const j = rowToHist({ serie: 'Takoras', jeton: r.jeton, odds: r.odds, created_at: 0 });
    return `<span class="gain"><img class="jeton" src="${j.img}" alt="" style="filter:drop-shadow(0 0 4px ${j.glow})">${esc2(r.jeton)} · 1/${n}</span>`;
  }
  if (id === 'collec') return t('u_collec', { n, t: SERIES.Takoras.length });
  return t(id === 'pulls' ? 'u_pulls' : 'u_tokens', { n });
}
async function renderBoard() {
  $('kinds').innerHTML = KINDS.map(([k], i) => `<button class="chip${i === kind ? ' on' : ''}" data-k="${i}">${t(k)}</button>`).join('');
  if (typeof sb === 'undefined' || !sb) return;
  const req = ++boardReq;
  const { data, error } = await sb.rpc('leaderboard', { kind: KINDS[kind][1], since: period === 'week' ? weekStart() : null, n: 50 });
  if (req !== boardReq) return; // une réponse plus récente arrive
  const r = error ? [] : data;
  const me = p => typeof ACC !== 'undefined' && ACC.user && p.pseudo === ACC.pseudo;
  const name = p => esc2(p.pseudo) + (me(p) ? ` <span class="muted">(${t('you_tag')})</span>` : '');
  $('podium').innerHTML = r.length ? [[1, 'p2'], [0, 'p1'], [2, 'p3']].map(([i, c]) => r[i]
    ? `<div class="pod ${c}"><span class="av">${esc2(r[i].pseudo[0].toUpperCase())}</span><b>${name(r[i])}</b><small>${boardVal(r[i])}</small><div class="step">${i + 1}</div></div>`
    : '<div></div>').join('') : '';
  $('list').innerHTML = r.length
    ? r.slice(3).map((p, i) => `<div class="li${me(p) ? ' me' : ''}"><span class="rank">${i + 4}</span><span class="av">${esc2(p.pseudo[0].toUpperCase())}</span><span>${name(p)}</span><span class="val">${boardVal(p)}</span></div>`).join('')
    : `<p class="empty board-empty">${t('board_empty')}</p>`;
}
setInterval(renderBoard, 60000);
$('kinds').addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) { kind = +b.dataset.k; renderBoard(); } });
$('period').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  period = b.dataset.p;
  [...$('period').children].forEach(x => x.classList.toggle('on', x === b));
  renderBoard();
});

select(0);
renderBoard();
renderHist();
