// Combat (réservé aux admins pour l'instant) : un deck de 3 jetons, du tour par tour contre un robot.
// À ton tour : tu choisis un de tes jetons, la cible en face, tu peux lancer sa capacité (si elle est rechargée,
// elle réussit toujours), puis tu attaques : 15 % de chance de rater, 15 % de coup critique (×1,5).
// Chaque attaque a son animation en particules pixel art (couleur du jeton), chaque capacité a la sienne.

// Tout est dans une fonction pour ne pas écraser les effets de l'ouverture (burst, flash, shake… existent déjà)
(() => {
const CT = {
  fr: {
    title: 'Combat', beta: 'Admin · bêta', deck: 'Ton deck', deck_hint: 'Choisis 3 jetons : ils restent dans ton deck pour tous tes combats (et ne peuvent pas être vendus).',
    slot_empty: 'Choisir un jeton', fight_bot: '⚔️ Combattre le robot', queue: '🌐 Chercher un joueur', soon: 'bientôt', need3: 'Il te faut 3 jetons dans ton deck',
    pick_title: 'Deck · case {n}', pick_remove: 'Retirer de la case', debug: 'Debug robot', bot_deck: 'Deck du robot', random: 'Au hasard', rig: 'Tes attaques', rig_n: 'Normal', rig_c: 'Toujours critique', rig_m: 'Toujours ratées',
    cd: 'recharge {n} tour(s)', ready: 'Prête', in_cd: 'Prête dans {n} tour(s)',
    your_turn: 'À toi de jouer', bot_turn: 'Tour du robot', step_pick: 'Choisis un de tes jetons', step_target: 'Choisis ta cible', step_go: 'Attaque !', thinking: 'Le robot réfléchit…',
    attack: 'Attaquer', abil_use: 'Utiliser la capacité', abil_on: 'Activée', ko: 'K.O.', turn: 'Tour {n}', crit: 'CRITIQUE !', miss: 'RATÉ',
    win: 'Victoire !', lose: 'Défaite…', again: 'Rejouer', menu: 'Menu combat', quit_q: 'Abandonner le combat ?',
    l_start_0: 'Tu commences !', l_start_1: 'Le robot commence !', l_hit: '{a} frappe {t} : −{d}', l_crit: '{a} : coup critique sur {t} ! −{d}', l_miss: '{a} rate son attaque', l_ko: '{t} est K.O. !',
    l_skip_0: 'Tu ne peux pas jouer (tout est gelé)', l_skip_1: 'Le robot ne peut pas jouer (tout est gelé)', l_curse: '{t} subit la malédiction : −{d}', l_dodge: '{t} esquive !',
    hp: 'PV', atk: 'Attaque', def: 'Défense', spd: 'Vitesse', effects: 'Effets', no_fx: 'Aucun effet', mine: 'Ton jeton', theirs: 'Jeton du robot', ability: 'Capacité',
    st_shield: 'Bouclier', st_shield_d: 'Absorbe {n} dégâts avant les PV.', st_frozen: 'Gelé', st_frozen_d: 'Ne peut pas jouer ce tour-ci.', st_curse: 'Maudit', st_curse_d: 'Perd 12 PV au début de ses {n} prochains tours.',
    st_dodge: 'Ombre', st_dodge_d: 'Esquive la prochaine attaque.', st_blind: 'Aveuglé', st_blind_d: 'Sa prochaine attaque fait moitié moins de dégâts.',
    st_rust: 'Rouillé', st_rust_d: '−{n} de défense pour le combat.', st_fury: 'Furieux', st_fury_d: '+{n} d’attaque pour le combat.',
  },
  en: {
    title: 'Battle', beta: 'Admin · beta', deck: 'Your deck', deck_hint: 'Pick 3 tokens: they stay in your deck for all your battles (and can’t be sold).',
    slot_empty: 'Pick a token', fight_bot: '⚔️ Fight the bot', queue: '🌐 Find a player', soon: 'soon', need3: 'You need 3 tokens in your deck',
    pick_title: 'Deck · slot {n}', pick_remove: 'Clear slot', debug: 'Bot debug', bot_deck: 'Bot deck', random: 'Random', rig: 'Your attacks', rig_n: 'Normal', rig_c: 'Always crit', rig_m: 'Always miss',
    cd: 'cooldown {n} turn(s)', ready: 'Ready', in_cd: 'Ready in {n} turn(s)',
    your_turn: 'Your turn', bot_turn: 'Bot’s turn', step_pick: 'Pick one of your tokens', step_target: 'Pick your target', step_go: 'Attack!', thinking: 'The bot is thinking…',
    attack: 'Attack', abil_use: 'Use ability', abil_on: 'On', ko: 'K.O.', turn: 'Turn {n}', crit: 'CRITICAL!', miss: 'MISS',
    win: 'Victory!', lose: 'Defeat…', again: 'Play again', menu: 'Battle menu', quit_q: 'Give up this battle?',
    l_start_0: 'You go first!', l_start_1: 'The bot goes first!', l_hit: '{a} hits {t}: −{d}', l_crit: '{a}: critical hit on {t}! −{d}', l_miss: '{a} misses', l_ko: '{t} is K.O.!',
    l_skip_0: 'You can’t play (everything is frozen)', l_skip_1: 'The bot can’t play (everything is frozen)', l_curse: '{t} suffers the curse: −{d}', l_dodge: '{t} dodges!',
    hp: 'HP', atk: 'Attack', def: 'Defense', spd: 'Speed', effects: 'Effects', no_fx: 'No effects', mine: 'Your token', theirs: 'Bot token', ability: 'Ability',
    st_shield: 'Shield', st_shield_d: 'Absorbs {n} damage before HP.', st_frozen: 'Frozen', st_frozen_d: 'Can’t play this turn.', st_curse: 'Cursed', st_curse_d: 'Loses 12 HP at the start of its next {n} turns.',
    st_dodge: 'Shadow', st_dodge_d: 'Dodges the next attack.', st_blind: 'Blinded', st_blind_d: 'Its next attack deals half damage.',
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
  return new Promise(res => {
    const step = now => {
      const t = Math.min(1, (now - t0) / ms), e = t * t * (3 - 2 * t);
      const x = a.x + (b.x - a.x) * e, y = a.y + (b.y - a.y) * e - Math.sin(t * Math.PI) * arc;
      emit({ x, y, size, color: c[2], life: 90, drag: 1, fade: false, shrink: false });
      for (let i = 0; i < 3; i++) emit({ x: x + rnd(-4, 4), y: y + rnd(-4, 4), vx: rnd(-1, 1), vy: rnd(-1, 1), size: rnd(3, 6), color: pick(c), life: rnd(250, 450) });
      if (t < 1) requestAnimationFrame(step); else res();
    };
    requestAnimationFrame(step);
  });
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
    fx: async c => { c.heal = weakest(c.allies); const p = pos(c.heal); beam(p, '#fcd34d', 40, 800); await wait(500); rise(p, '#fde68a', 34); }, run: c => healOf(c.heal, 40) },
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
// Règles
// =====================================================================
const alive = u => u && u.hp > 0;
const weakest = list => list.filter(alive).sort((a, b) => a.hp / a.max - b.hp / b.max)[0];
function shieldOf(u, n) { if (alive(u)) { u.shield += n; floatNum(u, '+' + n, 'shield'); } }
function healOf(u, n) { if (!alive(u)) return; const h = Math.min(n, u.max - u.hp); u.hp += h; floatNum(u, '+' + h, 'heal'); }
// pierce = ignore le bouclier
function hurt(u, n, pierce = false, crit = false) {
  if (!alive(u)) return 0;
  let d = Math.max(0, Math.round(n));
  if (!pierce && u.shield) { const s = Math.min(u.shield, d); u.shield -= s; d -= s; if (s) floatNum(u, '−' + s, 'shield'); }
  u.hp = Math.max(0, u.hp - d);
  if (d) floatNum(u, '−' + d, crit ? 'crit' : 'hit');
  hitFx(u, crit);
  if (!alive(u)) { log(ct('l_ko', { t: uName(u) }), 'ko'); koFx(u); }
  return d;
}

let BT = null;
const DBG = { botDeck: ['', '', ''], rig: 'n' };
const uName = u => jn(u.name);
const teamOf = side => BT.teams[side];
const canAct = u => alive(u) && !u.frozen;
function unitOf(j, side, i) {
  const s = statsOf(j.name, j.odds);
  return { side, i, name: j.name, odds: j.odds, glow: j.glow || '#ffffff', hp: s.s_hp, max: s.s_hp, atk: s.s_atk, def: s.s_def, spd: s.s_spd, shield: 0, cd: 0 };
}

function startBattle(myDeck) {
  const pool = SERIES.Takoras;
  const bot = DBG.botDeck.map(n => (n ? jetonOf(n) : pool[Math.floor(Math.random() * pool.length)]));
  BT = { teams: [myDeck.map((j, i) => unitOf(j, 0, i)), bot.map((j, i) => unitOf(j, 1, i))], turn: 0, sel: null, tgt: null, abil: false, busy: true, over: false, n: 1, look: null };
  const sp = BT.teams.map(t => t.reduce((s, u) => s + u.spd, 0));
  BT.turn = sp[0] === sp[1] ? (Math.random() < .5 ? 0 : 1) : sp[0] > sp[1] ? 0 : 1;
  openBattle();
  log(ct('l_start_' + BT.turn), 'sys');
  setTimeout(beginTurn, 900);
}

function beginTurn() {
  if (!BT || BT.over) return;
  const side = BT.turn, team = teamOf(side);
  team.forEach(u => {
    if (u.cd > 0) u.cd--;
    if (alive(u) && u.curse > 0) { u.curse--; spiral(pos(u), '#c026d3', 50, 20, 600); log(ct('l_curse', { t: uName(u), d: 12 }), 'curse'); hurt(u, 12, true); }
  });
  BT.sel = BT.tgt = null; BT.abil = false; BT.busy = false;
  if (checkEnd()) return;
  if (!team.some(canAct)) { log(ct('l_skip_' + side), 'sys'); BT.busy = true; updateAll(); return setTimeout(endTurn, 1000); }
  banner(side ? ct('bot_turn') : ct('your_turn'), side);
  if (side === 1) { BT.busy = true; updateAll(); setTimeout(botPlay, 1000); }
  else {
    const ok = team.filter(canAct);
    if (ok.length === 1) BT.sel = ok[0].i;
    const foes = teamOf(1).filter(alive);
    if (BT.sel !== null && foes.length === 1) BT.tgt = foes[0].i;
    updateAll();
  }
}
function endTurn() {
  if (!BT) return;
  teamOf(BT.turn).forEach(u => { u.frozen = false; });
  if (checkEnd()) return;
  BT.turn = 1 - BT.turn;
  if (BT.turn === 0) BT.n++;
  beginTurn();
}
function checkEnd() {
  const lost = BT.teams.map(t => !t.some(alive));
  if (!lost[0] && !lost[1]) return false;
  BT.over = true; BT.busy = true;
  updateAll();
  setTimeout(() => showEnd(!lost[0]), 900);
  return true;
}

// Un tour : capacité (optionnelle, réussit toujours) puis attaque (15 % raté, 15 % critique ×1,5)
async function playTurn(side, ui, ti, useAbil) {
  BT.busy = true; BT.sel = ui; BT.tgt = ti;
  updateAll();
  const me = teamOf(side)[ui], enemies = teamOf(1 - side), foe = enemies[ti];
  const c = { me, foe, allies: teamOf(side), enemies, mult: 1, steal: 0, sure: false, critBoost: 0 };
  if (useAbil && me.cd === 0) {
    const [nm] = abilText(me.name), A = abilOf(me.name);
    log(`${uName(me)} · ${nm}`, 'abil');
    abilCallout(me, nm);
    me.cd = A.cd + 1; // +1 : elle redescend au début de ton tour
    sfx.upgrade();
    await A.fx(c);
    A.run(c);
    updateAll();
    await wait(450);
    if (checkEnd()) return;
  }
  if (!alive(foe)) { await wait(300); return endTurn(); } // la capacité a déjà fini la cible
  // jet d'attaque
  let r = Math.random();
  if (side === 0 && DBG.rig === 'c') r = .99;
  if (side === 0 && DBG.rig === 'm') r = 0;
  const miss = !c.sure && r < .15, crit = !miss && (r > .85 || Math.random() < c.critBoost);
  await attackFx(me, foe, miss, crit);
  if (miss) { log(ct('l_miss', { a: uName(me) }), 'miss'); floatNum(foe, ct('miss'), 'miss'); sfx.deny(); }
  else if (foe.dodge) { foe.dodge = false; log(ct('l_dodge', { t: uName(foe) }), 'sys'); floatNum(foe, ct('st_dodge'), 'dodge'); dodgeFx(foe); }
  else {
    let dmg = (me.atk * 2 - foe.def) * c.mult * rnd(.9, 1.1) * (crit ? 1.5 : 1);
    if (me.blind) dmg /= 2;
    const d = hurt(foe, Math.max(6, dmg), false, crit);
    log(ct(crit ? 'l_crit' : 'l_hit', { a: uName(me), t: uName(foe), d }), side ? 'bad' : 'good');
    if (c.steal && d) { await wait(200); healOf(me, Math.round(d * c.steal)); }
  }
  me.blind = false;
  updateAll();
  await wait(800);
  endTurn();
}

// Robot : son jeton le plus fort (capacité prête en priorité), vise le plus faible en face
async function botPlay() {
  if (!BT || BT.over) return;
  const mine = teamOf(1).filter(canAct), foes = teamOf(0).filter(alive);
  const me = [...mine].sort((a, b) => (b.cd === 0) - (a.cd === 0) || b.atk - a.atk)[0];
  const foe = [...foes].sort((a, b) => (a.hp + a.shield) - (b.hp + b.shield))[0];
  BT.sel = me.i; updateAll(); await wait(500);
  BT.tgt = foe.i; updateAll(); await wait(600);
  const heal = ['Soléo', 'Zénith'].includes(me.name);
  playTurn(1, me.i, foe.i, me.cd === 0 && (!heal || teamOf(1).some(u => alive(u) && u.hp < u.max * .65)));
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
  renderCombat();
}

// Les jetons sont créés une fois ; ensuite on ne met à jour que les morceaux (sinon les animations sautent)
function buildUnits() {
  [['bt-foes', 1], ['bt-mine', 0]].forEach(([id, side]) => {
    $(id).innerHTML = teamOf(side).map((u, k) => `
      <div class="bu" data-side="${side}" data-i="${u.i}" style="--g:${hexRGB(u.glow)};--d:${k * .7}s">
        <div class="bu-float"><div class="bu-aura"></div><img class="bu-img" src="${texOf(jetonOf(u.name))}" alt=""></div>
        <div class="bu-ground"></div>
        <div class="bu-info"><div class="bu-name">${jnH(u.name)}</div><div class="bu-hp"><i></i><s></s><b></b></div><div class="bu-cd"></div></div>
        <div class="bu-st"></div>
      </div>`).join('');
  });
  updateAll();
}
function updateUnit(u) {
  const el = unitEl(u); if (!el) return;
  const myTurn = BT.turn === 0 && !BT.busy && !BT.over;
  el.classList.toggle('ko', !alive(u));
  el.classList.toggle('frozen', !!u.frozen);
  el.classList.toggle('sel', BT.sel === u.i && u.side === BT.turn && !BT.over);
  el.classList.toggle('tgt', BT.tgt === u.i && u.side !== BT.turn && !BT.over);
  el.classList.toggle('can', myTurn && ((u.side === 0 && canAct(u)) || (u.side === 1 && alive(u) && BT.sel !== null)));
  el.classList.toggle('look', BT.look && BT.look.side === u.side && BT.look.i === u.i);
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
  BT.teams.flat().forEach(updateUnit);
  const myTurn = BT.turn === 0 && !BT.busy && !BT.over;
  $('bt-turn').innerHTML = `<b>${ct('turn', { n: BT.n })}</b><span class="${BT.turn ? 'bad' : 'good'}">${BT.turn ? ct('bot_turn') : ct('your_turn')}</span>`;
  $('bt-step').textContent = BT.over ? '' : BT.turn === 1 ? ct('thinking') : BT.busy ? '' : BT.sel === null ? ct('step_pick') : BT.tgt === null ? ct('step_target') : ct('step_go');
  $('battle').classList.toggle('their', BT.turn === 1);
  drawInspector();
  // barre d'action : capacité du jeton choisi + Attaquer
  const bar = $('bt-actions'), me = BT.sel !== null && BT.turn === 0 ? teamOf(0)[BT.sel] : null;
  if (!myTurn || !me) { bar.classList.remove('on'); return; }
  const A = abilOf(me.name), [an, ad] = abilText(me.name);
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

// Panneau d'infos : le jeton survolé / cliqué (ou ton jeton choisi), avec stats, capacité et effets expliqués
function drawInspector() {
  const ins = $('bt-ins');
  // grand écran : panneau toujours là (survol, cible, jeton choisi) ; petit écran : seulement quand on clique sur un jeton
  const wide = innerWidth > 1100;
  const u = BT.look ? teamOf(BT.look.side)[BT.look.i] : !wide ? null : BT.tgt !== null && BT.turn === 0 ? teamOf(1)[BT.tgt] : BT.sel !== null ? teamOf(BT.turn)[BT.sel] : null;
  if (!u) { ins.classList.remove('on'); return; }
  const A = abilOf(u.name), [an, ad] = abilText(u.name), st = statusesOf(u);
  ins.classList.add('on');
  ins.style.setProperty('--g', hexRGB(u.glow));
  ins.innerHTML = `
    <div class="bi-head"><img src="${texOf(jetonOf(u.name))}" alt=""><div><small class="${u.side ? 'bad' : 'good'}">${ct(u.side ? 'theirs' : 'mine')}</small><b>${jnH(u.name)}</b><small class="t-${tierKey(u.odds)}">1/${fmt(u.odds)}</small></div></div>
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
function banner(text, side) {
  const b = $('bt-banner');
  b.textContent = text; b.className = 'bt-banner ' + (side ? 'bad' : 'good');
  void b.offsetWidth; b.classList.add('on');
  sfx.next();
}

function showEnd(won) {
  const o = $('bt-end');
  o.innerHTML = `<div class="bt-end-card ${won ? 'win' : 'lose'}"><h2>${ct(won ? 'win' : 'lose')}</h2>
    <div class="bt-end-row">${teamOf(0).map(u => `<div class="${alive(u) ? '' : 'ko'}"><img src="${texOf(jetonOf(u.name))}" alt=""><small>${u.hp}/${u.max}</small></div>`).join('')}</div>
    <div class="bt-end-btns"><button class="btn primary" id="bt-again">${ct('again')}</button><button class="btn ghost" id="bt-menu">${ct('menu')}</button></div></div>`;
  o.hidden = false;
  if (won) { sfx.reveal?.(10000); for (let i = 0; i < 6; i++) setTimeout(() => burst({ x: rnd(100, innerWidth - 100), y: rnd(100, innerHeight / 2) }, pick(['#86efac', '#fde68a', '#c4b5fd']), 40, 8, 6, 1200), i * 180); }
  else sfx.deny();
}

// Clics : mon jeton → cible → (capacité) → Attaquer. Clic sur un jeton = voir ses infos.
$('battle').addEventListener('click', e => {
  if (!BT) return;
  if (e.target.closest('#bt-again')) { $('bt-end').hidden = true; return startBattle(BT.teams[0].map(u => jetonOf(u.name))); }
  if (e.target.closest('#bt-menu')) { $('bt-end').hidden = true; return closeBattle(); }
  if (e.target.closest('#bt-quit')) { if (BT.over || confirm(ct('quit_q'))) { BT.over = true; closeBattle(); } return; }
  const u = e.target.closest('.bu');
  if (u) {
    const side = +u.dataset.side, i = +u.dataset.i, me = BT.turn === 0 && !BT.busy && !BT.over;
    BT.look = { side, i };
    if (me && side === 0 && canAct(teamOf(0)[i])) { BT.sel = i; BT.abil = false; BT.look = null; sfx.click(); }
    // 1er clic sur un ennemi = le viser ; re-clic sur la cible = voir ses infos
    else if (me && side === 1 && BT.sel !== null && alive(teamOf(1)[i]) && BT.tgt !== i) { BT.tgt = i; BT.look = null; sfx.click(); }
    else if (BT.look && innerWidth <= 1100 && $('bt-ins').classList.contains('on') && unitEl(teamOf(side)[i])?.classList.contains('look')) BT.look = null; // re-clic = fermer
    return updateAll();
  }
  if (e.target.closest('#bt-abil')) { BT.abil = !BT.abil; sfx.click(); return updateAll(); }
  if (e.target.closest('#bt-go') && BT.turn === 0 && !BT.busy && BT.sel !== null && BT.tgt !== null) { $('bt-actions').classList.remove('on'); return playTurn(0, BT.sel, BT.tgt, BT.abil); }
  if (!e.target.closest('#bt-ins')) { BT.look = null; updateAll(); }
});
// Survol d'un jeton (souris) : le panneau d'infos le montre
$('battle').addEventListener('pointerover', e => {
  if (!BT || e.pointerType !== 'mouse' || innerWidth <= 1100) return;
  const u = e.target.closest('.bu');
  const look = u ? { side: +u.dataset.side, i: +u.dataset.i } : null;
  if (JSON.stringify(look) === JSON.stringify(BT.look)) return;
  BT.look = look; updateAll();
});

// =====================================================================
// Menu combat (page #combat) : deck, lancer un combat, debug
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
          const j = jetonOf(d.jeton), s = statsOf(j.name, j.odds), A = abilOf(j.name), [an, ad] = abilText(j.name);
          return `<button class="cb-slot" data-slot="${i}" style="--g:${hexRGB(j.glow)}">
            <div class="cb-coin"><img src="${texOf(j)}" alt=""></div><b>${jnH(j.name)}</b><small class="t-${tierKey(j.odds)}">1/${fmt(j.odds)}</small>
            <div class="cb-stats"><span><i>${ct('hp')}</i>${s.s_hp}</span><span><i>${ct('atk')}</i>${s.s_atk}</span><span><i>${ct('def')}</i>${s.s_def}</span><span><i>${ct('spd')}</i>${s.s_spd}</span></div>
            <div class="cb-abil"><b>${esc(an)}</b><p>${esc(ad)}</p><small class="muted">${ct('cd', { n: A.cd })}</small></div>
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
        <div class="cb-dbg-row"><span>${ct('rig')}</span><div class="seg">${['n', 'c', 'm'].map(k => `<button data-rig="${k}" class="${DBG.rig === k ? 'on' : ''}">${ct('rig_' + k)}</button>`).join('')}</div></div>
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
      const j = jetonOf(x.name), id = x.ids.find(i => !used.has(i));
      return `<button class="pk${id ? '' : ' off'}" data-id="${id || ''}" data-n="${esc(x.name)}" data-o="${x.odds}" style="--g:${hexRGB(j.glow)}"><img src="${texOf(j)}" alt=""><b>${jnH(x.name)}</b><small>${esc(abilText(x.name)[0])}</small></button>`;
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

// Ce dont le reste du site a besoin
window.renderCombat = renderCombat;
window.CB = { DBG, startBattle, get BT() { return BT; } };
})();
