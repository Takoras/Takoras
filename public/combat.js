// Combat (réservé aux admins pour l'instant) : un deck de 3 jetons, du tour par tour contre un robot.
// À ton tour : tu choisis un de tes jetons, la cible en face, tu peux lancer sa capacité (si elle est rechargée,
// elle réussit toujours), puis tu choisis pile ou face. Bien deviné = dégâts, raté = rien. Ensuite c'est à l'autre.

const CT = {
  fr: {
    title: 'Combat', beta: 'Admin · bêta', deck: 'Ton deck', deck_hint: 'Choisis 3 jetons : ils restent dans ton deck pour tous tes combats (et ne peuvent pas être vendus).',
    slot_empty: 'Choisir un jeton', fight_bot: '⚔️ Combattre le robot', queue: '🌐 Chercher un joueur', soon: 'bientôt', need3: 'Il te faut 3 jetons dans ton deck',
    pick_title: 'Deck · case {n}', pick_remove: 'Retirer de la case', debug: 'Debug robot', bot_deck: 'Deck du robot', random: 'Au hasard', rig: 'Pile ou face', rig_n: 'Normal', rig_w: 'Je gagne toujours', rig_l: 'Je perds toujours',
    codex: 'Les capacités', cd: 'recharge {n} tour(s)', ready: 'prête', in_cd: 'dans {n}',
    your_turn: 'À toi !', bot_turn: 'Tour du robot', step_pick: 'Choisis un de tes jetons', step_target: 'Choisis qui attaquer', step_guess: 'Pile ou face ?',
    pile: 'Pile', face: 'Face', use_abil: 'Lancer la capacité', abil_on: 'Capacité activée', frozen: 'gelé', ko: 'K.O.',
    win: 'Victoire !', lose: 'Défaite…', again: 'Rejouer', menu: 'Menu combat', quit: 'Abandonner', quit_q: 'Abandonner le combat ?', log: 'Journal',
    l_start_0: 'Tu commences !', l_start_1: 'Le robot commence !', l_hit: '{a} frappe {t} : −{d}', l_miss: '{a} rate son attaque ({r})', l_ko: '{t} est K.O. !', l_flip: 'C’est {r} !',
    l_guess: '{a} parie {g}', l_skip_0: 'Tu ne peux pas jouer (tout est gelé)', l_skip_1: 'Le robot ne peut pas jouer (tout est gelé)', l_curse: '{t} subit la malédiction : −{d}', l_dodge: '{t} esquive !', l_reroll: 'Étoile filante : on relance !',
    you: 'Toi', bot: 'Robot',
  },
  en: {
    title: 'Battle', beta: 'Admin · beta', deck: 'Your deck', deck_hint: 'Pick 3 tokens: they stay in your deck for all your battles (and can’t be sold).',
    slot_empty: 'Pick a token', fight_bot: '⚔️ Fight the bot', queue: '🌐 Find a player', soon: 'soon', need3: 'You need 3 tokens in your deck',
    pick_title: 'Deck · slot {n}', pick_remove: 'Clear slot', debug: 'Bot debug', bot_deck: 'Bot deck', random: 'Random', rig: 'Coin flip', rig_n: 'Normal', rig_w: 'I always win', rig_l: 'I always lose',
    codex: 'Abilities', cd: 'cooldown {n} turn(s)', ready: 'ready', in_cd: 'in {n}',
    your_turn: 'Your turn!', bot_turn: 'Bot’s turn', step_pick: 'Pick one of your tokens', step_target: 'Pick who to attack', step_guess: 'Heads or tails?',
    pile: 'Tails', face: 'Heads', use_abil: 'Use ability', abil_on: 'Ability on', frozen: 'frozen', ko: 'K.O.',
    win: 'Victory!', lose: 'Defeat…', again: 'Play again', menu: 'Battle menu', quit: 'Give up', quit_q: 'Give up this battle?', log: 'Log',
    l_start_0: 'You go first!', l_start_1: 'The bot goes first!', l_hit: '{a} hits {t}: −{d}', l_miss: '{a} misses ({r})', l_ko: '{t} is K.O.!', l_flip: 'It’s {r}!',
    l_guess: '{a} bets {g}', l_skip_0: 'You can’t play (everything is frozen)', l_skip_1: 'The bot can’t play (everything is frozen)', l_curse: '{t} suffers the curse: −{d}', l_dodge: '{t} dodges!', l_reroll: 'Shooting star: flip again!',
    you: 'You', bot: 'Bot',
  },
};
const ct = (k, v = {}) => { let s = (CT[SETTINGS.lang] || CT.fr)[k] ?? CT.fr[k] ?? k; for (const x in v) s = s.replace('{' + x + '}', v[x]); return s; };

// ---------- Capacités : une par jeton. tgt = qui elle vise (moi, la cible choisie, mes alliés, tous les ennemis)
// run(c) : c.me (mon jeton), c.foe (la cible), c.allies, c.enemies ; peut modifier l'attaque de ce tour (c.mult, c.steal, c.reroll)
const ABIL = {
  'Mobu': { ico: '🛡️', cd: 2, fr: ['Carapace', 'Se donne un bouclier de 35.'], en: ['Shell', 'Gains a 35 shield.'], run: c => shieldOf(c.me, 35) },
  'Pikko': { ico: '📌', cd: 2, fr: ['Piqûre', 'Cette attaque fait ×1,5 dégâts.'], en: ['Sting', 'This attack deals ×1.5 damage.'], run: c => { c.mult *= 1.5; } },
  'Rouillé': { ico: '🦠', cd: 3, fr: ['Rouille', 'La cible perd 4 de défense pour tout le combat.'], en: ['Rust', 'Target loses 4 defense for the whole battle.'], run: c => { c.foe.def = Math.max(0, c.foe.def - 4); c.foe.rust = (c.foe.rust || 0) + 4; } },
  'Givre': { ico: '❄️', cd: 3, fr: ['Gel', 'La cible est gelée : elle ne pourra pas jouer au prochain tour.'], en: ['Freeze', 'Target is frozen: it can’t play next turn.'], run: c => { c.foe.frozen = true; } },
  'Soléo': { ico: '☀️', cd: 3, fr: ['Soin solaire', 'Soigne de 40 l’allié le plus blessé.'], en: ['Solar heal', 'Heals the most hurt ally by 40.'], run: c => healOf(weakest(c.allies), 40) },
  'Azura': { ico: '🌊', cd: 3, fr: ['Raz-de-marée', '12 dégâts à tous les ennemis (même avec bouclier).'], en: ['Tidal wave', '12 damage to every enemy (even shielded).'], run: c => c.enemies.forEach(e => hurt(c, e, 12, true)) },
  'Carmin': { ico: '🩸', cd: 2, fr: ['Saignée', 'Cette attaque te soigne de 60 % des dégâts.'], en: ['Bloodletting', 'This attack heals you for 60% of the damage.'], run: c => { c.steal = .6; } },
  'Vyolis': { ico: '🔮', cd: 3, fr: ['Barrière', 'Bouclier de 20 sur tous tes jetons.'], en: ['Barrier', '20 shield on all your tokens.'], run: c => c.allies.forEach(a => shieldOf(a, 20)) },
  'Lumis': { ico: '✨', cd: 3, fr: ['Aveuglement', 'La prochaine attaque de la cible fait moitié moins de dégâts.'], en: ['Blind', 'Target’s next attack deals half damage.'], run: c => { c.foe.blind = true; } },
  'Nyx': { ico: '🌑', cd: 3, fr: ['Ombre', 'Esquive la prochaine attaque reçue.'], en: ['Shadow', 'Dodges the next attack received.'], run: c => { c.me.dodge = true; } },
  'Astra': { ico: '🌠', cd: 3, fr: ['Étoile filante', 'Si tu rates ton pile ou face, on relance une fois.'], en: ['Shooting star', 'If you miss the coin flip, it’s flipped again once.'], run: c => { c.reroll = true; } },
  'Kraïos': { ico: '⚡', cd: 3, fr: ['Fureur', '+6 d’attaque pour tout le combat.'], en: ['Fury', '+6 attack for the whole battle.'], run: c => { c.me.atk += 6; c.me.fury = (c.me.fury || 0) + 6; } },
  'Chronos': { ico: '⏳', cd: 4, fr: ['Distorsion', 'Recharge les capacités de tes alliés et cette attaque fait ×1,25.'], en: ['Distortion', 'Recharges your allies’ abilities and this attack deals ×1.25.'], run: c => { c.allies.forEach(a => { if (a !== c.me) a.cd = 0; }); c.mult *= 1.25; } },
  'Néphéris': { ico: '💜', cd: 3, fr: ['Malédiction', 'La cible perd 12 PV au début de ses 3 prochains tours.'], en: ['Curse', 'Target loses 12 HP at the start of its next 3 turns.'], run: c => { c.foe.curse = 3; } },
  'Zénith': { ico: '🌟', cd: 3, fr: ['Aube', 'Soigne tous tes jetons de 22.'], en: ['Dawn', 'Heals all your tokens by 22.'], run: c => c.allies.forEach(a => healOf(a, 22)) },
  'Oblivion': { ico: '🕳️', cd: 3, fr: ['Néant', '30 dégâts sûrs à la cible (ignore le bouclier).'], en: ['Void', '30 sure damage to the target (ignores shield).'], run: c => hurt(c, c.foe, 30, true) },
  'Takoras': { ico: '👑', cd: 3, fr: ['Jugement', 'Cette attaque fait ×2 dégâts et te donne un bouclier de 25.'], en: ['Judgment', 'This attack deals ×2 damage and gives you a 25 shield.'], run: c => { c.mult *= 2; shieldOf(c.me, 25); } },
};
const abilOf = name => ABIL[name] || ABIL.Mobu;
const abilText = name => { const a = abilOf(name); return a[SETTINGS.lang] || a.fr; };

// ---------- Petites actions sur un jeton en combat
const alive = u => u.hp > 0;
const weakest = list => list.filter(alive).sort((a, b) => a.hp / a.max - b.hp / b.max)[0];
function shieldOf(u, n) { if (alive(u)) { u.shield += n; fxOn(u, 'shield', '+' + n); } }
function healOf(u, n) { if (!u || !alive(u)) return; const h = Math.min(n, u.max - u.hp); u.hp += h; fxOn(u, 'heal', '+' + h); }
// pierce = ignore le bouclier
function hurt(c, u, n, pierce = false) {
  if (!alive(u)) return 0;
  let d = Math.max(0, Math.round(n));
  if (!pierce && u.shield) { const s = Math.min(u.shield, d); u.shield -= s; d -= s; }
  u.hp = Math.max(0, u.hp - d);
  fxOn(u, 'hit', '−' + d);
  if (!alive(u)) { log(ct('l_ko', { t: uName(u) }), 'ko'); sfx.impact(); }
  return d;
}

// ---------- État du combat
let BT = null;          // combat en cours
const DBG = { botDeck: ['', '', ''], rig: 'n' };
const uName = u => jn(u.name);
function unitOf(j, side, i) {
  const s = statsOf(j.name, j.odds);
  return { side, i, name: j.name, odds: j.odds, glow: j.glow, hp: s.s_hp, max: s.s_hp, atk: s.s_atk, def: s.s_def, spd: s.s_spd, shield: 0, cd: 0 };
}
const teamOf = side => BT.teams[side];
const foeSide = side => 1 - side;
const canAct = u => alive(u) && !u.frozen;

function startBattle(myDeck) {
  const pool = SERIES.Takoras;
  const bot = DBG.botDeck.map(n => n ? jetonOf(n) : pool[Math.floor(Math.random() * pool.length)]);
  BT = { teams: [myDeck.map((j, i) => unitOf(j, 0, i)), bot.map((j, i) => unitOf(j, 1, i))], turn: 0, sel: null, tgt: null, abil: false, busy: false, over: false, log: [], n: 0 };
  // le deck le plus rapide commence (égalité = au hasard)
  const sp = BT.teams.map(t => t.reduce((s, u) => s + u.spd, 0));
  BT.turn = sp[0] === sp[1] ? (Math.random() < .5 ? 0 : 1) : sp[0] > sp[1] ? 0 : 1;
  openBattle();
  log(ct('l_start_' + BT.turn), 'sys');
  setTimeout(beginTurn, 700);
}

// Début du tour d'un camp : malédictions, recharges, puis on joue (ou on passe si tout est gelé)
function beginTurn() {
  if (BT.over) return;
  const side = BT.turn, team = teamOf(side);
  team.forEach(u => {
    if (u.cd > 0) u.cd--;
    if (alive(u) && u.curse > 0) { u.curse--; log(ct('l_curse', { t: uName(u), d: 12 }), 'curse'); hurt(null, u, 12, true); }
  });
  BT.sel = BT.tgt = null; BT.abil = false;
  drawBattle();
  if (checkEnd()) return;
  if (!team.some(canAct)) { log(ct('l_skip_' + side), 'sys'); return setTimeout(endTurn, 900); }
  banner(side ? ct('bot_turn') : ct('your_turn'), side);
  if (side === 1) setTimeout(botPlay, 900);
  else { const ok = team.filter(canAct); if (ok.length === 1) BT.sel = ok[0].i; drawBattle(); }
}
function endTurn() {
  teamOf(BT.turn).forEach(u => { u.frozen = false; });
  if (checkEnd()) return;
  BT.turn = foeSide(BT.turn);
  BT.n++;
  beginTurn();
}
function checkEnd() {
  const lost = BT.teams.map(t => !t.some(alive));
  if (!lost[0] && !lost[1]) return false;
  BT.over = true;
  drawBattle();
  setTimeout(() => showEnd(!lost[0]), 700);
  return true;
}

// Joue un tour : capacité (optionnelle, réussit toujours) puis pile ou face pour les dégâts
async function playTurn(side, ui, ti, useAbil, guess) {
  BT.busy = true;
  const me = teamOf(side)[ui], enemies = teamOf(foeSide(side)), foe = enemies[ti];
  const c = { me, foe, allies: teamOf(side), enemies, mult: 1, steal: 0, reroll: false };
  drawBattle();
  if (useAbil && me.cd === 0) {
    const [nm] = abilText(me.name);
    log(`${abilOf(me.name).ico} ${uName(me)} : ${nm}`, 'abil');
    me.cd = abilOf(me.name).cd + 1; // +1 : elle redescend au début de ton tour
    sfx.upgrade();
    abilOf(me.name).run(c);
    castFx(me);
    drawBattle();
    await wait(650);
    if (checkEnd()) return (BT.busy = false);
  }
  if (!alive(foe)) { BT.busy = false; return endTurn(); } // la capacité a déjà fini la cible
  log(ct('l_guess', { a: uName(me), g: ct(guess) }), 'sys');
  let res = await flipCoin(side === 0 ? guess : null);
  if (res !== guess && c.reroll) { log(ct('l_reroll'), 'abil'); await wait(300); res = await flipCoin(null); }
  if (res === guess) {
    let dmg = (me.atk * 2 - foe.def) * c.mult * (.9 + Math.random() * .2);
    if (me.blind) { dmg /= 2; }
    me.blind = false;
    if (foe.dodge) { foe.dodge = false; log(ct('l_dodge', { t: uName(foe) }), 'sys'); fxOn(foe, 'dodge', '✦'); sfx.whoosh?.(); }
    else {
      const d = hurt(c, foe, Math.max(6, dmg));
      log(ct('l_hit', { a: uName(me), t: uName(foe), d }), side ? 'bad' : 'good');
      sfx.impact();
      lunge(me, foe);
      if (c.steal && d) healOf(me, Math.round(d * c.steal));
    }
  } else {
    me.blind = false;
    log(ct('l_miss', { a: uName(me), r: ct(res) }), 'miss');
    sfx.deny();
  }
  drawBattle();
  await wait(750);
  BT.busy = false;
  endTurn();
}

// ---------- Robot : prend son jeton le plus fort, vise le plus faible en face, lance sa capacité si elle sert
async function botPlay() {
  if (BT.over) return;
  const mine = teamOf(1).filter(canAct), foes = teamOf(0).filter(alive);
  const me = [...mine].sort((a, b) => (b.cd === 0) - (a.cd === 0) || b.atk - a.atk)[0];
  const foe = [...foes].sort((a, b) => (a.hp + a.shield) - (b.hp + b.shield))[0];
  BT.sel = me.i; BT.tgt = foe.i; drawBattle();
  await wait(700);
  const heal = ['Soléo', 'Zénith'].includes(me.name);
  const useAbil = me.cd === 0 && (!heal || teamOf(1).some(u => alive(u) && u.hp < u.max * .65));
  playTurn(1, me.i, foe.i, useAbil, Math.random() < .5 ? 'pile' : 'face');
}

// ---------- Pièce : pile = côté pièce, face = côté Takoras. Truquée en debug (seulement pour tes paris)
function flipCoin(myGuess) {
  let res = Math.random() < .5 ? 'pile' : 'face';
  if (myGuess && DBG.rig === 'w') res = myGuess;
  if (myGuess && DBG.rig === 'l') res = myGuess === 'pile' ? 'face' : 'pile';
  const coin = $('bt-coin'), turns = 5 + Math.floor(Math.random() * 2);
  const end = turns * 360 + (res === 'pile' ? 180 : 0);
  sfx.whoosh?.();
  coin.classList.add('flipping');
  const a = coin.animate([
    { transform: `translateY(0) rotateX(0deg) scale(1)` },
    { transform: `translateY(-90px) rotateX(${end / 2}deg) scale(1.15)`, offset: .45 },
    { transform: `translateY(0) rotateX(${end}deg) scale(1)` },
  ], { duration: reducedFx() ? 300 : 1150, easing: 'cubic-bezier(.3,.7,.4,1)', fill: 'forwards' });
  return new Promise(r => {
    const done = () => {
      coin.classList.remove('flipping');
      coin.style.transform = `rotateX(${res === 'pile' ? 180 : 0}deg)`; a.cancel();
      $('bt-flip').textContent = ct(res).toUpperCase(); $('bt-flip').className = 'bt-flip on ' + res;
      sfx.next();
      setTimeout(() => { $('bt-flip').classList.remove('on'); }, 900);
      r(res);
    };
    Promise.race([a.finished, wait(1400)]).then(done, done);
  });
}
const wait = ms => new Promise(r => setTimeout(r, ms));

// =====================================================================
// Interface
// =====================================================================
function openBattle() {
  const b = $('battle');
  b.hidden = false;
  document.documentElement.classList.add('lock');
  requestAnimationFrame(() => b.classList.add('on'));
  $('bt-log').innerHTML = '';
  drawBattle();
}
function closeBattle() {
  const b = $('battle');
  b.classList.remove('on');
  document.documentElement.classList.remove('lock');
  setTimeout(() => { b.hidden = true; }, 350);
  BT = null;
  renderCombat();
}

function unitHTML(u) {
  const j = jetonOf(u.name), a = abilOf(u.name), [an] = abilText(u.name);
  const mySide = u.side === 0, myTurn = BT.turn === 0 && !BT.busy && !BT.over;
  const pickable = myTurn && mySide && canAct(u), targetable = myTurn && !mySide && alive(u) && BT.sel !== null;
  const cls = ['bu', alive(u) ? '' : 'ko', u.frozen ? 'frozen' : '', BT.sel === u.i && u.side === BT.turn ? 'sel' : '', BT.tgt === u.i && u.side !== BT.turn ? 'tgt' : '',
    pickable ? 'can' : '', targetable ? 'can aim' : ''].filter(Boolean).join(' ');
  const hp = u.hp / u.max * 100, sh = Math.min(100 - hp, u.shield / u.max * 100);
  const st = [u.shield ? `<span title="Bouclier">🛡️${u.shield}</span>` : '', u.frozen ? `<span>❄️</span>` : '', u.curse ? `<span>💜${u.curse}</span>` : '', u.dodge ? '<span>🌑</span>' : '',
    u.blind ? '<span>✨</span>' : '', u.rust ? `<span>🦠−${u.rust}</span>` : '', u.fury ? `<span>⚡+${u.fury}</span>` : ''].join('');
  return `<div class="${cls}" data-side="${u.side}" data-i="${u.i}" style="--g:${hexRGB(j.glow || '#ffffff')}">
    <div class="bu-fx" id="bufx-${u.side}-${u.i}"></div>
    <div class="bu-coin">${jetonHTML(j, 92)}</div>
    <div class="bu-name">${jnH(u.name)}</div>
    <div class="bu-hp"><i style="width:${hp}%"></i><s style="left:${hp}%;width:${sh}%"></s><b>${u.hp}<small>/${u.max}</small></b></div>
    <div class="bu-meta"><span>⚔️${u.atk}</span><span>🛡${u.def}</span>${st}</div>
    <div class="bu-abil${u.cd ? ' cd' : ''}" title="${esc(abilText(u.name)[1])}">${a.ico} ${esc(an)} <small>${u.cd ? ct('in_cd', { n: u.cd }) : ct('ready')}</small></div>
    ${alive(u) ? '' : `<div class="bu-ko">${ct('ko')}</div>`}
  </div>`;
}

function drawBattle() {
  if (!BT) return;
  $('bt-foes').innerHTML = teamOf(1).map(unitHTML).join('');
  $('bt-mine').innerHTML = teamOf(0).map(unitHTML).join('');
  const myTurn = BT.turn === 0 && !BT.busy && !BT.over;
  const me = BT.sel !== null ? teamOf(0)[BT.sel] : null;
  $('bt-step').textContent = BT.over ? '' : BT.turn === 1 ? ct('bot_turn') + '…' : BT.busy ? '' : BT.sel === null ? ct('step_pick') : BT.tgt === null ? ct('step_target') : ct('step_guess');
  $('battle').classList.toggle('their', BT.turn === 1);
  const bar = $('bt-actions');
  if (!myTurn || !me || BT.tgt === null) { bar.classList.remove('on'); return; }
  const a = abilOf(me.name), [an, ad] = abilText(me.name);
  bar.classList.add('on');
  bar.innerHTML = `
    <button class="bt-abil${BT.abil ? ' on' : ''}" id="bt-abil" ${me.cd ? 'disabled' : ''} title="${esc(ad)}">
      <span class="bt-abil-ico">${a.ico}</span><span><b>${esc(an)}</b><small>${me.cd ? ct('in_cd', { n: me.cd }) : BT.abil ? ct('abil_on') : esc(ad)}</small></span>
    </button>
    <div class="bt-guess"><button data-g="pile"><img src="img/piece.png" alt="">${ct('pile')}</button><button data-g="face"><img src="img/jetons/takoras.png" alt="">${ct('face')}</button></div>`;
}

function log(text, kind = '') {
  if (!BT) return;
  const box = $('bt-log');
  const d = document.createElement('div');
  d.className = 'bl ' + kind; d.textContent = text;
  box.prepend(d);
  while (box.children.length > 40) box.lastChild.remove();
}
function banner(text, side) {
  const b = $('bt-banner');
  b.textContent = text; b.className = 'bt-banner on ' + (side ? 'bad' : 'good');
  clearTimeout(banner.t); banner.t = setTimeout(() => b.classList.remove('on'), 1100);
}
// Chiffre qui monte au-dessus d'un jeton (dégâts, soin, bouclier) + petite secousse
function fxOn(u, kind, text) {
  requestAnimationFrame(() => {
    const host = document.querySelector(`.bu[data-side="${u.side}"][data-i="${u.i}"]`);
    if (!host) return;
    const n = document.createElement('span');
    n.className = 'bu-num ' + kind; n.textContent = text;
    host.appendChild(n);
    setTimeout(() => n.remove(), 1200);
    if (kind === 'hit') host.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-8px) rotate(-2deg)' }, { transform: 'translateX(8px) rotate(2deg)' }, { transform: 'translateX(0)' }], { duration: 320 });
  });
}
function castFx(u) {
  const host = document.querySelector(`.bu[data-side="${u.side}"][data-i="${u.i}"]`);
  host?.animate([{ boxShadow: '0 0 0 0 rgba(var(--g), .0)' }, { boxShadow: '0 0 0 10px rgba(var(--g), .45)' }, { boxShadow: '0 0 0 0 rgba(var(--g), 0)' }], { duration: 600 });
}
function lunge(me, foe) {
  const host = document.querySelector(`.bu[data-side="${me.side}"][data-i="${me.i}"]`);
  host?.animate([{ transform: 'none' }, { transform: `translateY(${me.side ? 26 : -26}px) scale(1.04)` }, { transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.3,1.4,.5,1)' });
}

function showEnd(won) {
  const o = $('bt-end');
  o.innerHTML = `<div class="bt-end-card ${won ? 'win' : 'lose'}"><h2>${ct(won ? 'win' : 'lose')}</h2>
    <div class="bt-end-row">${teamOf(0).map(u => `<div class="${alive(u) ? '' : 'ko'}">${jetonHTML(jetonOf(u.name), 56)}<small>${u.hp}/${u.max}</small></div>`).join('')}</div>
    <div class="bt-end-btns"><button class="btn primary" id="bt-again">${ct('again')}</button><button class="btn ghost" id="bt-menu">${ct('menu')}</button></div></div>`;
  o.hidden = false;
  if (won) sfx.reveal?.(10000); else sfx.deny();
}

// Clics dans l'arène : mon jeton → cible → (capacité) → pile / face
$('battle').addEventListener('click', e => {
  if (!BT) return;
  if (e.target.closest('#bt-again')) { $('bt-end').hidden = true; return startBattle(BT.teams[0].map(u => jetonOf(u.name))); }
  if (e.target.closest('#bt-menu')) { $('bt-end').hidden = true; return closeBattle(); }
  if (e.target.closest('#bt-quit')) { if (BT.over || confirm(ct('quit_q'))) { BT.over = true; closeBattle(); } return; }
  if (e.target.closest('#bt-logbtn')) return $('bt-log').classList.toggle('open');
  if (BT.turn !== 0 || BT.busy || BT.over) return;
  const u = e.target.closest('.bu.can');
  if (u) {
    sfx.click();
    if (+u.dataset.side === 0) { BT.sel = +u.dataset.i; BT.abil = false; }
    else BT.tgt = +u.dataset.i;
    return drawBattle();
  }
  if (e.target.closest('#bt-abil')) { BT.abil = !BT.abil; sfx.click(); return drawBattle(); }
  const g = e.target.closest('[data-g]');
  if (g && BT.sel !== null && BT.tgt !== null) { $('bt-actions').classList.remove('on'); playTurn(0, BT.sel, BT.tgt, BT.abil, g.dataset.g); }
});

// =====================================================================
// Menu combat (page #combat) : deck, lancer un combat, debug, liste des capacités
// =====================================================================
let DECK = [];
async function loadDeck() {
  const { data } = await sb.rpc('my_deck');
  DECK = Array.from({ length: 3 }, (_, i) => (data || [])[i] || null);
}
async function saveDeck() {
  const { error } = await sb.rpc('set_deck', { ids: DECK.map(d => d?.id).filter(Boolean) });
  if (error) toast(errText(error), true);
  await loadDeck();
  renderCombat();
}

async function renderCombat() {
  const page = $('page-combat');
  if (!ACC.isAdmin) { page.innerHTML = `<div class="page-empty"><p class="muted">⚔️ ${t('soon_combat')}</p></div>`; return; }
  await loadDeck();
  const full = DECK.every(Boolean);
  page.innerHTML = `
    <div class="cb-page">
      <div class="page-head"><div><div class="eyebrow">${ct('beta')}</div><h2 class="page-title">${ct('title')}</h2></div></div>
      <section class="cb-deck">
        <h3 class="shop-h">🃏 ${ct('deck')} <small class="muted">${DECK.filter(Boolean).length}/3</small></h3>
        <p class="muted small">${ct('deck_hint')}</p>
        <div class="cb-slots">${DECK.map((d, i) => {
          if (!d) return `<button class="cb-slot empty" data-slot="${i}"><span>+</span><small>${ct('slot_empty')}</small></button>`;
          const j = jetonOf(d.jeton), s = statsOf(j.name, j.odds), a = abilOf(j.name), [an, ad] = abilText(j.name);
          return `<button class="cb-slot" data-slot="${i}" style="--g:${hexRGB(j.glow)}">
            <div class="cb-coin">${jetonHTML(j, 96)}</div><b>${jnH(j.name)}</b><small class="t-${tierKey(j.odds)}">1/${fmt(j.odds)}</small>
            <div class="cb-stats"><span>❤️ ${s.s_hp}</span><span>⚔️ ${s.s_atk}</span><span>🛡 ${s.s_def}</span><span>💨 ${s.s_spd}</span></div>
            <div class="cb-abil"><b>${a.ico} ${esc(an)}</b><p>${esc(ad)}</p><small class="muted">${ct('cd', { n: a.cd })}</small></div>
          </button>`;
        }).join('')}</div>
        <div class="cb-go">
          <button class="btn primary cb-fight" id="cb-fight" ${full ? '' : 'disabled'}>${ct('fight_bot')}</button>
          <button class="btn ghost" disabled>${ct('queue')} · ${ct('soon')}</button>
          ${full ? '' : `<small class="muted">${ct('need3')}</small>`}
        </div>
      </section>
      <section class="ad-box cb-debug">
        <h4>🛠️ ${ct('debug')}</h4>
        <div class="cb-dbg-row"><span>${ct('bot_deck')}</span>${DBG.botDeck.map((n, i) => `<select class="adm-in" data-bot="${i}"><option value="">🎲 ${ct('random')}</option>${SERIES.Takoras.map(j => `<option value="${esc(j.name)}"${n === j.name ? ' selected' : ''}>${esc(jn(j.name))} · 1/${fmt(j.odds)}</option>`).join('')}</select>`).join('')}</div>
        <div class="cb-dbg-row"><span>${ct('rig')}</span><div class="seg">${['n', 'w', 'l'].map(k => `<button data-rig="${k}" class="${DBG.rig === k ? 'on' : ''}">${ct('rig_' + k)}</button>`).join('')}</div></div>
      </section>
      <section>
        <h3 class="shop-h">📖 ${ct('codex')}</h3>
        <div class="cb-codex">${SERIES.Takoras.map(j => { const a = abilOf(j.name), [an, ad] = abilText(j.name); return `<div class="cb-cx" style="--g:${hexRGB(j.glow)}"><img src="${texOf(j)}" alt=""><div><b>${jnH(j.name)} · ${a.ico} ${esc(an)}</b><p class="muted">${esc(ad)} <small>(${ct('cd', { n: a.cd })})</small></p></div></div>`; }).join('')}</div>
      </section>
    </div>`;
}
$('page-combat').addEventListener('click', async e => {
  const s = e.target.closest('[data-slot]'); if (s) return pickDeck(+s.dataset.slot);
  const r = e.target.closest('[data-rig]'); if (r) { DBG.rig = r.dataset.rig; sfx.click(); return renderCombat(); }
  if (e.target.closest('#cb-fight')) { sfx.click(); startBattle(DECK.map(d => jetonOf(d.jeton))); }
});
$('page-combat').addEventListener('change', e => { const b = e.target.closest('[data-bot]'); if (b) DBG.botDeck[+b.dataset.bot] = b.value; });

// Choisir le jeton d'une case du deck (même fenêtre que la vitrine)
async function pickDeck(slot) {
  await loadInventory();
  const st = { q: '' }, card = $('jm-card');
  jm.style.setProperty('--g', '139, 92, 246');
  card.onclick = card.oninput = card.onchange = null;
  const draw = () => {
    const used = new Set(DECK.filter(Boolean).map(d => d.id));
    const l = INV.groups.filter(x => jn(x.name).toLowerCase().includes(st.q)).sort((a, b) => b.odds - a.odds);
    card.querySelector('.pk-list').innerHTML = l.map(x => {
      const j = jetonOf(x.name), id = x.ids.find(i => !used.has(i)), a = abilOf(x.name);
      return `<button class="pk${id ? '' : ' off'}" data-id="${id || ''}" data-n="${esc(x.name)}" data-o="${x.odds}" style="--g:${hexRGB(j.glow)}"><img src="${texOf(j)}" alt=""><b>${jnH(x.name)}</b><small>${a.ico} ${esc(abilText(x.name)[0])}</small></button>`;
    }).join('') || `<p class="muted">${t('inv_empty')}</p>`;
  };
  card.innerHTML = `
    <button class="set-close jm-close" aria-label="${t('close')}">✕</button>
    <div class="pk-wrap">
      <h2>${ct('pick_title', { n: slot + 1 })}</h2>
      <div class="pk-tools"><input class="adm-in" id="pk-q" placeholder="${t('search')}"></div>
      <div class="pk-list"></div>
      ${DECK[slot] ? `<button class="btn ghost" id="pk-remove">${ct('pick_remove')}</button>` : ''}
    </div>`;
  draw();
  jm.classList.add('on');
  card.oninput = e => { if (e.target.id === 'pk-q') { st.q = e.target.value.trim().toLowerCase(); draw(); } };
  card.onclick = async e => {
    const b = e.target.closest('.pk'), rm = e.target.closest('#pk-remove');
    if (!b && !rm) return;
    if (b && !b.dataset.id) return;
    DECK[slot] = rm ? null : { id: +b.dataset.id, jeton: b.dataset.n, odds: +b.dataset.o };
    jm.classList.remove('on'); sfx.click();
    saveDeck();
  };
}
