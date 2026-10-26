// Écran du Ring (repris de legacy/ring-ui.js + ring-fx.js, puis retravaillé en phase 8 : DA pixel art).
// Ce fichier est la référence : il n'est plus régénéré. Les règles (physique) restent dans ring-engine.js, inchangé.
import { RCFG } from './ring-config.js';
import { RG } from './ring-engine.js';
import { SETTINGS, esc, fmt, hexRGB, host, jetonOf, jn, jnH, reducedFx, sfx, texOf, vCls, vTag, t, at } from './env';
import './legacy-base.css';
import './ring.css';

// « Ring » : l'écran du duel. Visée au lance-pierre (doigt ou souris), tours simultanés, animation de la physique,
// effets (traînées, chocs, ralenti, chutes), IA d'entraînement, écran de fin et tuto interactif.
// Règles : ring-engine.js (RG). Valeurs : ring-config.js (RCFG).

// ---------- Textes (FR + EN)
const RT = {
  fr: {
    map_arene: 'Arène', map_jardin: 'Jardin', map_volcan: 'Volcan', map_glace: 'Glace', map_ruines: 'Ruines', foeTeam: 'Équipe adverse', scout: 'Leurs pouvoirs', scoutHint: 'Touche un jeton pour voir sa fiche. Le chrono est en pause pendant que tu regardes (entraînement).',
    pw: {
      grow: ['Gonfler', 'Plus gros et plus lourd ce tour.'],
      bounce: ['Rebond', 'Rebondit sur le bord au lieu de sortir.'],
      scrap: ['Ferraille', 'Deux fois plus lourd ce tour : pousse fort, bouge peu.'],
      slide: ['Glissade', 'Presque aucun frottement : file beaucoup plus loin.'],
      eruption: ['Éruption', 'À l’arrêt : onde de choc qui repousse tout autour.'],
      curve: ['Courant', 'Sa trajectoire se courbe vers l’ennemi le plus proche.'],
      double: ['Frappe ×2', 'Son premier choc pousse deux fois plus fort.'],
      ghost: ['Fantôme', 'Traverse les jetons jusqu’à s’arrêter.'],
      rescue: ['Sauvetage', 'Ramène ton jeton le plus au bord vers le centre.'],
      shrink: ['Ombre', 'Plus petit et beaucoup plus rapide.'],
      magnet: ['Aimant', 'À l’arrêt : attire les ennemis proches.'],
      anchor: ['Ancre', 'Ne tire pas, mais impossible à pousser ce tour.'],
      second: ['Second souffle', 'Repart une 2e fois quand il ralentit.'],
      roots: ['Racines', 'Aucun de tes jetons ne peut sortir ce tour.'],
      shield: ['Bouclier', 'Les ennemis ne peuvent pas le pousser ce tour.'],
      void: ['Néant', 'Le premier ennemi touché est projeté vers le bord.'],
      split: ['Dédoublement', 'Se divise en deux en plein tir (le double disparaît après).'],
      haste: ['Coup de pouce', 'Les pouvoirs de tes alliés reviennent 1 tour plus tôt.'],
      guard: ['Bulle', 'Ton allié le plus proche ne peut pas être poussé ce tour.'],
      none: ['—', 'Pas de pouvoir.'],
    },
    once: '1 fois par match', every: 'recharge {n} tours', ready: 'Prêt', used: 'Utilisé', inCd: 'dans {n} tour(s)', pick: 'Choisis un jeton',
    power: 'Pouvoir', on: 'Activé', validate: 'Valider', validated: 'Validé ✓', pass: 'Passer le tour', turn: 'Tour {n}/{m}', sudden: 'Mort subite !', foeOk: '✓ L’adversaire a validé',
    hSel: 'Tape un de tes jetons', hAim: 'Glisse vers l’arrière pour viser : tu peux partir de n’importe où sur l’écran', hVal: 'Valide quand tu es prêt', hWait: 'En attente de l’adversaire…',
    reveal: 'Feu !', out: 'Éjecté !', win: 'Victoire !', lose: 'Défaite…', draw: 'Égalité', again: 'Rejouer', back: 'Retour', quit: 'Abandonner le match ?', you: 'Toi', bot: 'Robot',
    why: { forfeit: 'Abandon', stale: 'Match fermé (les deux joueurs étaient partis) · Elo inchangé', afk: 'Absent 3 tours de suite', out: 'Tous ses jetons sont sortis du ring', count: 'Plus de jetons au dernier tour', turns: 'Plus de jetons restants à la fin', center: 'Jetons plus proches du centre', draw: 'Personne ne gagne' },
    turns: '{n} tours', mass: 'Poids', powerS: 'Puissance', size: 'Taille', koS: 'Éjecté',
    massD: 'Plus il est lourd, plus il est dur à pousser et plus il pousse fort.', powD: 'La force max de son tir : jusqu’où il peut aller.', sizeD: 'Plus il est gros, plus il touche facilement… mais plus il est facile à toucher.', statsLegend: '⚖️ Poids : dur à pousser, pousse fort · 💥 Puissance : force du tir · ⭕ Taille : touche plus facilement, mais cible plus facile',
    t1: 'Tape un de tes jetons pour le choisir.', t2: 'Glisse vers l’arrière pour viser. Plus tu tires loin, plus c’est fort. Regarde la trajectoire !',
    t3: 'Valide ! Ton adversaire tire en même temps que toi.', t4: 'Éjecte ses jetons du ring pour gagner.', t5: 'Chaque jeton a un pouvoir, essaie-le ! Active-le, vise, puis valide.',
    t6: 'Bien joué, tu es prêt pour le classé !', tOk: 'OK', tSkip: 'Passer', tEnd: 'Terminer',
    shrink: 'Le ring rétrécit à chaque tour !', cmpWin: 'Avantage : toi', cmpEven: 'Assez équilibré', cmpLose: 'Avantage : lui', cmpHint: 'Plus lourd = dur à pousser · plus de puissance = tir plus fort.',
    tTimer: 'Le chrono : <b>60 s</b> pour viser à chaque tour. Si les deux valident avant, le tour part tout de suite. Et <b>le ring rétrécit à chaque tour</b> : reste loin du bord !',
    tWalls: 'Pouvoirs : tu peux activer ceux de <b>plusieurs jetons</b> dans le même tour (choisis un jeton, touche son pouvoir, puis un autre…), mais <b>un seul jeton tire</b> : celui que tu vises.',
    tScout: 'Touche un <b>jeton adverse</b> pour voir sa fiche (stats, pouvoir). Si ton jeton est choisi, tu vois les <b>deux côte à côte</b> pour comparer. Re-touche ton jeton pour le déselectionner.',
    tRanked: '<b>Le classé</b> : tu affrontes un vrai joueur de ton niveau (Elo). Victoire = +Elo, défaite = −Elo. Monte de <b>Fer 1</b> jusqu’à <b>Légende</b> ! Si tu ne joues pas 3 tours de suite, tu perds le match.',
  },
  en: {
    map_arene: 'Arena', map_jardin: 'Garden', map_volcan: 'Volcano', map_glace: 'Ice', map_ruines: 'Ruins', foeTeam: 'Opponent team', scout: 'Their powers', scoutHint: 'Tap a token to see its card. The timer is paused while you look (training).',
    pw: {
      grow: ['Inflate', 'Bigger and heavier this turn.'],
      bounce: ['Bounce', 'Bounces off the edge instead of falling out.'],
      scrap: ['Scrap metal', 'Twice as heavy this turn: pushes hard, barely moves.'],
      slide: ['Slide', 'Almost no friction: travels much further.'],
      eruption: ['Eruption', 'When it stops: shockwave that pushes everything away.'],
      curve: ['Current', 'Its path curves toward the nearest enemy.'],
      double: ['Double hit', 'Its first hit pushes twice as hard.'],
      ghost: ['Ghost', 'Goes through tokens until it stops.'],
      rescue: ['Rescue', 'Pulls your token closest to the edge back toward the center.'],
      shrink: ['Shadow', 'Smaller and much faster.'],
      magnet: ['Magnet', 'When it stops: pulls nearby enemies.'],
      anchor: ['Anchor', 'Doesn’t shoot, but can’t be pushed this turn.'],
      second: ['Second wind', 'Speeds up again once when it slows down.'],
      roots: ['Roots', 'None of your tokens can fall out this turn.'],
      shield: ['Shield', 'Enemies can’t push it this turn.'],
      void: ['Void', 'The first enemy it hits is flung toward the edge.'],
      split: ['Split', 'Splits in two mid-shot (the copy vanishes after).'],
      haste: ['Helping hand', 'Your allies’ powers come back 1 turn sooner.'],
      guard: ['Bubble', 'Your closest ally can’t be pushed this turn.'],
      none: ['—', 'No power.'],
    },
    once: 'once per match', every: '{n}-turn cooldown', ready: 'Ready', used: 'Used', inCd: 'in {n} turn(s)', pick: 'Pick a token',
    power: 'Power', on: 'On', validate: 'Confirm', validated: 'Confirmed ✓', pass: 'Skip turn', turn: 'Turn {n}/{m}', sudden: 'Sudden death!', foeOk: '✓ Opponent is ready',
    hSel: 'Tap one of your tokens', hAim: 'Drag backwards to aim: you can start anywhere on the screen', hVal: 'Confirm when you’re ready', hWait: 'Waiting for the opponent…',
    reveal: 'Go!', out: 'Out!', win: 'Victory!', lose: 'Defeat…', draw: 'Draw', again: 'Play again', back: 'Back', quit: 'Forfeit the match?', you: 'You', bot: 'Bot',
    why: { forfeit: 'Forfeit', stale: 'Match closed (both players had left) · Elo unchanged', afk: 'Away for 3 turns in a row', out: 'All their tokens left the ring', count: 'More tokens on the last turn', turns: 'More tokens left at the end', center: 'Tokens closer to the center', draw: 'Nobody wins' },
    turns: '{n} turns', mass: 'Weight', powerS: 'Power', size: 'Size', koS: 'Knocked out',
    massD: 'The heavier, the harder to push and the harder it pushes.', powD: 'Its max shot strength: how far it can go.', sizeD: 'The bigger, the easier it hits… but the easier it is to hit.', statsLegend: '⚖️ Weight: hard to push, pushes hard · 💥 Power: shot strength · ⭕ Size: hits more easily, but easier to hit',
    t1: 'Tap one of your tokens to pick it.', t2: 'Drag backwards to aim. The further you pull, the harder the shot. Watch the path!',
    t3: 'Confirm! Your opponent shoots at the same time.', t4: 'Knock their tokens out of the ring to win.', t5: 'Every token has a power, try it! Turn it on, aim, then confirm.',
    t6: 'Well done, you’re ready for ranked!', tOk: 'OK', tSkip: 'Skip', tEnd: 'Finish',
    shrink: 'The ring shrinks every turn!', cmpWin: 'Advantage: you', cmpEven: 'Fairly even', cmpLose: 'Advantage: them', cmpHint: 'Heavier = harder to push · more power = stronger shot.',
    tTimer: 'The timer: <b>60 s</b> to aim each turn. If both confirm earlier, the turn starts right away. And <b>the ring shrinks every turn</b>: stay away from the edge!',
    tWalls: 'Powers: you can turn on the powers of <b>several tokens</b> in the same turn (pick a token, tap its power, then another…), but <b>only one token shoots</b>: the one you aim with.',
    tScout: 'Tap an <b>enemy token</b> to see its card (stats, power). With your token selected, you see <b>both side by side</b> to compare. Tap your token again to deselect it.',
    tRanked: '<b>Ranked</b>: you face a real player at your level (Elo). Win = +Elo, lose = −Elo. Climb from <b>Iron 1</b> up to <b>Legend</b>! Skip 3 turns in a row and you lose the match.',
  },
};
const rtL = () => RT[SETTINGS.lang] || RT.fr;
const rt = (k, v = {}) => String(rtL()[k] ?? RT.fr[k]).replace(/\{(\w+)\}/g, (_, x) => v[x] ?? '');
const PW_COL = { grow: '#7dd3fc', bounce: '#f9a8d4', scrap: '#fb923c', slide: '#a5f3fc', eruption: '#f97316', curve: '#60a5fa', double: '#f43f5e', ghost: '#c4b5fd',
  rescue: '#4ade80', shrink: '#818cf8', magnet: '#fde68a', anchor: '#94a3b8', second: '#fb7185', roots: '#86efac', shield: '#f1f5f9', void: '#a855f7', split: '#ffffff', haste: '#86efac', guard: '#7dd3fc', none: '#888' };
function powerText(name) {
  const k = RG.kit(name), [n, d] = rtL().pw[k.pw] || rtL().pw.none;
  return { pw: k.pw, name: n, desc: d, cd: k.cd, when: k.pw === 'none' ? '' : k.cd ? rt('every', { n: k.cd }) : rt('once') };
}

// ---------- État
const RNG = { st: null, el: null, cv: null, ctx: null, raf: 0, phase: 'aim', sel: null, aim: null, pow: false, drag: null, prev: null, foe: null, foeOk: false, locked: false,
  timer: 0, play: null, parts: [], trails: {}, spin: {}, shake: 0, imgs: {}, ai: 'normal', names: ['', ''], onEnd: null, tuto: null, view: { s: 1, cx: 0, cy: 0 } };
// Classé en ligne : chacun se voit EN BAS. ME = mon camp dans l'état du serveur (0 ou 1) ; si je suis le camp 1,
// l'écran est tourné d'un demi-tour (les maps sont symétriques, donc chacun voit le même terrain).
const ME = () => RNG.me || 0, FOE = () => 1 - ME(), FL = () => (RNG.me ? -1 : 1);
const sideCol = b => SIDE[b.side === ME() ? 0 : 1];
// Rayon de départ (la vue ne bouge pas) et rayon affiché (le bord se resserre en douceur entre deux tours)
const rgR0 = () => RNG.st?.map?.R0 || RG.ringR(RNG.st);
const rgImg = name => {
  if (RNG.imgs[name]) return RNG.imgs[name];
  const im = new Image(); im.src = texOf(jetonOf(name)); RNG.imgs[name] = im; return im;
};

// teams : [[{ name, lvl, variant }×3] ×2]. opts : { names, ai, tuto, onEnd }
// opts.online (classé) : { me, state, deadline, shoot(shot), forfeit(), tick(), now() } — l'état vient du serveur
function startRing(teams, opts = {}) {
  closeRing();
  const on = opts.online || null;
  Object.assign(RNG, { dispR: null, me: on ? on.me : 0, online: on, st: on ? RG.clone(on.state) : RG.create(teams, opts.map), phase: 'aim', sel: null, aim: null, pow: false, drag: null, prev: null, foe: null, foeOk: false, locked: false, play: null, parts: [], trails: {}, spin: {}, shake: 0,
    ai: opts.ai || 'normal', names: opts.names || [rt('you'), rt('bot')], onEnd: opts.onEnd || null, tuto: opts.tuto ? { step: 0, must: !!opts.must, onDone: opts.onDone || null } : null, last: 0 });
  teams.flat().forEach(j => rgImg(j.name));
  const o = document.createElement('div');
  o.className = 'rg'; o.id = 'rg';
  o.innerHTML = `
    <div class="rg-top">
      <button class="rg-x" data-quit aria-label="${t('close')}">✕</button>
      <div class="rg-score"><span class="me" id="rg-n0"></span><b id="rg-turn"></b><span class="foe" id="rg-n1"></span></div>
      <div class="rg-timer" id="rg-timer"><svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15.5"/><circle class="p" cx="18" cy="18" r="15.5" pathLength="100"/></svg><b></b></div>
    </div>
    <div class="rg-names"><span>${esc(RNG.names[ME()])}</span><span class="rg-ok" id="rg-ok">${rt('foeOk')}</span><span>${esc(RNG.names[FOE()])}</span></div>
    <div class="rg-stage" id="rg-stage"><canvas id="rg-cv"></canvas><div class="rg-banner" id="rg-banner"></div><div class="rg-team foe" id="rg-t1"></div><div class="rg-team me" id="rg-t0"></div></div>
    <p class="rg-hint" id="rg-hint"></p>
    <div class="rg-bot">
      <button class="rg-pw" id="rg-pw" disabled></button>
      <button class="rg-go" id="rg-go" disabled></button>
    </div>`;
  document.body.appendChild(o);
  RNG.el = o; RNG.cv = o.querySelector('#rg-cv'); RNG.ctx = RNG.cv.getContext('2d');
  document.documentElement.classList.add('lock');
  requestAnimationFrame(() => o.classList.add('on'));
  rgResize(); addEventListener('resize', rgResize);
  const stage = o.querySelector('#rg-stage');
  stage.addEventListener('pointerdown', rgDown);
  addEventListener('pointermove', rgMove); addEventListener('pointerup', rgUp); addEventListener('pointercancel', rgUp);
  o.querySelectorAll('.rg-team').forEach(p => p.addEventListener('click', e => { const b = e.target.closest('[data-id]'); if (b) rgInfo(+b.dataset.id); }));
  o.querySelector('#rg-pw').onclick = rgTogglePow;
  o.querySelector('#rg-go').onclick = () => rgLock();
  o.querySelector('[data-quit]').onclick = async () => {
    if (RNG.st?.over || RNG.tuto || RNG.phase === 'end' || await host.ask(rt('quit'))) {
      if (!RNG.st) return;
      if (RNG.online && RNG.phase !== 'end') RNG.online.forfeit();
      RNG.tuto = null; const onEnd = RNG.onEnd; closeRing(); onEnd?.('back');
    }
  };
  sfx.whoosh?.();
  if (RNG.st.map) setTimeout(() => RNG.st && rgBanner(`${rt('map_' + RNG.st.map.id)}`, MAP_THEME[RNG.st.map.id]?.rim || '#c4b5fd', false, 1300), 350);
  rgTurnStart();
  RNG.raf = requestAnimationFrame(rgFrame);
}
function closeRing() {
  cancelAnimationFrame(RNG.raf); clearTimeout(RNG.foeT); clearTimeout(RNG.okT); RFX.reset();
  removeEventListener('resize', rgResize); removeEventListener('pointermove', rgMove); removeEventListener('pointerup', rgUp); removeEventListener('pointercancel', rgUp);
  document.querySelectorAll('.rg, .rg-res').forEach(x => { x.classList.remove('on'); setTimeout(() => x.remove(), 250); });
  document.documentElement.classList.remove('lock');
  RNG.st = null; RNG.el = null; RNG.online = null; RNG.me = 0;
}
// Le ring prend toute la place disponible (carré). Rendu en deux couches « pixel art » basse résolution (décor et effets,
// agrandies sans lissage = vrais gros pixels) et les jetons au-dessus en pleine résolution, nets.
function rgResize() {
  if (!RNG.el) return;
  const st = RNG.el.querySelector('#rg-stage'), r = st.getBoundingClientRect(), size = Math.max(200, Math.min(r.width, r.height)), dpr = Math.min(2, devicePixelRatio || 1);
  RNG.cv.style.width = RNG.cv.style.height = size + 'px';
  RNG.cv.width = RNG.cv.height = Math.round(size * dpr);
  // pixels du décor : 1,5 px sur grand écran, 1 px sur téléphone (pixel art discret)
  const px = size >= 520 ? 1.5 : 1, low = Math.ceil(size / px);
  for (const k of ['lo', 'hi']) {
    const cv = RNG[k] || (RNG[k] = document.createElement('canvas'));
    cv.width = cv.height = low;
  }
  RNG.view = { size, dpr, px, s: size / 2 / ((RNG.st ? rgR0() : RCFG.RING_R) * 1.08) };
}
const w2s = (x, y) => { const k = RNG.view.s * FL(); return [RNG.view.size / 2 + x * k, RNG.view.size / 2 + y * k]; };
const s2w = (px, py) => { const k = RNG.view.s * FL(); return [(px - RNG.view.size / 2) / k, (py - RNG.view.size / 2) / k]; };
// Couleurs des camps : violet = toi, orange = l'adversaire (les couleurs du site)
const SIDE = [{ hi: '#ddd6fe', md: '#a78bfa', lo: '#4c1d95', rgb: '167,139,250' }, { hi: '#fed7aa', md: '#fb923c', lo: '#7c2d12', rgb: '251,146,60' }];
// Filtres des variantes (les mêmes que sur tout le site)
const VFILTER = { gold: 'sepia(1) saturate(2.6) hue-rotate(-12deg) brightness(1.12)', celeste: 'grayscale(.55) brightness(1.35) sepia(.15) hue-rotate(195deg) saturate(1.4)', ombre: 'grayscale(.6) brightness(.55) sepia(.45) hue-rotate(225deg) saturate(1.7) contrast(1.3)' };

// ---------- Tour : visée (60 s, ou dès que les deux ont validé), l'IA prépare son tir en même temps
// L'IA calcule dans un Worker (fil à part) ; sans Worker, on calcule ici (même résultat, juste un petit à-coup)
let aiWorker = null, aiSeq = 0;
function rgAiThink(st, level) {
  if (level === 'still') return Promise.resolve(null);
  try { aiWorker ??= new Worker(new URL('./ai.worker.js', import.meta.url), { type: 'module' }); } catch { aiWorker = false; }
  if (!aiWorker) return Promise.resolve(RG.aiShot(st, 1, level));
  const id = ++aiSeq;
  return new Promise(res => {
    const done = e => { if (e.data.id !== id) return; aiWorker.removeEventListener('message', done); res(e.data.shot); };
    aiWorker.addEventListener('message', done);
    aiWorker.postMessage({ id, st, side: 1, level });
  });
}
function rgTurnStart() {
  const st = RNG.st;
  Object.assign(RNG, { phase: 'aim', aim: null, pow: false, pows: new Set(), prev: null, foe: null, foeOk: false, locked: false, drag: null });
  const mine = RG.alive(st, ME());
  if (!mine.some(b => b.id === RNG.sel)) RNG.sel = null;
  RNG.timer = RCFG.AIM_S;
  RNG.el.querySelector('#rg-ok').classList.remove('on');
  if (st.map && st.turn === 2 && !RNG.tuto) setTimeout(() => RNG.st && rgBanner(rt('shrink'), '#fb7185', true, 1500), 200);
  if (RNG.online) { RNG.online.sent = false; rgHud(); return; } // l'adversaire est un vrai joueur : rien à simuler
  // l'IA réfléchit (hors simulation : son hasard ne touche pas au déterminisme du tour)
  clearTimeout(RNG.foeT); clearTimeout(RNG.okT); RNG.foeReady = false;
  const turn = st.turn;
  RNG.foeT = setTimeout(async () => {
    if (!RNG.st || RNG.st.turn !== turn) return;
    const shot = await rgAiThink(RG.clone(RNG.st), RNG.ai);
    if (!RNG.st || RNG.st.turn !== turn) return;
    RNG.foe = shot; RNG.foeReady = true;
    if (RNG.ai === 'still') return;
    RNG.okT = setTimeout(() => { if (RNG.st && RNG.phase === 'aim' && !RNG.foeOk) { RNG.foeOk = true; RNG.el.querySelector('#rg-ok').classList.add('on'); sfx.click?.(); } }, 1200 + Math.random() * 3500);
  }, 60);
  rgHud();
  if (RNG.tuto) rgTuto();
}
function rgHud() {
  const st = RNG.st, o = RNG.el; if (!o) return;
  [0, 1].forEach(s => { o.querySelector('#rg-n' + (s === ME() ? 0 : 1)).innerHTML = st.bodies.filter(b => b.side === s).map(b => `<i class="${b.alive ? '' : 'off'}"></i>`).join(''); });
  rgPanels();
  o.querySelector('#rg-turn').textContent = st.sudden ? rt('sudden') : st.map ? '' : rt('turn', { n: Math.min(st.turn, RCFG.TURNS), m: RCFG.TURNS });
  const b = st.bodies.find(x => x.id === RNG.sel), pwB = o.querySelector('#rg-pw'), go = o.querySelector('#rg-go');
  if (b) {
    const p = powerText(b.name), rd = RG.ready(b);
    pwB.disabled = !rd || RNG.locked || RNG.phase !== 'aim';
    pwB.className = 'rg-pw' + (RNG.pow ? ' on' : '') + (rd ? ' ready' : '');
    pwB.style.setProperty('--c', PW_COL[p.pw]);
    pwB.innerHTML = `<b>✦ ${esc(p.name)}</b><small>${RNG.pow ? rt('on') : rd ? esc(p.desc) : b.spent ? rt('used') : rt('inCd', { n: b.cd })}</small>`;
  } else { pwB.disabled = true; pwB.className = 'rg-pw'; pwB.innerHTML = `<b>✦ ${rt('power')}</b><small>${rt('pick')}</small>`; }
  const canGo = RNG.phase === 'aim' && !RNG.locked && rgHasMove();
  go.disabled = RNG.phase !== 'aim' || RNG.locked;
  go.className = 'rg-go' + (canGo ? ' ready' : '') + (RNG.locked ? ' done' : '');
  go.textContent = RNG.locked ? rt('validated') : canGo ? rt('validate') : rt('pass');
  o.querySelector('#rg-hint').textContent = RNG.phase !== 'aim' ? '' : RNG.locked ? rt('hWait') : !b ? rt('hSel') : !RNG.aim ? rt('hAim') : rt('hVal');
}

// ---------- Les deux équipes dans les coins (la sienne en haut à droite, la tienne en bas à gauche) : touche pour la fiche
function rgPanels() {
  const st = RNG.st; if (!st || !RNG.el) return;
  [0, 1].forEach(side => {
    const box = RNG.el.querySelector('#rg-t' + (side === ME() ? 0 : 1));
    box.innerHTML = st.bodies.filter(b => b.side === side).map(b => {
      const p = powerText(b.name), rd = RG.ready(b);
      return `<button class="rg-tc${b.alive ? '' : ' ko'}${b.id === RNG.sel ? ' sel' : ''}${RNG.pows?.has(b.id) ? ' on' : ''}" data-id="${b.id}" style="--c:${PW_COL[p.pw]}" aria-label="${esc(jn(b.name))}">
        <img class="px${vCls(b.variant)}" src="${texOf(jetonOf(b.name))}" alt="">
        <span class="rg-tcp">${!b.alive ? '✕' : rd ? '✦' : b.spent ? '·' : b.cd}</span>
      </button>`;
    }).join('');
  });
}
// Stats physiques avec leur explication (fiche du match, fiches du site, éditeur d'équipe)
function ringStatsHTML(name, lvl = 1, variant = '', compact = false) {
  const s = RG.stats(name, lvl, variant), M = RCFG.STAT_MAX;
  const row = (k, ico, label, v, max, txt, d) => `<div class="rs-row ${k}"><span class="rs-l">${ico} ${label}</span><span class="rs-b"><i style="width:${Math.min(100, v / max * 100)}%"></i></span><b>${txt}</b>${compact ? '' : `<small>${d}</small>`}</div>`;
  return `<div class="rs${compact ? ' compact' : ''}">
    ${row('mass', '⚖️', rt('mass'), s.mass, M.mass, s.mass.toFixed(2), rt('massD'))}
    ${row('pow', '<img class="px rs-ico" src="/img/stats/puissance.png" alt="">', rt('powerS'), s.power, M.power, fmt(Math.round(s.power)), rt('powD'))}
    ${row('size', '<img class="px rs-ico" src="/img/stats/taille.png" alt="">', rt('size'), s.r, M.r, s.r, rt('sizeD'))}
  </div>`;
}
// Fiche d'un jeton pendant le match (le chrono s'arrête en entraînement)
function rgInfo(id) {
  const b = RNG.st?.bodies.find(x => x.id === id); if (!b) return;
  RNG.el.querySelector('.rg-info')?.remove();
  const p = powerText(b.name), rd = RG.ready(b);
  const state = !b.alive ? rt('koS') : rd ? rt('ready') : b.spent ? rt('used') : rt('inCd', { n: b.cd });
  // ton jeton choisi + un jeton adverse : on compare les deux
  const mine = b.side !== ME() && RNG.st.bodies.find(x => x.id === RNG.sel && x.alive && x.side === ME());
  const o = document.createElement('div'); o.className = 'rg-info';
  o.innerHTML = `<div class="rg-ic ${b.side === ME() ? 'me' : 'foe'}" style="--g:${hexRGB(jetonOf(b.name).glow)}">
    <button class="rg-icx" aria-label="${t('close')}">✕</button>
    <div class="rg-ih"><img class="px${vCls(b.variant)}" src="${texOf(jetonOf(b.name))}" alt=""><div><b>${jnH(b.name)} ${vTag(b.variant)}</b><small>${esc(RNG.names[b.side])} · ${at('lvl')} ${b.lvl}</small></div></div>
    <div class="rg-ip" style="--c:${PW_COL[p.pw]}"><b>✦ ${esc(p.name)}</b><p>${esc(p.desc)}</p><small>${state}${p.when ? ' · ' + p.when : ''}</small></div>
    ${mine ? rgCompare(mine, b) : ringStatsHTML(b.name, b.lvl, b.variant)}
  </div>`;
  RNG.el.appendChild(o); RNG.info = true; sfx.click();
  o.animate([{ opacity: 0, transform: 'scale(.94)' }, { opacity: 1, transform: 'none' }], { duration: 180, easing: 'ease-out' });
  o.onclick = () => { o.remove(); RNG.info = false; };
}

// Comparaison : mes stats (avec bonus de rôle et d'équipe) contre les siennes, et qui gagne sur chaque stat
function rgCompare(a, b) {
  const M = RCFG.STAT_MAX, f = (v, k) => (k === 'mass' ? v.toFixed(2) : fmt(Math.round(v)));
  const rows = [['mass', '⚖️', rt('mass')], ['power', '<img class="px rs-ico" src="/img/stats/puissance.png" alt="">', rt('powerS')], ['r', '<img class="px rs-ico" src="/img/stats/taille.png" alt="">', rt('size')]];
  const wins = rows.filter(([k]) => a.base[k] > b.base[k]).length;
  const bar = (v, k, side) => `<span class="rg-cb ${side}"><i style="width:${Math.min(100, v / M[k] * 100)}%"></i></span>`;
  return `<div class="rg-cmp">
    <div class="rg-ch"><span class="me"><img class="px${vCls(a.variant)}" src="${texOf(jetonOf(a.name))}" alt="">${jnH(a.name)}</span><span>vs</span><span class="foe">${jnH(b.name)}<img class="px${vCls(b.variant)}" src="${texOf(jetonOf(b.name))}" alt=""></span></div>
    ${rows.map(([k, ico, l]) => {
      const x = a.base[k], y = b.base[k], w = x > y ? 'me' : x < y ? 'foe' : '';
      return `<div class="rg-cr ${w}"><b class="me">${f(x, k)}</b>${bar(x, k, 'me')}<small>${ico} ${l}</small>${bar(y, k, 'foe')}<b class="foe">${f(y, k)}</b></div>`;
    }).join('')}
    <p class="rg-cv">${rt(wins >= 2 ? 'cmpWin' : wins === 1 ? 'cmpEven' : 'cmpLose')}</p>
    <small class="muted">${rt('cmpHint')}</small>
  </div>`;
}

// ---------- Visée au lance-pierre : tape un jeton, puis glisse (depuis le jeton ou n'importe où) vers l'arrière
function rgPt(e) { const r = RNG.cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
function rgDown(e) {
  if (!RNG.st) return;
  e.preventDefault();
  const [px, py] = rgPt(e), [wx, wy] = s2w(px, py);
  const near = b => RG.len(b.x - wx, b.y - wy) < b.r * 1.3 + 15;
  // toucher un jeton adverse : sa fiche (stats, pouvoir), même quand un de tes jetons est déjà choisi.
  // Si tu glisses au lieu de toucher, c'est une visée comme d'habitude.
  const foe = !RNG.play && RG.alive(RNG.st, FOE()).find(near);
  if (foe && (RNG.sel == null || RNG.phase !== 'aim' || RNG.locked || RNG.tuto?.block)) return rgInfo(foe.id);
  if (foe) { RNG.drag = { x: px, y: py, id: e.pointerId, foe: foe.id, aim0: RNG.aim }; return; }
  if (RNG.phase !== 'aim' || RNG.locked) { const mine = !RNG.play && RG.alive(RNG.st, ME()).find(near); return mine && rgInfo(mine.id); }
  if (RNG.tuto?.block) return;
  const hit = RG.alive(RNG.st, ME()).find(b => RG.len(b.x - wx, b.y - wy) < b.r * 1.5 + 20);
  // re-toucher ton jeton déjà choisi (sans glisser) le déselectionne (voir rgUp)
  const again = !!hit && hit.id === RNG.sel;
  if (hit && hit.id !== RNG.sel) { RNG.sel = hit.id; RNG.aim = null; RNG.pow = !!RNG.pows?.has(hit.id); RNG.prev = null; sfx.click(); rgHud(); RNG.tuto?.on?.('sel'); }
  if (RNG.sel == null) return;
  RNG.drag = { x: px, y: py, id: e.pointerId, again };
}
function rgMove(e) {
  const d = RNG.drag; if (!d || e.pointerId !== d.id || RNG.locked) return;
  const [px, py] = rgPt(e), dx = d.x - px, dy = d.y - py, L = Math.hypot(dx, dy);
  const full = Math.min(120, RNG.view.size * .3); // puissance max avec un geste court (jeton près du bord du téléphone)
  // sur un jeton adverse, un doigt qui bouge un peu reste un « toucher » (sa fiche), pas une visée
  if (L < (d.foe != null ? 26 : 8)) return;
  d.moved = true;
  const f = Math.round(Math.min(1, L / full) * 100) / 100;
  RNG.aim = { ax: Math.round(dx / L * 1000 * FL()) || 0, ay: Math.round(dy / L * 1000 * FL()) || 0, f }; // direction dans le monde (écran tourné si camp 1)
  RNG.prevDirty = true;
  if (!RNG.aimTick || performance.now() - RNG.aimTick > 90) { RNG.aimTick = performance.now(); sfx.tick?.(.2 + f * .6); }
}
function rgUp(e) {
  const d = RNG.drag; if (!d || e.pointerId !== d.id) return;
  RNG.drag = null;
  if (d.foe != null && !d.moved) { RNG.aim = d.aim0 ?? RNG.aim; return rgInfo(d.foe); } // simple toucher sur un jeton adverse
  if (d.again && !d.moved) { RNG.sel = null; RNG.aim = null; RNG.pow = false; RNG.prev = null; /* ses pouvoirs activés restent activés */ sfx.click(); return rgHud(); }
  if (RNG.aim && RNG.aim.f < RCFG.MIN_FORCE) { RNG.aim = null; RNG.prev = null; }
  rgHud();
  if (RNG.aim) RNG.tuto?.on?.('aim');
}
// Pouvoirs : tu peux en activer sur PLUSIEURS de tes jetons dans le même tour (un seul jeton tire : celui que tu vises)
function rgTogglePow() {
  const b = RNG.st?.bodies.find(x => x.id === RNG.sel); if (!b || !RG.ready(b) || RNG.locked) return;
  RNG.pows ??= new Set();
  if (RNG.pows.has(b.id)) RNG.pows.delete(b.id); else RNG.pows.add(b.id);
  RNG.pow = RNG.pows.has(b.id); RNG.prevDirty = true; sfx.next?.(); rgHud();
  if (RNG.pow) RNG.tuto?.on?.('pow');
}
// Mon tir : le jeton choisi tire (s'il y a une visée) ; les pouvoirs activés des autres partent avec (pows)
function rgShot() {
  const pw = [...(RNG.pows || [])].map(id => RNG.st.bodies.find(x => x.id === id && x.alive)).filter(Boolean);
  const b = RNG.st.bodies.find(x => x.id === RNG.sel && x.alive) || pw[0];
  if (!b) return null;
  return { i: b.i, ax: RNG.aim?.ax || 0, ay: RNG.aim?.ay || -FL(), f: RNG.aim && b.id === RNG.sel ? RNG.aim.f : 0, pow: RNG.pows?.has(b.id) || false, pows: pw.filter(x => x !== b).map(x => x.i) };
}
const rgHasMove = () => !!RNG.aim || !!RNG.pows?.size;
// Trajectoire prévue : seulement ton tir, jusqu'un peu après le premier choc
function rgPreview() {
  RNG.prevDirty = false;
  if (!RNG.aim || RNG.sel == null) { RNG.prev = null; return; }
  const sh = [null, null]; sh[ME()] = rgShot();
  const sim = RG.clone(RNG.st), r = RG.resolve(sim, sh, { preview: 70 });
  const idx = RNG.st.bodies.findIndex(b => b.id === RNG.sel);
  const hitEv = r.ev.find(e => e.t === 'hit' && (e.a === RNG.sel || e.b === RNG.sel));
  const other = hitEv ? RNG.st.bodies.findIndex(b => b.id === (hitEv.a === RNG.sel ? hitEv.b : hitEv.a)) : -1;
  const cut = r.firstHit >= 0 ? r.firstHit + 1 : r.frames.length;
  RNG.prev = { me: r.frames.slice(0, cut + 40).map(f => f[idx]).filter(Boolean), hit: other >= 0 ? r.frames.slice(cut).map(f => f[other]).filter(Boolean) : [], cut, out: r.ev.some(e => e.t === 'out' && e.id === RNG.sel) };
}
function rgLock(auto) {
  if (RNG.phase !== 'aim' || RNG.locked) return;
  if (RNG.tuto?.block && RNG.tuto.block !== 'go') return;
  RNG.locked = true; RNG.drag = null;
  sfx.upgrade?.(); rgHud();
  RNG.tuto?.on?.('go');
  // en ligne : on envoie le tir au serveur ; le tour part quand il a les deux (ou à la fin du chrono)
  if (RNG.online) { RNG.online.sent = true; RNG.online.shoot(rgHasMove() ? rgShot() : null); return; }
  // l'adversaire valide (au plus tard à la fin du chrono)
  const go = () => {
    if (!RNG.st) return;
    if (!RNG.foeOk) { RNG.foeOk = true; RNG.el.querySelector('#rg-ok').classList.add('on'); }
    setTimeout(() => rgReveal(), 350);
  };
  const wait = () => { if (!RNG.st) return; if (RNG.foeReady) go(); else setTimeout(wait, 100); };
  clearTimeout(RNG.okT);
  setTimeout(wait, auto ? 0 : 300 + Math.random() * 600);
}

// ---------- Classé en ligne : le serveur décide, l'écran rejoue.
// Chaque mise à jour du match (temps réel) arrive ici. Un tour calculé = on rejoue les deux tirs révélés à partir de
// l'état d'avant (même moteur, même résultat), puis on se cale exactement sur l'état du serveur.
function ringOnline(m) {
  const O = RNG.online; if (!RNG.st || !O || !m) return;
  if (m.status === 'done') O.done = m;
  if (m.turn > O.turn) O.next = m;
  else if (m.turn === O.turn) { O.deadline = O.toLocal(m.deadline); rgFoeReady(ME() ? m.ready1 : m.ready2); }
  rgOnlineStep();
}
function rgFoeReady(on) {
  if (!RNG.el || !on || RNG.foeOk) return;
  RNG.foeOk = true; RNG.el.querySelector('#rg-ok').classList.add('on'); sfx.click?.();
}
function rgOnlineStep() {
  const O = RNG.online; if (!O || RNG.phase === 'reveal' || RNG.phase === 'play' || RNG.phase === 'end') return;
  const m = O.next;
  if (m) {
    O.next = null; O.turn = m.turn; O.deadline = O.toLocal(m.deadline); O.snap = m.state;
    const L = m.last;
    if (L && L.turn === m.turn - 1 && L.turn === RNG.st.turn) {
      RNG.st = RG.clone(L.before);
      RNG.locked = true; rgFoeReady(true);
      setTimeout(() => rgReveal(L.shots), 350);
      return;
    }
    RNG.st = RG.clone(m.state); // trop en retard pour rejouer : on se cale directement
    return rgOnlineAfter();
  }
  if (O.done) rgOnlineAfter(); // abandon ou absence : fin sans dernier tour à rejouer
}
// Après l'animation (ou un recalage) : état exact du serveur, puis tour suivant ou écran de fin
function rgOnlineAfter() {
  const O = RNG.online; if (!O) return;
  if (O.snap) { RNG.st = RG.clone(O.snap); O.snap = null; }
  if (O.next) return rgOnlineStep();
  if (O.done) {
    O.elo = O.done.elo;
    RNG.phase = 'end'; rgHud();
    const d = O.done; O.done = null;
    return setTimeout(() => rgResult({ winner: d.winner, why: d.why }), 600);
  }
  rgTurnStart();
}
// Chrono du serveur. À zéro : on envoie ce qu'on a ; un peu après, on demande au serveur de calculer le tour.
function rgOnlineClock() {
  const O = RNG.online;
  if (RNG.phase !== 'aim') return;
  const left = (O.deadline - Date.now()) / 1000;
  RNG.timer = Math.max(0, Math.min(RCFG.AIM_S, left));
  if (left <= 0 && !RNG.locked) rgLock(true);
  if (left < -3 && Date.now() - (O.ticked || 0) > 2500) { O.ticked = Date.now(); O.tick(); }
}

// ---------- Révélation puis résolution animée
function rgReveal(srv) {
  const st = RNG.st; if (!st) return;
  RNG.phase = 'reveal'; rgHud();
  const mine = rgHasMove() ? rgShot() : null, shots = srv || (ME() ? [RNG.foe || null, mine] : [mine, RNG.foe || null]);
  RNG.reveal = shots.map((s, side) => s && { body: st.bodies.find(b => b.side === side && b.i === s.i), s });
  rgBanner(rt('reveal'), '#fde68a');
  sfx.riser?.(.6);
  setTimeout(() => {
    if (!RNG.st) return;
    const before = RG.clone(st);
    const r = RG.resolve(st, shots);
    const bodies = r.ids.map(id => before.bodies.find(b => b.id === id) || { ...before.bodies.find(b => b.id === id - 100), id, tmp: true });
    RNG.play = { r, bodies, f: 0, ei: 0, slow: 0, fall: [] };
    RFX.start(RNG.play);
    RNG.reveal = null; RNG.phase = 'play'; RNG.prev = null;
    sfx.whooshOut?.();
  }, 700);
}
function rgEvent(e) {
  const P = RNG.play, body = id => P.bodies.find(b => b.id === id);
  const at = (x, y) => w2s(x, y);
  if (e.t === 'hit') {
    const [x, y] = at(e.x, e.y), big = e.j > RCFG.BIG_HIT;
    rgSparks(x, y, big ? 22 : 9, big ? '#fde68a' : '#fff', big ? 4 : 2.5);
    if (big) { RNG.shake = Math.min(14, 6 + e.j / 400); P.slow = RCFG.SLOWMO_S; sfx.impact?.(); } else sfx.click?.();
  }
  if (e.t === 'wall') {
    const [x, y] = at(e.x, e.y), bump = e.k > 1;
    rgSparks(x, y, bump ? 18 : 8, bump ? '#f9a8d4' : '#e7e5e4', bump ? 4 : 2.5);
    if (bump) { rgRing(x, y, '#f472b6', 2.4); RNG.shake = Math.min(10, 4 + e.j / 500); sfx.impact?.(); } else sfx.click?.();
  }
  if (e.t === 'out') {
    const b = body(e.id), [x, y] = at(e.x, e.y);
    P.fall.push({ b, x: e.x, y: e.y, vx: e.vx, vy: e.vy, t: 0 });
    P.slow = RCFG.SLOWMO_S * 1.4; RNG.shake = 10;
    const mine = b.side === ME();
    rgSparks(x, y, 26, mine ? '#a78bfa' : '#fb923c', 4);
    rgBanner(rt('out'), mine ? '#fb923c' : '#a78bfa');
    sfx.evaporate?.(); sfx.impact?.();
  }
  RFX.event(e, P); // pouvoirs : effets, sons et ralentis propres à chacun (ring-fx.js)
  if (e.t === 'void' || e.t === 'double' || e.t === 'eruption') P.slow = RCFG.SLOWMO_S;
  if (e.t === 'sudden') setTimeout(() => rgBanner(rt('sudden'), '#fb7185', false, 1600), 500);
}

// ---------- Petits effets
function rgSparks(x, y, n, col, sp) { if (reducedFx()) n = Math.ceil(n / 3); for (let k = 0; k < n; k++) { const a = Math.random() * 6.283, v = (.5 + Math.random()) * sp; RNG.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, col, size: 1.5 + Math.random() * 2.5 }); } }
function rgRing(x, y, col, size, inward) { RNG.parts.push({ ring: true, x, y, col, size, life: 1, inward }); }
function rgFlashCol(col) {
  if (!RNG.el || reducedFx()) return;
  const f = document.createElement('div'); f.className = 'rg-flash'; f.style.background = col; RNG.el.appendChild(f);
  f.animate([{ opacity: .35 }, { opacity: 0 }], { duration: 380 }); setTimeout(() => f.remove(), 390);
}
function rgBanner(text, col, small, ms = 900) {
  const b = RNG.el?.querySelector('#rg-banner'); if (!b) return;
  b.innerHTML = text; b.style.setProperty('--c', col); b.className = 'rg-banner on' + (small ? ' sm' : '');
  b.getAnimations().forEach(a => a.cancel());
  b.animate([{ opacity: 0, transform: 'translate(-50%, -50%) scale(1.7)' }, { opacity: 1, transform: 'translate(-50%, -50%) scale(1)', offset: .2 }, { opacity: 1, offset: .75 }, { opacity: 0, transform: 'translate(-50%, -50%) scale(.95)' }], { duration: ms, easing: 'ease-out', fill: 'forwards' });
}

// ---------- Boucle d'affichage
function rgFrame(now) {
  if (!RNG.st) return;
  RNG.raf = requestAnimationFrame(rgFrame);
  const dt = Math.min(.05, (now - (RNG.last || now)) / 1000); RNG.last = now;
  if (RNG.online) rgOnlineClock();
  else if (RNG.phase === 'aim' && !RNG.locked && !RNG.tuto && !RNG.info) {
    RNG.timer -= dt;
    if (RNG.timer <= 0) { RNG.timer = 0; rgLock(true); }
  }
  if (RNG.prevDirty) rgPreview();
  // le bord rejoint le nouveau rayon une fois l'animation du tour finie
  const Rt = RG.ringR(RNG.st);
  if (RNG.dispR == null) RNG.dispR = Rt;
  if (RNG.phase !== 'play' && RNG.phase !== 'reveal' && RNG.dispR !== Rt) RNG.dispR = Math.abs(RNG.dispR - Rt) < 1 ? Rt : RNG.dispR + (Rt - RNG.dispR) * Math.min(1, dt * 2.5);
  const P = RNG.play;
  if (RNG.phase === 'play' && P && (P.intros?.length || RFX.busy())) {
    if (!RFX.busy()) RFX.introStart(P.intros.shift(), P); // le temps se fige le temps de l'intro du pouvoir
  } else if (RNG.phase === 'play' && P) {
    const scale = P.slow > 0 ? RCFG.SLOWMO : 1;
    if (P.slow > 0) P.slow -= dt;
    P.f += dt * scale / RCFG.DT;
    const ev = P.r.ev;
    while (P.ei < ev.length && ev[P.ei].at / RCFG.DT <= P.f) rgEvent(ev[P.ei++]);
    P.fall.forEach(x => { x.t += dt * scale; });
    if (P.f >= P.r.frames.length - 1 && P.fall.every(x => x.t > .7)) {
      while (P.ei < ev.length) rgEvent(ev[P.ei++]);
      RNG.play = null; RNG.trails = {}; RFX.endTurn();
      if (RNG.online) rgOnlineAfter();
      else if (RNG.st.over) { RNG.phase = 'end'; rgHud(); setTimeout(() => rgResult(ev.find(x => x.t === 'end')), 600); }
      else { rgTurnStart(); RNG.tuto?.on?.('turn'); }
    }
  }
  rgDraw(dt);
  const tm = RNG.el.querySelector('#rg-timer');
  tm.querySelector('b').textContent = RNG.phase === 'aim' && !RNG.tuto ? Math.ceil(RNG.timer) : '';
  tm.style.setProperty('--p', RNG.phase === 'aim' ? RNG.timer / RCFG.AIM_S : 0);
  tm.classList.toggle('low', RNG.phase === 'aim' && !RNG.locked && RNG.timer < 3.5 && !RNG.tuto);
}

// ---------- Dessin du ring
// Ambiance de chaque map : sol (centre → bord), bord, plots, obstacles
const MAP_THEME = {
  arene: { floor: ['#2e2550', '#1d1736', '#140f26'], rim: '#c4b5fd', rimDark: '#2e1065', stud: '#7c3aed', rock: ['#6b6390', '#3b3459', '#a59ccf'] },
  jardin: { floor: ['#1f3b2c', '#15291f', '#0d1a14'], rim: '#86efac', rimDark: '#14532d', stud: '#16a34a', rock: ['#6b7d5c', '#3c4a33', '#a3b896'] },
  volcan: { floor: ['#3b1a14', '#26110d', '#170a08'], rim: '#fb923c', rimDark: '#7c2d12', stud: '#ea580c', rock: ['#5b4a46', '#2f2422', '#8f7a74'] },
  glace: { floor: ['#1e3a52', '#142838', '#0b1824'], rim: '#a5f3fc', rimDark: '#155e75', stud: '#22d3ee', rock: ['#7aa6c2', '#3f6480', '#d6f3ff'] },
  ruines: { floor: ['#3a3326', '#26211a', '#17140f'], rim: '#fde68a', rimDark: '#713f12', stud: '#ca8a04', rock: ['#8a7e66', '#4f4637', '#c2b594'] },
};
// Zones au sol : boue qui bouillonne (ralentit) ou glace qui brille (fait filer)
function rgZones(c, t) {
  const Z = RNG.st?.map?.zones; if (!Z?.length) return;
  const V = RNG.view, px = V.px;
  for (const z of Z) {
    const [x0, y0] = w2s(z.x - z.w / 2, z.y - z.h / 2), w = z.w * V.s, h = z.h * V.s, rad = Math.min(w, h) * .18;
    c.save(); c.beginPath(); c.roundRect(x0, y0, w, h, rad);
    if (z.fric > 1) {
      c.fillStyle = 'rgba(92,56,24,.55)'; c.fill(); c.clip();
      c.fillStyle = 'rgba(60,36,14,.6)';
      for (let k = 0; k < 9; k++) { const bx = x0 + w * ((k * .37 + .1) % 1), by = y0 + h * ((k * .61 + .2) % 1); c.beginPath(); c.ellipse(bx, by, w * .12, h * .08, 0, 0, 7); c.fill(); }
      for (let k = 0; k < 5; k++) { const ph = (t * .6 + k * .2) % 1, bx = x0 + w * ((k * .29 + .15) % 1), by = y0 + h * ((k * .53 + .3) % 1); c.strokeStyle = `rgba(214,170,120,${.6 * (1 - ph)})`; c.lineWidth = px; c.beginPath(); c.arc(bx, by, 2 + ph * 7, 0, 7); c.stroke(); }
      c.restore(); c.save(); c.beginPath(); c.roundRect(x0, y0, w, h, rad); c.strokeStyle = 'rgba(180,120,60,.7)'; c.setLineDash([px * 4, px * 3]); c.lineWidth = px * 1.5; c.stroke();
    } else {
      c.fillStyle = 'rgba(165,243,252,.22)'; c.fill(); c.clip();
      c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = px * 1.5;
      for (let k = -2; k < 7; k++) { const o = ((t * 30 + k * 70) % (w + h)) - h; c.beginPath(); c.moveTo(x0 + o, y0 + h); c.lineTo(x0 + o + h * .5, y0); c.stroke(); }
      c.restore(); c.save(); c.beginPath(); c.roundRect(x0, y0, w, h, rad); c.strokeStyle = 'rgba(207,250,254,.75)'; c.lineWidth = px * 1.5; c.stroke();
    }
    c.restore();
  }
}
// Murs : pierre en briques (amortit) ou mur rebondisseur rose lumineux, chevrons qui défilent (renvoie plus vite)
function rgWalls(c, t) {
  const W = RNG.st?.map?.walls; if (!W?.length) return;
  const V = RNG.view, px = V.px, T = MAP_THEME[RNG.st.map.id] || MAP_THEME.arene;
  for (const o of W) {
    const [ax, ay] = w2s(o.x1, o.y1), [bx, by] = w2s(o.x2, o.y2), w = o.w * V.s, L = Math.hypot(bx - ax, by - ay) || 1, ux = (bx - ax) / L, uy = (by - ay) / L;
    const seg = (col, lw, dx = 0, dy = 0) => { c.strokeStyle = col; c.lineWidth = lw; c.lineCap = 'round'; c.beginPath(); c.moveTo(ax + dx, ay + dy); c.lineTo(bx + dx, by + dy); c.stroke(); };
    seg('rgba(0,0,0,.45)', w + px * 2, w * .15, w * .3); // ombre
    if (o.k > 1) {
      const p = .6 + .4 * Math.sin(t * 6);
      c.shadowColor = '#f472b6'; c.shadowBlur = 10 * p; seg('#831843', w + px * 2); c.shadowBlur = 0;
      seg('#ec4899', w * .78);
      // chevrons qui défilent le long du mur
      c.fillStyle = 'rgba(255,255,255,.85)';
      const step = 26, off = (t * 40) % step, hw = w * .22;
      for (let d = off; d < L; d += step) { const cx = ax + ux * d, cy = ay + uy * d; c.beginPath(); c.moveTo(cx - uy * hw, cy + ux * hw); c.lineTo(cx + ux * 6, cy + uy * 6); c.lineTo(cx + uy * hw, cy - ux * hw); c.lineTo(cx + ux * 2, cy + uy * 2); c.fill(); }
    } else {
      seg(T.rock[1], w + px * 2);
      seg(T.rock[0], w * .8);
      seg(T.rock[2], Math.max(px, w * .14), -uy * w * .2, ux * w * .2); // reflet sur le dessus
      // joints de briques
      c.strokeStyle = T.rock[1]; c.lineWidth = Math.max(1, px);
      for (let d = 18, k = 0; d < L - 6; d += 22, k++) { const cx = ax + ux * d, cy = ay + uy * d, h = w * .38, o2 = k % 2 ? h * .5 : -h * .5; c.beginPath(); c.moveTo(cx - uy * (o2 > 0 ? 0 : h), cy + ux * (o2 > 0 ? 0 : h)); c.lineTo(cx + uy * (o2 > 0 ? h : 0), cy - ux * (o2 > 0 ? h : 0)); c.stroke(); }
    }
  }
}
// Équipe adverse (ou la tienne) : les 3 jetons d'un coup, pouvoir, état et stats, pour préparer son tir

// Sol du ring en pixel art : disque sombre tramé, cercles repères, bord épais en deux tons avec des plots, étoiles autour
// R0 : sol de départ (en cache) · Rc : bord actuel (le ring rétrécit : au-delà, le vide)
function rgFloor(c, ox, oy, R, Rc, t) {
  const px = RNG.view.px;
  // étoiles qui scintillent dans les coins (hors du ring)
  if (!RNG.stars) RNG.stars = Array.from({ length: 34 }, () => { const a = Math.random() * 6.283, d = 1.04 + Math.random() * .5; return { a, d, k: Math.random() * 6 }; });
  for (const s of RNG.stars) {
    const x = ox + Math.cos(s.a) * R * s.d, y = oy + Math.sin(s.a) * R * s.d, on = .35 + .65 * Math.abs(Math.sin(t * 1.3 + s.k));
    c.fillStyle = `rgba(221,214,254,${on * .8})`; c.fillRect(Math.round(x / px) * px, Math.round(y / px) * px, px, px);
  }
  const T = MAP_THEME[RNG.st?.map?.id] || MAP_THEME.arene;
  // le sol fixe (dégradé, trame, repères) est dessiné une fois puis gardé en cache, tant que la vue ne change pas
  const V = RNG.view, key = `${V.size}|${px}|${V.s}|${ox}|${oy}|${RNG.st?.map?.id}`;
  if (RNG.floor?.key !== key) {
    const cv = RNG.floor?.cv || document.createElement('canvas');
    cv.width = c.canvas.width; cv.height = c.canvas.height;
    const f = cv.getContext('2d');
    f.setTransform(1 / px, 0, 0, 1 / px, 0, 0);
    const g = f.createRadialGradient(ox, oy, R * .05, ox, oy, R);
    g.addColorStop(0, T.floor[0]); g.addColorStop(.7, T.floor[1]); g.addColorStop(1, T.floor[2]);
    f.fillStyle = g; f.beginPath(); f.arc(ox, oy, R, 0, 7); f.fill();
    // trame en damier très légère pour le grain pixel art
    f.save(); f.beginPath(); f.arc(ox, oy, R, 0, 7); f.clip();
    f.fillStyle = 'rgba(255,255,255,.025)';
    for (let y = Math.max(0, oy - R); y < Math.min(V.size, oy + R); y += px * 2) for (let x = Math.max(0, ox - R) + ((y / px / 2) % 2 ? px : 0); x < Math.min(V.size, ox + R); x += px * 4) f.fillRect(x, y, px, px);
    f.restore();
    // cercles repères en pointillés
    f.strokeStyle = 'rgba(196,181,253,.10)'; f.lineWidth = px; f.setLineDash([px * 2, px * 3]);
    [.33, .66].forEach(k => { f.beginPath(); f.arc(ox, oy, R * k, 0, 7); f.stroke(); });
    f.setLineDash([]);
    // centre : petit losange
    f.fillStyle = 'rgba(221,214,254,.35)'; f.beginPath(); f.moveTo(ox, oy - px * 3); f.lineTo(ox + px * 3, oy); f.lineTo(ox, oy + px * 3); f.lineTo(ox - px * 3, oy); f.fill();
    RNG.floor = { key, cv };
  }
  c.save(); c.setTransform(1, 0, 0, 1, (RNG.shakeX || 0) / px, (RNG.shakeY || 0) / px); c.drawImage(RNG.floor.cv, 0, 0); c.restore();
  // partie du sol déjà avalée : le vide, avec un liseré rouge qui s'effrite au bord
  if (Rc < R - .5) {
    c.fillStyle = 'rgba(6,4,12,.88)'; c.beginPath(); c.arc(ox, oy, R + px * 2, 0, 7); c.arc(ox, oy, Rc, 0, 7, true); c.fill();
    c.fillStyle = `rgba(251,113,133,${.35 + .2 * Math.sin(t * 3)})`;
    for (let k = 0; k < 72; k++) { const a = k / 72 * 6.283, d = Rc + px * (2 + (k * 7 % 5)); if (k % 3) c.fillRect(Math.round((ox + Math.cos(a) * d) / px) * px, Math.round((oy + Math.sin(a) * d) / px) * px, px, px); }
  }
  R = Rc;
  // bord : anneau sombre + anneau clair qui pulse
  c.lineWidth = px * 3; c.strokeStyle = T.rimDark; c.beginPath(); c.arc(ox, oy, R + px, 0, 7); c.stroke();
  c.globalAlpha = .6 + .25 * Math.sin(t * 2); c.lineWidth = px * 1.4; c.strokeStyle = T.rim; c.shadowColor = T.rim; c.shadowBlur = 6;
  c.beginPath(); c.arc(ox, oy, R, 0, 7); c.stroke(); c.shadowBlur = 0; c.globalAlpha = 1;
  // plots sur le bord (16)
  for (let k = 0; k < 16; k++) {
    const a = k / 16 * 6.283 + t * .05, x = ox + Math.cos(a) * (R + px), y = oy + Math.sin(a) * (R + px);
    c.fillStyle = k % 4 ? T.stud : '#fde68a'; c.fillRect(x - px, y - px, px * 2, px * 2);
  }
}

// Repère de camp sous un jeton : anneau pixel à la couleur du camp, en segments qui tournent doucement
function rgTeamMark(c, b, x, y, rr, t, live) {
  const S = sideCol(b), px = RNG.view.px;
  // ombre portée (ellipse sombre)
  c.fillStyle = 'rgba(0,0,0,.45)'; c.beginPath(); c.ellipse(x + rr * .12, y + rr * .32, rr * 1.02, rr * .72, 0, 0, 7); c.fill();
  // halo de camp
  const g = c.createRadialGradient(x, y, rr * .7, x, y, rr * 1.45); g.addColorStop(0, `rgba(${S.rgb},.35)`); g.addColorStop(1, `rgba(${S.rgb},0)`);
  c.fillStyle = g; c.beginPath(); c.arc(x, y, rr * 1.45, 0, 7); c.fill();
  // anneau en 8 segments qui tourne (sens opposé pour l'adversaire)
  const rot = (b.side ? -1 : 1) * t * .6, seg = 6.283 / 8;
  c.lineWidth = px * 1.5; c.strokeStyle = S.md;
  for (let k = 0; k < 8; k++) { c.beginPath(); c.arc(x, y, rr + px * 2.5, rot + k * seg, rot + k * seg + seg * .62); c.stroke(); }
  // pouvoir activé pendant la visée : anneau de la couleur du pouvoir qui pulse
  if (live && RNG.pows?.has(b.id) && RNG.phase === 'aim') {
    const pc = PW_COL[b.pw]; c.strokeStyle = pc; c.lineWidth = px * 1.5; c.globalAlpha = .6 + .4 * Math.sin(t * 8);
    c.beginPath(); c.arc(x, y, rr + px * 5, 0, 7); c.stroke(); c.globalAlpha = 1;
  }
}

function rgDraw(dt) {
  const M = RNG.ctx, V = RNG.view, R = (RNG.dispR ?? RG.ringR(RNG.st)) * V.s, R0 = rgR0() * V.s, [ox, oy] = w2s(0, 0), t = performance.now() / 1000;
  const lo = RNG.lo.getContext('2d'), hi = RNG.hi.getContext('2d');
  // tremblement de l'écran (le même décalage pour toutes les couches)
  let sx0 = 0, sy0 = 0;
  if (RNG.shake > 0) { sx0 = (Math.random() - .5) * RNG.shake; sy0 = (Math.random() - .5) * RNG.shake; RNG.shake = Math.max(0, RNG.shake - dt * 40); }
  RNG.shakeX = sx0; RNG.shakeY = sy0;
  M.setTransform(V.dpr, 0, 0, V.dpr, 0, 0); M.clearRect(0, 0, V.size, V.size); M.translate(sx0, sy0);
  for (const L of [lo, hi]) { L.setTransform(1 / V.px, 0, 0, 1 / V.px, 0, 0); L.clearRect(0, 0, V.size, V.size); L.translate(sx0, sy0); }
  const blit = L => { M.save(); M.setTransform(V.dpr, 0, 0, V.dpr, 0, 0); M.imageSmoothingEnabled = false; M.drawImage(L.canvas, 0, 0, L.canvas.width * V.px, L.canvas.height * V.px); M.restore(); };

  // ----- Couche basse (pixel) : sol, effets au sol, traînées, repères de camp, auras
  let c = lo;
  rgFloor(c, ox, oy, R0, R, t);
  rgZones(c, t);
  rgWalls(c, t);
  // corps à afficher : pendant l'animation, les positions enregistrées ; sinon l'état du match
  const P = RNG.play;
  let list;
  if (P) {
    const fi = Math.min(P.r.frames.length - 1, Math.floor(P.f)), fr = P.r.frames[fi], nx = P.r.frames[Math.min(P.r.frames.length - 1, fi + 1)], k = P.f - fi;
    list = P.bodies.map((b, i) => { const a = fr[i], z = nx[i] || a; return a ? { ...b, x: a[0] + ((z?.[0] ?? a[0]) - a[0]) * k, y: a[1] + ((z?.[1] ?? a[1]) - a[1]) * k, r: a[2] } : null; }).filter(Boolean);
  } else list = RNG.st.bodies.filter(b => b.alive);
  RFX.under(c, list, t, dt);
  // traînées des jetons rapides (et rotation des jetons qui roulent)
  for (const b of list) {
    const tr = RNG.trails[b.id] ||= [];
    const lp = tr[tr.length - 1]; if (lp) RNG.spin[b.id] = (RNG.spin[b.id] || 0) + RG.len(b.x - lp[0], b.y - lp[1]) / b.r * (b.side ? -1 : 1);
    tr.push([b.x, b.y]); if (tr.length > 14) tr.shift();
    if (reducedFx() || tr.length < 3) continue;
    const d = RG.len(tr[tr.length - 1][0] - tr[0][0], tr[tr.length - 1][1] - tr[0][1]);
    if (d < 40) continue;
    const col = b.variant === 'gold' ? '253,230,138' : b.variant === 'celeste' ? '165,243,252' : b.variant === 'ombre' ? '139,92,246' : sideCol(b).rgb;
    for (let k = 1; k < tr.length; k++) {
      const [ax, ay] = w2s(...tr[k - 1]), [bx, by] = w2s(...tr[k]);
      c.strokeStyle = `rgba(${col},${k / tr.length * .6})`; c.lineWidth = b.r * V.s * 1.3 * k / tr.length; c.lineCap = 'square';
      c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke();
    }
  }
  // repères de camp, auras des pouvoirs et des variantes
  for (const b of list) {
    const [x, y] = w2s(b.x, b.y), rr = b.r * V.s;
    if (b.variant && !reducedFx()) {
      const col = b.variant === 'gold' ? '253,230,138' : b.variant === 'celeste' ? '165,243,252' : '124,58,237';
      const ag = c.createRadialGradient(x, y, rr * .9, x, y, rr * 1.9); ag.addColorStop(0, `rgba(${col},.55)`); ag.addColorStop(1, `rgba(${col},0)`);
      c.fillStyle = ag; c.beginPath(); c.arc(x, y, rr * 1.9, 0, 7); c.fill();
      if (b.variant === 'celeste') for (let k = 0; k < 6; k++) { const a = t * 1.5 + k * 1.047; c.fillStyle = '#e0f2fe'; c.fillRect(x + Math.cos(a) * rr * 1.5 - V.px, y + Math.sin(a) * rr * 1.5 - V.px, V.px * 2, V.px * 2); }
      if (b.variant === 'ombre') for (let k = 0; k < 4; k++) { const a = -t * 1.2 + k * 1.57; c.fillStyle = 'rgba(46,16,101,.85)'; c.fillRect(x + Math.cos(a) * rr * 1.35 - V.px * 1.5, y + Math.sin(a) * rr * 1.35 - V.px * 1.5, V.px * 3, V.px * 3); }
    }
    rgTeamMark(c, b, x, y, rr, t, !P);
    RFX.aura(c, b, x, y, rr, t);
  }
  blit(lo);

  // ----- Jetons, nets, en pleine résolution
  for (const b of list) {
    const [x, y] = w2s(b.x, b.y), rr = b.r * V.s, tr = RNG.trails[b.id] || [], lp = tr[tr.length - 3];
    rgToken(M, b, t, false);
    RFX.emit(b, x, y, rr, !!lp && RG.len(b.x - lp[0], b.y - lp[1]) > 4);
  }
  // jetons qui tombent hors du ring
  if (P) P.fall.forEach(x => {
    const k = Math.min(1, x.t / .7);
    rgToken(M, { ...x.b, x: x.x + x.vx * x.t * .35, y: x.y + x.vy * x.t * .35 }, t, 1 - k);
  });

  // ----- Couche haute (pixel) : visée, révélation des tirs, particules, effets
  c = hi;
  const sel = !P && RNG.st.bodies.find(b => b.id === RNG.sel && b.alive);
  if (sel && RNG.phase === 'aim') {
    const [sx, sy] = w2s(sel.x, sel.y), px = V.px;
    // jeton choisi : 4 coins de visée qui respirent
    const o = sel.r * V.s + px * 5 + Math.sin(t * 6) * px, L = px * 4;
    c.fillStyle = '#fff';
    for (const [dx, dy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { c.fillRect(sx + dx * o - (dx > 0 ? L : 0), sy + dy * o - (dy > 0 ? px : 0), L, px); c.fillRect(sx + dx * o - (dx > 0 ? px : 0), sy + dy * o - (dy > 0 ? L : 0), px, L); }
    if (RNG.prev && RNG.aim) {
      const col = RNG.aim.f < .5 ? '#a78bfa' : RNG.aim.f < .8 ? '#fb923c' : '#f43f5e';
      // trajectoire prévue : pointillés pixel
      c.fillStyle = RNG.prev.out ? '#f43f5e' : 'rgba(255,255,255,.8)';
      RNG.prev.me.forEach((p, k) => { if (k % 3) return; const [x, y] = w2s(p[0], p[1]); c.fillRect(Math.round(x / px) * px, Math.round(y / px) * px, px, px); });
      if (RNG.prev.hit.length > 1) { c.fillStyle = 'rgba(253,230,138,.9)'; RNG.prev.hit.forEach((p, k) => { if (k % 3) return; const [x, y] = w2s(p[0], p[1]); c.fillRect(Math.round(x / px) * px, Math.round(y / px) * px, px, px); }); }
      const end = RNG.prev.me[RNG.prev.me.length - 1]; if (end) { const [x, y] = w2s(end[0], end[1]); c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = px; c.setLineDash([px * 2, px * 2]); c.beginPath(); c.arc(x, y, sel.r * V.s, 0, 7); c.stroke(); c.setLineDash([]); }
      // flèche
      const Lr = 26 + RNG.aim.f * 70, n = RG.len(RNG.aim.ax, RNG.aim.ay) * FL(), ux = RNG.aim.ax / n, uy = RNG.aim.ay / n;
      const ax = sx + ux * (sel.r * V.s + 6), ay = sy + uy * (sel.r * V.s + 6), bx = ax + ux * Lr, by = ay + uy * Lr;
      c.strokeStyle = col; c.fillStyle = col; c.lineWidth = px * 2 + RNG.aim.f * px * 2; c.lineCap = 'butt';
      c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke();
      c.beginPath(); c.moveTo(bx + ux * 14, by + uy * 14); c.lineTo(bx - uy * 10, by + ux * 10); c.lineTo(bx + uy * 10, by - ux * 10); c.fill();
      // jauge de force : 12 crans autour du jeton
      const gr = sel.r * V.s + px * 9, on = Math.round(RNG.aim.f * 12);
      for (let k = 0; k < 12; k++) { const a = -1.571 + k / 12 * 6.283; c.fillStyle = k < on ? col : 'rgba(255,255,255,.14)'; c.fillRect(sx + Math.cos(a) * gr - px, sy + Math.sin(a) * gr - px, px * 2, px * 2); }
    }
  }
  // révélation : on montre les deux tirs
  if (RNG.reveal) RNG.reveal.forEach(r => {
    if (!r || !r.s.f) return;
    const b = r.body, [sx, sy] = w2s(b.x, b.y), n = RG.len(r.s.ax, r.s.ay) * FL(), ux = r.s.ax / n, uy = r.s.ay / n, L = 30 + r.s.f * 80;
    c.strokeStyle = sideCol(b).md; c.lineWidth = V.px * 3; c.lineCap = 'butt';
    c.beginPath(); c.moveTo(sx + ux * b.r * V.s, sy + uy * b.r * V.s); c.lineTo(sx + ux * (b.r * V.s + L), sy + uy * (b.r * V.s + L)); c.stroke();
  });
  // particules et formes d'effets (les textes, eux, restent nets)
  RNG.parts = RNG.parts.filter(p => p.life > 0);
  for (const p of RNG.parts) {
    c = p.text ? M : hi;
    c.save();
    if (p.ring) {
      const k = 1 - p.life, rad = (p.inward ? 1 - k : k) * p.size * 30 + 6;
      c.strokeStyle = p.col; c.globalAlpha = p.life; c.lineWidth = V.px * 1.5; c.beginPath(); c.arc(p.x, p.y, rad, 0, 7); c.stroke();
      p.life -= dt * 1.8;
    } else if (p.wave) { // onde de choc pleine (éruption) ou qui se referme (aimant)
      const k = 1 - p.life, rad = p.inward ? p.rad * (1 - k) : p.rad * Math.min(1, k * 1.6);
      const g = c.createRadialGradient(p.x, p.y, rad * .6, p.x, p.y, rad); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, p.col);
      c.globalAlpha = p.life * .8; c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, rad, 0, 7); c.fill();
      c.strokeStyle = p.col; c.lineWidth = V.px * 1.5; c.stroke();
      p.life -= dt * 1.5;
    } else if (p.star) { // éclat en étoile (Frappe ×2)
      const k = 1 - p.life; c.translate(p.x, p.y); c.rotate(k * 1.5); c.globalAlpha = p.life; c.fillStyle = p.col;
      c.beginPath(); for (let i = 0; i < 16; i++) { const r = (i % 2 ? .35 : 1) * p.size * (.5 + k); const a = i / 16 * 6.283; i ? c.lineTo(Math.cos(a) * r, Math.sin(a) * r) : c.moveTo(Math.cos(a) * r, Math.sin(a) * r); } c.fill();
      p.life -= dt * 2.2;
    } else if (p.text) {
      c.globalAlpha = Math.min(1, p.life * 2); c.fillStyle = p.col; c.font = `900 ${p.size}px "Space Grotesk Variable", sans-serif`; c.textAlign = 'center'; c.shadowColor = '#000'; c.shadowBlur = 8;
      c.fillText(p.text, p.x, p.y - (1 - p.life) * 30); p.life -= dt * 1.2;
    } else if (p.bolt) { // éclair violet (Néant)
      const [ax, ay, bx, by] = p.bolt; c.globalAlpha = p.life; c.strokeStyle = p.col; c.lineWidth = V.px * 1.5;
      c.beginPath(); c.moveTo(ax, ay); for (let i = 1; i < 8; i++) { const k = i / 8; c.lineTo(ax + (bx - ax) * k + (Math.random() - .5) * 18, ay + (by - ay) * k + (Math.random() - .5) * 18); } c.lineTo(bx, by); c.stroke();
      p.life -= dt * 2.5;
    } else if (p.hole) { // trou noir qui tourbillonne
      const r = p.size * (1.2 - p.life * .4); const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, r); g.addColorStop(0, 'rgba(0,0,0,.95)'); g.addColorStop(.6, 'rgba(59,7,100,.7)'); g.addColorStop(1, 'rgba(168,85,247,0)');
      c.globalAlpha = p.life; c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, r, 0, 7); c.fill(); p.life -= dt * 1.4;
    } else if (p.hex) {
      c.globalAlpha = p.life; c.strokeStyle = p.col; c.lineWidth = V.px * 1.5; const r = p.size * (1.4 - p.life * .4);
      c.beginPath(); for (let i = 0; i <= 6; i++) { const a = i / 6 * 6.283; i ? c.lineTo(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r) : c.moveTo(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r); } c.stroke(); p.life -= dt * 2.4;
    } else {
      if (p.sink) { p.vx = (p.sink[0] - p.x) * .12; p.vy = (p.sink[1] - p.y) * .12; }
      p.x += p.vx; p.y += p.vy; if (!p.sink && !p.bubble) { p.vx *= .92; p.vy *= .92; }
      p.life -= dt * (p.bubble ? 1.1 : 1.6);
      c.fillStyle = p.col; c.globalAlpha = Math.max(0, p.life);
      if (p.bubble) { c.strokeStyle = p.col; c.lineWidth = V.px; c.beginPath(); c.arc(p.x, p.y, p.size, 0, 7); c.stroke(); }
      else { const sz = Math.max(V.px, Math.round(p.size / V.px) * V.px); c.fillRect(Math.round(p.x / V.px) * V.px, Math.round(p.y / V.px) * V.px, sz, sz); }
    }
    c.restore();
  }
  RFX.over(hi, t, dt);
  blit(hi);
}
// Un jeton vu de dessus : son dessin en pixel art (avec l'effet de sa variante), qui tourne quand il roule.
// Le camp se lit à l'anneau pixel dessous (violet = toi, orange = lui). Gemme = pouvoir prêt.
// Effet « doodle » sur les jetons du Ring, comme partout sur le site : 3 dessins légèrement déformés (filtres SVG #dd0-2)
// préparés une seule fois par jeton, qui s'enchaînent à ~3 images/s. Sans filtres (Safari, effets réduits) : dessin fixe.
const DOODLE = {};
function rgDoodle(im, name) {
  const h = document.documentElement;
  if (h.classList.contains('reduce-fx') || h.classList.contains('no-svgfx')) return null;
  let f = DOODLE[name];
  if (!f) {
    f = DOODLE[name] = [];
    const w = im.naturalWidth, pad = Math.ceil(w * .06);
    for (let i = 0; i < 3; i++) {
      const cv = document.createElement('canvas'), x = cv.getContext('2d');
      cv.width = cv.height = w + pad * 2;
      if (!x || !('filter' in x)) return (DOODLE[name] = null);
      x.imageSmoothingEnabled = false;
      x.filter = `url(#dd${i})`;
      x.drawImage(im, pad, pad, w, w);
      cv.k = (w + pad * 2) / w;
      f.push(cv);
    }
  }
  return f ? f[Math.floor(performance.now() / 300) % 3] : null;
}
function rgToken(c, b, t, fall) {
  const V = RNG.view, [x, y] = w2s(b.x, b.y), rr = b.r * V.s * (fall === false ? 1 : .4 + .6 * fall);
  if (rr <= .5) return;
  c.save();
  if (fall !== false) c.globalAlpha = Math.max(0, fall);
  if (RFX.isActive(b.id) === 'ghost' && RNG.play) c.globalAlpha *= .55;
  if (b.tmp) c.globalAlpha *= .8;
  const spin = RNG.spin[b.id] || 0, im = rgImg(b.name);
  c.translate(x, y); c.rotate(spin * .5); c.imageSmoothingEnabled = false;
  if (b.variant && VFILTER[b.variant]) c.filter = VFILTER[b.variant];
  if (im.complete && im.naturalWidth) { const sz = rr * 2.08 * ((jetonOf(b.name).grid || 64) / 64), d = rgDoodle(im, b.name), k = d ? sz * d.k : sz; c.drawImage(d || im, -k / 2, -k / 2, k, k); }
  else { c.fillStyle = sideCol(b).md; c.beginPath(); c.arc(0, 0, rr, 0, 7); c.fill(); }
  c.filter = 'none';
  c.restore();
  // pouvoir prêt (pendant la visée) : petite gemme pixel
  if (fall === false && !b.tmp && RNG.phase === 'aim') {
    const live = RNG.st?.bodies.find(z => z.id === b.id);
    if (live && RG.ready(live)) {
      const gx = Math.round(x + rr * .74), gy = Math.round(y - rr * .74), gr = Math.max(4, Math.round(rr * .2));
      c.fillStyle = '#0b0914'; c.beginPath(); c.moveTo(gx, gy - gr - 2); c.lineTo(gx + gr + 2, gy); c.lineTo(gx, gy + gr + 2); c.lineTo(gx - gr - 2, gy); c.fill();
      c.fillStyle = PW_COL[b.pw]; c.beginPath(); c.moveTo(gx, gy - gr); c.lineTo(gx + gr, gy); c.lineTo(gx, gy + gr); c.lineTo(gx - gr, gy); c.fill();
    }
  }
}

// ---------- Fin du match
function rgResult(e) {
  if (!RNG.st) return;
  const w = e?.winner, me = w === ME(), draw = w == null, st = RNG.st, elo = RNG.online?.elo;
  const dElo = elo ? elo.after[ME()] - elo.before[ME()] : null;
  RNG.tuto = null;
  const box = document.createElement('div');
  box.className = 'rg-res ' + (draw ? 'draw' : me ? 'win' : 'lose');
  box.innerHTML = `<div class="rg-rbox">
    <h2>${draw ? rt('draw') : me ? rt('win') : rt('lose')}</h2>
    <small class="muted">${rtL().why[e?.why] || ''}</small>
    <div class="rg-rleft"><span class="me">${RG.alive(st, ME()).map(b => `<img class="px${vCls(b.variant)}" src="${texOf(jetonOf(b.name))}" alt="">`).join('') || '—'}</span><b>vs</b><span class="foe">${RG.alive(st, FOE()).map(b => `<img class="px${vCls(b.variant)}" src="${texOf(jetonOf(b.name))}" alt="">`).join('') || '—'}</span></div>
    <small class="muted">${rt('turns', { n: st.map ? st.turn - 1 : Math.min(st.turn, RCFG.TURNS + 3) })}</small>
    ${dElo == null ? '' : `<p class="rg-elo ${dElo >= 0 ? 'up' : 'down'}"><b>${dElo >= 0 ? '+' : ''}${dElo} Elo</b><small>${fmt(elo.after[ME()])}</small></p>`}
    <div class="rg-rbtn"><button class="btn primary" data-again>${rt('again')}</button><button class="btn ghost" data-back>${rt('back')}</button></div>
  </div>`;
  document.body.appendChild(box);
  requestAnimationFrame(() => box.classList.add('on'));
  box.querySelector('h2').animate([{ transform: 'scale(2.2)', opacity: 0 }, { transform: 'scale(.92)', opacity: 1, offset: .6 }, { transform: 'none' }], { duration: 520, easing: 'cubic-bezier(.2, 1.3, .4, 1)' });
  if (me) { sfx.announce?.(); rgConfetti(box); } else sfx.deny?.();
  const onEnd = RNG.onEnd;
  box.onclick = ev => {
    if (ev.target.closest('[data-back]')) { closeRing(); onEnd?.('back'); }
    if (ev.target.closest('[data-again]')) { closeRing(); onEnd?.('again'); }
  };
}
function rgConfetti(host) {
  if (reducedFx()) return;
  const cols = ['#fde68a', '#a78bfa', '#4ade80', '#38bdf8', '#fb7185'];
  for (let k = 0; k < 40; k++) {
    const p = document.createElement('i'); p.className = 'rg-conf'; p.style.background = cols[k % cols.length]; p.style.left = Math.random() * 100 + '%';
    host.appendChild(p);
    p.animate([{ transform: 'translateY(-20px) rotate(0)' }, { transform: `translateY(${innerHeight + 40}px) rotate(${720 * (Math.random() - .5)}deg)` }], { duration: 1600 + Math.random() * 1400, delay: Math.random() * 300, easing: 'cubic-bezier(.3, .2, .6, 1)', fill: 'forwards' });
  }
}

// ---------- Tuto interactif (premier match, ou depuis les paramètres)
const RTUTO_KEY = 'takoras-ring-tuto';
const ringTutoSeen = () => { try { return localStorage.getItem(RTUTO_KEY) === '1'; } catch { return true; } };
// opts.must : premier tuto obligatoire (pas de bouton « Passer ») · opts.onDone : appelé quand le tuto est fini
function startRingTuto(onEnd, opts = {}) {
  const mine = ['Carmin', 'Mobu', 'Pikko'].map(name => ({ name, lvl: 1 })), foe = ['Rouillé', 'Givre', 'Azura'].map(name => ({ name, lvl: 1 }));
  startRing([mine, foe], { tuto: true, must: opts.must, onDone: opts.onDone, ai: 'still', map: 'arene', names: [rt('you'), rt('bot')], onEnd });
}
function rgTip(text, where, btns = [['skip', rt('tSkip')]]) {
  RNG.el.querySelector('.rg-tip')?.remove();
  if (RNG.tuto?.must) btns = btns.filter(([k]) => k !== 'skip');
  const b = document.createElement('div'); b.className = 'rg-tip ' + where;
  b.innerHTML = `<p>${text}</p><div>${btns.map(([k, l]) => `<button class="btn ${k === 'skip' ? 'ghost' : 'primary'} sm" data-t="${k}">${l}</button>`).join('')}</div>`;
  RNG.el.appendChild(b);
  b.animate([{ opacity: 0, transform: 'translate(-50%, 8px) scale(.96)' }, { opacity: 1, transform: 'translate(-50%, 0)' }], { duration: 240, easing: 'ease-out' });
  b.onclick = e => { const k = e.target.closest('[data-t]')?.dataset.t; if (!k) return; sfx.click(); if (k === 'skip') return rgEndTuto(); RNG.tuto?.next?.(k); };
}
function rgHl(sel) { RNG.el.querySelectorAll('.rg-hl').forEach(x => x.classList.remove('rg-hl')); if (sel) RNG.el.querySelector(sel)?.classList.add('rg-hl'); }
// Le tuto avance tout seul selon ce que fait le joueur (on : sel, aim, go, pow, turn)
function rgTuto() {
  const tu = RNG.tuto; if (!tu) return;
  const show = n => {
    tu.step = n; tu.next = null; tu.block = null;
    if (n === 1) { rgTip(rt('t1'), 'top'); rgHl('#rg-stage'); }
    if (n === 2) { rgTip(rt('t2'), 'top'); rgHl('#rg-stage'); }
    if (n === 3) { rgTip(rt('t3'), 'top'); rgHl('#rg-go'); tu.block = 'go'; }
    if (n === 4) { rgTip(rt('t4'), 'top', [['ok', rt('tOk')]]); rgHl(null); tu.block = 'all'; tu.next = () => show(4.1); }
    if (n === 4.1) { rgTip(rt('tTimer'), 'top', [['ok', rt('tOk')]]); rgHl('#rg-timer'); tu.block = 'all'; tu.next = () => show(4.2); }
    if (n === 4.2) { rgTip(rt('tWalls'), 'top', [['ok', rt('tOk')]]); rgHl('#rg-stage'); tu.block = 'all'; tu.next = () => show(4.3); }
    if (n === 4.3) { rgTip(rt('tScout'), 'top', [['ok', rt('tOk')]]); rgHl('#rg-stage'); tu.block = 'all'; tu.next = () => show(5); }
    if (n === 5) {
      const carmin = RNG.st.bodies.find(b => b.side === 0 && b.alive && RG.ready(b));
      if (!carmin) return show(6);
      RNG.sel = carmin.id; RNG.pow = !!RNG.pows?.has(carmin.id); rgHud();
      rgTip(rt('t5'), 'top'); rgHl('#rg-pw');
    }
    if (n === 6) { rgTip(rt('tRanked'), 'top', [['ok', rt('tOk')]]); rgHl(null); tu.block = 'all'; tu.next = () => show(7); }
    if (n === 7) { rgTip(rt('t6'), 'top', [['ok', rt('tEnd')]]); rgHl(null); tu.block = 'all'; tu.next = () => rgEndTuto(); }
  };
  tu.on = what => {
    if (tu.step === 1 && what === 'sel') show(2);
    else if (tu.step === 2 && what === 'aim' && RNG.aim?.f >= .25) show(3);
    else if (tu.step === 3 && what === 'go') { RNG.el.querySelector('.rg-tip')?.remove(); rgHl(null); tu.step = 3.5; }
    else if (tu.step === 3.5 && what === 'turn') show(4);
    else if (tu.step === 5 && what === 'pow') { rgHl(null); RNG.el.querySelector('.rg-tip')?.remove(); tu.step = 5.5; }
    else if (tu.step === 5.5 && what === 'turn') show(6);
  };
  if (!tu.step) show(1);
}
function rgEndTuto() {
  try { localStorage.setItem(RTUTO_KEY, '1'); } catch {}
  const done = RNG.tuto?.onDone;
  RNG.tuto = null;
  done?.();
  RNG.el?.querySelector('.rg-tip')?.remove(); RNG.el && rgHl(null);
  RNG.timer = RCFG.AIM_S;
  rgHud();
}

// « Ring » : la mise en scène des pouvoirs. Chaque pouvoir a son intro (le temps se fige, le jeton s'illumine,
// un cercle de runes tourne), son aura pendant le tir, son effet au moment clé et son propre son, fabriqué en direct.
// Utilisé par ring-ui.js (dessin sur le canvas du ring).

// ---------- Sons des pouvoirs (Web Audio, passent par le volume et le filtre du site)
const RSND = (() => {
  const A = () => { const a = sfx.audio?.(); return a && a.ok ? a : null; };
  function tone(type, f0, f1, dur, vol, delay = 0, attack = .005) {
    const a = A(); if (!a) return;
    const t = a.ctx.currentTime + delay, o = a.ctx.createOscillator(), g = a.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g).connect(a.out); o.start(t); o.stop(t + dur + .05);
  }
  let nbuf = null;
  function noise(dur, vol, f0, f1, delay = 0, type = 'bandpass', q = 1.2) {
    const a = A(); if (!a) return;
    if (!nbuf) { nbuf = a.ctx.createBuffer(1, a.ctx.sampleRate * 2, a.ctx.sampleRate); const d = nbuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const t = a.ctx.currentTime + delay, s = a.ctx.createBufferSource(), f = a.ctx.createBiquadFilter(), g = a.ctx.createGain();
    s.buffer = nbuf; f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(f).connect(g).connect(a.out); s.start(t, Math.random()); s.stop(t + dur + .05);
  }
  const S = {
    // intro commune : le temps se fige et ça se charge
    charge() { noise(.55, .12, 300, 2600, 0, 'bandpass', 2); tone('triangle', 140, 420, .5, .05); },
    grow() { [0, .07, .14, .22].forEach((d, i) => tone('sine', 260 + i * 90, 700 + i * 120, .12, .12, d)); tone('sine', 90, 60, .5, .25, .25); },
    bounce() { tone('sine', 170, 560, .18, .22); tone('sine', 560, 260, .25, .14, .16); },
    scrap() { [520, 1370, 2110].forEach((f, i) => tone('square', f, f * .97, .35, .035, i * .01)); noise(.25, .18, 3000, 1500, 0, 'highpass'); tone('sine', 80, 40, .4, .35); },
    slide() { noise(.8, .1, 5000, 7000, 0, 'highpass', .7); tone('sine', 1300, 1900, .5, .05); tone('sine', 1950, 2600, .4, .03, .1); },
    eruption() { tone('sine', 130, 35, .9, .55); noise(1, .4, 900, 90, 0, 'lowpass'); for (let k = 0; k < 8; k++) noise(.05, .12, 2500, 1800, .1 + k * .07, 'highpass'); },
    curve() { noise(.6, .18, 350, 1300, 0, 'bandpass', 3); tone('sine', 300, 520, .5, .06); },
    double() { [0, .13].forEach(d => { tone('sine', 170, 45, .22, .55, d); noise(.09, .25, 1800, 600, d, 'bandpass'); }); },
    ghost() { tone('triangle', 440, 260, 1, .07); tone('triangle', 447, 266, 1, .07); tone('sine', 880, 520, .8, .025, .1); },
    rescue() { [880, 1320, 1760].forEach((f, i) => tone('sine', f, f, .7, .07, i * .08)); noise(.5, .06, 2000, 5000, 0, 'bandpass', 4); },
    shrink() { tone('square', 1300, 140, .28, .05); noise(.3, .12, 2000, 300, .02); },
    magnet() { tone('sawtooth', 70, 150, .7, .05); tone('sine', 300, 900, .7, .05); tone('sine', 90, 40, .3, .4, .7); },
    anchor() { tone('sine', 75, 32, .8, .6); noise(.6, .3, 500, 80, 0, 'lowpass'); [0, .09, .18].forEach(d => tone('square', 2400, 2300, .08, .025, .25 + d)); },
    second() { noise(.5, .25, 300, 3000, 0, 'bandpass', 1.5); tone('sawtooth', 200, 600, .35, .04); },
    roots() { noise(.9, .16, 150, 1100, 0, 'lowpass'); tone('sawtooth', 95, 70, .9, .05); for (let k = 0; k < 6; k++) noise(.04, .12, 4000, 2500, .15 + k * .11, 'highpass'); },
    snap() { noise(.06, .3, 5000, 2500, 0, 'highpass'); tone('triangle', 900, 300, .07, .1); },
    shield() { [1046, 1318, 1568, 2093].forEach((f, i) => tone('sine', f, f, .9, .05, i * .05)); },
    void() { tone('sine', 220, 28, 1.3, .55); tone('sawtooth', 55, 40, 1.2, .07); noise(1.2, .2, 600, 60, 0, 'lowpass'); },
    split() { [523, 659, 784, 1046, 1318].forEach((f, i) => tone('triangle', f, f, .3, .07, i * .055)); noise(.4, .08, 3000, 6000, 0, 'bandpass', 3); },
    boing() { tone('sine', 220, 620, .14, .2); tone('sine', 620, 300, .22, .12, .12); },
    punch() { tone('sine', 150, 45, .25, .5); noise(.1, .3, 1500, 500); },
    blackhole() { tone('sine', 160, 30, 1, .5); noise(.9, .25, 300, 50, 0, 'lowpass'); },
    flame() { noise(.45, .3, 600, 2400, 0, 'bandpass', 1); tone('sawtooth', 160, 420, .3, .04); },
    chime() { tone('sine', 1568, 1568, .4, .06); tone('sine', 2093, 2093, .35, .04, .04); },
    hum() { tone('sawtooth', 60, 140, .6, .05); tone('sine', 400, 1200, .6, .04); tone('sine', 80, 40, .3, .45, .6); },
  };
  return S;
})();

// ---------- Effets visuels des pouvoirs
const RFX = (() => {
  let active = {}, ground = [], vines = null, intro = null;
  const rand = (a, b) => a + Math.random() * (b - a);
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${a})`; };
  function part(o) { RNG.parts.push({ life: 1, size: 3, vx: 0, vy: 0, ...o }); }
  function burst(x, y, n, col, sp, o = {}) { for (let k = 0; k < (reducedFx() ? n / 3 : n); k++) { const a = rand(0, 6.283), v = rand(.4, 1) * sp; part({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, col, size: rand(2, 4.5), ...o }); } }

  // Au début de l'animation d'un tour : on note les pouvoirs actifs et on prépare les intros
  function start(P) {
    active = {}; ground = []; vines = null; intro = null;
    P.intros = P.r.ev.filter(e => e.t === 'power');
    P.intros.forEach(e => { active[e.id] = e.pw; });
    // les doubles de Dédoublement gardent l'aura dorée
    P.r.ev.filter(e => e.t === 'split').forEach(e => { active[e.cid] = 'split'; });
  }
  // Intro d'un pouvoir : temps figé ~0,8 s, cercle de runes, nom du pouvoir, son
  function introStart(e, P) {
    const b = P.bodies.find(x => x.id === e.id); if (!b) return;
    intro = { e, b, t: 0 };
    RSND.charge(); setTimeout(() => RSND[e.pw]?.(), 280);
    const [x, y] = w2s(b.x, b.y), col = PW_COL[e.pw];
    rgBanner(`<small>${b.side !== ME() ? '⚠️ ' : ''}${jnH(b.name)}</small>✦ ${rtL().pw[e.pw][0]}`, col, false, 950);
    burst(x, y, 30, col, 3.5);
    if (e.pw === 'roots') vines = { side: b.side, t: 0, flash: [] };
    if (e.pw === 'anchor') { RNG.shake = 12; for (let k = 0; k < 24; k++) { const a = k / 24 * 6.283; part({ x, y, vx: Math.cos(a) * 3.2, vy: Math.sin(a) * 3.2, col: '#93c5fd', size: 4 }); } }
    if (e.pw === 'rescue') { const r = P.r.ev.find(z => z.t === 'rescue'); if (r) intro.rescue = P.bodies.find(z => z.id === r.id); }
    if (e.pw === 'grow' || e.pw === 'scrap') RNG.shake = 6;
  }
  // Évènements pendant le tir
  function event(e, P) {
    const body = id => P.bodies.find(b => b.id === id);
    if (e.t === 'edge') {
      const [x, y] = w2s(e.x, e.y), b = body(e.id);
      if (vines && b && b.side === vines.side) { vines.flash.push({ a: Math.atan2(e.y * FL(), e.x * FL()), t: 1 }); burst(x, y, 22, '#4ade80', 3); burst(x, y, 8, '#f0abfc', 2.5); RSND.snap(); RNG.shake = 6; }
      else { burst(x, y, 18, PW_COL.bounce, 3.2); RNG.parts.push({ ring: true, x, y, col: PW_COL.bounce, size: 1.4, life: 1 }); RSND.boing(); }
    }
    if (e.t === 'eruption') {
      const [x, y] = w2s(e.x, e.y), rad = RG.kit(body(e.id).name).p.radius * RNG.view.s;
      RNG.parts.push({ wave: true, x, y, col: '#f97316', rad, life: 1 });
      burst(x, y, 60, '#fb923c', 6); burst(x, y, 30, '#fde047', 4.5); burst(x, y, 20, '#7f1d1d', 3, { size: 6 });
      RNG.shake = 16; rgFlashCol('#f97316'); RSND.eruption();
    }
    if (e.t === 'magnet') {
      const [x, y] = w2s(e.x, e.y), rad = RG.kit(body(e.id).name).p.radius * RNG.view.s;
      for (let k = 0; k < 40; k++) { const a = rand(0, 6.283), d = rand(rad * .5, rad); part({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, sink: [x, y], col: k % 2 ? '#fde68a' : '#fff', size: rand(2, 4) }); }
      RNG.parts.push({ wave: true, x, y, col: '#fde68a', rad, life: 1, inward: true });
      RNG.shake = 8; RSND.hum();
    }
    if (e.t === 'double') {
      const o = body(e.to), [x, y] = w2s(o.x, o.y);
      RNG.parts.push({ star: true, x, y, col: '#f43f5e', life: 1, size: 40 });
      RNG.parts.push({ text: '×2 !', x, y: y - 20, col: '#fecdd3', life: 1, size: 30 });
      burst(x, y, 40, '#f43f5e', 6); RNG.shake = 14; RSND.punch(); setTimeout(() => RSND.punch(), 110);
    }
    if (e.t === 'void') {
      const o = body(e.to), s = body(e.id), [x, y] = w2s(o.x, o.y), [sx, sy] = w2s(s.x, s.y);
      RNG.parts.push({ bolt: [sx, sy, x, y], col: '#c084fc', life: 1 });
      RNG.parts.push({ hole: true, x, y, life: 1, size: 34 });
      burst(x, y, 30, '#a855f7', 5); burst(x, y, 20, '#1e1b4b', 4, { size: 6 });
      RNG.shake = 16; rgFlashCol('#3b0764'); RSND.blackhole();
    }
    if (e.t === 'split') { const b = body(e.id), [x, y] = w2s(b.x, b.y); burst(x, y, 40, '#fde68a', 4.5); for (let k = 0; k < 18; k++) part({ x, y, vx: rand(-3, 3), vy: rand(-3, 3), col: `hsl(${k * 20},90%,75%)`, size: 3 }); rgFlashCol('#fde68a'); RSND.split(); }
    // Soutien : Coup de pouce (étincelles vertes sur les alliés), Bulle (bouclier bleu sur l'allié protégé)
    if (e.t === 'haste') { const b = body(e.id); if (b) { const [x, y] = w2s(b.x, b.y); burst(x, y, 18, '#86efac', 3); RNG.parts.push({ text: '⏩', x, y: y - 10, col: '#86efac', size: 18, life: 1 }); } }
    if (e.t === 'guard') { const b = body(e.id); if (b) { const [x, y] = w2s(b.x, b.y); RNG.parts.push({ hex: true, x, y, col: '#7dd3fc', life: 1, size: b.r * RNG.view.s * 1.3 }); burst(x, y, 16, '#7dd3fc', 2.5); RSND.chime?.(); } }
    if (e.t === 'boost') { const b = body(e.id), [x, y] = w2s(b.x, b.y); burst(x, y, 36, '#fb7185', 5); burst(x, y, 20, '#fdba74', 4); RNG.shake = 8; RSND.flame(); }
    if (e.t === 'hit') {
      for (const id of [e.a, e.b]) {
        const pw = active[id]; if (!pw) continue;
        const [x, y] = w2s(e.x, e.y);
        if (pw === 'scrap') { burst(x, y, 26, '#fb923c', 5); burst(x, y, 10, '#fde047', 3); RSND.scrap(); }
        if (pw === 'shield') { RNG.parts.push({ hex: true, x, y, col: '#f8fafc', life: 1, size: 30 }); RSND.chime(); }
        if (pw === 'grow') { burst(x, y, 16, '#7dd3fc', 3); }
      }
    }
  }
  // Sol : traînée de glace de Glissade, ronces autour du ring
  function under(c, list, t, dt) {
    const V = RNG.view, R = (RNG.dispR ?? RG.ringR(RNG.st)) * V.s, [ox, oy] = w2s(0, 0);
    for (const b of list) if (active[b.id] === 'slide' && RNG.play) ground.push({ x: b.x, y: b.y, r: b.r, life: 1 });
    ground = ground.filter(g => (g.life -= dt * .35) > 0);
    for (const g of ground) { const [x, y] = w2s(g.x, g.y); c.fillStyle = `rgba(186,230,253,${g.life * .12})`; c.beginPath(); c.arc(x, y, g.r * V.s * .9, 0, 7); c.fill(); }
    if (vines) drawVines(c, ox, oy, R, t, dt);
  }
  // Les ronces poussent tout autour du bord : tige ondulée, épines, fleurs, lueur verte
  function drawVines(c, ox, oy, R, t, dt) {
    vines.t += dt;
    if (vines.out != null && (vines.out += dt) > .6) { vines = null; return; }
    const grow = Math.min(1, vines.t / .7) * (vines.out != null ? 1 - vines.out / .6 : 1), end = grow * 6.2832, N = 140;
    c.save(); c.lineCap = 'round';
    for (const [w, col, blur] of [[9, 'rgba(22,101,52,.9)', 0], [4, '#4ade80', 14]]) {
      c.lineWidth = w; c.strokeStyle = col; c.shadowColor = '#22c55e'; c.shadowBlur = blur;
      c.beginPath();
      for (let k = 0; k <= N; k++) { const a = -1.5708 + k / N * end, rr = R + Math.sin(k * .9 + t * 3) * 4 + Math.sin(k * .37) * 3; const x = ox + Math.cos(a) * rr, y = oy + Math.sin(a) * rr; k ? c.lineTo(x, y) : c.moveTo(x, y); }
      c.stroke();
    }
    c.shadowBlur = 0;
    for (let k = 0; k < 48; k++) {
      const a = -1.5708 + k / 48 * 6.2832; if (a + 1.5708 > end) break;
      const fl = vines.flash.reduce((m, f) => Math.max(m, f.t * Math.max(0, 1 - Math.abs(Math.atan2(Math.sin(a - f.a), Math.cos(a - f.a))) * 3)), 0);
      const out = k % 2 ? 1 : -1, len = 9 + fl * 10, bx = ox + Math.cos(a) * R, by = oy + Math.sin(a) * R, nx = Math.cos(a) * out, ny = Math.sin(a) * out;
      c.fillStyle = fl > .1 ? '#bbf7d0' : '#15803d';
      c.beginPath(); c.moveTo(bx - Math.sin(a) * 4, by + Math.cos(a) * 4); c.lineTo(bx + Math.sin(a) * 4, by - Math.cos(a) * 4); c.lineTo(bx + nx * len, by + ny * len); c.fill();
      if (k % 6 === 3) { c.fillStyle = '#f0abfc'; c.beginPath(); c.arc(bx + nx * 3, by + ny * 3, 3.5 + Math.sin(t * 4 + k) * .8, 0, 7); c.fill(); }
    }
    vines.flash.forEach(f => { f.t -= dt * 1.5; }); vines.flash = vines.flash.filter(f => f.t > 0);
    c.restore();
  }
  // Aura d'un jeton dont le pouvoir est actif (dessinée sous le jeton)
  function aura(c, b, x, y, rr, t) {
    const pw = active[b.id]; if (!pw || !RNG.play) return;
    const col = PW_COL[pw];
    c.save();
    if (pw === 'eruption' || pw === 'second') { for (let k = 0; k < 12; k++) { const a = k / 12 * 6.283 + t * 2, f = 1.25 + .2 * Math.sin(t * 20 + k * 3); c.fillStyle = k % 2 ? '#fb923c' : '#fde047'; c.beginPath(); c.moveTo(x + Math.cos(a - .2) * rr, y + Math.sin(a - .2) * rr); c.lineTo(x + Math.cos(a) * rr * f, y + Math.sin(a) * rr * f); c.lineTo(x + Math.cos(a + .2) * rr, y + Math.sin(a + .2) * rr); c.fill(); } }
    if (pw === 'magnet' || pw === 'split') { for (let k = 0; k < 5; k++) { const a = t * 2.5 + k * 1.257; c.fillStyle = pw === 'split' ? `hsl(${(t * 120 + k * 72) % 360},90%,75%)` : '#fde68a'; c.beginPath(); c.arc(x + Math.cos(a) * rr * 1.45, y + Math.sin(a) * rr * 1.45, 2.6, 0, 7); c.fill(); } }
    if (pw === 'shield') { c.strokeStyle = 'rgba(248,250,252,.85)'; c.lineWidth = 2; c.shadowColor = '#fff'; c.shadowBlur = 12; c.beginPath(); for (let k = 0; k <= 6; k++) { const a = k / 6 * 6.283 + t * .8; const px = x + Math.cos(a) * rr * 1.45, py = y + Math.sin(a) * rr * 1.45; k ? c.lineTo(px, py) : c.moveTo(px, py); } c.stroke(); c.fillStyle = 'rgba(248,250,252,.08)'; c.fill(); }
    if (pw === 'anchor') { c.strokeStyle = '#94a3b8'; c.lineWidth = 3; c.setLineDash([5, 4]); c.lineDashOffset = -t * 20; c.beginPath(); c.arc(x, y, rr * 1.35, 0, 7); c.stroke(); c.setLineDash([]); c.font = `${rr}px serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.globalAlpha = .9; c.fillText('⚓', x, y - rr * 1.6); }
    if (pw === 'void') { const g = c.createRadialGradient(x, y, rr * .5, x, y, rr * 2); g.addColorStop(0, 'rgba(10,0,25,.9)'); g.addColorStop(1, 'rgba(88,28,135,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, rr * 2, 0, 7); c.fill(); c.strokeStyle = '#a855f7'; c.lineWidth = 2; for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(x, y, rr * (1.2 + k * .25), t * (3 + k) + k * 2, t * (3 + k) + k * 2 + 2.2); c.stroke(); } }
    if (pw === 'double') { c.strokeStyle = '#f43f5e'; c.lineWidth = 3; c.shadowColor = '#f43f5e'; c.shadowBlur = 18; c.globalAlpha = .6 + .4 * Math.sin(t * 14); c.beginPath(); c.arc(x, y, rr * 1.3, 0, 7); c.stroke(); }
    if (pw === 'ghost') { const tr = RNG.trails[b.id] || []; tr.slice(-12).forEach((p, k) => { if (k % 3) return; const [gx, gy] = w2s(p[0], p[1]); c.globalAlpha = .12 + k / 12 * .2; c.fillStyle = '#c4b5fd'; c.beginPath(); c.arc(gx, gy, rr, 0, 7); c.fill(); }); }
    if (pw === 'curve') { c.strokeStyle = 'rgba(96,165,250,.8)'; c.lineWidth = 2.5; for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(x, y, rr * (1.25 + k * .18), -t * 5 + k * 2, -t * 5 + k * 2 + 1.6); c.stroke(); } }
    if (pw === 'grow') { c.strokeStyle = 'rgba(125,211,252,.7)'; c.lineWidth = 2; c.beginPath(); c.arc(x, y, rr * (1.15 + .06 * Math.sin(t * 9)), 0, 7); c.stroke(); }
    if (pw === 'scrap') { c.fillStyle = 'rgba(120,53,15,.35)'; c.beginPath(); c.arc(x, y, rr * 1.3, 0, 7); c.fill(); }
    if (pw === 'shrink') { c.fillStyle = 'rgba(49,46,129,.45)'; c.beginPath(); c.arc(x, y, rr * 1.5, 0, 7); c.fill(); }
    if (pw === 'bounce' || pw === 'rescue' || pw === 'slide' || pw === 'roots') { c.strokeStyle = rgba(col, .75); c.lineWidth = 2.5; c.shadowColor = col; c.shadowBlur = 12; c.beginPath(); c.arc(x, y, rr * 1.22, 0, 7); c.stroke(); }
    c.restore();
  }
  // Particules d'aura pendant le trajet (bulles, étincelles, flocons, flammes…)
  function emit(b, x, y, rr, moving) {
    const pw = active[b.id]; if (!pw || !RNG.play || reducedFx() || Math.random() > .6) return;
    const j = (s = 1) => rand(-rr, rr) * s;
    if (pw === 'grow') part({ x: x + j(), y: y + j(), vx: 0, vy: -rand(.5, 1.4), col: 'rgba(186,230,253,.9)', size: rand(2, 5), bubble: true });
    if (pw === 'scrap' && moving) part({ x: x + j(.6), y: y + j(.6), vx: rand(-1.5, 1.5), vy: rand(-1.5, 1.5), col: Math.random() < .5 ? '#fb923c' : '#fde047', size: 2 });
    if (pw === 'slide' && moving) part({ x: x + j(), y: y + j(), vx: rand(-.4, .4), vy: rand(-.4, .4), col: '#e0f2fe', size: rand(1.5, 3) });
    if ((pw === 'eruption' || pw === 'second') && moving) part({ x: x + j(.5), y: y + j(.5), vx: rand(-1, 1), vy: rand(-1, 1), col: Math.random() < .5 ? '#f97316' : '#fde047', size: rand(2, 4) });
    if (pw === 'curve' && moving) part({ x: x + j(), y: y + j(), vx: rand(-.6, .6), vy: rand(-.6, .6), col: '#93c5fd', size: rand(2, 3.5) });
    if (pw === 'shrink' && moving) part({ x: x + j(.7), y: y + j(.7), vx: rand(-.3, .3), vy: rand(-.3, .3), col: 'rgba(76,29,149,.8)', size: rand(4, 8) });
    if (pw === 'ghost') part({ x: x + j(), y: y + j(), vx: 0, vy: -rand(.3, .8), col: 'rgba(196,181,253,.8)', size: rand(2, 4) });
    if (pw === 'void') part({ x: x + j(1.6), y: y + j(1.6), sink: [x, y], col: '#a855f7', size: 2.5 });
    if (pw === 'split' || pw === 'magnet') part({ x: x + j(1.2), y: y + j(1.2), vx: 0, vy: 0, col: '#fef3c7', size: 2 });
    if (pw === 'double') part({ x: x + j(.8), y: y + j(.8), vx: rand(-.5, .5), vy: rand(-.5, .5), col: '#fb7185', size: 2.5 });
  }
  // Par-dessus : l'intro (fond assombri, cercle de runes qui tourne autour du jeton, faisceau de Sauvetage)
  function over(c, t, dt) {
    if (!intro) return;
    intro.t += dt;
    const V = RNG.view, k = Math.min(1, intro.t / .25), out = Math.max(0, (intro.t - .65) / .2), a = k * (1 - out);
    const b = intro.b, [x, y] = w2s(b.x, b.y), rr = b.r * V.s, col = PW_COL[intro.e.pw];
    c.save();
    c.fillStyle = `rgba(5,3,12,${.55 * a})`; c.fillRect(-20, -20, V.size + 40, V.size + 40);
    if (intro.rescue) { const [rx, ry] = w2s(intro.rescue.x, intro.rescue.y); c.strokeStyle = rgba(col, a); c.lineWidth = 6 * a + 2; c.shadowColor = col; c.shadowBlur = 20; c.beginPath(); c.moveTo(x, y); c.lineTo(rx, ry); c.stroke(); c.beginPath(); c.arc(rx, ry, intro.rescue.r * V.s * 1.3, 0, 7); c.stroke(); }
    rgToken(c, b, t, false);
    c.globalAlpha = a; c.strokeStyle = col; c.shadowColor = col; c.shadowBlur = 22; c.lineWidth = 3;
    const R1 = rr * (1.5 + .5 * k);
    c.beginPath(); c.arc(x, y, R1, 0, 7); c.stroke();
    c.lineWidth = 1.5; c.beginPath(); c.arc(x, y, R1 + 9, 0, 7); c.stroke();
    c.fillStyle = col; c.font = `bold ${Math.max(9, rr * .35)}px "Space Grotesk Variable", sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (let i = 0; i < 12; i++) { const an = i / 12 * 6.283 + intro.t * 2.2; c.save(); c.translate(x + Math.cos(an) * (R1 + 4.5), y + Math.sin(an) * (R1 + 4.5)); c.rotate(an + 1.57); c.fillText('✦◆✧◇'[i % 4], 0, 0); c.restore(); }
    for (let i = 0; i < 8; i++) { const an = i / 8 * 6.283 - intro.t * 3; c.beginPath(); c.moveTo(x + Math.cos(an) * rr * 1.1, y + Math.sin(an) * rr * 1.1); c.lineTo(x + Math.cos(an) * R1 * .95, y + Math.sin(an) * R1 * .95); c.stroke(); }
    c.restore();
    if (intro.t > .85) intro = null;
  }
  const busy = () => !!intro;
  // fin du tour : les ronces se rétractent, les auras s'éteignent
  function endTurn() { active = {}; if (vines) vines.out = 0; }
  function reset() { active = {}; ground = []; vines = null; intro = null; }
  return { start, introStart, event, under, aura, emit, over, busy, reset, endTurn, isActive: id => active[id] };
})();

export { ringOnline, startRing, closeRing, startRingTuto, ringTutoSeen, powerText, ringStatsHTML, PW_COL, RT, rt, RNG, RFX, RSND };
