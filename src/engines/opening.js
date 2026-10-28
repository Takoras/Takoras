// Ouverture des tirages. Repris de legacy/ (transitions.js + opening.js) ; ce fichier est maintenant la référence (plus régénéré).
import { SERIES, texOf } from '@/data/jetons';
import { burstAt } from '@/lib/pfx';
import { $, ACC, LOCALE, PULLS, SETTINGS, STAT_MAX, VARIANTS, errText, fmt, fmtLuck, jn, jnH, reducedFx, saveSettings, sb, sfx, sparkStyle, speed, statsOf, t, toast, vCls, vOdds, vTag, host } from './env';
import { CINE } from './cinema.js';
import './legacy-base.css';
import './opening.css';

// Crochets vers React (économie, historique, admin)
const openPulls = (n) => host.openPulls(n);
const applyState = (st) => host.applyState(st);
const ecoDecorate = () => host.ecoDecorate();
const accRecordPull = (j, serie) => host.accRecordPull(j, serie);
const loadLocalHist = () => host.loadLocalHist();
const renderHist = () => host.renderHist();
const toggleAdmin = () => host.toggleAdmin();
let current = 0; // un seul type de pull
// Le jeton héros de l’accueil sert de point de départ à la transition ; ailleurs, un point invisible au centre
const heroCoin = () => document.getElementById('coin') ?? (document.getElementById('coin-fallback') ?? document.body.appendChild(Object.assign(document.createElement('div'), { id: 'coin-fallback', style: 'position:fixed;left:50%;top:42%;width:1px;height:1px;visibility:hidden' })));
const select = (i) => { current = i; };

// HTML de l’écran (textes traduits au passage)
if (!document.getElementById('opening')) {
  document.body.insertAdjacentHTML('beforeend', "<div class=\"opening\" id=\"opening\" aria-hidden=\"true\">\n    <div class=\"op-bg\" id=\"op-bg\"></div>\n    <div class=\"op-rays\"></div>\n    <div class=\"op-glow\"></div>\n    <div class=\"op-vignette\"></div>\n    <div class=\"op-bars\"></div>\n    <div class=\"op-top\">\n      <div class=\"eyebrow\" id=\"op-tag\">Pull Takoras</div>\n      <div class=\"op-odds\" id=\"op-odds\">1/1</div>\n    </div>\n    <div class=\"op-autobar\"><button class=\"op-auto\" id=\"op-auto\" hidden></button><button class=\"op-auto op-skip\" id=\"op-skip\" hidden></button></div>\n    <div class=\"op-main\">\n      <div class=\"op-coin-col\">\n        <button class=\"op-coin\" id=\"op-coin\" aria-label=\"Cliquer sur le jeton\"></button>\n        <p class=\"op-hint\" id=\"op-hint\">Clique sur le jeton</p>\n      </div>\n      <div class=\"op-info\" id=\"op-info\">\n        <div class=\"op-id\"><img class=\"op-serie\" src=\"/img/logo-takoras.png\" alt=\"Takoras\">\n        <h2 class=\"op-name\" id=\"op-name\"></h2>\n        <div class=\"op-rarity\" id=\"op-rarity\"></div></div>\n        <div class=\"op-stats\" id=\"op-stats\"></div>\n        <p class=\"op-note\" data-i18n=\"stats_note\">Statistiques provisoires · combats bientôt</p>\n        <div class=\"op-actions\">\n          <button class=\"btn primary\" id=\"op-next\" hidden>Suivant</button>\n          <button class=\"btn primary\" id=\"op-recap\" hidden data-i18n=\"see_recap\">Voir le récap</button>\n          <button class=\"btn primary\" id=\"op-again\">Pull encore · <span id=\"op-price\">100</span> ◆</button>\n          <button class=\"btn ghost\" id=\"op-back\" data-i18n=\"back\">Retour</button>\n        </div>\n      </div>\n    </div>\n    <button class=\"op-recap-x\" id=\"op-recap-x\" aria-label=\"Fermer\">✕</button>\n    <div class=\"op-recap-view\">\n      <div class=\"eyebrow\" id=\"op-recap-tag\">Récap</div>\n      <h2 class=\"op-name\" id=\"op-recap-title\">Tes jetons</h2>\n      <div class=\"op-recap-grid\" id=\"op-recap-grid\"></div>\n      <div class=\"op-actions\">\n        <button class=\"btn primary\" id=\"op-recap-again\">Pull ×10 encore · <span id=\"op-recap-price\">1 000</span> ◆</button>\n        <button class=\"btn ghost\" id=\"op-recap-back\" data-i18n=\"back\">Retour</button>\n      </div>\n    </div>\n  </div>\n  <div class=\"fx\" id=\"fx\"></div>");
  document.querySelectorAll('#opening [data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
}

// Transitions d'ouverture d'un pull (0,5 s max) + menu debug (taper « debug »)
const fx = $('fx'), opening = $('opening');
const DUR = 500;

const el = (css = '', html = '') => { const d = document.createElement('div'); d.style.cssText = css; d.innerHTML = html; fx.appendChild(d); return d; };
const done = ms => new Promise(r => setTimeout(r, ms));
const glowRGB = () => getComputedStyle(document.documentElement).getPropertyValue('--glow').trim() || '139, 92, 246';
function origin() {
  const r = heroCoin().getBoundingClientRect();
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
    el(`left:${o.x - s / 2}px;top:${o.y - s / 2}px;${sparkStyle(tints[i % 2])};z-index:2`).animate([
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: `translate(${Math.cos(a) * r}px,${Math.sin(a) * r}px) rotate(${(i % 2 ? 1 : -1) * 90}deg) scale(.4)`, opacity: 0 },
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
  heroCoin().style.visibility = '';
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
$('debug-close')?.addEventListener('click', () => { $('debug').hidden = true; });
let typed = '';
addEventListener('keydown', e => {
  if (e.key.length !== 1 || e.target.closest?.('input, textarea, select')) return;
  typed = (typed + e.key.toLowerCase()).slice(-5);
  if (typed === 'debug' && ACC.isAdmin) { typed = ''; toggleAdmin(); } // réservé aux admins : même chose que le bouclier
});

// Ouverture d'un pull : le jeton « ? » et le compteur de chance qui monte à chaque clic (1/1 → 1/X).
// Le résultat est tiré dès l'ouverture ; les clics ne font que le révéler. On peut spammer pour aller vite.

// Jetons de la série Takoras — PROVISOIRES : même texture (template), seule la couleur du glow change.
// Taille de la grille du dessin (64×64 pour la plupart). Un dessin plus grand (Néphéris : 74×74) est affiché un peu plus grand
// pour que ses pixels fassent la même taille que ceux des autres jetons.
const texScale = j => (j?.grid || 64) / 64;
// la liste des jetons vient de src/data/series.json (une seule source : avant, une vieille copie ici n'avait pas l'image de Takoras)
const SKIP = 1 / 5; // environ 1 clic sur 5 saute discrètement une étape

// Couleur du compteur selon la rareté atteinte
const TIERS = [[10, '200, 200, 210'], [50, '74, 222, 128'], [200, '56, 189, 248'], [1000, '167, 139, 250'], [5000, '251, 191, 36'], [25000, '244, 114, 182'], [Infinity, '240, 240, 255']];
const FAST = 60;   // en dessous de 1/60 : retournement direct, pas de pause
const RARE = 1000; // à partir de 1/1000 : zoom plus fort et révélation plus spectaculaire
// Pendant le compteur : pas de couleur, juste du blanc de plus en plus lumineux
const tierOf = () => '235, 235, 255';
const MYTHIC = 100000, GOD = 1000000; // mise en scène spéciale à partir de 1/100 000, et encore plus pour 1/1 000 000
const hexRGB = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).join(', ');
const jetonHTML = (j, size, v = '') =>
  `<img class="jeton${vCls(v)}" src="${texOf(j)}" alt="${j.name}" style="width:${size}px;height:${size}px;filter:drop-shadow(0 0 ${Math.max(4, size / 8)}px ${j.glow})">`;

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
  const kept = out.filter((v, i) => i === out.length - 1 || i === 0 || Math.random() > SKIP);
  if (SETTINGS.speed === 'instant') return [X];
  if (SETTINGS.speed === 'rapide') return kept.filter((v, i) => i % 2 === 1 || i === kept.length - 1);
  return kept;
}

let run = null;
const opCoin = $('op-coin');
const MYSTERE = '/img/jetons/mystere.png';

// Le « ? » apparaît tout petit et grossit en douceur
function spawn() {
  sfx.spawn();
  opCoin.animate([{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 520, easing: 'cubic-bezier(.16, 1, .3, 1)' });
}
// Jeton plat : la même image devant et derrière (le dos est retourné pour se lire dans le bon sens), rien d'autre.
// Pas de tranche ni de reflet plaqué : ils faisaient des bords qui dépassent pendant la rotation.
function coin3D(src, alt, style = '', cls = '') {
  return `<img class="face${cls}" src="${src}" alt="${alt}" decoding="sync" style="${style}"><img class="back${cls}" src="${src}" alt="" decoding="sync" style="transform:rotateY(180deg)">`;
}
function setGlareMask(src) {
  void src; // plus de reflet plaqué sur le jeton
}
// Explosion de rayons de lumière derrière le jeton (pas un cercle) : une étoile qui jaillit, tourne et s'efface
function rays(power = 1) {
  if (reducedFx()) return;
  const r = opCoin.getBoundingClientRect(), d = document.createElement('div');
  d.className = 'op-burst';
  const size = r.width * (2.2 + power * 1.6);
  d.style.cssText = `left:${r.left + r.width / 2}px;top:${r.top + r.height / 2}px;width:${size}px;height:${size}px`;
  opening.appendChild(d);
  d.animate([
    { transform: 'translate(-50%,-50%) scale(.25) rotate(0deg)', opacity: 0 },
    { transform: 'translate(-50%,-50%) scale(1) rotate(25deg)', opacity: 1, offset: .25 },
    { transform: 'translate(-50%,-50%) scale(1.25) rotate(60deg)', opacity: 0 },
  ], { duration: 650 + power * 450, easing: 'cubic-bezier(.15,.7,.3,1)' }).finished.then(() => d.remove());
}
// Le jeton « claque » : il gonfle d'un coup, dépasse, puis se pose (ressort)
function pop(power = 1) {
  if (reducedFx()) return;
  opCoin.querySelector('.zoom')?.animate([
    { transform: 'scale(.55)', filter: 'brightness(2.2)' },
    { transform: `scale(${1.18 + power * .12})`, filter: 'brightness(1.5)', offset: .35 },
    { transform: 'scale(.94)', filter: 'brightness(1.05)', offset: .65 },
    { transform: 'scale(1.02)', offset: .85 },
    { transform: 'scale(1)', filter: 'none' },
  ], { duration: 560, easing: 'cubic-bezier(.2,.8,.3,1)' });
}
// Flash à la couleur du jeton (pas blanc)
function tint(power = .35, ms = 450) {
  if (reducedFx()) power *= .3;
  const f = document.createElement('div');
  f.style.cssText = `position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 50% 45%, rgba(${getComputedStyle(opening).getPropertyValue('--tier')}, .9), transparent 70%)`;
  opening.appendChild(f);
  f.animate([{ opacity: power }, { opacity: 0 }], { duration: ms, easing: 'ease-out' }).finished.then(() => f.remove());
}

// Session d'ouverture (1 ou 10 pulls), sauvegardée dans le navigateur pour reprendre après un refresh
const SAVE_KEY = 'takoras-session';
let sess = null;
function save() { try { sess ? localStorage.setItem(SAVE_KEY, JSON.stringify(sess)) : localStorage.removeItem(SAVE_KEY); } catch {} }
function startSession(n, plan = null, vars = null, lucks = null, ids = null) { sess = { pull: current, total: n, idx: 0, results: [], rvars: [], cur: null, plan, vars, lucks, ids }; save(); }
function endSession() { sess = null; save(); }
const seriesOf = () => SERIES[PULLS[sess.pull].name] || SERIES.Takoras;
const findJeton = name => seriesOf().find(j => j.name === name);

// Prépare le jeton « ? » courant. Sans état sauvegardé, on tire un nouveau jeton.
function startOpening() {
  if (!sess) startSession(1);
  if (!sess.cur) {
    // Jeton tiré par le serveur (plan) ; sinon tirage local (tests admin « sans stock »)
    const result = (sess.plan && findJeton(sess.plan[sess.idx])) || draw(seriesOf());
    sess.cur = { name: result.name, variant: (sess.vars || [])[sess.idx] || '', queue: steps(result.odds), shown: 1, phase: 'count' };
    save();
  }
  const c = sess.cur, p = PULLS[sess.pull];
  run = { result: findJeton(c.name), variant: c.variant || '', queue: c.queue, shown: c.shown, done: false };
  $('op-tag').textContent = t('pull') + ' ' + p.name + (sess.total > 1 ? ` · ${sess.idx + 1}/${sess.total}` : '');
  $('op-odds').classList.remove('bump');
  if ($('op-price')) $('op-price').textContent = (p.price * sess.total).toLocaleString(LOCALE()); // ce bouton peut être réécrit par l'économie
  $('op-odds').textContent = '1/' + c.shown.toLocaleString(LOCALE());
  stopBg();
  opening.classList.remove('hold', 'rare', 'revealed', 'recap', 'spinning', 'mythic', 'god', 'cinema', 'v-gold', 'v-celeste', 'v-ombre');
  opening.querySelectorAll('.v-pop').forEach(x => x.remove()); // l'annonce de variante ne reste jamais sur le jeton suivant
  setTier(c.shown);
  opCoin.className = 'op-coin';
  opCoin.innerHTML = `<div class="zoom"><div class="tilt3d"><div class="spin">${coin3D(MYSTERE, 'Jeton mystère')}</div>${'<b class="tw"></b>'.repeat(7)}</div></div>`;
  setGlareMask(MYSTERE);
  if (c.phase === 'count' && c.shown === 1 && !sess.auto) spawn(); // le « ? » arrive en grossissant
  $('op-hint').textContent = t(matchMedia('(pointer: coarse)').matches ? 'tap_coin' : 'click_coin');
  $('op-stats').innerHTML = '';
  if (c.phase === 'hold') hold(true);
  if (c.phase === 'revealed') reveal(true);
  renderAuto();
  if (sess.auto) autoRun(); // tout de suite : on ne voit jamais le jeton mystère
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
  opCoin.style.setProperty('--boost', v >= 50 ? Math.min(1.6, Math.log10(v / 50) * .4) : 0); // le halo grandit avec la rareté
}

// Le compteur roule vite vers la nouvelle valeur ; un nouveau clic reprend là où il en est
let countAnim = 0;
function countTo(from, to, ms = 110) {
  const t0 = performance.now(), el = $('op-odds'), id = ++countAnim;
  el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
  (function step(t) {
    if (id !== countAnim) return;
    const k = Math.min(1, (t - t0) / ms);
    el.textContent = '1/' + Math.round(from + (to - from) * k).toLocaleString(LOCALE());
    if (k < 1) requestAnimationFrame(step);
  })(t0);
}

// Tremblement très rapide qui s'amortit (à partir de 1/500)
function shake(power = 1) {
  if (reducedFx()) return;
  const a = 9 * power, f = [1, -.8, .6, -.45, .3, -.18, .08, 0];
  opening.animate(f.map((k, i) => ({ transform: `translate(${a * k}px, ${a * k * (i % 2 ? .6 : -.6)}px)` })), { duration: 260, easing: 'ease-in' });
}

// Flash blanc doux (à partir de 1/5000)
function flash(power = .45, ms = 500) {
  if (reducedFx()) power *= .3;
  opening.querySelectorAll('.op-flash').forEach(f => f.remove());
  const f = document.createElement('div');
  f.className = 'op-flash';
  f.style.cssText = 'position:absolute;inset:0;background:#fff;pointer-events:none';
  opening.appendChild(f);
  f.animate([{ opacity: power }, { opacity: 0 }], { duration: ms, easing: 'ease-out' }).finished.then(() => f.remove());
}

function burst(n = 5) {
  if (reducedFx()) n = Math.ceil(n / 4);
  const r = opCoin.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
  const col = `rgb(${getComputedStyle(opening).getPropertyValue('--tier')})`;
  for (let i = 0; i < n; i++) {
    const s = document.createElement('i'), a = Math.random() * Math.PI * 2, d = r.width * (.55 + Math.random() * .3);
    s.className = 'op-spark';
    s.style.cssText = `left:${x}px;top:${y}px;${sparkStyle(col)}`;
    opening.appendChild(s);
    const spin = (Math.random() < .5 ? -1 : 1) * 90; // elles tournent un peu en volant
    s.animate([{ transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }, { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d}px)) rotate(${spin}deg) scale(.4)`, opacity: 0 }],
      { duration: 380, easing: 'cubic-bezier(.2,.7,.3,1)' }).finished.then(() => s.remove());
  }
}

// Effets selon le palier atteint par le clic
function effects(v) {
  if (v >= 500) shake(v >= 2500 ? 1.4 : 1);
  if (v >= 5000 && !run.flashed) { run.flashed = true; flash(); } // une seule fois par ouverture
  burst(v >= 100000 ? 16 : v >= 10000 ? 12 : v >= 1000 ? 9 : v >= 200 ? 6 : 4);
}

// Fiche du jeton (stats provisoires : plus il est rare, plus elles sont hautes)
function fillInfo(j, variant = '') {
  const lvl = Math.log10(j.odds) / 6; // 0 → 1 pour 1/1 → 1/1 000 000
  const stat = (k, base) => { const v = Math.round(base * (.35 + lvl * .65) * (.85 + Math.random() * .3)); return [k, v, Math.min(100, v / base * 100)]; };
  $('op-name').innerHTML = jnH(j.name) + vTag(variant);
  const lk = +(sess.lucks || [])[sess.idx] || 0; // chance active quand ce jeton a été tiré
  $('op-rarity').innerHTML = '1/' + vOdds(j.odds, variant).toLocaleString(LOCALE()) + (lk > 1 ? ` <span class="op-luck">×${fmtLuck(lk)}</span>` : '');
  // Mêmes stats que dans l'inventaire (stables pour un même jeton)
  const S = statsOf(j.name, j.odds);
  sess.cur.stats = ['s_mass', 's_pow', 's_size'].map(k => [k, S[k], Math.min(100, S[k] / STAT_MAX[k] * 100)]);
  $('op-stats').innerHTML = sess.cur.stats
    .map(([k, v, w]) => `<div class="stat"><span class="muted">${t(k)}</span><div class="bar"><i data-w="${w}"></i></div><b>${v}</b></div>`).join('');
  requestAnimationFrame(() => requestAnimationFrame(() => $('op-stats').querySelectorAll('i').forEach(i => { i.style.width = i.dataset.w + '%'; })));
}

// Pause finale : le haut disparaît, zoom sur le jeton qui tremble, on clique pour révéler
function hold(restored) {
  const r = run;
  r.holding = true;
  sess.cur.phase = 'hold'; save();
  opening.classList.add('hold');
  opening.classList.toggle('rare', r.result.odds >= RARE);
  opening.classList.toggle('cinema', r.result.odds >= MYTHIC); // bandes noires façon film + battement de cœur
  opCoin.classList.remove('hit');
  if (!restored) { flash(.18, 260); sfx.hold(); } // mini flash : le compteur ne montera plus
  if (r.result.odds >= MYTHIC) { // battement de cœur sonore, calé sur la vignette
    r.hb = setInterval(() => { if (run !== r || r.done) clearInterval(r.hb); else sfx.heartbeat(); }, 1100);
  }
  $('op-hint').textContent = t('click_reveal');
  setTimeout(() => { if (run === r) r.canReveal = true; }, 450 * Math.max(.5, speed())); // évite de révéler par accident en spammant
}

// Révélation : le jeton tourne en se penchant, la face change à mi-chemin, puis il glisse à gauche et la fiche arrive
// Fond de la révélation, dessiné en pixel art en direct sur un petit canvas agrandi sans lissage.
// Plus le jeton est rare, plus le fond est chargé : bandes → rayons + poussière → étoiles + reflets.
const bg = { canvas: null, ctx: null, raf: 0, level: 0, rgb: [255, 255, 255], dust: [], stars: [] };
const PX = 6; // taille d'un « pixel » du fond à l'écran
function bgLevel(odds) { return odds >= GOD ? 5 : odds >= MYTHIC ? 4 : odds >= 10000 ? 3 : odds >= RARE ? 2 : odds >= FAST ? 1 : 0; }

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
  bg.dust = Array.from({ length: [0, 0, 26, 50, 80, 120][bg.level] }, () => ({ x: Math.random() * W, y: Math.random() * H, v: .04 + Math.random() * .1, a: Math.random() }));
  bg.stars = Array.from({ length: [0, 0, 0, 40, 55, 75][bg.level] }, () => ({ x: Math.random() * W | 0, y: Math.random() * H | 0, p: Math.random() * 6 }));
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
    const n = level >= 4 ? 16 : 12, R = Math.hypot(W, H), turn = t * (level >= 4 ? .14 : .08);
    for (let i = 0; i < n; i++) {
      const a0 = turn + i / n * Math.PI * 2, a1 = a0 + Math.PI / n * .55;
      ctx.fillStyle = col(level >= 4 ? .13 + .07 * Math.sin(t * 3 + i) : level >= 3 ? .10 + .05 * Math.sin(t * 2 + i) : .08);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a0) * R, cy + Math.sin(a0) * R);
      ctx.lineTo(cx + Math.cos(a1) * R, cy + Math.sin(a1) * R);
      ctx.fill();
    }
  }

  // Bandes en escalier qui glissent doucement (l'escalier vient de l'agrandissement sans lissage)
  const slope = -.1, thick = Math.max(10, H * .09);
  const bands = level === 0 ? [[.2, .35]] : level >= 5 ? [[.16, .5], [.86, .5], [.5, .16], [.03, .2]] : level >= 3 ? [[.16, 1], [.86, 1], [.5, .25], [.03, .3]] : [[.18, 1], [.84, 1]];
  if (bg.mode !== 'hold') bands.forEach(([pos, alpha], k) => {
    const shift = Math.sin(t * .35 + k) * 3;
    const y0 = H * pos + shift - slope * W / 2;
    ctx.fillStyle = col(alpha * (level === 0 ? 1 : .95));
    ctx.beginPath();
    ctx.moveTo(0, y0); ctx.lineTo(W, y0 + slope * W); ctx.lineTo(W, y0 + slope * W + thick); ctx.lineTo(0, y0 + thick);
    ctx.fill();
    // Reflet blanc qui parcourt la bande (à partir de 1/10 000)
    if (level >= 3 && alpha >= .5) {
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

  // Mythique (1/100 000+) : anneaux de pixels en orbite, ondes de choc ; 1/1 000 000 : deux anneaux, tout en blanc
  if (level >= 4 && bg.mode !== 'hold') {
    const R0 = c.width / PX * .78;
    [[1, 22, .9], ...(level >= 5 ? [[-1.4, 14, 1.25]] : [])].forEach(([dir, n, k]) => {
      for (let i = 0; i < n; i++) {
        const a = t * .9 * dir + i / n * Math.PI * 2, R = R0 * k + Math.sin(t * 3 + i) * 1.5;
        ctx.fillStyle = i % 3 ? col(.9) : 'rgba(255,255,255,.95)';
        ctx.fillRect(cx + Math.cos(a) * R | 0, cy + Math.sin(a) * R * .92 | 0, i % 4 ? 1 : 2, i % 4 ? 1 : 2);
      }
    });
    const period = level >= 5 ? 1.2 : 1.8, ph = (t % period) / period;
    ctx.strokeStyle = col(.8 * (1 - ph)); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, R0 + ph * W * .55, 0, Math.PI * 2); ctx.stroke();
  }

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
function reveal(restored, quiet = false) {
  const r = run, j = r.result;
  r.done = true;
  opening.classList.remove('hold');
  opCoin.classList.add('done');
  $('op-hint').textContent = '';
  opening.style.setProperty('--tier', hexRGB(j.glow));
  startBg(j);
  const spin = opCoin.querySelector('.spin');
  spin.innerHTML = coin3D(texOf(j), j.name, '', vCls(r.variant)); // la mutation se voit dès la rotation
  spin.style.scale = texScale(j) === 1 ? '' : texScale(j); // face, reflet et tranche ensemble // pas d'ombre sur l'image (elle serait coupée en carré en 3D) : le halo est derrière
  setGlareMask(texOf(j));
  // Le jeton se retourne très vite puis ralentit longtemps (plus il est rare, plus ça dure)
  if (!restored) {
    const turns = j.odds >= GOD ? 10 : j.odds >= MYTHIC ? 8 : j.odds >= RARE ? 6 : j.odds >= FAST ? 4 : 3;
    // rythme selon la rareté (cahier § 16.2) : commune 0,8 s · rare 1,4 s · épique 2,2 s · légendaire 3,2 s · hyper rare 4,5 s
    const ms = Math.max(350, (j.odds >= MYTHIC ? 4500 : j.odds >= 10000 ? 3200 : j.odds >= RARE ? 2200 : j.odds >= 100 ? 1400 : 800) * (speed() || .2));
    const T = turns * 360;
    spin.animate([
      { transform: 'rotateY(0) scale(.92)' },
      { transform: `rotateY(${T}deg) scale(1)` },
    ], { duration: ms, easing: 'cubic-bezier(.1, .8, .15, 1)' }); // part très vite et freine longtemps, sans à-coup
    // atterrissage : petit impact (secousse, étincelles, onde) pile quand il se pose
    setTimeout(() => {
      if (run !== r) return;
      shake(j.odds >= RARE ? .8 : .35); burst(j.odds >= RARE ? 14 : 8);
    }, ms * .7);
    // On ne peut pas passer à la suite tout de suite : 0,5 s max pour les jetons communs,
    // toute la rotation pour les vrais rares (1/1000 et plus)
    const lock = j.odds >= RARE ? ms : Math.min(ms, 500);
    r.spinEnd = performance.now() + lock;
    opening.classList.add('spinning');
    setTimeout(() => { if (run === r) opening.classList.remove('spinning'); }, lock);
  }
  fillInfo(j, r.variant);
  if (r.variant) opening.classList.add('v-' + r.variant);
  opening.classList.toggle('rare', j.odds >= RARE);
  opening.classList.toggle('mythic', j.odds >= MYTHIC); // jeton animé : halo qui pulse, reflet qui passe, étincelles
  opening.classList.toggle('god', j.odds >= GOD);       // + couleurs arc-en-ciel
  opening.classList.toggle('cinema', j.odds >= GOD);
  opening.style.setProperty('--jg', j.glow);
  opening.classList.add('revealed');
  opCoin.style.setProperty('--boost', j.odds >= MYTHIC ? 1.6 : j.odds >= RARE ? 1 : .5);
  updateActions();
  r.revealedAt = performance.now();
  if (restored) return;
  sess.cur.phase = 'revealed';
  sess.results.push(j.name); (sess.rvars ||= []).push(r.variant || '');
  save();
  if (!quiet) { sfx.reveal(j.odds); if (j.odds >= MYTHIC) sfx.impact(); } // après une cinématique, sa musique a déjà fait la révélation
  // dopamine : le jeton claque, des rayons jaillissent derrière, étincelles, flash à sa couleur, secousse
  const lv = j.odds >= MYTHIC ? 2 : j.odds >= RARE ? 1.4 : j.odds >= 100 ? 1 : .6;
  pop(lv); rays(lv); tint(.25 + lv * .2, 300 + lv * 250);
  if (lv >= 1) burstAt(opCoin, j.glow, .6 + lv * .2); // particules dessinées à la main, à la couleur du jeton (jetons pas communs)
  burst(Math.round(10 + lv * 12));
  shake(lv * .7);
  if (j.odds >= MYTHIC) {
    flash(j.odds >= GOD ? .8 : .55, 800);
    setTimeout(() => { if (run === r) { rays(lv * .8); burst(20); shake(1.2); } }, 260);
  }
  addToHistory(j, r.variant);
  if (r.variant) setTimeout(() => { if (run === r) variantFx(r.variant, j.odds); }, 650); // jeton spécial : deuxième effet
}

// Variante (Doré, Glitch, Prisme) : bandeau qui claque, flash et étincelles à sa couleur, petit jingle
function variantFx(v, odds = 1) {
  const d = document.createElement('div');
  d.className = 'v-pop v-' + v;
  d.innerHTML = `<i></i><b>${t('v_' + v)}</b><small>1/${fmt(vOdds(odds, v))}</small>`;
  opening.querySelectorAll('.v-pop').forEach(x => x.remove());
  opening.appendChild(d);
  setTimeout(() => d.remove(), 1800);
  flash(.35, 500); burst(v === 'gold' ? 24 : 36); shake(v === 'gold' ? .5 : 1);
  sfx.upgrade(); if (v !== 'gold') setTimeout(() => sfx.reveal(20000), 120);
}

// 1/1000 et plus : cinématique propre au jeton (cinema.js), puis la fiche normale prend le relais
async function cine() {
  const r = run;
  r.done = true;
  clearInterval(r.hb);
  await CINE.play(r.result);
  if (run !== r) return;
  reveal(false, true);
}

// (ancienne) 1/1 000 000 : mini cinématique. Écran noir d'un coup, montée sonore, une ligne de lumière qui s'étire, puis l'explosion blanche
async function cinematic() {
  const r = run;
  r.done = true;
  clearInterval(r.hb);
  const black = document.createElement('div');
  black.className = 'op-black';
  opening.appendChild(black); // coupure au noir instantanée, sans rien d'autre
  const D = 1800;
  sfx.riser(D / 1000);
  await done(D);
  if (run !== r) return black.remove();
  black.remove();
  flash(1, 1300);
  reveal();
}

// Boutons sous la fiche : Suivant (pendant un ×10), Récap (à la fin d'un ×10), ou Pull encore / Retour
function updateActions() {
  renderAuto();
  const last = sess.idx >= sess.total - 1, multi = sess.total > 1;
  if (typeof ecoDecorate === 'function') setTimeout(ecoDecorate);
  $('op-next').hidden = last;
  $('op-next').innerHTML = t('next', { a: sess.idx + 2, b: sess.total });
  $('op-recap').hidden = !(last && multi);
  // un par un : seulement « Retour » (on rouvre en cliquant au milieu, sur le jeton) ; plus de bouton « Ouvrir encore »
  $('op-again').hidden = true;
  $('op-back').hidden = !(last && !multi);
  if (last && !multi) $('op-hint').textContent = '';
}
const spinning = () => run && performance.now() < (run.spinEnd || 0);
// Toucher pendant la rotation : le jeton s'arrête net de face (on peut enchaîner vite les tirages)
function stopSpin() {
  opCoin.querySelector('.spin')?.getAnimations().forEach(a => a.finish());
  if (run) run.spinEnd = 0;
  opening.classList.remove('spinning');
}
function next() {
  if (sess?.auto) return;
  if (!sess || sess.idx >= sess.total - 1 || !opening.classList.contains('revealed') || spinning()) return;
  sess.idx++;
  sfx.next();
  sess.cur = null;
  if (sess.autoResume) { sess.autoResume = false; sess.auto = true; } // l'auto-ouverture reprend après le bon jeton
  save();
  startOpening();

}

// « Tout ouvrir d'un coup » (pendant un Tout ouvrir) : les jetons s'ouvrent tout seuls, un par un, très vite.
// Ça s'arrête dès qu'un jeton est spécial (variante, ou 1/1000 et plus) : celui-là tu l'ouvres toi-même, avec toute la mise en scène.
// S'arrêter ? Selon les réglages du joueur (sous les tirages, sur l'accueil)
const isSpecial = (j, v) => (v && (SETTINGS.autoVars || []).includes(v)) || j.odds >= (SETTINGS.autoMin || Infinity);
function renderAuto() {
  const b = $('op-auto'); if (!b) return;
  const show = sess && sess.total > 1 && !sess.recap && (sess.idx < sess.total - 1 || !opening.classList.contains('revealed'));
  b.hidden = !show;
  b.classList.toggle('on', !!sess?.auto);
  b.textContent = sess?.auto ? '' + t('auto_stop') : '' + t('auto_go');
  const s = $('op-skip');
  s.hidden = !show;
  s.textContent = '✕ ' + t('auto_quit');
}
// « Retour au menu » : on arrête d'ouvrir et on repart à l'accueil. Les pulls pas encore ouverts reviennent dans ton stock.
// (Leurs résultats sont gardés par le serveur et ressortent tels quels aux prochains pulls : impossible de « relancer ».)
try { localStorage.removeItem('takoras-paused'); } catch {} // ancienne version (bouton Reprendre)
async function quitAll() {
  if (!sess || sess.recap || sess.total < 2 || quitAll.busy) return;
  quitAll.busy = true;
  sess.auto = false; turbo(false);
  if (run) { run.done = true; run.queue = []; clearInterval(run.hb); run.spinEnd = 0; }
  opening.classList.remove('spinning', 'hold');
  const ids = (sess.ids || []).slice(sess.results.length).filter((x) => x != null); // les doublons vendus d'office (limite 500) n'ont pas de ligne // le jeton en cours (pas encore révélé) compte comme pas ouvert
  let back = 0;
  if (ids.length) {
    const { data, error } = await sb.rpc('refund_pulls', { ids });
    if (error) { quitAll.busy = false; sfx.deny(); return toast(errText(error), true); }
    back = data.refunded; applyState(data.state);
  }
  sess.recap = true; // on a le droit de partir
  await leave();
  quitAll.busy = false;
  if (back) toast('' + t('auto_quit_ok', { n: back }));
}
$('op-skip')?.addEventListener('click', e => { e.stopPropagation(); quitAll(); });
// Mode turbo : environ 0,25 s par jeton, lignes de vitesse, compteur de combo, notes qui montent
const AUTO_STEP = 200;
let autoWait = 0;
function autoRun() {
  // auto lancée pendant que l'écran d'ouverture arrive : on réessaie un peu plus tard (sinon elle restait bloquée)
  if (sess?.auto && (!run || !opening.classList.contains('on')) && autoWait < 40) { autoWait++; return setTimeout(autoRun, 100); }
  autoWait = 0;
  if (!sess?.auto || !run || !opening.classList.contains('on')) return turbo(false);
  if (sess.recap) { sess.auto = false; turbo(false); return renderAuto(); }
  if (!run.done) {
    if (isSpecial(run.result, run.variant)) { // on s'arrête : à toi de jouer
      sess.auto = false; sess.autoResume = true; save(); renderAuto(); turbo(false);
      sfx.hold(); toast('' + t('auto_special'));
      return;
    }
    turbo(true);
    preloadTokens();
    run.queue = []; run.done = true; clearInterval(run.hb);
    reveal(false, true); // révélation sans le son normal (le turbo a le sien)
    // pas de longue rotation : le jeton claque direct
    opCoin.querySelector('.spin')?.getAnimations().forEach(a => a.finish());
    run.spinEnd = 0; opening.classList.remove('spinning');
    turboHit(run.result, run.variant);
    return setTimeout(autoRun, AUTO_STEP);
  }
  if (sess.idx >= sess.total - 1) { sess.auto = false; save(); turbo(false); return setTimeout(showRecap, 250); }
  sess.idx++; sess.cur = null; save();
  startOpening();
}
// Images des jetons décodées à l'avance : sinon, sur téléphone, le jeton n'a pas le temps de s'afficher à 0,2 s par pull
let tokImgs = null;
function preloadTokens() {
  if (tokImgs) return;
  tokImgs = SERIES.Takoras.map(j => { const i = new Image(); i.src = texOf(j); i.decode?.().catch(() => {}); return i; });
}
let combo = 0;
function turbo(on) {
  if (on && !opening.classList.contains('turbo')) { // centre du flou radial = le jeton
    const r = opCoin.getBoundingClientRect(), o = opening.getBoundingClientRect();
    opening.style.setProperty('--cx', (r.left + r.width / 2 - o.left) + 'px');
    opening.style.setProperty('--cy', (r.top + r.height / 2 - o.top) + 'px');
    opening.style.setProperty('--coinr', (r.width / 2) + 'px');
  }
  opening.classList.toggle('turbo', on);
  if (!on) { combo = 0; const c = $('op-combo'); if (c) c.hidden = true; }
}
function turboHit(j, v = '') {
  combo++;
  sfx.combo?.(combo);
  let c = $('op-combo');
  if (!c) { c = document.createElement('div'); c.id = 'op-combo'; c.className = 'op-combo'; opening.appendChild(c); }
  c.hidden = false;
  $('op-odds').textContent = '1/' + vOdds(j.odds, v).toLocaleString(LOCALE());
  c.style.setProperty('--cg', hexRGB(j.glow));
  c.innerHTML = `<b>×${combo}</b><small>${jnH(j.name)}</small>`;
  c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop');
  const z = opCoin.querySelector('.zoom');
  // petit coup de zoom, sans flash blanc : le jeton reste bien visible
  z?.animate([{ transform: 'scale(1.28)', filter: 'brightness(1.6)' }, { transform: 'scale(.95)', offset: .55 }, { transform: 'scale(1)', filter: 'none' }], { duration: 170, easing: 'cubic-bezier(.2, .9, .3, 1)' });
  // chaque jeton : étincelles à sa couleur ; un peu rare : rayons + flash ; tous les 10 : gros coup
  opening.style.setProperty('--tier', hexRGB(j.glow));
  // effets légers à chaque jeton (ça défile vite) ; les gros effets seulement sur les jetons rares et tous les 10
  burst(j.odds >= 100 ? 6 : 3);
  if (j.odds >= 400 || v) { rays(.5); tint(.25, 220); shake(.35); burstAt(opCoin, j.glow, .45); }
  else if (combo % 10 === 0) { rays(.7); shake(.4); }
}
$('op-auto')?.addEventListener('click', e => {
  e.stopPropagation();
  if (!sess) return;
  sess.auto = !sess.auto; sess.autoResume = false; save(); sfx.click(); renderAuto();
  if (sess.auto) autoRun();
});

// Récap des 10 jetons, le plus rare mis en avant
function showRecap() {
  if (spinning()) return;
  sess.recap = true;
  save();
  stopBg();
  const list = sess.results.map(findJeton), vars = sess.rvars || [], best = list.reduce((a, b) => (b.odds > a.odds ? b : a));
  opening.style.setProperty('--tier', hexRGB(best.glow));
  startBg(best);
  // Les doublons sont regroupés en une seule carte « ×N », du plus rare au plus commun (50 pulls tiennent sur un écran)
  const g = new Map();
  list.forEach((j, i) => { const k = j.name + '|' + (vars[i] || ''); const x = g.get(k) || { j, v: vars[i] || '', n: 0, lk: 0 }; x.n++; x.lk = Math.max(x.lk, +(sess.lucks || [])[i] || 0); g.set(k, x); });
  const cards = [...g.values()].sort((a, b) => vOdds(b.j.odds, b.v) - vOdds(a.j.odds, a.v));
  $('op-recap-grid').innerHTML = cards.map(({ j, v, n, lk }, i) =>
    `<div class="rc${i === 0 ? ' best' : ''}" style="--g:${hexRGB(j.glow)};animation-delay:${Math.min(i, 20) * 45}ms">${i === 0 ? `<span class="rc-tag">${t('best')}</span>` : ''}${n > 1 ? `<span class="rc-n">×${n}</span>` : ''}${jetonHTML(j, 72, v)}<b>${jnH(j.name)}${vTag(v)}</b><small>1/${vOdds(j.odds, v).toLocaleString(LOCALE())}${lk > 1 ? ` · ×${fmtLuck(lk)}` : ''}</small></div>`).join('');
  $('op-recap-tag').textContent = t('recap_tag', { n: sess.total });
  $('op-recap-title').textContent = t('recap_title', { n: sess.total });
  if (typeof ecoDecorate === 'function') ecoDecorate();
  opening.classList.remove('revealed', 'hold');
  opening.classList.add('recap');
}

// On ne peut quitter qu'à la fin (pour ne pas perdre les pulls achetés)
function canClose() { return !sess || sess.recap || (sess.total === 1 && opening.classList.contains('revealed')); }

function addToHistory(j, variant = '', luck = +(sess?.lucks || [])[sess?.results.length - 1] || 0) {
  const serie = SERIES[PULLS[sess.pull].name] ? PULLS[sess.pull].name : 'Takoras';
  if (accRecordPull({ ...j, variant, luck }, serie)) return renderHist(); // connecté : enregistré en ligne
  const h = loadLocalHist();
  h.unshift({ name: j.name, odds: j.odds, glow: j.glow, img: texOf(j), ts: Date.now() });
  try { localStorage.setItem('takoras-hist', JSON.stringify(h.slice(0, 30))); } catch {}
  renderHist();
}

function tap() {
  if (sess?.auto) return; // ouverture auto en cours : les clics ne doivent pas s'en mêler (ça la faisait dérailler)
  if (run?.done && opening.classList.contains('revealed') && spinning()) return stopSpin();
  // un par un : une fois le jeton révélé, toucher le jeton ouvre le pull suivant (il n'y a plus de bouton « Ouvrir encore »)
  if (run?.done && sess && sess.total === 1 && opening.classList.contains('revealed') && !spinning()) return openPulls(1);
  if (!run || run.done) return;
  if (run.holding) { if (run.canReveal) (run.result.odds >= RARE && SETTINGS.speed !== 'instant' ? cine() : reveal()); return; }
  if (!run.queue.length) return; // entre le dernier palier et la pause
  const next = run.queue.shift();
  countTo(run.shown, next);
  run.shown = next;
  sfx.tick(next);
  sess.cur.queue = run.queue; sess.cur.shown = next; save();
  setTier(next);
  opCoin.classList.remove('hit'); void opCoin.offsetWidth; opCoin.classList.add('hit');
  effects(next);
  $('op-hint').textContent = '';
  if (!run.queue.length) {
    // En instantané (ou pour les communs), on révèle directement, sans pause ni cinématique
    if (run.result.odds < FAST || SETTINGS.speed === 'instant') { run.done = true; setTimeout(reveal, 120); }
    else setTimeout(hold, 200);
  }
}

opCoin.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); tap(); }); // pointerdown = réagit dès l'appui, idéal pour spammer
// un par un : une fois le jeton révélé, toucher n'importe où sur l'écran (hors boutons) ouvre le tirage suivant
opening.addEventListener('pointerdown', e => {
  if (e.target.closest('button, a, input, select, .op-recap-view')) return;
  if (sess?.auto) return;
  if (run?.done && opening.classList.contains('revealed') && spinning()) { e.preventDefault(); return stopSpin(); }
  if (run?.done && sess && sess.total === 1 && opening.classList.contains('revealed') && !spinning()) { e.preventDefault(); openPulls(1); }
});
addEventListener('keydown', e => {
  if (!opening.classList.contains('on') || (e.key !== ' ' && e.key !== 'Enter') || e.target.closest?.('select, .debug') || (e.key === 'Enter' && e.target.closest?.('button:not(#op-coin)'))) return;
  e.preventDefault();
  if (opening.classList.contains('revealed')) { if (!$('op-next').hidden) next(); else if (!$('op-recap').hidden) showRecap(); return; }
  tap();
});

function buy(n, plan = null, vars = null, lucks = null, ids = null) { closeOpening(); startSession(n, plan, vars, lucks, ids); runTransition(); }
$('op-next')?.addEventListener('click', next);
// Pendant un ×10 : un clic n'importe où sur l'écran passe au jeton suivant
opening.addEventListener('click', e => {
  if (e.target.closest?.('button, select, .debug') || $('op-next').hidden || !opening.classList.contains('revealed')) return;
  next();
});
$('op-recap')?.addEventListener('click', showRecap);
$('op-again')?.addEventListener('click', () => openPulls(1));
$('op-back')?.addEventListener('click', leave);
$('op-recap-again')?.addEventListener('click', () => openPulls('all'));
$('op-recap-back')?.addEventListener('click', leave);
$('op-recap-x')?.addEventListener('click', e => { e.stopPropagation(); leave(); });

// Retour à l'accueil : tout s'envole hors de l'écran, les bandes noires repartent, puis l'accueil revient en douceur
let leaving = false;
async function leave() {
  if (leaving || !opening.classList.contains('on') || !canClose()) return;
  leaving = true;
  sfx.whooshOut();
  const out = 'cubic-bezier(.6, 0, .85, .2)', anims = [];
  // N'anime que ce qui est visible, en partant de son opacité actuelle (sinon un élément caché réapparaîtrait)
  const fly = (el, kf, opt) => {
    if (!el || el.offsetParent === null) return;
    const o = +getComputedStyle(el).opacity;
    if (o === 0) return;
    kf[0] = { ...kf[0], opacity: o };
    anims.push(el.animate(kf, { fill: 'forwards', easing: out, ...opt }));
  };
  opening.classList.add('leaving');
  opening.classList.remove('cinema');
  fly(opening.querySelector('.op-coin-col'), [{ transform: getComputedStyle(opening.querySelector('.op-coin-col')).transform }, { transform: 'translate(-70vw, 8vh) rotate(-35deg)', opacity: 0 }], { duration: 520 });
  fly($('op-info'), [{ transform: 'none', opacity: 1 }, { transform: 'translateX(60vw)', opacity: 0 }], { duration: 480, delay: 40 });
  fly(opening.querySelector('.op-top'), [{ opacity: 1 }, { transform: 'translateY(-14vh)', opacity: 0 }], { duration: 400 });
  opening.querySelectorAll('.rc').forEach((c, i) =>
    fly(c, [{ transform: 'none', opacity: 1 }, { transform: `translate(${(i % 5 - 2) * 18}vw, ${i < 5 ? -60 : 60}vh) rotate(${(i % 2 ? 1 : -1) * 25}deg)`, opacity: 0 }], { duration: 520, delay: i * 25 }));
  fly(opening.querySelector('.op-recap-view h2'), [{ opacity: 1 }, { transform: 'translateY(-10vh)', opacity: 0 }], { duration: 400 });
  opening.querySelectorAll('.op-recap-view .eyebrow, .op-recap-view .op-actions').forEach(el => fly(el, [{ opacity: 1 }, { opacity: 0, transform: 'translateY(20px)' }], { duration: 300 }));
  ['.op-bg', '.op-glow', '.op-vignette'].forEach(q => fly(opening.querySelector(q), [{ opacity: getComputedStyle(opening.querySelector(q)).opacity }, { opacity: 0 }], { duration: 600, easing: 'ease-in', delay: 120 }));
  await done(560);
  // L'écran d'ouverture s'efface et l'accueil revient avec un léger zoom
  await Promise.all([
    opening.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, easing: 'ease-out', fill: 'forwards' }).finished,
    document.querySelector('main').animate([{ opacity: .3, transform: 'scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 520, easing: 'cubic-bezier(.16, 1, .3, 1)' }).finished,
  ]);
  closeOpening();
  opening.getAnimations().forEach(a => a.cancel());
  anims.forEach(a => a.cancel());
  opening.classList.remove('leaving');
  leaving = false;
}

// Menu debug
const LUCKS = [1, 2, 5, 10, 100, 1000];
const FX = [['Shake', () => shake()], ['Vignette', () => opening.classList.toggle('t1000')], ['Rayons', () => opening.classList.toggle('t2500')], ['Flash', flash]];
function renderDebug() {
  $('dbg-luck').innerHTML = LUCKS.map(l => `<button class="${l === debug.luck ? 'on' : ''}" data-l="${l}">×${l}</button>`).join('');
  $('dbg-force').innerHTML = '<option value="">Aléatoire</option>' + SERIES.Takoras.map(j =>
    `<option value="${j.name}"${j.name === debug.force ? ' selected' : ''}>${jn(j.name)} · 1/${j.odds.toLocaleString(LOCALE())}</option>`).join('');
  $('dbg-var').innerHTML = [['', 'Au hasard'], ['none', 'Aucune'], ['gold', 'Doré'], ['celeste', 'Céleste'], ['ombre', 'Ombre']].map(([v, l]) => `<option value="${v}"${v === (debug.variant || '') ? ' selected' : ''}>${l}</option>`).join('');
  $('dbg-fx').innerHTML = FX.map(([n], i) => `<button data-f="${i}">${n}</button>`).join('');
}
$('dbg-luck')?.addEventListener('click', e => { const b = e.target.closest('button'); if (b) { debug.luck = +b.dataset.l; renderDebug(); } });
$('dbg-force')?.addEventListener('change', e => { debug.force = e.target.value; });
$('dbg-var')?.addEventListener('change', e => { debug.variant = e.target.value; });
$('dbg-fx')?.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (!opening.classList.contains('on')) { startSession(1); showOpening(); }
  FX[+b.dataset.f][1]();
});
$('dbg-open')?.addEventListener('click', () => buy(1));

// Reprise après un refresh : on revient exactement où on en était
(function restore() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch {}
  // une ouverture géante (plus de 1000, avant la limite) bloquait le site : on l'oublie, les jetons sont déjà dans l'inventaire
  if (saved?.total > 1000) { endSession(); return; }
  if (!saved || !PULLS[saved.pull] || (saved.cur && !(SERIES[PULLS[saved.pull].name] || SERIES.Takoras).some(j => j.name === saved.cur.name))) { endSession(); return; }
  sess = saved;
  if (!ACC.user && !(sb && localStorage.getItem('sb-joyskjoofihwhycyreyn-auth-token'))) { endSession(); return; } // pas connecté : rien à reprendre
  select(sess.pull);
  if (!sess.cur && !sess.recap) { endSession(); return; }
  showOpening();
  if (sess.recap) showRecap();
})();

// Hover : le jeton du pull penche vers la souris avec un reflet de lumière (comme sur l'accueil)
(function tiltLoop() {
  let over = false, mx = .5, my = .5;
  const cur = { rx: 0, ry: 0, g: 0 };
  opCoin.addEventListener('pointermove', e => {
    const r = opCoin.getBoundingClientRect();
    mx = (e.clientX - r.left) / r.width; my = (e.clientY - r.top) / r.height; over = true;
  });
  opCoin.addEventListener('pointerleave', () => { over = false; });
  (function frame() {
    const t = opCoin.querySelector('.tilt3d');
    if (t && opening.classList.contains('on')) {
      const tgt = over ? { rx: (.5 - my) * 64, ry: (mx - .5) * 64, g: 1 } : { rx: 0, ry: 0, g: 0 };
      for (const k in cur) cur[k] += (tgt[k] - cur[k]) * (over ? .12 : .06);
      t.style.transform = `rotateX(${cur.rx.toFixed(2)}deg) rotateY(${cur.ry.toFixed(2)}deg)`;
      opCoin.style.setProperty('--mx', (mx * 100).toFixed(1) + '%');
      opCoin.style.setProperty('--my', (my * 100).toFixed(1) + '%');
      opCoin.style.setProperty('--gl', cur.g.toFixed(3)); // intensité du reflet
    }
    requestAnimationFrame(frame);
  })();
})();

// Hover sur les jetons du récap
$('op-recap-grid')?.addEventListener('pointermove', e => {
  const card = e.target.closest('.rc'); if (!card) return;
  const img = card.querySelector('img'), r = img.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
  img.style.transform = `perspective(400px) rotateX(${(-y * 36).toFixed(1)}deg) rotateY(${(x * 36).toFixed(1)}deg) scale(1.08)`;
});
$('op-recap-grid')?.addEventListener('pointerout', e => {
  const card = e.target.closest('.rc'); if (card && !card.contains(e.relatedTarget)) card.querySelector('img').style.transform = '';
});

// ---------- Réglages de « Tout ouvrir d'un coup » (sous les tirages, sur l'accueil) : sur quoi ça s'arrête
const AC_MINS = [100, 500, 1000, 5000, 25000, 100000, 0]; // 0 = jamais
function renderAutoCfg() {
  const box = $('auto-cfg'); if (!box) return;
  const min = SETTINGS.autoMin || 0, vars = SETTINGS.autoVars || [];
  box.innerHTML = `<h4>${t('ac_title')}</h4><p>${t('ac_sub')}</p>
    <div class="ac-lbl">${t('ac_min')}</div>
    <div class="ac-row" data-ac="min">${AC_MINS.map(m => `<button data-v="${m}" class="${m === min ? 'on' : ''}">${m ? '1/' + m.toLocaleString(LOCALE()) : t('ac_never')}</button>`).join('')}</div>
    <div class="ac-lbl">${t('ac_vars')}</div>
    <div class="ac-row" data-ac="vars">${Object.keys(VARIANTS).map(v => `<button data-v="${v}" class="v-${v}${vars.includes(v) ? ' on' : ''}">${t('v_' + v)} <small>1/${VARIANTS[v].odds}</small></button>`).join('')}</div>
    ${!min && !vars.length ? `<p class="ac-hint">${t('ac_hint')}</p>` : ''}`;
}
$('auto-cfg')?.addEventListener('click', e => {
  const b = e.target.closest('.ac-row button'); if (!b) return;
  if (b.parentNode.dataset.ac === 'min') SETTINGS.autoMin = +b.dataset.v;
  else { const v = b.dataset.v, l = SETTINGS.autoVars || []; SETTINGS.autoVars = l.includes(v) ? l.filter(x => x !== v) : [...l, v]; }
  saveSettings(); sfx.click(); renderAutoCfg();
});
addEventListener('DOMContentLoaded', renderAutoCfg);

// Jetons dessinés sur une grille plus grande : on les agrandit partout (sauf dans le jeton 3D et la fiche, déjà agrandis en entier)
(function gridCSS() {
  const css = Object.values(SERIES).flat().filter(j => j.img && texScale(j) !== 1)
    .map(j => `img[src$="${j.img.split('/').pop()}"]:not(.spin img):not(.jm-coin img){scale:${texScale(j)}}`).join('');
  if (css) document.head.appendChild(Object.assign(document.createElement('style'), { textContent: css }));
})();

export { buy, leave, canClose, startOpening, closeOpening, renderAutoCfg, renderDebug, debug, sess };
