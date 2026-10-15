// Outils partagés par les pages : navigation, pièce, puissance des jetons, bannières et icônes en pixel art, aperçu d'un jeton.

// ---------- Pièce (la monnaie)
const PIECE = '<img class="piece" src="img/piece.png" alt="◆">';
const money = n => `${fmt(n)} ${PIECE}`;
const sellValue = odds => Math.max(1, Math.round(odds * .5)); // même règle que le serveur

// ---------- Rareté et puissance (stables : un même jeton a toujours les mêmes stats)
const TIER_NAMES = [[60, 'r_common'], [1000, 'r_rare'], [10000, 'r_epic'], [100000, 'r_legend'], [Infinity, 'r_myth']];
const tierKey = odds => TIER_NAMES.find(([m]) => odds < m)[1];
const strHash = s => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
function statsOf(name, odds) {
  const lvl = Math.log10(odds) / 6, h = strHash(name);
  const v = (i, base) => Math.round(base * (.35 + lvl * .65) * (.85 + ((h >> (i * 5)) % 31) / 100));
  const s = { s_hp: v(0, 500), s_atk: v(1, 120), s_def: v(2, 120), s_spd: v(3, 100) };
  s.power = Math.round(s.s_hp / 5 + s.s_atk + s.s_def + s.s_spd);
  return s;
}
const jetonOf = name => SERIES.Takoras.find(j => j.name === name) || { name, odds: 1, glow: '#ffffff' };

// ---------- Navigation entre pages : #inventaire, #boutique, #profil/Pseudo, #classement
// Transition : les éléments de la page actuelle partent vers le haut en fondu, ceux de la nouvelle arrivent du bas un par un.
const PAGES = { inv: 'page-inv', shop: 'page-shop', profile: 'page-profile' };
let routeTok = 0, routeKey = null;
const EASE_OUT = 'cubic-bezier(.6, 0, .85, .2)', EASE_IN = 'cubic-bezier(.16, 1, .3, 1)';

// Les blocs à animer d'une page (et les cartes de ses grilles, pour un effet en cascade)
function pieces(page) {
  if (page === 'home') return [...document.querySelectorAll('.home-sec')];
  const root = $(PAGES[page]), top = root.querySelector('.prof') || root;
  const list = [...top.children].filter(el => !el.classList.contains('sell-bar'));
  return list;
}
function cards(page) {
  if (page === 'home') return [];
  return [...$(PAGES[page]).querySelectorAll('.ic, .si, .sc')].slice(0, 30);
}
function nav(page, p) {
  const key = p === 'classement' ? 'board' : page;
  document.querySelectorAll('.links a').forEach(a => a.classList.toggle('on', a.dataset.page === key));
  const on = document.querySelector('.links a.on'), ink = document.querySelector('.nav-ink');
  if (on && ink) { ink.style.width = on.offsetWidth + 'px'; ink.style.transform = `translateX(${on.offsetLeft}px)`; ink.style.opacity = 1; }
}

async function route() {
  const tok = ++routeTok;
  const h = decodeURIComponent(location.hash.slice(1));
  const [p, arg] = h.split('/');
  const page = p === 'inventaire' ? 'inv' : p === 'boutique' ? 'shop' : p === 'profil' ? 'profile' : 'home';
  const key = page + '/' + (page === 'profile' ? (arg || ACC.pseudo || '') : '');
  const from = routeKey ? routeKey.split('/')[0] : null;
  const animate = routeKey !== null && routeKey !== key && !reducedFx();
  nav(page, p);

  // 1. La page actuelle s'en va
  if (animate) {
    sfx.whooshOut?.();
    const out = pieces(from);
    // Sécurité : si le navigateur ne joue pas l'animation (onglet en arrière-plan…), on change quand même de page
    await Promise.race([Promise.all(out.map((el, i) => el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-22px) scale(.985)' }],
      { duration: 200, delay: Math.min(i, 5) * 35, easing: EASE_OUT, fill: 'forwards' }).finished.catch(() => {}))), new Promise(r => setTimeout(r, 450))]);
    if (tok !== routeTok) return;
    out.forEach(el => el.getAnimations().forEach(a => a.cancel()));
  }

  // 2. On affiche la nouvelle et on la remplit
  routeKey = key;
  document.querySelectorAll('.home-sec').forEach(s => { s.hidden = page !== 'home'; });
  Object.entries(PAGES).forEach(([k, id]) => { $(id).hidden = k !== page; });
  if (page !== 'home' || from !== 'home') scrollTo({ top: 0 });
  const ready = page === 'inv' ? renderInventory() : page === 'shop' ? renderShop() : page === 'profile' ? renderProfile(arg || ACC.pseudo) : null;
  if (page === 'home' && p === 'classement') setTimeout(() => $('classement').scrollIntoView({ behavior: 'smooth' }), animate ? 250 : 0);

  // 3. Elle arrive : les blocs montent un par un, puis les cartes en cascade
  if (animate) {
    const box = page === 'home' ? null : $(PAGES[page]);
    if (box) box.style.opacity = 0; // invisible le temps de charger son contenu
    await ready;
    if (tok !== routeTok) return;
    if (box) box.style.opacity = '';
    pieces(page).forEach((el, i) => el.animate([{ opacity: 0, transform: 'translateY(28px)' }, { opacity: 1, transform: 'none' }],
      { duration: 480, delay: Math.min(i, 6) * 60, easing: EASE_IN, fill: 'backwards' }));
    cards(page).forEach((el, i) => el.animate([{ opacity: 0, transform: 'translateY(18px) scale(.96)' }, { opacity: 1, transform: 'none' }],
      { duration: 420, delay: 80 + i * 28, easing: EASE_IN, fill: 'backwards' }));
  }
}
addEventListener('hashchange', route);
addEventListener('resize', () => nav(routeKey ? routeKey.split('/')[0] : 'home', location.hash.slice(1).split('/')[0]));
const goProfile = pseudo => { location.hash = '#profil/' + encodeURIComponent(pseudo); };

// ---------- Pixel art dessiné en code (icônes de la boutique)
function pixelArt(rows, pal, px = 4) {
  const c = document.createElement('canvas');
  c.width = rows[0].length; c.height = rows.length;
  const x = c.getContext('2d');
  rows.forEach((r, y) => [...r].forEach((ch, i) => { if (pal[ch]) { x.fillStyle = pal[ch]; x.fillRect(i, y, 1, 1); } }));
  return `<img class="pix" src="${c.toDataURL()}" alt="" style="width:${c.width * px}px;height:${c.height * px}px">`;
}
const POTION = ['....kk....', '....kk....', '...kwwk...', '...kwwk...', '..kLLLLk..', '.kLLwLLLk.', 'kLLLLLLLLk', 'kLMMMMMMLk', 'kMMMMMMMMk', 'kMMMMMMDMk', '.kMMMMMDk.', '..kkkkkk..'];
const HOURGLASS = ['kkkkkkkk', '.kwwwwk.', '.kSSSSk.', '..kSSk..', '...kk...', '..k.Sk..', '.k..SSk.', '.kSSSSk.', 'kkkkkkkk'];
const ICONS = { // icônes dessinées pixel par pixel
  potion1: () => '<img class="pix potion" src="img/potions/chance-1-3.png" alt="">', // tes potions dessinées
  potion2: () => '<img class="pix potion" src="img/potions/chance-2.png" alt="">',
  potion3: () => '<img class="pix potion" src="img/potions/chance-5.png" alt="">',
  hourglass: () => pixelArt(HOURGLASS, { k: '#e2e8f0', w: '#94a3b8', S: '#fbbf24' }, 7),
  instant: () => '<img class="pix" src="img/jetons/takoras.png" alt="" style="width:44px;height:44px">',
};

// ---------- Bannières de profil en pixel art (dessinées sur un petit canvas agrandi)
const BANNERS = {
  nuit:   { bg: '#1c1830', a: '#8b5cf6', b: '#f97316', motif: 'bands' },
  aurore: { bg: '#2a1530', a: '#f472b6', b: '#fbbf24', motif: 'bands' },
  ocean:  { bg: '#0b2236', a: '#38bdf8', b: '#2dd4bf', motif: 'waves' },
  braise: { bg: '#2a0f0a', a: '#f97316', b: '#ef4444', motif: 'embers' },
  foret:  { bg: '#0d2016', a: '#4ade80', b: '#a3e635', motif: 'waves' },
  neon:   { bg: '#0b0b18', a: '#22d3ee', b: '#e879f9', motif: 'grid' },
  or:     { bg: '#241a06', a: '#facc15', b: '#fde68a', motif: 'bands' },
  cosmos: { bg: '#070714', a: '#c4b5fd', b: '#ffffff', motif: 'stars' },
};
function drawBanner(canvas, id) {
  const B = BANNERS[id] || BANNERS.nuit, W = canvas.width = 120, H = canvas.height = 30, x = canvas.getContext('2d');
  let seed = strHash(id); const rnd = () => (seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296;
  x.fillStyle = B.bg; x.fillRect(0, 0, W, H);
  if (B.motif === 'bands') {
    [[4, B.a], [20, B.b]].forEach(([y0, c]) => { x.fillStyle = c; x.beginPath(); x.moveTo(0, y0 + 8); x.lineTo(W, y0 - 4); x.lineTo(W, y0 + 1); x.lineTo(0, y0 + 13); x.fill(); });
  } else if (B.motif === 'waves') {
    for (let i = 0; i < 3; i++) { x.fillStyle = i % 2 ? B.b : B.a; x.globalAlpha = .55 + i * .15; for (let px = 0; px < W; px++) x.fillRect(px, Math.round(8 + i * 7 + Math.sin(px / 9 + i * 2) * 3), 1, 2); }
    x.globalAlpha = 1;
  } else if (B.motif === 'embers') {
    for (let i = 0; i < 60; i++) { x.fillStyle = rnd() < .5 ? B.a : B.b; x.globalAlpha = .4 + rnd() * .6; x.fillRect(rnd() * W | 0, rnd() * H | 0, 1, 1 + (rnd() < .3)); }
    x.globalAlpha = 1; x.fillStyle = B.b; x.fillRect(0, H - 3, W, 3);
  } else if (B.motif === 'grid') {
    x.fillStyle = B.a; for (let px = 0; px < W; px += 8) x.fillRect(px, 15, 1, H);
    for (let y = 15; y < H; y += 4) x.fillRect(0, y, W, 1);
    x.fillStyle = B.b; x.fillRect(0, 14, W, 1); x.fillRect(W / 2 - 8, 4, 16, 8);
  } else if (B.motif === 'stars') {
    for (let i = 0; i < 70; i++) { x.fillStyle = rnd() < .7 ? B.b : B.a; x.globalAlpha = .3 + rnd() * .7; x.fillRect(rnd() * W | 0, rnd() * H | 0, 1, 1); }
    x.globalAlpha = 1; x.fillStyle = B.a; x.fillRect(90, 8, 3, 1); x.fillRect(91, 7, 1, 3);
  }
}
// Bannières dessinées par toi (images). Les anciennes bannières en code restent en secours.
const bannerName = id => { const k = 'bn_' + id, n = t(k); return n === k ? id.charAt(0).toUpperCase() + id.slice(1) : n; };
const BANNER_IMG = { plaine: 'img/bannieres/plaine.png', doodle: 'img/bannieres/doodle.png' };
const bannerCanvas = id => {
  if (BANNER_IMG[id]) { const i = new Image(); i.className = 'banner-cv'; i.src = BANNER_IMG[id]; i.alt = ''; return i; }
  const c = document.createElement('canvas'); c.className = 'banner-cv'; drawBanner(c, id); return c;
};

// ---------- Photo de profil : pour l'instant l'initiale (les photos à choisir arriveront plus tard, jamais d'image Discord)
function avatarHTML(p, size = 64) {
  return `<span class="pp av" style="width:${size}px;height:${size}px;font-size:${size / 2.4}px">${esc((p.pseudo || '?')[0].toUpperCase())}</span>`;
}

// ---------- Aperçu d'un jeton (fenêtre) : grand jeton qui penche, rareté, valeur, puissance et stats
const jm = $('jeton-modal');
function openJeton(name, extra = '') {
  const j = jetonOf(name), s = statsOf(j.name, j.odds);
  jm.style.setProperty('--g', hexRGB(j.glow));
  $('jm-card').onclick = null; $('jm-card').oninput = null; $('jm-card').onchange = null;
  $('jm-card').innerHTML = `
    <button class="set-close jm-close" aria-label="${t('close')}">✕</button>
    <div class="jm-coin"><img src="${texOf(j)}" alt=""></div>
    <div class="jm-info">
      <span class="tier t-${tierKey(j.odds)}">${t(tierKey(j.odds))}</span>
      <h2>${esc(jn(j.name))}</h2>
      <div class="jm-odds">1/${fmt(j.odds)}</div>
      <div class="jm-power">${t('power')} <b>${fmt(s.power)}</b></div>
      <div class="op-stats">${['s_hp', 's_atk', 's_def', 's_spd'].map(k => `<div class="stat"><span class="muted">${t(k)}</span><div class="bar"><i style="width:${Math.min(100, s[k] / { s_hp: 500, s_atk: 120, s_def: 120, s_spd: 100 }[k] * 100)}%"></i></div><b>${s[k]}</b></div>`).join('')}</div>
      <div class="jm-val">${t('sell_value')} : ${money(sellValue(j.odds))}</div>
      ${extra}
    </div>`;
  jm.classList.add('on');
}
jm.addEventListener('click', e => { if (e.target === jm || e.target.closest('.jm-close')) jm.classList.remove('on'); });
// Le jeton penche seulement quand la souris est dessus, puis revient doucement
jm.addEventListener('pointermove', e => {
  const c = e.target.closest('.jm-coin'); if (!c) return;
  const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
  c.style.transform = `perspective(600px) rotateX(${(-y * 30).toFixed(1)}deg) rotateY(${(x * 30).toFixed(1)}deg) scale(1.04)`;
});
jm.addEventListener('pointerout', e => {
  const c = e.target.closest('.jm-coin');
  if (c && !c.contains(e.relatedTarget)) c.style.transform = '';
});
addEventListener('keydown', e => { if (e.key === 'Escape') jm.classList.remove('on'); });

// Petit message en bas de l'écran
function toast(text, bad = false) {
  const d = document.createElement('div');
  d.className = 'toast' + (bad ? ' bad' : '');
  d.innerHTML = text;
  document.body.appendChild(d);
  setTimeout(() => d.classList.add('out'), 2600);
  setTimeout(() => d.remove(), 3100);
}
// Messages d'erreur du serveur → texte
const ERR = { not_enough_coins: 'err_coins', limit_reached: 'err_limit', potion_active: 'err_potion', stock_full: 'err_stock_full', owned: 'err_owned', not_in_shop: 'err_shop' };
const errText = e => t(Object.entries(ERR).find(([k]) => e?.message?.includes(k))?.[1] || 'err_generic');
