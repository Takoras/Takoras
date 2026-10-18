// Outils partagés par les pages : navigation, pièce, puissance des jetons, bannières et icônes en pixel art, aperçu d'un jeton.

// ---------- Pièce (la monnaie)
const PIECE = '<img class="piece" src="img/piece.png" alt="◆">';
const money = n => `${fmt(n)} ${PIECE}`;
// Variantes : n'importe quel jeton peut sortir Doré (1/20), Céleste (1/200) ou Ombre (1/500) — revente ×3, ×10, ×25
// (VARIANTS, vTag, vCls, vOdds sont dans settings.js : app.js en a besoin avant que ce fichier soit chargé)
const sellValue = (odds, v) => Math.max(1, Math.round(odds * .5)) * (VARIANTS[v]?.mult || 1); // même règle que le serveur

// ---------- Rareté et puissance (stables : un même jeton a toujours les mêmes stats)
const TIER_NAMES = [[60, 'r_common'], [1000, 'r_rare'], [10000, 'r_epic'], [100000, 'r_legend'], [Infinity, 'r_myth']];
const tierKey = odds => TIER_NAMES.find(([m]) => odds < m)[1];
const strHash = s => [...String(s ?? "")].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
// Stats de combat : les rares sont un peu plus forts, mais pas trop (la capacité et le pile ou face comptent plus)
const STAT_MAX = { s_hp: 140, s_atk: 30, s_def: 10, s_spd: 20 };
function statsOf(name, odds) {
  const lvl = Math.log10(Math.max(1, odds)) / 6, h = strHash(name);
  const r = i => ((h >>> (i * 5)) % 31) / 30 - .5; // petite variation propre à chaque jeton (-0,5 à 0,5)
  const s = { s_hp: Math.round(100 + 30 * lvl + 8 * r(0)), s_atk: Math.round(20 + 7 * lvl + 3 * r(1)), s_def: Math.round(4 + 4 * lvl + 2 * r(2)), s_spd: Math.round(10 + 7 * lvl + 4 * r(3)) };
  s.power = Math.round(s.s_hp / 2 + s.s_atk * 3 + s.s_def * 5 + s.s_spd * 2);
  return s;
}
const jetonOf = name => SERIES.Takoras.find(j => j.name === name) || { name, odds: 1, glow: '#ffffff' };

// ---------- Navigation entre pages : #inventaire, #boutique, #profil/Pseudo, #classement
// Transition : les éléments de la page actuelle partent vers le haut en fondu, ceux de la nouvelle arrivent du bas un par un.
const PAGES = { bestiary: 'page-bestiary', inv: 'page-inv', shop: 'page-shop', profile: 'page-profile', friends: 'page-friends', combat: 'page-combat', board: 'page-board' };
let routeTok = 0, routeKey = null;
const EASE_OUT = 'cubic-bezier(.6, 0, .85, .2)', EASE_IN = 'cubic-bezier(.16, 1, .3, 1)';

// Les blocs à animer d'une page (et les cartes de ses grilles, pour un effet en cascade)
function pieces(page) {
  if (page === 'home') return [...document.querySelectorAll('.home-sec')];
  const root = $(PAGES[page]), top = root.querySelector('.prof, .fr-page, .cb-page') || root;
  const list = [...top.children].filter(el => !el.classList.contains('sell-bar'));
  return list;
}
function cards(page) {
  if (page === 'home') return [];
  return [...$(PAGES[page]).querySelectorAll('.ic, .si, .sc, .fr, .cb-slot, .pod, .li')].slice(0, 30);
}
function nav(page, p) {
  const key = page === 'bestiary' ? 'inv' : page;
  document.querySelectorAll('.links a').forEach(a => a.classList.toggle('on', a.dataset.page === key));
  // barre d'onglets du téléphone : classement / profil / combat sont dans « Plus »
  const tab = ['board', 'profile', 'combat'].includes(key) ? 'more' : key;
  document.querySelectorAll('.tabbar [data-page]').forEach(a => a.classList.toggle('on', a.dataset.page === tab));
  const on = document.querySelector('.links a.on'), ink = document.querySelector('.nav-ink');
  if (on && ink) { ink.style.width = on.offsetWidth + 'px'; ink.style.transform = `translateX(${on.offsetLeft}px)`; ink.style.opacity = 1; }
}

async function route() {
  const tok = ++routeTok;
  const h = decodeURIComponent(location.hash.slice(1));
  const [p, arg] = h.split('/');
  // Inventaire = un seul menu, deux onglets : #inventaire (jetons, le bestiaire) et #inventaire/objets
  const page = p === 'bestiaire' || (p === 'inventaire' && arg !== 'objets') ? 'bestiary' : p === 'inventaire' ? 'inv' : p === 'boutique' ? 'shop' : p === 'profil' ? 'profile' : p === 'amis' ? 'friends' : p === 'combat' ? 'combat' : p === 'classement' ? 'board' : 'home';
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
  const ready = page === 'bestiary' ? renderBestiary() : page === 'inv' ? renderInventory() : page === 'shop' ? renderShop() : page === 'profile' ? renderProfile(arg || ACC.pseudo) : page === 'friends' ? renderFriends() : page === 'combat' ? renderCombat() : page === 'board' ? renderBoard() : null;

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
  potion10: () => '<img class="pix potion" src="img/potions/chance-5.png" alt="" style="--tint:hue-rotate(150deg) saturate(1.6)">',
  potion25: () => '<img class="pix potion" src="img/potions/chance-5.png" alt="" style="--tint:hue-rotate(290deg) saturate(1.8)">',
  potion50: () => '<img class="pix potion" src="img/potions/chance-5.png" alt="" style="--tint:hue-rotate(-20deg) saturate(2.2)">',
  potion100: () => '<img class="pix potion" src="img/potions/chance-5.png" alt="" style="--tint:grayscale(1) brightness(1.6)">',
  hourglass: () => '<img class="pix potion" src="img/objets/sablier.png" alt="">',   // tes dessins
  instant: () => '<img class="pix potion" src="img/objets/recharge.png" alt="">',
};

// ---------- Bannières de profil : uniquement les images dessinées par l'auteur
const bannerName = id => { const k = 'bn_' + id, n = t(k); return n === k ? id.charAt(0).toUpperCase() + id.slice(1) : n; };
const BANNER_IMG = { plaine: 'img/bannieres/plaine.png', doodle: 'img/bannieres/doodle.png' };
const bannerCanvas = id => {
  const i = new Image(); i.className = 'banner-cv'; i.alt = '';
  if (BANNER_IMG[id]) i.src = BANNER_IMG[id]; else i.hidden = true; // bannière qui n'existe plus : rien
  return i;
};

// ---------- Photo de profil : 3 gratuites, d'autres en boutique (jamais d'image Discord). Sans photo : l'initiale.
const AVATARS = { bleu: 'img/pp/bleu.png', rouge: 'img/pp/rouge.png', vert: 'img/pp/vert.png', yeux: 'img/pp/yeux.png', dunes: 'img/pp/dunes.png', etoile: 'img/pp/etoile.gif' };
const FREE_PP = ['bleu', 'rouge', 'vert', 'yeux', 'dunes'];
const AV_CACHE = {}; // pseudo → photo (pour le classement, le live, les amis… qui ne la donnent pas)
function avatarHTML(p, size = 64) {
  const av = (p.avatar && p.avatar !== 'default') ? p.avatar : AV_CACHE[p.pseudo];
  const st = `width:${size}px;height:${size}px;font-size:${size / 2.4}px`;
  if (AVATARS[av]) return `<span class="pp av has-img" style="${st}"><img src="${AVATARS[av]}" alt=""></span>`;
  return `<span class="pp av" data-pp="${esc(p.pseudo || '')}" style="${st}">${esc((p.pseudo || '?')[0].toUpperCase())}</span>`;
}
// Les initiales affichées (data-pp) sont remplacées par la photo du joueur s'il en a une (une seule requête pour tous)
const hydrateAvatars = (() => {
  let timer, asked = new Set();
  const apply = () => document.querySelectorAll('.av[data-pp]').forEach(el => {
    const a = AV_CACHE[el.dataset.pp];
    if (AVATARS[a]) { el.classList.add('has-img'); el.innerHTML = `<img src="${AVATARS[a]}" alt="">`; el.removeAttribute('data-pp'); }
  });
  return () => { clearTimeout(timer); timer = setTimeout(async () => {
    const need = [...new Set([...document.querySelectorAll('.av[data-pp]')].map(e => e.dataset.pp))].filter(p => p && !asked.has(p));
    apply();
    if (!need.length) return;
    need.forEach(p => asked.add(p));
    const { data } = await sb.rpc('avatars_of', { p: need });
    (data || []).forEach(r => { AV_CACHE[r.pseudo] = r.avatar; });
    apply();
  }, 120); };
})();
new MutationObserver(hydrateAvatars).observe(document.body, { childList: true, subtree: true });

// Badge β : les comptes créés pendant la bêta ont une petite marque à côté de leur pseudo (à vie)
const BETA_CACHE = new Map(); // pseudo → true / false
const betaTag = pseudo => pseudo ? `<i class="bt-tag" data-bt="${esc(pseudo)}"${BETA_CACHE.get(pseudo) ? '' : ' hidden'} title="${t('beta_tester')}">β</i>` : '';
const hydrateBeta = (() => {
  let timer;
  const apply = () => document.querySelectorAll('.bt-tag[data-bt]').forEach(el => { el.hidden = !BETA_CACHE.get(el.dataset.bt); });
  return () => { clearTimeout(timer); timer = setTimeout(async () => {
    const need = [...new Set([...document.querySelectorAll('.bt-tag[data-bt]')].map(e => e.dataset.bt))].filter(p => p && !BETA_CACHE.has(p));
    apply();
    if (!need.length) return;
    need.forEach(p => BETA_CACHE.set(p, false));
    const { data } = await sb.rpc('beta_of', { p: need });
    (data || []).forEach(r => BETA_CACHE.set(r.pseudo, true));
    apply();
  }, 150); };
})();
new MutationObserver(hydrateBeta).observe(document.body, { childList: true, subtree: true });

// ---------- Aperçu d'un jeton (fenêtre) : grand jeton qui penche, rareté, valeur, puissance et stats
const jm = $('jeton-modal');
function openJeton(name, extra = '', variant = '', locked = false) {
  const j = jetonOf(name), s = statsOf(j.name, j.odds);
  jm.style.setProperty('--g', hexRGB(j.glow));
  $('jm-card').onclick = null; $('jm-card').oninput = null; $('jm-card').onchange = null;
  $('jm-card').innerHTML = `
    <button class="set-close jm-close" aria-label="${t('close')}">✕</button>
    <div class="jm-coin"><img class="${vCls(variant)}${locked ? ' sil' : ''}" src="${texOf(j)}" alt="">${locked ? '' : `<i class="glare${variant ? ' hv-' + variant : ''}" style="-webkit-mask-image:url(${texOf(j)});mask-image:url(${texOf(j)})"></i>`}</div>
    <div class="jm-info">
      <span class="tier t-${tierKey(j.odds)}">${t(tierKey(j.odds))}</span>
      <h2>${jnH(j.name)} ${vTag(variant)}</h2>
      <div class="jm-odds">1/${fmt(j.odds)}${variant ? ` <small class="muted">× ${t('v_' + variant)} 1/${fmt(VARIANTS[variant].odds)} = 1/${fmt(vOdds(j.odds, variant))}</small>` : ''}</div>
      <div class="jm-power">${t('power')} <b>${fmt(s.power)}</b></div>
      <div class="op-stats">${['s_hp', 's_atk', 's_def', 's_spd'].map(k => `<div class="stat"><span class="muted">${t(k)}</span><div class="bar"><i style="width:${Math.min(100, s[k] / STAT_MAX[k] * 100)}%"></i></div><b>${s[k]}</b></div>`).join('')}</div>
      <div class="jm-val">${t('sell_value')} : ${money(sellValue(j.odds, variant))}</div>
      ${extra}
    </div>`;
  jm.classList.add('on');
}
jm.addEventListener('click', e => { if (e.target === jm || e.target.closest('.jm-close')) jm.classList.remove('on'); });
// Le jeton penche seulement quand la souris est dessus, puis revient doucement
jm.addEventListener('pointermove', e => {
  const c = e.target.closest('.jm-coin'); if (!c) return;
  const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
  c.style.transform = `perspective(600px) rotateX(${(-y * 50).toFixed(1)}deg) rotateY(${(x * 50).toFixed(1)}deg) scale(1.05)`;
  c.style.setProperty('--mx', ((x + .5) * 100).toFixed(1) + '%'); c.style.setProperty('--my', ((y + .5) * 100).toFixed(1) + '%'); c.style.setProperty('--gl', 1);
});
jm.addEventListener('pointerout', e => {
  const c = e.target.closest('.jm-coin');
  if (c && !c.contains(e.relatedTarget)) { c.style.transform = ''; c.style.setProperty('--gl', 0); }
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
// Fenêtre de confirmation du site (les confirm() / prompt() du navigateur sont bloqués dans certains navigateurs,
// ex. celui intégré à Discord, ou si on a coché « empêcher cette page de créer d'autres boîtes de dialogue »)
// typed : le joueur doit taper ce mot pour valider (actions très dangereuses)
function ask(text, { ok = t('confirm_ok'), danger = false, typed = '' } = {}) {
  return new Promise(res => {
    const o = document.createElement('div');
    o.className = 'askbox';
    o.innerHTML = `<div class="ask-card${danger ? ' danger' : ''}"><p>${esc(text)}</p>
      ${typed ? `<input class="mpx-in" id="ask-in" placeholder="${esc(typed)}" autocomplete="off">` : ''}
      <div class="ask-btns"><button class="btn ghost" data-a="0">${t('cancel')}</button><button class="btn primary" data-a="1" ${typed ? 'disabled' : ''}>${esc(ok)}</button></div></div>`;
    document.body.appendChild(o);
    requestAnimationFrame(() => o.classList.add('on'));
    const inp = o.querySelector('#ask-in'), go = o.querySelector('[data-a="1"]');
    if (inp) { inp.focus(); inp.oninput = () => { go.disabled = inp.value.trim() !== typed; }; } else go.focus();
    const done = v => { o.classList.remove('on'); setTimeout(() => o.remove(), 200); removeEventListener('keydown', key, true); res(v); };
    const key = e => { if (e.key === 'Escape') { e.stopPropagation(); done(false); } if (e.key === 'Enter' && !go.disabled) { e.preventDefault(); done(true); } };
    addEventListener('keydown', key, true);
    o.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (b && !b.disabled) done(b.dataset.a === '1'); else if (e.target === o) done(false); });
  });
}

// Messages d'erreur du serveur → texte
const ERR = { too_many_pulls: 'err_too_many', not_enough_coins: 'err_coins', limit_reached: 'err_limit', potion_active: 'err_potion', stock_full: 'err_stock_full', owned: 'err_owned', not_in_shop: 'err_shop',
  banned: 'err_banned', not_friends: 'err_not_friends', slow_down: 'err_slow', unknown_player: 'err_unknown', self: 'err_self', pseudo_taken: 'err_pseudo_taken', bad_pseudo: 'err_pseudo', pseudo_cooldown: 'err_pseudo_cd', deck_incomplete: 'err_deck', quest_not_done: 'err_quest', feedback_short: 'fb_short', busy: 'err_busy', invite_expired: 'err_inv_exp', not_your_turn: 'err_turn',
  code_invalid: 'err_code_invalid', code_expired: 'err_code_expired', code_used_up: 'err_code_used_up', code_already: 'err_code_already', bad_code: 'err_bad_code' };
const errText = e => t(Object.entries(ERR).find(([k]) => e?.message?.includes(k))?.[1] || 'err_generic');
