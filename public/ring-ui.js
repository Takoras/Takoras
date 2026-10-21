// « Ring » : l'écran du duel. Visée au lance-pierre (doigt ou souris), tours simultanés, animation de la physique,
// effets (traînées, chocs, ralenti, chutes), IA d'entraînement, écran de fin et tuto interactif.
// Règles : ring-engine.js (RG). Valeurs : ring-config.js (RCFG).

// ---------- Textes (FR + EN)
const RT = {
  fr: {
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
      none: ['—', 'Pas de pouvoir.'],
    },
    once: '1 fois par match', every: 'recharge {n} tours', ready: 'Prêt', used: 'Utilisé', inCd: 'dans {n} tour(s)', pick: 'Choisis un jeton',
    power: 'Pouvoir', on: 'Activé', validate: 'Valider', validated: 'Validé ✓', pass: 'Passer le tour', turn: 'Tour {n}/{m}', sudden: 'Mort subite !', foeOk: '✓ L’adversaire a validé',
    hSel: 'Tape un de tes jetons', hAim: 'Glisse vers l’arrière pour viser (n’importe où sur l’écran)', hVal: 'Valide quand tu es prêt', hWait: 'En attente de l’adversaire…',
    reveal: 'Feu !', out: 'Éjecté !', win: 'Victoire !', lose: 'Défaite…', draw: 'Égalité', again: 'Rejouer', back: 'Retour', quit: 'Abandonner le match ?', you: 'Toi', bot: 'Robot',
    why: { out: 'Tous ses jetons sont sortis du ring', count: 'Plus de jetons au dernier tour', turns: 'Plus de jetons restants après 12 tours', center: 'Jetons plus proches du centre', draw: 'Personne ne gagne' },
    turns: '{n} tours', mass: 'Poids', powerS: 'Puissance', size: 'Taille', koS: 'Éjecté',
    massD: 'Plus il est lourd, plus il est dur à pousser et plus il pousse fort.', powD: 'La force max de son tir : jusqu’où il peut aller.', sizeD: 'Plus il est gros, plus il touche facilement… mais plus il est facile à toucher.', statsLegend: '⚖️ Poids : dur à pousser, pousse fort · 💥 Puissance : force du tir · ⭕ Taille : touche plus facilement, mais cible plus facile',
    t1: 'Tape un de tes jetons pour le choisir.', t2: 'Glisse vers l’arrière pour viser. Plus tu tires loin, plus c’est fort. Regarde la trajectoire !',
    t3: 'Valide ! Ton adversaire tire en même temps que toi.', t4: 'Éjecte ses jetons du ring pour gagner.', t5: 'Chaque jeton a un pouvoir, essaie-le ! Active-le, vise, puis valide.',
    t6: 'Bien joué, tu es prêt pour le classé !', tOk: 'OK', tSkip: 'Passer', tEnd: 'Terminer',
  },
  en: {
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
      none: ['—', 'No power.'],
    },
    once: 'once per match', every: '{n}-turn cooldown', ready: 'Ready', used: 'Used', inCd: 'in {n} turn(s)', pick: 'Pick a token',
    power: 'Power', on: 'On', validate: 'Confirm', validated: 'Confirmed ✓', pass: 'Skip turn', turn: 'Turn {n}/{m}', sudden: 'Sudden death!', foeOk: '✓ Opponent is ready',
    hSel: 'Tap one of your tokens', hAim: 'Drag backwards to aim (anywhere on the screen)', hVal: 'Confirm when you’re ready', hWait: 'Waiting for the opponent…',
    reveal: 'Go!', out: 'Out!', win: 'Victory!', lose: 'Defeat…', draw: 'Draw', again: 'Play again', back: 'Back', quit: 'Forfeit the match?', you: 'You', bot: 'Bot',
    why: { out: 'All their tokens left the ring', count: 'More tokens on the last turn', turns: 'More tokens left after 12 turns', center: 'Tokens closer to the center', draw: 'Nobody wins' },
    turns: '{n} turns', mass: 'Weight', powerS: 'Power', size: 'Size', koS: 'Knocked out',
    massD: 'The heavier, the harder to push and the harder it pushes.', powD: 'Its max shot strength: how far it can go.', sizeD: 'The bigger, the easier it hits… but the easier it is to hit.', statsLegend: '⚖️ Weight: hard to push, pushes hard · 💥 Power: shot strength · ⭕ Size: hits more easily, but easier to hit',
    t1: 'Tap one of your tokens to pick it.', t2: 'Drag backwards to aim. The further you pull, the harder the shot. Watch the path!',
    t3: 'Confirm! Your opponent shoots at the same time.', t4: 'Knock their tokens out of the ring to win.', t5: 'Every token has a power, try it! Turn it on, aim, then confirm.',
    t6: 'Well done, you’re ready for ranked!', tOk: 'OK', tSkip: 'Skip', tEnd: 'Finish',
  },
};
const rtL = () => RT[SETTINGS.lang] || RT.fr;
const rt = (k, v = {}) => String(rtL()[k] ?? RT.fr[k]).replace(/\{(\w+)\}/g, (_, x) => v[x] ?? '');
const PW_COL = { grow: '#7dd3fc', bounce: '#f9a8d4', scrap: '#fb923c', slide: '#a5f3fc', eruption: '#f97316', curve: '#60a5fa', double: '#f43f5e', ghost: '#c4b5fd',
  rescue: '#4ade80', shrink: '#818cf8', magnet: '#fde68a', anchor: '#94a3b8', second: '#fb7185', roots: '#86efac', shield: '#f1f5f9', void: '#a855f7', split: '#ffffff', none: '#888' };
function powerText(name) {
  const k = RG.kit(name), [n, d] = rtL().pw[k.pw] || rtL().pw.none;
  return { pw: k.pw, name: n, desc: d, cd: k.cd, when: k.pw === 'none' ? '' : k.cd ? rt('every', { n: k.cd }) : rt('once') };
}

// ---------- État
const RNG = { st: null, el: null, cv: null, ctx: null, raf: 0, phase: 'aim', sel: null, aim: null, pow: false, drag: null, prev: null, foe: null, foeOk: false, locked: false,
  timer: 0, play: null, parts: [], trails: {}, spin: {}, shake: 0, imgs: {}, ai: 'normal', names: ['', ''], onEnd: null, tuto: null, view: { s: 1, cx: 0, cy: 0 } };
const rgImg = name => {
  if (RNG.imgs[name]) return RNG.imgs[name];
  const im = new Image(); im.src = texOf(jetonOf(name)); RNG.imgs[name] = im; return im;
};

// teams : [[{ name, lvl, variant }×3] ×2]. opts : { names, ai, tuto, onEnd }
function startRing(teams, opts = {}) {
  closeRing();
  Object.assign(RNG, { st: RG.create(teams), phase: 'aim', sel: null, aim: null, pow: false, drag: null, prev: null, foe: null, foeOk: false, locked: false, play: null, parts: [], trails: {}, spin: {}, shake: 0,
    ai: opts.ai || 'normal', names: opts.names || [rt('you'), rt('bot')], onEnd: opts.onEnd || null, tuto: opts.tuto ? { step: 0 } : null, last: 0 });
  teams.flat().forEach(j => rgImg(j.name));
  const o = document.createElement('div');
  o.className = 'rg'; o.id = 'rg';
  o.innerHTML = `
    <div class="rg-top">
      <button class="rg-x" data-quit aria-label="${t('close')}">✕</button>
      <div class="rg-score"><span class="me" id="rg-n0"></span><b id="rg-turn"></b><span class="foe" id="rg-n1"></span></div>
      <div class="rg-timer" id="rg-timer"><svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15.5"/><circle class="p" cx="18" cy="18" r="15.5" pathLength="100"/></svg><b></b></div>
    </div>
    <div class="rg-names"><span>${esc(RNG.names[0])}</span><span class="rg-ok" id="rg-ok">${rt('foeOk')}</span><span>${esc(RNG.names[1])}</span></div>
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
  o.querySelector('[data-quit]').onclick = () => { if (RNG.st.over || RNG.tuto || confirm(rt('quit'))) { RNG.tuto = null; closeRing(); RNG.onEnd?.('back'); } };
  sfx.whoosh?.();
  rgTurnStart();
  RNG.raf = requestAnimationFrame(rgFrame);
}
function closeRing() {
  cancelAnimationFrame(RNG.raf); clearTimeout(RNG.foeT); clearTimeout(RNG.okT); RFX.reset();
  removeEventListener('resize', rgResize); removeEventListener('pointermove', rgMove); removeEventListener('pointerup', rgUp); removeEventListener('pointercancel', rgUp);
  document.querySelectorAll('.rg, .rg-res').forEach(x => { x.classList.remove('on'); setTimeout(() => x.remove(), 250); });
  document.documentElement.classList.remove('lock');
  RNG.st = null; RNG.el = null;
}
// Le ring prend toute la place disponible (carré), en pixels nets
function rgResize() {
  if (!RNG.el) return;
  const st = RNG.el.querySelector('#rg-stage'), r = st.getBoundingClientRect(), size = Math.max(200, Math.min(r.width, r.height)), dpr = Math.min(2, devicePixelRatio || 1);
  RNG.cv.style.width = RNG.cv.style.height = size + 'px';
  RNG.cv.width = RNG.cv.height = Math.round(size * dpr);
  RNG.view = { size, dpr, s: size / 2 / (RCFG.RING_R * 1.1) };
}
const w2s = (x, y) => [RNG.view.size / 2 + x * RNG.view.s, RNG.view.size / 2 + y * RNG.view.s];
const s2w = (px, py) => [(px - RNG.view.size / 2) / RNG.view.s, (py - RNG.view.size / 2) / RNG.view.s];

// ---------- Tour : visée (10 s), l'IA prépare son tir en même temps
function rgTurnStart() {
  const st = RNG.st;
  Object.assign(RNG, { phase: 'aim', aim: null, pow: false, prev: null, foe: null, foeOk: false, locked: false, drag: null });
  const mine = RG.alive(st, 0);
  if (!mine.some(b => b.id === RNG.sel)) RNG.sel = null;
  RNG.timer = RCFG.AIM_S;
  RNG.el.querySelector('#rg-ok').classList.remove('on');
  // l'IA réfléchit (hors simulation : son hasard ne touche pas au déterminisme du tour)
  clearTimeout(RNG.foeT); clearTimeout(RNG.okT); RNG.foeReady = false;
  const turn = st.turn;
  RNG.foeT = setTimeout(() => {
    if (!RNG.st || RNG.st.turn !== turn) return;
    RNG.foe = RG.aiShot(RG.clone(RNG.st), 1, RNG.ai); RNG.foeReady = true;
    if (RNG.ai === 'still') return;
    RNG.okT = setTimeout(() => { if (RNG.st && RNG.phase === 'aim' && !RNG.foeOk) { RNG.foeOk = true; RNG.el.querySelector('#rg-ok').classList.add('on'); sfx.click?.(); } }, 1200 + Math.random() * 3500);
  }, 60);
  rgHud();
  if (RNG.tuto) rgTuto();
}
function rgHud() {
  const st = RNG.st, o = RNG.el; if (!o) return;
  [0, 1].forEach(s => { o.querySelector('#rg-n' + s).innerHTML = st.bodies.filter(b => b.side === s).map(b => `<i class="${b.alive ? '' : 'off'}"></i>`).join(''); });
  rgPanels();
  o.querySelector('#rg-turn').textContent = st.sudden ? rt('sudden') : rt('turn', { n: Math.min(st.turn, RCFG.TURNS), m: RCFG.TURNS });
  const b = st.bodies.find(x => x.id === RNG.sel), pwB = o.querySelector('#rg-pw'), go = o.querySelector('#rg-go');
  if (b) {
    const p = powerText(b.name), rd = RG.ready(b);
    pwB.disabled = !rd || RNG.locked || RNG.phase !== 'aim';
    pwB.className = 'rg-pw' + (RNG.pow ? ' on' : '') + (rd ? ' ready' : '');
    pwB.style.setProperty('--c', PW_COL[p.pw]);
    pwB.innerHTML = `<b>✦ ${esc(p.name)}</b><small>${RNG.pow ? rt('on') : rd ? esc(p.desc) : b.spent ? rt('used') : rt('inCd', { n: b.cd })}</small>`;
  } else { pwB.disabled = true; pwB.className = 'rg-pw'; pwB.innerHTML = `<b>✦ ${rt('power')}</b><small>${rt('pick')}</small>`; }
  const canGo = RNG.phase === 'aim' && !RNG.locked && (RNG.aim || (RNG.pow && b));
  go.disabled = RNG.phase !== 'aim' || RNG.locked;
  go.className = 'rg-go' + (canGo ? ' ready' : '') + (RNG.locked ? ' done' : '');
  go.textContent = RNG.locked ? rt('validated') : canGo ? rt('validate') : rt('pass');
  o.querySelector('#rg-hint').textContent = RNG.phase !== 'aim' ? '' : RNG.locked ? rt('hWait') : !b ? rt('hSel') : !RNG.aim ? rt('hAim') : rt('hVal');
}

// ---------- Les deux équipes dans les coins (la sienne en haut à droite, la tienne en bas à gauche) : touche pour la fiche
function rgPanels() {
  const st = RNG.st; if (!st || !RNG.el) return;
  [0, 1].forEach(side => {
    const box = RNG.el.querySelector('#rg-t' + side);
    box.innerHTML = st.bodies.filter(b => b.side === side).map(b => {
      const p = powerText(b.name), rd = RG.ready(b);
      return `<button class="rg-tc${b.alive ? '' : ' ko'}${b.id === RNG.sel ? ' sel' : ''}" data-id="${b.id}" style="--c:${PW_COL[p.pw]}" aria-label="${esc(jn(b.name))}">
        <img class="${vCls(b.variant)}" src="${texOf(jetonOf(b.name))}" alt="">
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
    ${row('pow', '💥', rt('powerS'), s.power, M.power, fmt(Math.round(s.power)), rt('powD'))}
    ${row('size', '⭕', rt('size'), s.r, M.r, s.r, rt('sizeD'))}
  </div>`;
}
// Fiche d'un jeton pendant le match (le chrono s'arrête en entraînement)
function rgInfo(id) {
  const b = RNG.st?.bodies.find(x => x.id === id); if (!b) return;
  RNG.el.querySelector('.rg-info')?.remove();
  const p = powerText(b.name), rd = RG.ready(b);
  const state = !b.alive ? rt('koS') : rd ? rt('ready') : b.spent ? rt('used') : rt('inCd', { n: b.cd });
  const o = document.createElement('div'); o.className = 'rg-info';
  o.innerHTML = `<div class="rg-ic ${b.side ? 'foe' : 'me'}" style="--g:${hexRGB(jetonOf(b.name).glow)}">
    <button class="rg-icx" aria-label="${t('close')}">✕</button>
    <div class="rg-ih"><img class="${vCls(b.variant)}" src="${texOf(jetonOf(b.name))}" alt=""><div><b>${jnH(b.name)} ${vTag(b.variant)}</b><small>${esc(RNG.names[b.side])} · ${at('lvl')} ${b.lvl}</small></div></div>
    <div class="rg-ip" style="--c:${PW_COL[p.pw]}"><b>✦ ${esc(p.name)}</b><p>${esc(p.desc)}</p><small>${state}${p.when ? ' · ' + p.when : ''}</small></div>
    ${ringStatsHTML(b.name, b.lvl, b.variant)}
  </div>`;
  RNG.el.appendChild(o); RNG.info = true; sfx.click();
  o.animate([{ opacity: 0, transform: 'scale(.94)' }, { opacity: 1, transform: 'none' }], { duration: 180, easing: 'ease-out' });
  o.onclick = () => { o.remove(); RNG.info = false; };
}

// ---------- Visée au lance-pierre : tape un jeton, puis glisse (depuis le jeton ou n'importe où) vers l'arrière
function rgPt(e) { const r = RNG.cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
function rgDown(e) {
  if (!RNG.st) return;
  e.preventDefault();
  const [px, py] = rgPt(e), [wx, wy] = s2w(px, py);
  const near = b => RG.len(b.x - wx, b.y - wy) < b.r * 1.3 + 15;
  // toucher un jeton adverse (ou un des tiens hors visée) : sa fiche
  const foe = !RNG.play && RG.alive(RNG.st, 1).find(near);
  if (foe && !RNG.drag && RNG.sel == null || foe && RNG.phase !== 'aim') return rgInfo(foe.id);
  if (RNG.phase !== 'aim' || RNG.locked) { const mine = !RNG.play && RG.alive(RNG.st, 0).find(near); return mine && rgInfo(mine.id); }
  if (RNG.tuto?.block) return;
  const hit = RG.alive(RNG.st, 0).find(b => RG.len(b.x - wx, b.y - wy) < b.r * 1.5 + 20);
  if (hit && hit.id !== RNG.sel) { RNG.sel = hit.id; RNG.aim = null; RNG.pow = false; RNG.prev = null; sfx.click(); rgHud(); RNG.tuto?.on?.('sel'); }
  if (RNG.sel == null) return;
  RNG.drag = { x: px, y: py, id: e.pointerId };
}
function rgMove(e) {
  const d = RNG.drag; if (!d || e.pointerId !== d.id || RNG.locked) return;
  const [px, py] = rgPt(e), dx = d.x - px, dy = d.y - py, L = Math.hypot(dx, dy);
  const full = Math.min(170, RNG.view.size * .42);
  if (L < 8) return;
  const f = Math.round(Math.min(1, L / full) * 100) / 100;
  RNG.aim = { ax: Math.round(dx / L * 1000), ay: Math.round(dy / L * 1000), f };
  RNG.prevDirty = true;
  if (!RNG.aimTick || performance.now() - RNG.aimTick > 90) { RNG.aimTick = performance.now(); sfx.tick?.(.2 + f * .6); }
}
function rgUp(e) {
  const d = RNG.drag; if (!d || e.pointerId !== d.id) return;
  RNG.drag = null;
  if (RNG.aim && RNG.aim.f < RCFG.MIN_FORCE) { RNG.aim = null; RNG.prev = null; }
  rgHud();
  if (RNG.aim) RNG.tuto?.on?.('aim');
}
function rgTogglePow() {
  const b = RNG.st?.bodies.find(x => x.id === RNG.sel); if (!b || !RG.ready(b) || RNG.locked) return;
  RNG.pow = !RNG.pow; RNG.prevDirty = true; sfx.next?.(); rgHud();
  if (RNG.pow) RNG.tuto?.on?.('pow');
}
function rgShot() { const b = RNG.st.bodies.find(x => x.id === RNG.sel); return b ? { i: b.i, ax: RNG.aim?.ax || 0, ay: RNG.aim?.ay || -1, f: RNG.aim?.f || 0, pow: RNG.pow } : null; }
// Trajectoire prévue : seulement ton tir, jusqu'un peu après le premier choc
function rgPreview() {
  RNG.prevDirty = false;
  if (!RNG.aim || RNG.sel == null) { RNG.prev = null; return; }
  const sim = RG.clone(RNG.st), r = RG.resolve(sim, [rgShot(), null], { preview: 70 });
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

// ---------- Révélation puis résolution animée
function rgReveal() {
  const st = RNG.st; if (!st) return;
  RNG.phase = 'reveal'; rgHud();
  const shots = [RNG.aim || RNG.pow ? rgShot() : null, RNG.foe || null];
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
  if (e.t === 'out') {
    const b = body(e.id), [x, y] = at(e.x, e.y);
    P.fall.push({ b, x: e.x, y: e.y, vx: e.vx, vy: e.vy, t: 0 });
    P.slow = RCFG.SLOWMO_S * 1.4; RNG.shake = 10;
    rgSparks(x, y, 26, b.side ? '#fb7185' : '#4ade80', 4);
    rgBanner(rt('out'), b.side ? '#4ade80' : '#fb7185');
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
  if (RNG.phase === 'aim' && !RNG.locked && !RNG.tuto && !RNG.info) {
    RNG.timer -= dt;
    if (RNG.timer <= 0) { RNG.timer = 0; rgLock(true); }
  }
  if (RNG.prevDirty) rgPreview();
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
      if (RNG.st.over) { RNG.phase = 'end'; rgHud(); setTimeout(() => rgResult(ev.find(x => x.t === 'end')), 600); }
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
function rgDraw(dt) {
  const c = RNG.ctx, V = RNG.view, R = RCFG.RING_R * V.s, mid = V.size / 2, t = performance.now() / 1000;
  c.setTransform(V.dpr, 0, 0, V.dpr, 0, 0);
  c.clearRect(0, 0, V.size, V.size);
  if (RNG.shake > 0) { c.translate((Math.random() - .5) * RNG.shake, (Math.random() - .5) * RNG.shake); RNG.shake = Math.max(0, RNG.shake - dt * 40); }
  // sol du ring
  const g = c.createRadialGradient(mid, mid, R * .1, mid, mid, R);
  g.addColorStop(0, '#2b2348'); g.addColorStop(1, '#17122a');
  c.fillStyle = g; c.beginPath(); c.arc(mid, mid, R, 0, 7); c.fill();
  c.strokeStyle = 'rgba(255,255,255,.05)'; c.lineWidth = 1;
  [.33, .66].forEach(k => { c.beginPath(); c.arc(mid, mid, R * k, 0, 7); c.stroke(); });
  c.beginPath(); c.arc(mid, mid, 4, 0, 7); c.fillStyle = 'rgba(255,255,255,.18)'; c.fill();
  // bord bien visible, qui pulse doucement
  c.lineWidth = 5; c.strokeStyle = `rgba(167,139,250,${.65 + .2 * Math.sin(t * 2)})`; c.shadowColor = '#a78bfa'; c.shadowBlur = 18;
  c.beginPath(); c.arc(mid, mid, R, 0, 7); c.stroke(); c.shadowBlur = 0;
  // corps à afficher : pendant l'animation, les positions enregistrées ; sinon l'état du match
  const P = RNG.play;
  let list;
  if (P) {
    const fi = Math.min(P.r.frames.length - 1, Math.floor(P.f)), fr = P.r.frames[fi], nx = P.r.frames[Math.min(P.r.frames.length - 1, fi + 1)], k = P.f - fi;
    list = P.bodies.map((b, i) => { const a = fr[i], z = nx[i] || a; return a ? { ...b, x: a[0] + ((z?.[0] ?? a[0]) - a[0]) * k, y: a[1] + ((z?.[1] ?? a[1]) - a[1]) * k, r: a[2] } : null; }).filter(Boolean);
  } else list = RNG.st.bodies.filter(b => b.alive);
  RFX.under(c, list, t, dt);
  // traînées des jetons rapides (et rotation des jetons qui roulent)
  if (!reducedFx()) for (const b of list) {
    const tr = RNG.trails[b.id] ||= [];
    const lp = tr[tr.length - 1]; if (lp) RNG.spin[b.id] = (RNG.spin[b.id] || 0) + RG.len(b.x - lp[0], b.y - lp[1]) / b.r * (b.side ? -1 : 1);
    tr.push([b.x, b.y]); if (tr.length > 14) tr.shift();
    if (tr.length < 3) continue;
    const d = RG.len(tr[tr.length - 1][0] - tr[0][0], tr[tr.length - 1][1] - tr[0][1]);
    if (d < 40) continue;
    const col = b.variant === 'gold' ? '253,230,138' : b.variant === 'celeste' ? '165,243,252' : b.variant === 'ombre' ? '139,92,246' : b.side ? '251,113,133' : '74,222,128';
    for (let k = 1; k < tr.length; k++) {
      const [ax, ay] = w2s(...tr[k - 1]), [bx, by] = w2s(...tr[k]);
      c.strokeStyle = `rgba(${col},${k / tr.length * .55})`; c.lineWidth = b.r * V.s * 1.4 * k / tr.length; c.lineCap = 'round';
      c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke();
    }
  }
  // visée : trajectoire en pointillés, flèche et jauge de force
  const sel = !P && RNG.st.bodies.find(b => b.id === RNG.sel && b.alive);
  if (sel && RNG.phase === 'aim') {
    const [sx, sy] = w2s(sel.x, sel.y);
    c.strokeStyle = '#fff'; c.lineWidth = 2.5; c.globalAlpha = .55 + .35 * Math.sin(t * 6);
    c.beginPath(); c.arc(sx, sy, sel.r * V.s + 7, 0, 7); c.stroke(); c.globalAlpha = 1;
    if (RNG.prev && RNG.aim) {
      const col = RNG.aim.f < .5 ? '#4ade80' : RNG.aim.f < .8 ? '#fb923c' : '#f43f5e';
      c.setLineDash([3, 7]); c.lineWidth = 2.5; c.strokeStyle = RNG.prev.out ? '#f43f5e' : 'rgba(255,255,255,.75)';
      c.beginPath(); RNG.prev.me.forEach((p, k) => { const [x, y] = w2s(p[0], p[1]); k ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke();
      if (RNG.prev.hit.length > 1) { c.strokeStyle = 'rgba(253,230,138,.85)'; c.beginPath(); RNG.prev.hit.forEach((p, k) => { const [x, y] = w2s(p[0], p[1]); k ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke(); }
      c.setLineDash([]);
      const end = RNG.prev.me[RNG.prev.me.length - 1]; if (end) { const [x, y] = w2s(end[0], end[1]); c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 1.5; c.beginPath(); c.arc(x, y, sel.r * V.s, 0, 7); c.stroke(); }
      const L = 26 + RNG.aim.f * 70, n = RG.len(RNG.aim.ax, RNG.aim.ay), ux = RNG.aim.ax / n, uy = RNG.aim.ay / n;
      const ax = sx + ux * (sel.r * V.s + 6), ay = sy + uy * (sel.r * V.s + 6), bx = ax + ux * L, by = ay + uy * L;
      c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 5 + RNG.aim.f * 3; c.lineCap = 'round'; c.shadowColor = col; c.shadowBlur = 12;
      c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke();
      c.beginPath(); c.moveTo(bx + ux * 12, by + uy * 12); c.lineTo(bx - uy * 9, by + ux * 9); c.lineTo(bx + uy * 9, by - ux * 9); c.fill(); c.shadowBlur = 0;
      // jauge de force
      c.lineWidth = 5; c.strokeStyle = 'rgba(255,255,255,.12)'; c.beginPath(); c.arc(sx, sy, sel.r * V.s + 15, -1.57, 4.71); c.stroke();
      c.strokeStyle = col; c.beginPath(); c.arc(sx, sy, sel.r * V.s + 15, -1.57, -1.57 + 6.283 * RNG.aim.f); c.stroke();
    }
  }
  // révélation : on montre les deux tirs
  if (RNG.reveal) RNG.reveal.forEach(r => {
    if (!r || !r.s.f) return;
    const b = r.body, [sx, sy] = w2s(b.x, b.y), n = RG.len(r.s.ax, r.s.ay), ux = r.s.ax / n, uy = r.s.ay / n, L = 30 + r.s.f * 80;
    c.strokeStyle = b.side ? '#fb7185' : '#4ade80'; c.lineWidth = 6; c.lineCap = 'round'; c.shadowColor = c.strokeStyle; c.shadowBlur = 14;
    c.beginPath(); c.moveTo(sx + ux * b.r * V.s, sy + uy * b.r * V.s); c.lineTo(sx + ux * (b.r * V.s + L), sy + uy * (b.r * V.s + L)); c.stroke(); c.shadowBlur = 0;
  });
  // jetons (avec l'aura de leur pouvoir)
  for (const b of list) {
    const [x, y] = w2s(b.x, b.y), rr = b.r * V.s, tr = RNG.trails[b.id] || [], lp = tr[tr.length - 3];
    RFX.aura(c, b, x, y, rr, t);
    rgToken(c, b, t, false);
    RFX.emit(b, x, y, rr, !!lp && RG.len(b.x - lp[0], b.y - lp[1]) > 4);
  }
  // jetons qui tombent hors du ring
  if (P) P.fall.forEach(x => {
    const k = Math.min(1, x.t / .7);
    rgToken(c, { ...x.b, x: x.x + x.vx * x.t * .35, y: x.y + x.vy * x.t * .35 }, t, 1 - k);
  });
  // particules et formes d'effets
  RNG.parts = RNG.parts.filter(p => p.life > 0);
  for (const p of RNG.parts) {
    c.save();
    if (p.ring) {
      const k = 1 - p.life, rad = (p.inward ? 1 - k : k) * p.size * 30 + 6;
      c.strokeStyle = p.col; c.globalAlpha = p.life; c.lineWidth = 4; c.beginPath(); c.arc(p.x, p.y, rad, 0, 7); c.stroke();
      p.life -= dt * 1.8;
    } else if (p.wave) { // onde de choc pleine (éruption) ou qui se referme (aimant)
      const k = 1 - p.life, rad = p.inward ? p.rad * (1 - k) : p.rad * Math.min(1, k * 1.6);
      const g = c.createRadialGradient(p.x, p.y, rad * .6, p.x, p.y, rad); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, p.col);
      c.globalAlpha = p.life * .8; c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, rad, 0, 7); c.fill();
      c.strokeStyle = p.col; c.lineWidth = 4; c.shadowColor = p.col; c.shadowBlur = 20; c.stroke();
      p.life -= dt * 1.5;
    } else if (p.star) { // éclat en étoile (Frappe ×2)
      const k = 1 - p.life; c.translate(p.x, p.y); c.rotate(k * 1.5); c.globalAlpha = p.life; c.fillStyle = p.col; c.shadowColor = p.col; c.shadowBlur = 24;
      c.beginPath(); for (let i = 0; i < 16; i++) { const r = (i % 2 ? .35 : 1) * p.size * (.5 + k); const a = i / 16 * 6.283; i ? c.lineTo(Math.cos(a) * r, Math.sin(a) * r) : c.moveTo(Math.cos(a) * r, Math.sin(a) * r); } c.fill();
      p.life -= dt * 2.2;
    } else if (p.text) {
      c.globalAlpha = Math.min(1, p.life * 2); c.fillStyle = p.col; c.font = `900 ${p.size}px "Space Grotesk", sans-serif`; c.textAlign = 'center'; c.shadowColor = '#000'; c.shadowBlur = 8;
      c.fillText(p.text, p.x, p.y - (1 - p.life) * 30); p.life -= dt * 1.2;
    } else if (p.bolt) { // éclair violet (Néant)
      const [ax, ay, bx, by] = p.bolt; c.globalAlpha = p.life; c.strokeStyle = p.col; c.lineWidth = 3; c.shadowColor = p.col; c.shadowBlur = 16;
      c.beginPath(); c.moveTo(ax, ay); for (let i = 1; i < 8; i++) { const k = i / 8; c.lineTo(ax + (bx - ax) * k + (Math.random() - .5) * 18, ay + (by - ay) * k + (Math.random() - .5) * 18); } c.lineTo(bx, by); c.stroke();
      p.life -= dt * 2.5;
    } else if (p.hole) { // trou noir qui tourbillonne
      const r = p.size * (1.2 - p.life * .4); const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, r); g.addColorStop(0, 'rgba(0,0,0,.95)'); g.addColorStop(.6, 'rgba(59,7,100,.7)'); g.addColorStop(1, 'rgba(168,85,247,0)');
      c.globalAlpha = p.life; c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, r, 0, 7); c.fill(); p.life -= dt * 1.4;
    } else if (p.hex) {
      c.globalAlpha = p.life; c.strokeStyle = p.col; c.lineWidth = 3; c.shadowColor = '#fff'; c.shadowBlur = 16; const r = p.size * (1.4 - p.life * .4);
      c.beginPath(); for (let i = 0; i <= 6; i++) { const a = i / 6 * 6.283; i ? c.lineTo(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r) : c.moveTo(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r); } c.stroke(); p.life -= dt * 2.4;
    } else {
      if (p.sink) { p.vx = (p.sink[0] - p.x) * .12; p.vy = (p.sink[1] - p.y) * .12; }
      p.x += p.vx; p.y += p.vy; if (!p.sink && !p.bubble) { p.vx *= .92; p.vy *= .92; }
      p.life -= dt * (p.bubble ? 1.1 : 1.6);
      c.fillStyle = p.col; c.globalAlpha = Math.max(0, p.life);
      if (p.bubble) { c.strokeStyle = p.col; c.lineWidth = 1.2; c.beginPath(); c.arc(p.x, p.y, p.size, 0, 7); c.stroke(); }
      else c.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    c.restore();
  }
  RFX.over(c, t, dt);
}
// Un jeton vu de dessus, comme un palet : anneau métallique à la couleur de son camp (vert = toi, rouge = lui),
// disque intérieur teinté par le jeton, image qui tourne quand il roule, reflet brillant, effet de mutation.
const SIDE_COL = [['#bbf7d0', '#22c55e', '#14532d'], ['#fecdd3', '#f43f5e', '#7f1d1d']];
function rgToken(c, b, t, fall) {
  const V = RNG.view, [x, y] = w2s(b.x, b.y), rr = b.r * V.s * (fall === false ? 1 : .4 + .6 * fall);
  if (rr <= .5) return;
  c.save();
  if (fall !== false) c.globalAlpha = Math.max(0, fall);
  if (RFX.isActive(b.id) === 'ghost' && RNG.play) c.globalAlpha *= .55;
  const [hi, md, lo] = SIDE_COL[b.side], glow = jetonOf(b.name).glow || '#a78bfa', spin = RNG.spin[b.id] || 0;
  // aura de mutation
  if (b.variant && !reducedFx()) {
    const col = b.variant === 'gold' ? '253,230,138' : b.variant === 'celeste' ? '165,243,252' : '91,33,182';
    const ag = c.createRadialGradient(x, y, rr * .8, x, y, rr * 1.75); ag.addColorStop(0, `rgba(${col},.6)`); ag.addColorStop(1, `rgba(${col},0)`);
    c.fillStyle = ag; c.beginPath(); c.arc(x, y, rr * 1.75, 0, 7); c.fill();
    if (b.variant === 'celeste') for (let k = 0; k < 5; k++) { const a = t * 1.5 + k * 1.257; c.fillStyle = '#e0f2fe'; c.fillRect(x + Math.cos(a) * rr * 1.4 - 1.5, y + Math.sin(a) * rr * 1.4 - 1.5, 3, 3); }
    if (b.variant === 'ombre') for (let k = 0; k < 3; k++) { const a = -t * 1.2 + k * 2.09; c.fillStyle = 'rgba(46,16,101,.7)'; c.beginPath(); c.arc(x + Math.cos(a) * rr * 1.25, y + Math.sin(a) * rr * 1.25, rr * .28, 0, 7); c.fill(); }
  }
  // ombre portée douce
  const sg = c.createRadialGradient(x + rr * .15, y + rr * .3, rr * .3, x + rr * .15, y + rr * .3, rr * 1.25);
  sg.addColorStop(0, 'rgba(0,0,0,.55)'); sg.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = sg; c.beginPath(); c.arc(x + rr * .15, y + rr * .3, rr * 1.25, 0, 7); c.fill();
  // anneau métallique
  const rim = c.createLinearGradient(x - rr, y - rr, x + rr, y + rr);
  if (b.tmp) { rim.addColorStop(0, '#fde68a'); rim.addColorStop(.5, '#f0abfc'); rim.addColorStop(1, '#67e8f9'); }
  else { rim.addColorStop(0, hi); rim.addColorStop(.45, md); rim.addColorStop(1, lo); }
  c.fillStyle = rim; c.beginPath(); c.arc(x, y, rr, 0, 7); c.fill();
  // crans sur l'anneau (ils tournent quand le jeton roule)
  if (rr > 9) { c.fillStyle = 'rgba(255,255,255,.35)'; for (let k = 0; k < 10; k++) { const a = spin + k * .628; c.beginPath(); c.arc(x + Math.cos(a) * rr * .91, y + Math.sin(a) * rr * .91, Math.max(1, rr * .045), 0, 7); c.fill(); } }
  // disque intérieur teinté par la couleur du jeton
  const ri = rr * .8, inner = c.createRadialGradient(x - ri * .3, y - ri * .3, ri * .1, x, y, ri);
  inner.addColorStop(0, glow); inner.addColorStop(.55, '#2a2140'); inner.addColorStop(1, '#0f0b1c');
  c.fillStyle = inner; c.beginPath(); c.arc(x, y, ri, 0, 7); c.fill();
  c.lineWidth = Math.max(1, rr * .05); c.strokeStyle = 'rgba(0,0,0,.45)'; c.stroke();
  // image du jeton, qui tourne
  const im = rgImg(b.name);
  c.save(); c.beginPath(); c.arc(x, y, ri * .97, 0, 7); c.clip();
  c.translate(x, y); c.rotate(spin * .5); c.imageSmoothingEnabled = false;
  if (im.complete && im.naturalWidth) { const sz = ri * 2.05; c.drawImage(im, -sz / 2, -sz / 2, sz, sz); }
  c.restore();
  c.save(); c.beginPath(); c.arc(x, y, ri, 0, 7); c.clip();
  if (b.variant === 'gold') { const sh = (t * .8 % 2) - .5, cl = v => Math.min(1, Math.max(0, v)); const lg = c.createLinearGradient(x - rr, y - rr, x + rr, y + rr); lg.addColorStop(cl(sh - .15), 'rgba(255,240,180,0)'); lg.addColorStop(cl(sh), 'rgba(255,240,180,.6)'); lg.addColorStop(cl(sh + .15), 'rgba(255,240,180,0)'); c.fillStyle = lg; c.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
  if (b.variant === 'ombre') { c.fillStyle = 'rgba(30,10,60,.3)'; c.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
  // reflet brillant en haut à gauche
  const gl = c.createRadialGradient(x - ri * .45, y - ri * .55, 0, x - ri * .45, y - ri * .55, ri * .9);
  gl.addColorStop(0, 'rgba(255,255,255,.32)'); gl.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gl; c.fillRect(x - rr, y - rr, rr * 2, rr * 2);
  c.restore();
  // fin liseré clair sur le bord
  c.lineWidth = Math.max(1, rr * .04); c.strokeStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.arc(x, y, rr - c.lineWidth / 2, 3.6, 5.6); c.stroke();
  // pouvoir prêt (tes jetons) : petite gemme ; pouvoir activé en visée : halo coloré
  if (fall === false && !b.tmp) {
    const live = RNG.st?.bodies.find(z => z.id === b.id);
    if (b.id === RNG.sel && RNG.pow && RNG.phase === 'aim') {
      const pc = PW_COL[b.pw]; c.strokeStyle = pc; c.lineWidth = 3; c.shadowColor = pc; c.shadowBlur = 16; c.globalAlpha = .6 + .4 * Math.sin(t * 8);
      c.beginPath(); c.arc(x, y, rr + 5, 0, 7); c.stroke(); c.shadowBlur = 0; c.globalAlpha = 1;
    }
    if (live && RG.ready(live) && RNG.phase === 'aim') { const gx = x + rr * .72, gy = y - rr * .72, gr = Math.max(3.5, rr * .2); c.fillStyle = PW_COL[b.pw]; c.shadowColor = PW_COL[b.pw]; c.shadowBlur = 8; c.beginPath(); c.moveTo(gx, gy - gr); c.lineTo(gx + gr, gy); c.lineTo(gx, gy + gr); c.lineTo(gx - gr, gy); c.fill(); }
  }
  c.restore();
}

// ---------- Fin du match
function rgResult(e) {
  if (!RNG.st) return;
  const w = e?.winner, me = w === 0, draw = w == null, st = RNG.st;
  RNG.tuto = null;
  const box = document.createElement('div');
  box.className = 'rg-res ' + (draw ? 'draw' : me ? 'win' : 'lose');
  box.innerHTML = `<div class="rg-rbox">
    <h2>${draw ? rt('draw') : me ? rt('win') : rt('lose')}</h2>
    <small class="muted">${rtL().why[e?.why] || ''}</small>
    <div class="rg-rleft"><span class="me">${RG.alive(st, 0).map(b => `<img src="${texOf(jetonOf(b.name))}" alt="">`).join('') || '—'}</span><b>vs</b><span class="foe">${RG.alive(st, 1).map(b => `<img src="${texOf(jetonOf(b.name))}" alt="">`).join('') || '—'}</span></div>
    <small class="muted">${rt('turns', { n: Math.min(st.turn, RCFG.TURNS + 3) })}</small>
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
function startRingTuto(onEnd) {
  const mine = ['Carmin', 'Mobu', 'Pikko'].map(name => ({ name, lvl: 1 })), foe = ['Rouillé', 'Givre', 'Azura'].map(name => ({ name, lvl: 1 }));
  startRing([mine, foe], { tuto: true, ai: 'still', names: [rt('you'), rt('bot')], onEnd });
}
function rgTip(text, where, btns = [['skip', rt('tSkip')]]) {
  RNG.el.querySelector('.rg-tip')?.remove();
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
    if (n === 4) { rgTip(rt('t4'), 'top', [['ok', rt('tOk')]]); rgHl(null); tu.block = 'all'; tu.next = () => show(5); }
    if (n === 5) {
      const carmin = RNG.st.bodies.find(b => b.side === 0 && b.alive && RG.ready(b));
      if (!carmin) return show(6);
      RNG.sel = carmin.id; RNG.pow = false; rgHud();
      rgTip(rt('t5'), 'top'); rgHl('#rg-pw');
    }
    if (n === 6) { rgTip(rt('t6'), 'top', [['ok', rt('tEnd')]]); rgHl(null); tu.block = 'all'; tu.next = () => rgEndTuto(); }
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
  RNG.tuto = null;
  RNG.el?.querySelector('.rg-tip')?.remove(); RNG.el && rgHl(null);
  RNG.timer = RCFG.AIM_S;
  rgHud();
}
