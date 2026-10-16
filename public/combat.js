// Combat : un deck de 3 jetons, du tour par tour contre un ami (en ligne) ou contre le robot (pour s'entraîner).
// À ton tour : tu choisis un de tes jetons, la cible en face, tu peux lancer sa capacité (si elle est rechargée,
// elle réussit toujours), puis tu attaques : 15 % de chance de rater, 15 % de coup critique (×1,5).
// Chaque attaque a son animation en particules pixel art (couleur du jeton), chaque capacité a la sienne.

// Tout est dans une fonction pour ne pas écraser les effets de l'ouverture (burst, flash, shake… existent déjà)
(() => {
const CT = {
  fr: {
    title: 'Combat', beta: 'Arène', you: 'Toi', bot: 'Robot', deck: 'Ton deck', deck_hint: 'Choisis 3 jetons : ils restent dans ton deck pour tous tes combats (et ne peuvent pas être vendus).',
    slot_empty: 'Choisir un jeton', fight_bot: '⚔️ Combattre le robot', queue: '🌐 Chercher un joueur', soon: 'bientôt', need3: 'Il te faut 3 jetons dans ton deck',
    pick_title: 'Deck · case {n}', pick_remove: 'Retirer de la case', debug: 'Debug robot', bot_deck: 'Deck du robot', random: 'Au hasard', rig: 'Tes attaques', rig_n: 'Normal', rig_c: 'Toujours critique', rig_m: 'Toujours ratées',
    cd: 'recharge {n} tour(s)', ready: 'Prête', in_cd: 'Prête dans {n} tour(s)',
    your_turn: 'À toi de jouer', bot_turn: 'Tour du robot', step_pick: 'Choisis un de tes jetons', step_target: 'Choisis ta cible', step_go: 'Attaque !', thinking: 'Le robot réfléchit…',
    attack: 'Attaquer', abil_use: 'Utiliser la capacité', abil_on: 'Activée', ko: 'K.O.', turn: 'Tour {n}', crit: 'CRITIQUE !', miss: 'RATÉ',
    win: 'Victoire !', lose: 'Défaite…', again: 'Rejouer', menu: 'Menu combat', quit_q: 'Abandonner le combat ?',
    l_start_0: 'Tu commences !', l_start_1: 'Le robot commence !', l_hit: '{a} frappe {t} : −{d}', l_crit: '{a} : coup critique sur {t} ! −{d}', l_miss: '{a} rate son attaque', l_ko: '{t} est K.O. !',
    l_skip_0: 'Tu ne peux pas jouer (tout est gelé)', l_skip_1: 'Le robot ne peut pas jouer (tout est gelé)', l_curse: '{t} subit la malédiction : −{d}', l_dodge: '{t} esquive !',
    hp: 'PV', atk: 'Attaque', def: 'Défense', spd: 'Vitesse', effects: 'Effets', no_fx: 'Aucun effet', mine: 'Ton jeton', theirs: 'Jeton de {n}', ability: 'Capacité',
    st_shield: 'Bouclier', st_shield_d: 'Absorbe {n} dégâts avant les PV.', st_frozen: 'Gelé', st_frozen_d: 'Ne peut pas jouer ce tour-ci.', st_curse: 'Maudit', st_curse_d: 'Perd 12 PV au début de ses {n} prochains tours.',
    st_dodge: 'Ombre', st_dodge_d: 'Esquive la prochaine attaque.', st_blind: 'Aveuglé', st_blind_d: 'Sa prochaine attaque fait moitié moins de dégâts.',
    l_start_me: 'Tu commences !', l_start_them: '{n} commence !', their_turn: 'Tour de {n}', waiting: '{n} réfléchit…', l_skip_me: 'Tu ne peux pas jouer (tout est gelé)', l_skip_them: '{n} ne peut pas jouer (tout est gelé)',
    l_timeout: '{n} n’a pas joué à temps ({k}/3)', timeout: 'Temps écoulé !', l_forfeit: '{n} abandonne', l_afk: '{n} est parti (3 tours sans jouer)', vs: 'contre {n}', rematch: 'Revanche',
    wait_for: 'En attente de <b>{n}</b>…', no_answer: 'Pas de réponse', challenges_you: 'te défie en combat !', decline: 'Refuser', accept_fight: 'Accepter', declined: '{n} a refusé le combat',
    wins: 'victoires', losses: 'défaites', vs_friend: 'Défier un ami', challenge: 'Défier', no_friends: 'Ajoute des amis pour les défier !', vs_bot: 'Entraînement', bot_hint: 'Affronte le robot pour tester ton deck (ne compte pas dans tes victoires).',
    st_rust: 'Rouillé', st_rust_d: '−{n} de défense pour le combat.', st_fury: 'Furieux', st_fury_d: '+{n} d’attaque pour le combat.',
  },
  en: {
    title: 'Battle', beta: 'Arena', you: 'You', bot: 'Bot', deck: 'Your deck', deck_hint: 'Pick 3 tokens: they stay in your deck for all your battles (and can’t be sold).',
    slot_empty: 'Pick a token', fight_bot: '⚔️ Fight the bot', queue: '🌐 Find a player', soon: 'soon', need3: 'You need 3 tokens in your deck',
    pick_title: 'Deck · slot {n}', pick_remove: 'Clear slot', debug: 'Bot debug', bot_deck: 'Bot deck', random: 'Random', rig: 'Your attacks', rig_n: 'Normal', rig_c: 'Always crit', rig_m: 'Always miss',
    cd: 'cooldown {n} turn(s)', ready: 'Ready', in_cd: 'Ready in {n} turn(s)',
    your_turn: 'Your turn', bot_turn: 'Bot’s turn', step_pick: 'Pick one of your tokens', step_target: 'Pick your target', step_go: 'Attack!', thinking: 'The bot is thinking…',
    attack: 'Attack', abil_use: 'Use ability', abil_on: 'On', ko: 'K.O.', turn: 'Turn {n}', crit: 'CRITICAL!', miss: 'MISS',
    win: 'Victory!', lose: 'Defeat…', again: 'Play again', menu: 'Battle menu', quit_q: 'Give up this battle?',
    l_start_0: 'You go first!', l_start_1: 'The bot goes first!', l_hit: '{a} hits {t}: −{d}', l_crit: '{a}: critical hit on {t}! −{d}', l_miss: '{a} misses', l_ko: '{t} is K.O.!',
    l_skip_0: 'You can’t play (everything is frozen)', l_skip_1: 'The bot can’t play (everything is frozen)', l_curse: '{t} suffers the curse: −{d}', l_dodge: '{t} dodges!',
    hp: 'HP', atk: 'Attack', def: 'Defense', spd: 'Speed', effects: 'Effects', no_fx: 'No effects', mine: 'Your token', theirs: '{n}’s token', ability: 'Ability',
    st_shield: 'Shield', st_shield_d: 'Absorbs {n} damage before HP.', st_frozen: 'Frozen', st_frozen_d: 'Can’t play this turn.', st_curse: 'Cursed', st_curse_d: 'Loses 12 HP at the start of its next {n} turns.',
    st_dodge: 'Shadow', st_dodge_d: 'Dodges the next attack.', st_blind: 'Blinded', st_blind_d: 'Its next attack deals half damage.',
    l_start_me: 'You go first!', l_start_them: '{n} goes first!', their_turn: '{n}’s turn', waiting: '{n} is thinking…', l_skip_me: 'You can’t play (everything is frozen)', l_skip_them: '{n} can’t play (everything is frozen)',
    l_timeout: '{n} didn’t play in time ({k}/3)', timeout: 'Time’s up!', l_forfeit: '{n} gives up', l_afk: '{n} left (3 turns without playing)', vs: 'vs {n}', rematch: 'Rematch',
    wait_for: 'Waiting for <b>{n}</b>…', no_answer: 'No answer', challenges_you: 'challenges you to a battle!', decline: 'Decline', accept_fight: 'Accept', declined: '{n} declined the battle',
    wins: 'wins', losses: 'losses', vs_friend: 'Challenge a friend', challenge: 'Challenge', no_friends: 'Add friends to challenge them!', vs_bot: 'Training', bot_hint: 'Fight the bot to test your deck (doesn’t count in your wins).',
    st_rust: 'Rusted', st_rust_d: '−{n} defense for the battle.', st_fury: 'Furious', st_fury_d: '+{n} attack for the battle.',
  },
};
const ct = (k, v = {}) => { let s = (CT[SETTINGS.lang] || CT.fr)[k] ?? CT.fr[k] ?? k; for (const x in v) s = s.replace('{' + x + '}', v[x]); return s; };
const wait = ms => new Promise(r => setTimeout(r, ms));

// =====================================================================
// Particules pixel art (un canvas plein écran au-dessus de l'arène)
// =====================================================================
const PX = { parts: [], raf: 0, last: 0 };
function pxCanvas() {
  const c = $('bt-fx'), d = devicePixelRatio || 1;
  if (c.width !== innerWidth * d || c.height !== innerHeight * d) { c.width = innerWidth * d; c.height = innerHeight * d; }
  const x = c.getContext('2d'); x.setTransform(d, 0, 0, d, 0, 0); x.imageSmoothingEnabled = false;
  return x;
}
function pxLoop(now) {
  const dt = Math.min(50, now - (PX.last || now)); PX.last = now;
  const x = pxCanvas();
  x.clearRect(0, 0, innerWidth, innerHeight);
  PX.parts = PX.parts.filter(p => {
    if (p.delay > 0) { p.delay -= dt; return true; }
    p.age += dt;
    if (p.age >= p.life) return false;
    const k = dt / 16;
    if (p.home) { p.vx += (p.home.x - p.x) * p.pull * k; p.vy += (p.home.y - p.y) * p.pull * k; }
    p.vx *= Math.pow(p.drag, k); p.vy *= Math.pow(p.drag, k);
    p.vy += p.grav * k;
    p.x += p.vx * k; p.y += p.vy * k;
    const t = p.age / p.life, s = Math.max(1, Math.round(p.size * (p.shrink ? 1 - t * .7 : 1)));
    x.globalAlpha = p.fade ? Math.min(1, (1 - t) * 1.6) : 1;
    x.fillStyle = p.color;
    x.fillRect(Math.round(p.x - s / 2), Math.round(p.y - s / 2), s, s);
    return true;
  });
  x.globalAlpha = 1;
  PX.raf = PX.parts.length ? requestAnimationFrame(pxLoop) : 0;
  if (!PX.raf) PX.last = 0;
}
function emit(o) {
  if (reducedFx() && Math.random() < .6) return; // effets réduits : moins de particules
  PX.parts.push({ x: 0, y: 0, vx: 0, vy: 0, grav: 0, drag: .94, size: 4, life: 700, age: 0, delay: 0, fade: true, shrink: true, pull: 0, ...o });
  if (!PX.raf) PX.raf = requestAnimationFrame(pxLoop);
}
// Couleurs : la couleur du jeton, plus claire / plus foncée
const mix = (hex, to, k) => { const a = hexRGB(hex).split(', ').map(Number), b = hexRGB(to).split(', ').map(Number); return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(',')})`; };
const shades = hex => [hex, mix(hex, '#ffffff', .55), mix(hex, '#ffffff', .85), mix(hex, '#000000', .35)];
const pick = a => a[Math.floor(Math.random() * a.length)];
const rnd = (a, b) => a + Math.random() * (b - a);

// Briques d'effets
function burst(p, col, n = 24, sp = 6, size = 5, life = 650) {
  const c = shades(col);
  for (let i = 0; i < n; i++) { const a = rnd(0, Math.PI * 2), v = rnd(sp * .3, sp); emit({ x: p.x, y: p.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, size: rnd(size * .5, size), color: pick(c), life: rnd(life * .6, life), drag: .9 }); }
}
function ring(p, col, r = 70, n = 36, inward = false, life = 700) {
  const c = shades(col);
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2, x = p.x + Math.cos(a) * (inward ? r : 6), y = p.y + Math.sin(a) * (inward ? r : 6), v = (inward ? -1 : 1) * r / 14;
    emit({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, size: 4, color: pick(c), life, drag: .86 });
  }
}
function rise(p, col, n = 30, w = 70, life = 1100) {
  const c = shades(col);
  for (let i = 0; i < n; i++) emit({ x: p.x + rnd(-w / 2, w / 2), y: p.y + rnd(0, 40), vx: rnd(-.3, .3), vy: rnd(-3, -1), size: rnd(3, 5), color: pick(c), life: rnd(life * .5, life), drag: .98, delay: rnd(0, 300) });
}
function rain(p, col, n = 30, w = 80, life = 600) {
  const c = shades(col);
  for (let i = 0; i < n; i++) emit({ x: p.x + rnd(-w / 2, w / 2), y: p.y - rnd(120, 220), vx: 0, vy: rnd(7, 11), size: rnd(3, 5), color: pick(c), life, drag: 1, delay: rnd(0, 350), shrink: false });
}
function beam(p, col, w = 34, life = 900) {
  const c = shades(col);
  for (let y = -innerHeight; y < p.y + 20; y += 8) for (let k = 0; k < 2; k++) emit({ x: p.x + rnd(-w / 2, w / 2), y, vx: 0, vy: rnd(-.5, .5), size: rnd(4, 7), color: pick(c), life: rnd(life * .5, life), drag: .9, delay: Math.max(0, (y + innerHeight) / 40) });
}
function spiral(p, col, r = 80, n = 40, life = 900) {
  const c = shades(col);
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 4, d = r * (1 - i / n * .4); emit({ x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d, vx: -Math.sin(a) * 3, vy: Math.cos(a) * 3, home: p, pull: .012, size: 4, color: pick(c), life, drag: .95, delay: i * 12 }); }
}
function bolt(a, b, col, life = 450) {
  const c = shades(col), segs = 9; let px = a.x, py = a.y;
  for (let i = 1; i <= segs; i++) {
    const t = i / segs, x = a.x + (b.x - a.x) * t + (i < segs ? rnd(-26, 26) : 0), y = a.y + (b.y - a.y) * t + (i < segs ? rnd(-12, 12) : 0);
    const steps = Math.ceil(Math.hypot(x - px, y - py) / 5);
    for (let s = 0; s < steps; s++) emit({ x: px + (x - px) * s / steps, y: py + (y - py) * s / steps, size: 5, color: s % 3 ? c[2] : c[0], life, drag: 1, shrink: false });
    px = x; py = y;
  }
}
// Projectile : une boule de pixels qui file de a à b en laissant une traînée. Résout à l'arrivée.
function shoot(a, b, col, ms = 380, size = 9, arc = 40) {
  const c = shades(col), t0 = performance.now();
  // sécurité : si l'onglet est en arrière-plan, le navigateur ne dessine plus d'images → on termine quand même à l'heure
  return Promise.race([wait(ms + 150), new Promise(res => {
    const step = now => {
      const t = Math.min(1, (now - t0) / ms), e = t * t * (3 - 2 * t);
      const x = a.x + (b.x - a.x) * e, y = a.y + (b.y - a.y) * e - Math.sin(t * Math.PI) * arc;
      emit({ x, y, size, color: c[2], life: 90, drag: 1, fade: false, shrink: false });
      for (let i = 0; i < 3; i++) emit({ x: x + rnd(-4, 4), y: y + rnd(-4, 4), vx: rnd(-1, 1), vy: rnd(-1, 1), size: rnd(3, 6), color: pick(c), life: rnd(250, 450) });
      if (t < 1) requestAnimationFrame(step); else res();
    };
    requestAnimationFrame(step);
  })]);
}
// Vague horizontale sur toute une rangée
function wave(row, col, life = 900) {
  const c = shades(col), y = row.y, w = innerWidth;
  for (let i = 0; i < 70; i++) emit({ x: -20, y: y + rnd(-50, 50), vx: rnd(14, 20), vy: rnd(-1, 1), size: rnd(4, 7), color: pick(c), life, drag: .99, delay: rnd(0, 250), shrink: false });
}

// =====================================================================
// Capacités : une par jeton, chacune avec son animation (fx) puis son effet (run)
// c.me, c.foe, c.allies, c.enemies ; peut modifier l'attaque de ce tour (c.mult, c.steal, c.sure, c.critBoost)
// =====================================================================
const ABIL = {
  'Mobu': { cd: 2, fr: ['Carapace', 'Se donne un bouclier de 35.'], en: ['Shell', 'Gains a 35 shield.'],
    fx: async c => { const p = pos(c.me); ring(p, '#7dd3fc', 80, 40, true); await wait(350); burst(p, '#bae6fd', 20, 4); }, run: c => shieldOf(c.me, 35) },
  'Pikko': { cd: 2, fr: ['Piqûre', 'Cette attaque fait ×1,5 dégâts.'], en: ['Sting', 'This attack deals ×1.5 damage.'],
    fx: async c => { const p = pos(c.me); for (let i = 0; i < 3; i++) { emit({ x: p.x, y: p.y, vx: 0, vy: -9, size: 6, color: '#f0a3b0', life: 300, drag: 1 }); } burst(p, '#f0a3b0', 18, 5, 4); await wait(300); }, run: c => { c.mult *= 1.5; } },
  'Rouillé': { cd: 3, fr: ['Rouille', 'La cible perd 4 de défense pour tout le combat.'], en: ['Rust', 'Target loses 4 defense for the whole battle.'],
    fx: async c => { const p = pos(c.foe); await shoot(pos(c.me), p, '#d2603a', 420, 7); for (let i = 0; i < 28; i++) emit({ x: p.x + rnd(-40, 40), y: p.y + rnd(-40, 10), vx: 0, vy: rnd(.5, 2), grav: .08, size: rnd(3, 5), color: pick(['#9a3412', '#c2410c', '#fdba74']), life: 900, drag: .98, delay: rnd(0, 300) }); await wait(400); },
    run: c => { c.foe.def = Math.max(0, c.foe.def - 4); c.foe.rust = (c.foe.rust || 0) + 4; } },
  'Givre': { cd: 3, fr: ['Gel', 'La cible est gelée : elle ne pourra pas jouer au prochain tour.'], en: ['Freeze', 'Target is frozen: it can’t play next turn.'],
    fx: async c => { const a = pos(c.me), b = pos(c.foe); for (let i = 0; i < 5; i++) { shoot(a, { x: b.x + rnd(-20, 20), y: b.y + rnd(-20, 20) }, '#bae6fd', 360 + i * 40, 5, rnd(10, 60)); } await wait(520); ring(b, '#e0f2fe', 70, 36); burst(b, '#7dd3fc', 26, 5); },
    run: c => { c.foe.frozen = true; } },
  'Soléo': { cd: 3, fr: ['Soin solaire', 'Soigne de 40 l’allié le plus blessé.'], en: ['Solar heal', 'Heals the most hurt ally by 40.'],
    fx: async c => { c.heal = c.heal || weakest(c.allies); const p = pos(c.heal); beam(p, '#fcd34d', 40, 800); await wait(500); rise(p, '#fde68a', 34); }, run: c => healOf(c.heal, 40) },
  'Azura': { cd: 3, fr: ['Raz-de-marée', '12 dégâts à tous les ennemis (même avec bouclier).'], en: ['Tidal wave', '12 damage to every enemy (even shielded).'],
    fx: async c => { wave(pos(c.foe), '#3b82f6'); await wait(650); c.enemies.filter(alive).forEach(e => burst(pos(e), '#93c5fd', 14, 4)); shake(6); }, run: c => c.enemies.forEach(e => hurt(e, 12, true)) },
  'Carmin': { cd: 2, fr: ['Saignée', 'Cette attaque te soigne de 60 % des dégâts.'], en: ['Bloodletting', 'This attack heals you for 60% of the damage.'],
    fx: async c => { spiral(pos(c.me), '#d0408f', 70, 36, 800); await wait(500); }, run: c => { c.steal = .6; } },
  'Vyolis': { cd: 3, fr: ['Barrière', 'Bouclier de 20 sur tous tes jetons.'], en: ['Barrier', '20 shield on all your tokens.'],
    fx: async c => { const p = pos(c.me); ring(p, '#a78bfa', 20, 30); await wait(250); c.allies.filter(alive).forEach(a => ring(pos(a), '#c4b5fd', 70, 30, true)); await wait(350); }, run: c => c.allies.forEach(a => shieldOf(a, 20)) },
  'Lumis': { cd: 3, fr: ['Aveuglement', 'La prochaine attaque de la cible fait moitié moins de dégâts.'], en: ['Blind', 'Target’s next attack deals half damage.'],
    fx: async c => { const b = pos(c.foe); await shoot(pos(c.me), b, '#fef9c3', 300, 8, 20); flash(.5); burst(b, '#ffffff', 40, 7, 5, 800); }, run: c => { c.foe.blind = true; } },
  'Nyx': { cd: 3, fr: ['Ombre', 'Esquive la prochaine attaque reçue.'], en: ['Shadow', 'Dodges the next attack received.'],
    fx: async c => { const p = pos(c.me); for (let i = 0; i < 40; i++) emit({ x: p.x + rnd(-45, 45), y: p.y + rnd(-20, 45), vx: rnd(-.5, .5), vy: rnd(-2, -.5), size: rnd(4, 8), color: pick(['#1e1b4b', '#312e81', '#4c1d95', '#0f0a1e']), life: 1000, drag: .98, delay: rnd(0, 300) }); await wait(600); },
    run: c => { c.me.dodge = true; } },
  'Astra': { cd: 3, fr: ['Étoile filante', 'Cette attaque ne peut pas rater et a 50 % de chance d’être critique.'], en: ['Shooting star', 'This attack can’t miss and has a 50% crit chance.'],
    fx: async c => { const b = pos(c.foe); await shoot({ x: b.x - 260, y: -40 }, b, '#e0e7ff', 500, 10, 0); burst(b, '#c7d2fe', 30, 6); }, run: c => { c.sure = true; c.critBoost = .5; } },
  'Kraïos': { cd: 3, fr: ['Fureur', '+6 d’attaque pour tout le combat.'], en: ['Fury', '+6 attack for the whole battle.'],
    fx: async c => { const p = pos(c.me); for (let i = 0; i < 3; i++) { bolt({ x: p.x + rnd(-30, 30), y: p.y - 260 }, p, '#facc15'); await wait(110); } burst(p, '#fde047', 30, 6); shake(5); },
    run: c => { c.me.atk += 6; c.me.fury = (c.me.fury || 0) + 6; } },
  'Chronos': { cd: 4, fr: ['Distorsion', 'Recharge les capacités de tes alliés et cette attaque fait ×1,25.'], en: ['Distortion', 'Recharges your allies’ abilities and this attack deals ×1.25.'],
    fx: async c => { c.allies.filter(alive).forEach(a => spiral(pos(a), '#facc15', 70, 30, 800)); await wait(600); }, run: c => { c.allies.forEach(a => { if (a !== c.me) a.cd = 0; }); c.mult *= 1.25; } },
  'Néphéris': { cd: 3, fr: ['Malédiction', 'La cible perd 12 PV au début de ses 3 prochains tours.'], en: ['Curse', 'Target loses 12 HP at the start of its next 3 turns.'],
    fx: async c => { const b = pos(c.foe); await shoot(pos(c.me), b, '#f0abfc', 450, 8, 70); spiral(b, '#c026d3', 75, 40, 900); await wait(400); }, run: c => { c.foe.curse = 3; } },
  'Zénith': { cd: 3, fr: ['Aube', 'Soigne tous tes jetons de 22.'], en: ['Dawn', 'Heals all your tokens by 22.'],
    fx: async c => { c.allies.filter(alive).forEach(a => beam(pos(a), '#f8fafc', 30, 700)); await wait(450); c.allies.filter(alive).forEach(a => rise(pos(a), '#fef3c7', 20)); }, run: c => c.allies.forEach(a => healOf(a, 22)) },
  'Oblivion': { cd: 3, fr: ['Néant', '30 dégâts sûrs à la cible (ignore le bouclier).'], en: ['Void', '30 sure damage to the target (ignores shield).'],
    fx: async c => { const b = pos(c.foe); for (let i = 0; i < 50; i++) { const a = rnd(0, 7), d = rnd(70, 130); emit({ x: b.x + Math.cos(a) * d, y: b.y + Math.sin(a) * d, home: b, pull: .02, size: rnd(3, 6), color: pick(['#fb7185', '#0b0710', '#4c0519', '#1f0a14']), life: 800, drag: .9, delay: rnd(0, 250) }); } await wait(700); flash(.35, '#000'); burst(b, '#fb7185', 30, 7); shake(8); },
    run: c => hurt(c.foe, 30, true) },
  'Takoras': { cd: 3, fr: ['Jugement', 'Cette attaque fait ×2 dégâts et te donne un bouclier de 25.'], en: ['Judgment', 'This attack deals ×2 damage and gives you a 25 shield.'],
    fx: async c => { const p = pos(c.me); beam(p, '#ffffff', 60, 1000); ring(p, '#fef3c7', 30, 40); await wait(550); flash(.6); ring(p, '#ffffff', 90, 48, true); await wait(300); }, run: c => { c.mult *= 2; shieldOf(c.me, 25); } },
};
const abilOf = name => ABIL[name] || ABIL.Mobu;
const abilText = name => { const a = abilOf(name); return a[SETTINGS.lang] || a.fr; };

// ---------- Icônes d'effets en pixel art (dessinées ici)
const ST_ICONS = {
  shield: [['.kkkkk.', 'kbbwbbk', 'kbwbbbk', 'kbbbbbk', '.kbbbk.', '..kbk..', '...k...'], { k: '#0c1a2e', b: '#60a5fa', w: '#e0f2fe' }],
  frozen: [['...w...', '.w.w.w.', '..www..', 'wwwcwww', '..www..', '.w.w.w.', '...w...'], { w: '#7dd3fc', c: '#ffffff' }],
  curse: [['.ppppp.', 'ppppppp', 'pkpppkp', 'ppppppp', '.ppkpp.', '.p.p.p.', '.......'], { p: '#e879f9', k: '#3b0764' }],
  dodge: [['..mmm..', '.mm....', 'mm.....', 'mm.....', 'mm.....', '.mm....', '..mmm..'], { m: '#a5b4fc' }],
  blind: [['.......', '..yyy..', '.y.k.y.', 'y.kkk.y', '.y.k.y.', '..yyy..', '.......'], { y: '#fde68a', k: '#92400e' }],
  rust: [['...r...', '..rrr..', '.rrrrr.', 'rrrorrr', 'rrooorr', '.rrrrr.', '..rrr..'], { r: '#c2410c', o: '#fdba74' }],
  fury: [['....yy.', '...yy..', '..yy...', '.yyyyy.', '...yy..', '..yy...', '.yy....'], { y: '#facc15' }],
};
const stIcon = k => (stIcon.c ||= {})[k] ||= pixelArt(...ST_ICONS[k], 3);
function statusesOf(u) {
  const l = [];
  if (u.shield) l.push(['shield', u.shield, ct('st_shield'), ct('st_shield_d', { n: u.shield })]);
  if (u.frozen) l.push(['frozen', 1, ct('st_frozen'), ct('st_frozen_d')]);
  if (u.curse) l.push(['curse', u.curse, ct('st_curse'), ct('st_curse_d', { n: u.curse })]);
  if (u.dodge) l.push(['dodge', '', ct('st_dodge'), ct('st_dodge_d')]);
  if (u.blind) l.push(['blind', '', ct('st_blind'), ct('st_blind_d')]);
  if (u.rust) l.push(['rust', '−' + u.rust, ct('st_rust'), ct('st_rust_d', { n: u.rust })]);
  if (u.fury) l.push(['fury', '+' + u.fury, ct('st_fury'), ct('st_fury_d', { n: u.fury })]);
  return l;
}

// =====================================================================
// Animations
// =====================================================================
const unitEl = u => document.querySelector(`.bu[data-side="${u.side}"][data-i="${u.i}"]`);
function pos(u) {
  const el = unitEl(u)?.querySelector('.bu-img');
  if (!el) return { x: innerWidth / 2, y: innerHeight / 2 };
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}
function shake(n = 6) {
  if (reducedFx()) return;
  $('bt-stage').animate([{ transform: 'none' }, { transform: `translate(${n}px, ${-n / 2}px)` }, { transform: `translate(${-n}px, ${n / 2}px)` }, { transform: `translate(${n / 2}px, 0)` }, { transform: 'none' }], { duration: 280 });
}
function flash(o = .5, col = '#fff') {
  const f = $('bt-flash'); f.style.background = col;
  f.animate([{ opacity: o }, { opacity: 0 }], { duration: 380, easing: 'ease-out' });
}
// Attaque de base : le jeton s'élance, une boule de pixels à sa couleur part vers la cible et explose
async function attackFx(me, foe, miss, crit) {
  const el = unitEl(me)?.querySelector('.bu-float'), a = pos(me), b = pos(foe);
  const dx = (b.x - a.x) * .18, dy = (b.y - a.y) * .18;
  sfx.whoosh?.();
  el?.animate([{ transform: 'none' }, { transform: `translate(${-dx * .3}px, ${-dy * .3}px) scale(.95)`, offset: .35 }, { transform: `translate(${dx}px, ${dy}px) scale(1.08)`, offset: .7 }, { transform: 'none' }], { duration: 520, easing: 'cubic-bezier(.3,.7,.3,1)' });
  await wait(260);
  const target = miss ? { x: b.x + (Math.random() < .5 ? -1 : 1) * rnd(90, 140), y: b.y - rnd(40, 90) } : b;
  if (crit) { $('battle').classList.add('slowmo'); }
  await shoot(a, target, me.glow, crit ? 520 : 360, crit ? 12 : 9, rnd(20, 70));
  $('battle').classList.remove('slowmo');
  if (miss) { burst(target, '#64748b', 10, 3, 3); return; }
  burst(b, me.glow, crit ? 60 : 30, crit ? 10 : 6, crit ? 7 : 5, crit ? 900 : 650);
  if (crit) { ring(b, '#ffffff', 20, 40); flash(.45); shake(12); critText(foe); sfx.reveal?.(1000); } else { shake(5); sfx.impact(); }
}
function hitFx(u, crit) {
  const el = unitEl(u)?.querySelector('.bu-float');
  el?.animate([{ filter: 'brightness(3) saturate(0)' }, { filter: 'none' }], { duration: crit ? 380 : 220 });
}
function dodgeFx(u) {
  const el = unitEl(u)?.querySelector('.bu-float');
  el?.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateX(46px) skewX(-10deg)', opacity: .3 }, { transform: 'none', opacity: 1 }], { duration: 480, easing: 'cubic-bezier(.3,1.3,.5,1)' });
}
function koFx(u) {
  const p = pos(u);
  burst(p, u.glow, 50, 8, 6, 1100);
  for (let i = 0; i < 30; i++) emit({ x: p.x + rnd(-40, 40), y: p.y + rnd(-40, 40), vx: rnd(-1, 1), vy: rnd(-2, 0), grav: .25, size: rnd(4, 7), color: pick(['#475569', '#64748b', '#94a3b8']), life: 1200, drag: .97 });
  sfx.impact(); shake(10);
}
function floatNum(u, text, kind) {
  const host = unitEl(u); if (!host) return;
  const n = document.createElement('span');
  n.className = 'bu-num ' + kind; n.textContent = text;
  n.style.left = 50 + rnd(-14, 14) + '%';
  host.appendChild(n);
  setTimeout(() => n.remove(), 1300);
}
function critText(u) { floatNum(u, ct('crit'), 'crit-tag'); }
function abilCallout(u, name) {
  const host = unitEl(u); if (!host) return;
  const n = document.createElement('div');
  n.className = 'bu-callout'; n.textContent = name;
  host.appendChild(n);
  setTimeout(() => n.remove(), 1500);
}

// =====================================================================
// Déroulé du combat. Les règles sont dans battle-engine.js (ENGINE) :
// - contre le robot, le moteur tourne ici ;
// - contre un ami, il tourne sur le serveur (fonction « battle ») et on reçoit ce qui s'est passé en direct.
// Dans les deux cas on rejoue la liste d'événements avec les animations, puis on prend l'état final.
// =====================================================================
const alive = u => u && u.hp > 0;
const weakest = list => list.filter(alive).sort((a, b) => a.hp / a.max - b.hp / b.max)[0];
const canAct = u => alive(u) && !u.frozen;
const clone = o => JSON.parse(JSON.stringify(o));
const withGlow = st => { st.teams.flat().forEach(u => { u.glow = jetonOf(u.name).glow || '#ffffff'; }); return st; };

let BT = null;   // combat affiché : { mode: 'bot' | 'online', me (mon camp), st (état du moteur), view (ce qui est affiché), names, … }
const DBG = { botDeck: ['', '', ''], rig: 'n' };
const uName = u => jn(u.name);
const V = () => BT.view;
const teamOf = side => V().teams[side];
const unitV = e => V().teams[e.side][e.i];
const myTurn = () => BT && !BT.busy && !V().over && V().turn === BT.me;
const sideName = side => side === BT.me ? ct('you') : BT.names[side];

// ---------- Lancer
function startBot(myDeck) {
  const pool = SERIES.Takoras;
  const bot = DBG.botDeck.map(n => (n ? jetonOf(n) : pool[Math.floor(Math.random() * pool.length)]));
  const { state, events } = ENGINE.create([myDeck.map(j => ({ name: j.name, odds: j.odds })), bot.map(j => ({ name: j.name, odds: j.odds }))]);
  BT = { mode: 'bot', me: 0, st: withGlow(state), names: [ct('you'), ct('bot')], sel: null, tgt: null, abil: false, busy: true, look: null, queue: Promise.resolve() };
  BT.view = withGlow(clone(state));
  openBattle();
  run(events, state);
}
function startOnline(row) {
  if (BT && BT.id === row.id) return;
  const me = row.p1 === ACC.user.id ? 0 : 1, other = me ? row.p1 : row.p2;
  BT = { mode: 'online', id: row.id, me, otherId: other, st: withGlow(row.state), version: row.version, deadline: Date.parse(row.deadline),
    names: me ? [nameOf(other), ct('you')] : [ct('you'), nameOf(other)], sel: null, tgt: null, abil: false, busy: true, look: null, queue: Promise.resolve() };
  BT.view = withGlow(clone(row.state));
  openBattle();
  // on arrive en cours de combat : on affiche juste l'état, sinon on rejoue le début
  run(row.version <= 2 ? row.events : [], row.state);
}
const nameOf = id => (typeof friendOf === 'function' && friendOf(id)?.pseudo) || '?';

// Rejoue des événements les uns après les autres (file d'attente : jamais deux animations en même temps)
function run(events, final) {
  BT.busy = true; updateAll();
  const bt = BT;
  BT.queue = BT.queue.then(async () => {
    for (const e of events) { if (BT !== bt) return; await (EV[e.t] || (() => {}))(e); }
    if (BT !== bt) return;
    BT.view = withGlow(clone(final));
    BT.busy = false;
    BT.sel = BT.tgt = null; BT.abil = false;
    // un seul jeton jouable / une seule cible : on les choisit pour toi
    if (myTurn()) {
      const ok = teamOf(BT.me).filter(canAct), foes = teamOf(1 - BT.me).filter(alive);
      if (ok.length === 1) BT.sel = ok[0].i;
      if (BT.sel !== null && foes.length === 1) BT.tgt = foes[0].i;
    }
    updateAll();
    if (V().over) return setTimeout(() => showEnd(V().winner === BT.me), 700);
    if (BT.mode === 'bot' && V().turn === 1) setTimeout(botPlay, 700);
  }).catch(err => { console.error(err); if (BT === bt) { BT.view = withGlow(clone(final)); BT.busy = false; updateAll(); } });
}

// Ce que fait chaque événement à l'écran
const EV = {
  start: e => { log(e.side === BT.me ? ct('l_start_me') : ct('l_start_them', { n: sideName(e.side) }), 'sys'); },
  turn: async e => {
    // les effets (recharges, gel…) de l'état final s'appliquent à ce moment-là, les PV restent ceux de l'animation
    const fin = BT.st;
    V().teams.flat().forEach(u => { const f = fin.teams[u.side][u.i]; Object.assign(u, { cd: f.cd, frozen: f.frozen, curse: f.curse, dodge: f.dodge, blind: f.blind, rust: f.rust, fury: f.fury, atk: f.atk, def: f.def }); });
    V().turn = e.side; V().n = e.n;
    BT.sel = BT.tgt = null;
    if (BT.mode === 'online') BT.deadline = BT.deadlineNext || BT.deadline;
    updateAll();
    banner(e.side === BT.me ? ct('your_turn') : ct('their_turn', { n: sideName(e.side) }), e.side !== BT.me);
    await wait(650);
  },
  curse: async e => { const u = unitV(e); spiral(pos(u), '#c026d3', 50, 20, 600); log(ct('l_curse', { t: uName(u), d: 12 }), 'curse'); await wait(350); },
  hit: async e => {
    const u = unitV(e);
    if (e.sh) floatNum(u, '−' + e.sh, 'shield');
    if (e.d) floatNum(u, '−' + e.d, e.crit ? 'crit' : 'hit');
    u.hp = e.hp; u.shield = e.shield;
    hitFx(u, e.crit); updateUnit(u);
    await wait(150);
  },
  ko: async e => { const u = unitV(e); log(ct('l_ko', { t: uName(u) }), 'ko'); koFx(u); updateUnit(u); await wait(450); },
  shield: async e => { const u = unitV(e); u.shield = e.shield; floatNum(u, '+' + e.n, 'shield'); updateUnit(u); await wait(120); },
  heal: async e => { const u = unitV(e); u.hp = e.hp; floatNum(u, '+' + e.n, 'heal'); updateUnit(u); await wait(150); },
  abil: async e => {
    const me = unitV(e), A = abilOf(e.name), [nm] = abilText(e.name);
    const c = { me, foe: teamOf(1 - e.side)[e.ti], allies: teamOf(e.side), enemies: teamOf(1 - e.side), heal: e.heal ? unitV(e.heal) : null };
    BT.sel = e.i; BT.tgt = e.ti; updateAll();
    log(`${uName(me)} · ${nm}`, 'abil');
    abilCallout(me, nm);
    sfx.upgrade();
    await A.fx(c);
    await wait(250);
  },
  atk: async e => {
    const me = unitV(e), foe = teamOf(1 - e.side)[e.ti];
    BT.sel = e.i; BT.tgt = e.ti; updateAll();
    await attackFx(me, foe, e.miss, e.crit);
    if (e.miss) { log(ct('l_miss', { a: uName(me) }), 'miss'); floatNum(foe, ct('miss'), 'miss'); sfx.deny(); }
    else BT.lastAtk = { a: uName(me), t: uName(foe), crit: e.crit, side: e.side };
    await wait(200);
  },
  dodge: async e => { const u = unitV(e); log(ct('l_dodge', { t: uName(u) }), 'sys'); floatNum(u, ct('st_dodge'), 'dodge'); dodgeFx(u); await wait(400); },
  skip: async e => { log(e.side === BT.me ? ct('l_skip_me') : ct('l_skip_them', { n: sideName(e.side) }), 'sys'); await wait(600); },
  timeout: async e => { log(ct('l_timeout', { n: sideName(e.side), k: e.count }), 'miss'); banner(ct('timeout'), true); await wait(800); },
  end: async e => { if (e.forfeit !== undefined) log(ct('l_forfeit', { n: sideName(e.forfeit) }), 'sys'); if (e.afk !== undefined) log(ct('l_afk', { n: sideName(e.afk) }), 'sys'); V().over = true; V().winner = e.winner; await wait(300); },
};
// Journal des coups (on l'écrit après le « hit » pour avoir les vrais dégâts)
const hitLog = EV.hit;
EV.hit = async e => {
  await hitLog(e);
  const la = BT.lastAtk;
  if (la && e.side !== la.side) { log(ct(la.crit ? 'l_crit' : 'l_hit', { a: la.a, t: la.t, d: e.d }), la.side === BT.me ? 'good' : 'bad'); BT.lastAtk = null; }
};

// ---------- Jouer mon tour
async function myAct() {
  if (!myTurn() || BT.sel === null || BT.tgt === null) return;
  const ui = BT.sel, ti = BT.tgt, abil = BT.abil;
  BT.busy = true; updateAll();
  if (BT.mode === 'bot') {
    let events;
    try { events = ENGINE.act(BT.st, 0, ui, ti, abil, Math.random, DBG.rig); } catch (err) { BT.busy = false; updateAll(); return toast(err.message, true); }
    withGlow(BT.st);
    return run(events, BT.st);
  }
  const row = await duelCall({ action: 'act', id: BT.id, unit: ui, target: ti, abil });
  if (!row) { BT.busy = false; updateAll(); return; }
  applyRow(row);
}
// Robot : son jeton le plus fort (capacité prête en priorité), vise le plus faible en face
function botPlay() {
  if (!BT || BT.mode !== 'bot' || V().over || BT.st.turn !== 1) return;
  const st = BT.st, mine = st.teams[1].filter(canAct), foes = st.teams[0].filter(alive);
  const me = [...mine].sort((a, b) => (b.cd === 0) - (a.cd === 0) || b.atk - a.atk)[0];
  const foe = [...foes].sort((a, b) => (a.hp + a.shield) - (b.hp + b.shield))[0];
  const heal = ['Soléo', 'Zénith'].includes(me.name);
  const events = ENGINE.act(st, 1, me.i, foe.i, me.cd === 0 && (!heal || st.teams[1].some(u => alive(u) && u.hp < u.max * .65)));
  withGlow(st);
  run(events, st);
}

// ---------- En ligne : nouvel état reçu (ma réponse ou en direct)
function applyRow(row) {
  if (!BT || BT.mode !== 'online' || row.id !== BT.id || row.version <= BT.version) return;
  const skipped = row.version > BT.version + 1; // on a raté un état : on saute directement au bon
  BT.version = row.version;
  BT.st = withGlow(row.state);
  BT.deadlineNext = Date.parse(row.deadline);
  run(skipped ? [] : row.events || [], row.state);
  if (skipped) BT.deadline = BT.deadlineNext;
}
// Appel à la fonction serveur « battle »
async function duelCall(body) {
  const { data, error } = await sb.functions.invoke('battle', { body });
  if (error || data?.error) { const code = data?.error || 'server_error'; if (code !== 'conflict') toast(errText({ message: code }), true); return null; }
  return data;
}
// Chrono du tour (en ligne) : à 0, n'importe lequel des deux demande au serveur de passer le tour
setInterval(() => {
  if (!BT || BT.mode !== 'online' || V().over || $('battle').hidden) return;
  const left = Math.max(0, Math.ceil((BT.deadline - Date.now()) / 1000));
  const t = $('bt-timer'); if (t) { t.textContent = left; t.classList.toggle('hurry', left <= 10); t.style.setProperty('--p', left / 60); }
  if (left === 0 && !BT.ticking && !BT.busy) { BT.ticking = true; duelCall({ action: 'tick', id: BT.id }).then(row => { BT.ticking = false; if (row) applyRow(row); }); }
}, 500);

// =====================================================================
// Interface
// =====================================================================
function openBattle() {
  const b = $('battle');
  b.hidden = false; $('bt-end').hidden = true;
  document.documentElement.classList.add('lock');
  $('bt-log').innerHTML = '';
  buildUnits();
  requestAnimationFrame(() => b.classList.add('on'));
}
function closeBattle() {
  const b = $('battle');
  b.classList.remove('on');
  document.documentElement.classList.remove('lock');
  PX.parts = [];
  setTimeout(() => { b.hidden = true; }, 350);
  BT = null;
  if (!$('page-combat').hidden) renderCombat();
}

// Les jetons sont créés une fois ; ensuite on ne met à jour que les morceaux (sinon les animations sautent)
function buildUnits() {
  [['bt-foes', 1 - BT.me], ['bt-mine', BT.me]].forEach(([id, side]) => {
    $(id).innerHTML = teamOf(side).map((u, k) => `
      <div class="bu" data-side="${side}" data-i="${u.i}" style="--g:${hexRGB(u.glow)};--d:${k * .7}s">
        <div class="bu-float"><div class="bu-aura"></div><img class="bu-img" src="${texOf(jetonOf(u.name))}" alt=""></div>
        <div class="bu-ground"></div>
        <div class="bu-info"><div class="bu-name">${jnH(u.name)}</div><div class="bu-hp"><i></i><s></s><b></b></div><div class="bu-cd"></div></div>
        <div class="bu-st"></div>
      </div>`).join('');
  });
  $('bt-vs').innerHTML = BT.mode === 'online' ? `<span>${esc(BT.names[1 - BT.me])}</span><b id="bt-timer" class="bt-timer">60</b>` : '';
  updateAll();
}
function updateUnit(u) {
  const el = unitEl(u); if (!el) return;
  const mine = u.side === BT.me, play = myTurn();
  el.classList.toggle('ko', !alive(u));
  el.classList.toggle('frozen', !!u.frozen);
  el.classList.toggle('sel', BT.sel === u.i && u.side === V().turn && !V().over);
  el.classList.toggle('tgt', BT.tgt === u.i && u.side !== V().turn && !V().over);
  el.classList.toggle('can', play && ((mine && canAct(u)) || (!mine && alive(u) && BT.sel !== null)));
  el.classList.toggle('look', !!BT.look && BT.look.side === u.side && BT.look.i === u.i);
  const hp = u.hp / u.max * 100, sh = Math.min(100 - hp, u.shield / u.max * 100);
  el.querySelector('.bu-hp i').style.width = hp + '%';
  const s = el.querySelector('.bu-hp s'); s.style.left = hp + '%'; s.style.width = sh + '%';
  el.querySelector('.bu-hp b').textContent = `${u.hp}${u.shield ? ' +' + u.shield : ''}`;
  el.querySelector('.bu-hp').classList.toggle('low', hp < 30);
  const cd = el.querySelector('.bu-cd');
  cd.className = 'bu-cd' + (u.cd ? '' : ' ready');
  // petites pastilles de recharge : toutes allumées = capacité prête
  const max = abilOf(u.name).cd, filled = u.cd ? Math.max(0, max - u.cd) : max;
  cd.innerHTML = alive(u) ? Array.from({ length: max }, (_, k) => `<i class="${k < filled ? 'on' : ''}"></i>`).join('') : '';
  cd.title = u.cd ? ct('in_cd', { n: u.cd }) : ct('ready');
  el.querySelector('.bu-st').innerHTML = alive(u) ? statusesOf(u).map(([k, n, nm, d]) => `<span class="st" data-tip="${esc(nm)} · ${esc(d)}">${stIcon(k)}${n !== '' ? `<b>${n}</b>` : ''}</span>`).join('') : '';
}
function updateAll() {
  if (!BT) return;
  V().teams.flat().forEach(updateUnit);
  const v = V(), mineTurn = v.turn === BT.me;
  $('bt-turn').innerHTML = `<b>${ct('turn', { n: v.n })}</b><span class="${mineTurn ? 'good' : 'bad'}">${mineTurn ? ct('your_turn') : ct('their_turn', { n: sideName(v.turn) })}</span>`;
  $('bt-step').textContent = v.over || BT.busy ? '' : !mineTurn ? (BT.mode === 'bot' ? ct('thinking') : ct('waiting', { n: sideName(v.turn) })) : BT.sel === null ? ct('step_pick') : BT.tgt === null ? ct('step_target') : ct('step_go');
  $('battle').classList.toggle('their', !mineTurn && !v.over);
  drawInspector();
  // barre d'action : capacité du jeton choisi + Attaquer
  const bar = $('bt-actions'), me = BT.sel !== null && mineTurn ? teamOf(BT.me)[BT.sel] : null;
  if (!myTurn() || !me) { bar.classList.remove('on'); return; }
  const [an, ad] = abilText(me.name);
  bar.classList.add('on');
  bar.style.setProperty('--g', hexRGB(me.glow));
  bar.innerHTML = `
    <button class="bt-abil${BT.abil ? ' on' : ''}" id="bt-abil" ${me.cd ? 'disabled' : ''}>
      <img src="${texOf(jetonOf(me.name))}" alt="">
      <span><b>${esc(an)} <em>${me.cd ? ct('in_cd', { n: me.cd }) : BT.abil ? ct('abil_on') : ct('ready')}</em></b><small>${esc(ad)}</small></span>
      <i class="bt-check"></i>
    </button>
    <button class="bt-go" id="bt-go" ${BT.tgt === null ? 'disabled' : ''}>${ct('attack')}</button>`;
}

// Panneau d'infos : grand écran = toujours là (survol, cible, jeton choisi) ; petit écran = quand on clique sur un jeton
function drawInspector() {
  const ins = $('bt-ins'), wide = innerWidth > 1100, v = V();
  const u = BT.look ? v.teams[BT.look.side][BT.look.i] : !wide ? null : BT.tgt !== null ? v.teams[1 - v.turn][BT.tgt] : BT.sel !== null ? v.teams[v.turn][BT.sel] : null;
  if (!u) { ins.classList.remove('on'); return; }
  const A = abilOf(u.name), [an, ad] = abilText(u.name), st = statusesOf(u);
  ins.classList.add('on');
  ins.style.setProperty('--g', hexRGB(u.glow));
  ins.innerHTML = `
    <div class="bi-head"><img src="${texOf(jetonOf(u.name))}" alt=""><div><small class="${u.side === BT.me ? 'good' : 'bad'}">${u.side === BT.me ? ct('mine') : ct('theirs', { n: BT.names[u.side] })}</small><b>${jnH(u.name)}</b><small class="t-${tierKey(u.odds)}">1/${fmt(u.odds)}</small></div></div>
    <div class="bi-stats">
      <div><span>${ct('hp')}</span><b>${u.hp}<small>/${u.max}</small></b></div>
      <div><span>${ct('atk')}</span><b>${u.atk}</b></div>
      <div><span>${ct('def')}</span><b>${u.def}</b></div>
      <div><span>${ct('spd')}</span><b>${u.spd}</b></div>
    </div>
    <div class="bi-abil"><span class="bi-k">${ct('ability')} · <em class="${u.cd ? '' : 'ok'}">${u.cd ? ct('in_cd', { n: u.cd }) : ct('ready')}</em></span><b>${esc(an)}</b><p>${esc(ad)}</p></div>
    <div class="bi-fx"><span class="bi-k">${ct('effects')}</span>${st.length ? st.map(([k, n, nm, d]) => `<div class="bi-st">${stIcon(k)}<div><b>${esc(nm)}</b><p>${esc(d)}</p></div></div>`).join('') : `<p class="muted">${ct('no_fx')}</p>`}</div>`;
}

function log(text, kind = '') {
  if (!BT) return;
  const box = $('bt-log');
  const d = document.createElement('div');
  d.className = 'bl ' + kind; d.textContent = text;
  box.prepend(d);
  while (box.children.length > 6) box.lastChild.remove();
}
function banner(text, bad) {
  const b = $('bt-banner');
  b.textContent = text; b.className = 'bt-banner ' + (bad ? 'bad' : 'good');
  void b.offsetWidth; b.classList.add('on');
  sfx.next();
}

function showEnd(won) {
  const o = $('bt-end');
  o.innerHTML = `<div class="bt-end-card ${won ? 'win' : 'lose'}"><h2>${ct(won ? 'win' : 'lose')}</h2>
    ${BT.mode === 'online' ? `<p class="muted">${ct('vs', { n: esc(BT.names[1 - BT.me]) })}</p>` : ''}
    <div class="bt-end-row">${teamOf(BT.me).map(u => `<div class="${alive(u) ? '' : 'ko'}"><img src="${texOf(jetonOf(u.name))}" alt=""><small>${u.hp}/${u.max}</small></div>`).join('')}</div>
    <div class="bt-end-btns">${BT.mode === 'bot' ? `<button class="btn primary" id="bt-again">${ct('again')}</button>` : `<button class="btn primary" id="bt-rematch">${ct('rematch')}</button>`}<button class="btn ghost" id="bt-menu">${ct('menu')}</button></div></div>`;
  o.hidden = false;
  if (won) { sfx.reveal?.(10000); for (let i = 0; i < 6; i++) setTimeout(() => burst({ x: rnd(100, innerWidth - 100), y: rnd(100, innerHeight / 2) }, pick(['#86efac', '#fde68a', '#c4b5fd']), 40, 8, 6, 1200), i * 180); }
  else sfx.deny();
}

// Clics : mon jeton → cible → (capacité) → Attaquer. Clic sur un jeton = voir ses infos.
$('battle').addEventListener('click', e => {
  if (!BT) return;
  if (e.target.closest('#bt-again')) { $('bt-end').hidden = true; const deck = teamOf(0).map(u => jetonOf(u.name)); BT = null; return startBot(deck); }
  if (e.target.closest('#bt-rematch')) { $('bt-end').hidden = true; const id = BT.otherId; closeBattle(); return duelInvite(id); }
  if (e.target.closest('#bt-menu')) { $('bt-end').hidden = true; return closeBattle(); }
  if (e.target.closest('#bt-quit')) {
    if (V().over) return closeBattle();
    return ask(ct('quit_q'), { danger: true }).then(async ok => {
      if (!ok || !BT) return;
      if (BT.mode === 'online') { const row = await duelCall({ action: 'forfeit', id: BT.id }); if (row) applyRow(row); }
      else closeBattle();
    });
  }
  const u = e.target.closest('.bu');
  if (u) {
    const side = +u.dataset.side, i = +u.dataset.i, play = myTurn();
    BT.look = { side, i };
    if (play && side === BT.me && canAct(teamOf(side)[i])) { BT.sel = i; BT.abil = false; BT.look = null; sfx.click(); }
    // 1er clic sur un ennemi = le viser ; re-clic sur la cible = voir ses infos
    else if (play && side !== BT.me && BT.sel !== null && alive(teamOf(side)[i]) && BT.tgt !== i) { BT.tgt = i; BT.look = null; sfx.click(); }
    return updateAll();
  }
  if (e.target.closest('#bt-abil')) { BT.abil = !BT.abil; sfx.click(); return updateAll(); }
  if (e.target.closest('#bt-go')) { $('bt-actions').classList.remove('on'); return myAct(); }
  if (!e.target.closest('#bt-ins')) { BT.look = null; updateAll(); }
});
// Survol d'un jeton (souris, grand écran) : le panneau d'infos le montre
$('battle').addEventListener('pointerover', e => {
  if (!BT || e.pointerType !== 'mouse' || innerWidth <= 1100) return;
  const u = e.target.closest('.bu');
  const look = u ? { side: +u.dataset.side, i: +u.dataset.i } : null;
  if (JSON.stringify(look) === JSON.stringify(BT.look)) return;
  BT.look = look; updateAll();
});

// =====================================================================
// Défis entre amis : invitation en direct, réponse, lancement chez les deux
// =====================================================================
const DUEL = { waiting: null, invites: new Map() };
async function duelInvite(friendId) {
  if (!ACC.user) return openAccount('login');
  const row = await duelCall({ action: 'invite', friend: friendId });
  if (!row) return;
  sfx.click();
  showWaiting(row);
}
// Fenêtre « En attente de X… » chez celui qui défie
function showWaiting(row) {
  closeWaiting();
  const o = document.createElement('div');
  o.className = 'askbox duel-box on';
  o.innerHTML = `<div class="ask-card"><div class="duel-vs">⚔️</div><p>${ct('wait_for', { n: esc(nameOf(row.p2)) })}</p><div class="duel-bar"><i></i></div><div class="ask-btns"><button class="btn ghost" data-x>${t('cancel')}</button></div></div>`;
  document.body.appendChild(o);
  const total = Math.max(1, Date.parse(row.deadline) - Date.now());
  o.querySelector('.duel-bar i').animate([{ width: '100%' }, { width: '0%' }], { duration: total, fill: 'forwards' });
  o.querySelector('[data-x]').onclick = () => { duelCall({ action: 'cancel', id: row.id }); closeWaiting(); };
  DUEL.waiting = { id: row.id, el: o, timer: setTimeout(() => { closeWaiting(); toast(ct('no_answer'), true); }, total + 1500) };
}
function closeWaiting() { if (!DUEL.waiting) return; clearTimeout(DUEL.waiting.timer); DUEL.waiting.el.remove(); DUEL.waiting = null; }

// Fenêtre « X te défie ! » chez l'ami, avec son
function showInvite(row) {
  if (DUEL.invites.has(row.id) || Date.parse(row.deadline) < Date.now()) return;
  const o = document.createElement('div');
  o.className = 'askbox duel-box on';
  o.innerHTML = `<div class="ask-card duel-in"><div class="duel-vs">⚔️</div><p><b>${esc(nameOf(row.p1))}</b> ${ct('challenges_you')}</p><div class="duel-bar"><i></i></div>
    <div class="ask-btns"><button class="btn ghost" data-a="0">${ct('decline')}</button><button class="btn primary" data-a="1">${ct('accept_fight')}</button></div></div>`;
  document.body.appendChild(o);
  const total = Math.max(1, Date.parse(row.deadline) - Date.now());
  o.querySelector('.duel-bar i').animate([{ width: '100%' }, { width: '0%' }], { duration: total, fill: 'forwards' });
  const close = () => { o.remove(); DUEL.invites.delete(row.id); };
  const timer = setTimeout(close, total);
  DUEL.invites.set(row.id, close);
  sfx.announce?.();
  o.addEventListener('click', async e => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    clearTimeout(timer); close();
    const res = await duelCall({ action: 'respond', id: row.id, accept: b.dataset.a === '1' });
    if (res && res.status === 'live') startOnline(res);
  });
}

// En direct : invitations reçues, réponses, coups joués (le serveur n'envoie que nos combats)
let duelChan = null;
window.duelSub = function () {
  if (duelChan) { sb.removeChannel(duelChan); duelChan = null; }
  if (!ACC.user) return;
  const me = ACC.user.id;
  duelChan = sb.channel('duels-' + me)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'battles' }, ({ new: row }) => {
      if (!row?.id) return;
      if (row.status === 'invite' && row.p2 === me) return showInvite(row);
      if (row.status !== 'invite' && DUEL.invites.has(row.id)) DUEL.invites.get(row.id)(); // invitation annulée / expirée
      if (DUEL.waiting?.id === row.id) {
        if (row.status === 'live') { closeWaiting(); return startOnline(row); }
        if (row.status === 'declined') { closeWaiting(); sfx.deny(); return toast(ct('declined', { n: esc(nameOf(row.p2)) }), true); }
      }
      if (BT?.mode === 'online' && BT.id === row.id) applyRow(row);
    })
    .subscribe();
  // un combat en cours (page rechargée) : on le reprend
  sb.from('battles').select('*').eq('status', 'live').or(`p1.eq.${me},p2.eq.${me}`).gt('deadline', new Date(Date.now() - 3 * 60e3).toISOString()).limit(1)
    .then(({ data }) => { if (data?.[0] && !BT) startOnline(data[0]); });
};

// =====================================================================
// Menu combat (page #combat) : deck, défier un ami, robot, debug (admins)
// =====================================================================
let DECK = [];
async function loadDeck() {
  const { data } = await sb.rpc('my_deck');
  DECK = Array.from({ length: 3 }, (_, i) => (data || [])[i] || null);
}
async function saveDeck() {
  const { error } = await sb.rpc('set_deck', { ids: DECK.map(d => d?.id).filter(Boolean) });
  if (error) toast(errText(error), true);
  const snap = moSnap($('page-combat'), '.cb-slot');
  await renderCombat();
  moPlay(snap, $('page-combat'), '.cb-slot', { dissolve: true });
}

async function renderCombat() {
  const page = $('page-combat');
  if (!ACC.user) { page.innerHTML = `<div class="page-empty"><p class="muted">${t('acc_need')}</p><button class="btn primary" onclick="openAccount('login')">${t('login')}</button></div>`; return; }
  await Promise.all([loadDeck(), typeof loadFriends === 'function' ? loadFriends() : null]);
  const full = DECK.every(Boolean), friendsOk = (typeof FR !== 'undefined' ? FR.list : []).filter(f => f.status === 'accepted');
  const { data: me } = await sb.rpc('profile_public', { p_pseudo: ACC.pseudo || '' });
  page.innerHTML = `
    <div class="cb-page">
      <div class="page-head"><div><div class="eyebrow">${ct('beta')}</div><h2 class="page-title">${ct('title')}</h2></div>
        ${me ? `<div class="cb-record"><b>${me.wins || 0}</b><span>${ct('wins')}</span><b>${me.losses || 0}</b><span>${ct('losses')}</span></div>` : ''}</div>
      <section class="cb-deck">
        <h3 class="shop-h">🃏 ${ct('deck')} <small class="muted">${DECK.filter(Boolean).length}/3</small></h3>
        <p class="muted small">${ct('deck_hint')}</p>
        <div class="cb-slots">${DECK.map((d, i) => {
          if (!d) return `<button class="cb-slot empty" data-slot="${i}" data-key="${i}:e"><span>+</span><small>${ct('slot_empty')}</small></button>`;
          const j = jetonOf(d.jeton), s = statsOf(j.name, j.odds), A = abilOf(j.name), [an, ad] = abilText(j.name);
          return `<button class="cb-slot" data-slot="${i}" data-key="${i}:${d.id}" style="--g:${hexRGB(j.glow)}">
            <div class="cb-coin"><img src="${texOf(j)}" alt=""></div><b>${jnH(j.name)}</b><small class="t-${tierKey(j.odds)}">1/${fmt(j.odds)}</small>
            <div class="cb-stats"><span><i>${ct('hp')}</i>${s.s_hp}</span><span><i>${ct('atk')}</i>${s.s_atk}</span><span><i>${ct('def')}</i>${s.s_def}</span><span><i>${ct('spd')}</i>${s.s_spd}</span></div>
            <div class="cb-abil"><b>${esc(an)}</b><p>${esc(ad)}</p><small class="muted">${ct('cd', { n: A.cd })}</small></div>
          </button>`;
        }).join('')}</div>
        ${full ? '' : `<p class="muted small cb-need">${ct('need3')}</p>`}
      </section>
      <section class="cb-modes">
        <div class="cb-mode">
          <h3 class="shop-h">🤝 ${ct('vs_friend')}</h3>
          <div class="cb-friends">${friendsOk.length ? friendsOk.map(f => `<div class="cb-fr">${avatarHTML(f, 36)}<b>${esc(f.pseudo)}</b><button class="btn primary sm" data-duel="${f.id}" ${full ? '' : 'disabled'}>⚔️ ${ct('challenge')}</button></div>`).join('')
            : `<p class="muted small">${ct('no_friends')} <a class="plink" href="#amis">${t('nav_friends')}</a></p>`}</div>
        </div>
        <div class="cb-mode">
          <h3 class="shop-h">🤖 ${ct('vs_bot')}</h3>
          <p class="muted small">${ct('bot_hint')}</p>
          <button class="btn ghost cb-fight" id="cb-fight" ${full ? '' : 'disabled'}>${ct('fight_bot')}</button>
        </div>
      </section>
      ${ACC.isAdmin ? `<section class="mp-box cb-debug">
        <h4>🛠️ ${ct('debug')}</h4>
        <div class="cb-dbg-row"><span>${ct('bot_deck')}</span>${DBG.botDeck.map((n, i) => `<select class="mpx-in" data-bot="${i}"><option value="">🎲 ${ct('random')}</option>${SERIES.Takoras.map(j => `<option value="${esc(j.name)}"${n === j.name ? ' selected' : ''}>${esc(jn(j.name))} · 1/${fmt(j.odds)}</option>`).join('')}</select>`).join('')}</div>
        <div class="cb-dbg-row"><span>${ct('rig')}</span><div class="seg">${['n', 'c', 'm'].map(k => `<button data-rig="${k}" class="${DBG.rig === k ? 'on' : ''}">${ct('rig_' + k)}</button>`).join('')}</div></div>
      </section>` : ''}
    </div>`;
}
$('page-combat').addEventListener('click', async e => {
  const s = e.target.closest('[data-slot]'); if (s) return pickDeck(+s.dataset.slot);
  const r = e.target.closest('[data-rig]'); if (r) { DBG.rig = r.dataset.rig; sfx.click(); return renderCombat(); }
  const d = e.target.closest('[data-duel]'); if (d && !d.disabled) return duelInvite(d.dataset.duel);
  if (e.target.closest('#cb-fight')) { sfx.click(); startBot(DECK.map(x => jetonOf(x.jeton))); }
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
      const j = jetonOf(x.name), id = x.ids.find(i => !used.has(i));
      return `<button class="pk${id ? '' : ' off'}" data-id="${id || ''}" data-n="${esc(x.name)}" data-o="${x.odds}" style="--g:${hexRGB(j.glow)}"><img src="${texOf(j)}" alt=""><b>${jnH(x.name)}</b><small>${esc(abilText(x.name)[0])}</small></button>`;
    }).join('') || `<p class="muted">${t('inv_empty')}</p>`;
  };
  card.innerHTML = `
    <button class="set-close jm-close" aria-label="${t('close')}">✕</button>
    <div class="pk-wrap">
      <h2>${ct('pick_title', { n: slot + 1 })}</h2>
      <div class="pk-tools"><input class="mpx-in" id="pk-q" placeholder="${t('search')}"></div>
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

// Ce dont le reste du site a besoin
window.renderCombat = renderCombat;
window.duelInvite = duelInvite;
window.CB = { DBG, startBot, startOnline, applyRow, get BT() { return BT; }, EV };
if (ACC.user) duelSub();
})();
