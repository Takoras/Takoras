// Moteur de combat « 3 endroits » (règles seulement, aucun affichage). Voir docs/COMBAT.md.
//
// Chaque joueur a une équipe de 3 jetons et des PV. À chaque manche :
//   1. les deux joueurs choisissent EN MÊME TEMPS le jeton qu'ils vont jouer → les deux jetons sont révélés ;
//   2. les deux joueurs choisissent EN MÊME TEMPS où le poser (gauche, milieu, droite), en cachant l'endroit,
//      et s'ils activent sa capacité (1 fois par jeton et par combat) → on révèle.
//   - Même endroit : les deux jetons se tapent (éléments, passifs, capacités). Les PV des jetons restent d'une manche
//     à l'autre ; un jeton K.O. ne peut plus être joué.
//   - Endroits différents : chaque jeton frappe directement le joueur d'en face.
// Le premier joueur à 0 PV (ou sans jeton debout) perd. Un jeton joué ne peut pas être rejoué à la manche suivante
// (sauf si c'est le seul encore debout).
// Déterministe : mêmes équipes + même graine + mêmes choix = même combat (le serveur pourra arbitrer le classé).

const CB = (() => {
  const LIFE = 60, MAX_ROUNDS = 20, LANES = 3;
  // ---------- Éléments
  const EL = {
    'Mobu': 'water', 'Pikko': 'plant', 'Rouillé': 'fire', 'Givre': 'water', 'Soléo': 'fire', 'Azura': 'water', 'Carmin': 'fire',
    'Vyolis': 'shadow', 'Lumis': 'plant', 'Nyx': 'shadow', 'Astra': 'light', 'Kraïos': 'water', 'Koi': 'fire', 'Néphéris': 'plant',
    'Zénith': 'light', 'Oblivion': 'shadow', 'Takoras': 'light',
  };
  const BEATS = { fire: 'plant', plant: 'water', water: 'fire' };
  const elOf = name => EL[name] || 'water';
  function elMult(a, b) { // ×1,3 si avantage, ×0,8 si désavantage
    if ((a === 'light' && b === 'shadow') || (a === 'shadow' && b === 'light')) return 1.3;
    if (BEATS[a] === b) return 1.3;
    if (BEATS[b] === a) return .8;
    return 1;
  }
  const VBONUS = { gold: 1.05, celeste: 1.1, ombre: 1.15 };

  // ---------- Stats (affichées dans les fiches) : un peu plus fort quand c'est rare ; niveaux et mutations comptent
  const strHash = s => [...String(s ?? '')].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  function stats(name, odds, lvl = 1, variant = '') {
    const r = Math.log10(Math.max(1, odds)) / 6, h = strHash(name);
    const v = i => ((h >>> (i * 5)) % 31) / 30 - .5;
    const m = (1 + .08 * (Math.max(1, lvl) - 1)) * (VBONUS[variant] || 1);
    return {
      hp: Math.round((1150 + 600 * r + 70 * v(0)) * m),
      atk: Math.round((50 + 28 * r + 4 * v(1)) * m),
      def: Math.round((16 + 14 * r + 3 * v(2)) * m),
      spd: Math.round(98 + 22 * r + 8 * v(3)),
    };
  }
  const power = s => Math.round(s.hp / 4 + s.atk * 4 + s.def * 6 + s.spd * 2);

  // ---------- Hasard déterministe
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  // ---------- Création. teams : [[{ name, odds, lvl, variant }×3], [...]]
  function create(teams, seed = 1) {
    const st = { round: 1, over: false, winner: null, rnd: rng(seed), ev: [], life: [LIFE, LIFE], guard: [0, 0], frozen: [-1, -1], last: [-1, -1],
      dazzle: [false, false], stars: [0, 0], curseFace: [0, 0], teams: [] };
    st.teams = teams.map((team, side) => {
      const crown = team.some(j => j.name === 'Takoras') ? 1.15 : 1; // passif Couronne
      return team.map((j, i) => {
        const s = stats(j.name, j.odds, j.lvl, j.variant);
        const hp = Math.round(s.hp / 10 * crown);
        return { side, i, name: j.name, odds: j.odds, lvl: j.lvl || 1, variant: j.variant || '', el: elOf(j.name), max: hp, hp,
          atk: s.atk * crown, def: s.def * crown, alive: true, used: false, plays: 0, rust: false, noHeal: false, curse: 0, stuck: false };
      });
    });
    return st;
  }
  const ref = u => ({ side: u.side, i: u.i });
  const emit = (st, e) => st.ev.push({ ...e, round: st.round });

  // Jetons jouables cette manche : debout, pas joué à la manche d'avant (sauf s'il est le seul), pas « collé » par Mobu
  function playable(st, side) {
    const alive = st.teams[side].filter(u => u.alive);
    const ok = alive.filter(u => u.i !== st.last[side] && !u.stuck);
    return (ok.length ? ok : alive).map(u => u.i);
  }
  // Endroits possibles (Givre peut geler un endroit pour l'adversaire)
  const lanes = (st, side) => [0, 1, 2].filter(l => l !== st.frozen[side]);

  // ---------- Dégâts
  function clashDmg(st, u, v, x) { // croisement : u tape v
    let d = u.atk * elMult(u.el, v.el) * 100 / (100 + v.def * (v.rust ? .7 : 1));
    if (u.name === 'Carmin') d *= 1 + .5 * (1 - u.hp / u.max);                  // Rage
    if (u.name === 'Givre' && v.hp < v.max) d *= 1.25;                          // Froid
    if (u.name === 'Soléo' && x.lane === 1) d *= 1.2;                            // Aube (au milieu)
    if (u.name === 'Kraïos') d *= 1 + .1 * Math.min(5, u.plays - 1);            // Fureur
    d *= 1 + .06 * st.stars[u.side];                                             // Constellation (Astra)
    return d * (.9 + st.rnd() * .2);
  }
  function faceDmg(st, u) { // coup direct sur le joueur d'en face
    let d = u.atk / 6;
    if (u.name === 'Azura') d += 3;                                              // Courant
    if (u.name === 'Lumis') d *= 1.5;                                            // Éclat
    if (u.name === 'Kraïos') d *= 1 + .1 * Math.min(5, u.plays - 1);
    return d * (1 + .06 * st.stars[u.side]);
  }
  function hurtToken(st, from, v, d, o = {}) {
    if (!v.alive) return 0;
    if (!o.true && v.guarded) { emit(st, { t: 'block', u: ref(v) }); return 0; }
    if (!o.true && v.name === 'Koi' && st.rnd() < .2) { emit(st, { t: 'dodge', u: ref(v) }); return 0; } // Chance
    d = Math.max(1, Math.round(d));
    v.hp = Math.max(0, v.hp - d);
    emit(st, { t: 'hit', from: from && ref(from), to: ref(v), d, em: from ? elMult(from.el, v.el) : 1, hp: v.hp, crit: !!o.crit });
    if (from && v.name === 'Néphéris' && from.alive && !o.reflect) hurtToken(st, v, from, d * .25, { reflect: true, true: true }); // Racines
    if (from && from.name === 'Oblivion') v.noHeal = true;                       // Vide
    if (v.hp <= 0) ko(st, v);
    return d;
  }
  function hurtPlayer(st, side, d, from, o = {}) {
    let x = d;
    if (st.teams[side].some(u => u.alive && u.name === 'Zénith')) x *= .8;      // Halo
    x = Math.max(1, Math.round(x));
    if (st.guard[side]) { const g = Math.min(st.guard[side], x); st.guard[side] -= g; x -= g; emit(st, { t: 'guard', side, n: g, left: st.guard[side] }); }
    if (x <= 0) return 0;
    st.life[side] = Math.max(0, st.life[side] - x);
    emit(st, { t: 'face', side, from: from && ref(from), d: x, life: st.life[side], crit: !!o.crit });
    return x;
  }
  function healToken(st, u, n) {
    if (!u.alive || u.noHeal) return;
    const h = Math.min(Math.round(n), u.max - u.hp); if (h <= 0) return;
    u.hp += h; emit(st, { t: 'heal', u: ref(u), n: h, hp: u.hp });
  }
  function ko(st, u) {
    if (!u.alive) return;
    u.alive = false; u.hp = 0;
    emit(st, { t: 'ko', u: ref(u) });
    if (u.name === 'Rouillé') hurtPlayer(st, 1 - u.side, 5, u);                  // Ferraille
  }

  // ---------- Capacités (activées en posant le jeton, 1 fois par jeton et par combat)
  // x = { me, foe (jeton adverse joué), crossed (même endroit ?), lane, dealt }
  const ABIL = {
    'Mobu': { pre: x => { x.me.guarded = true; } },                                                   // Bulle : aucun dégât ce tour
    'Pikko': { post: (st, x) => hurtPlayer(st, 1 - x.me.side, 6, x.me) },                            // Épines : 6 dégâts au joueur quoi qu'il arrive
    'Rouillé': { post: (st, x) => { if (x.crossed && x.foe.alive) { x.foe.rust = true; emit(st, { t: 'status', u: ref(x.foe), k: 'rust' }); } } },
    'Givre': { post: (st, x) => { st.frozen[1 - x.me.side] = x.lane; emit(st, { t: 'frozen', side: 1 - x.me.side, lane: x.lane }); } }, // Gel : endroit interdit à l'adversaire au tour suivant
    'Soléo': { post: (st, x) => st.teams[x.me.side].forEach(u => healToken(st, u, u.max * .3)) },
    'Azura': { pre: x => { x.force = true; } },                                                      // Raz-de-marée : touche le jeton adverse où qu'il soit
    'Carmin': { mult: 2, post: (st, x) => { if (x.dealt && x.crossed) healToken(st, x.me, x.dealt / 2); } },
    'Vyolis': { pre: (x, st) => { st.guard[x.me.side] += 8; emit(st, { t: 'guardup', side: x.me.side, n: 8 }); } },
    'Lumis': { post: (st, x) => { st.dazzle[1 - x.me.side] = true; } },                              // Éblouir : le prochain jeton adverse ne fait rien
    'Nyx': { pre: x => { x.slip = true; } },                                                         // Ombre : passe à travers et tape le joueur ×2
    'Astra': { crit: true },                                                                         // Étoile filante : coup critique ×2
    'Kraïos': { both: true },                                                                        // Tempête : tape le jeton croisé ET le joueur
    'Koi': { post: (st, x) => { const a = st.teams[x.me.side].find(u => u.alive && u.used && u !== x.me); if (a) { a.used = false; emit(st, { t: 'recharge', u: ref(a) }); } } },
    'Néphéris': { post: (st, x) => { if (x.crossed && x.foe.alive) { x.foe.curse = 3; emit(st, { t: 'status', u: ref(x.foe), k: 'curse' }); } else st.curseFace[1 - x.me.side] = 3; } },
    'Zénith': { post: (st, x) => { const d = st.teams[x.me.side].find(u => !u.alive); if (d) { d.alive = true; d.hp = Math.round(d.max * .5); emit(st, { t: 'revive', u: ref(d), hp: d.hp }); } else st.teams[x.me.side].forEach(u => healToken(st, u, u.max * .2)); } },
    'Oblivion': { post: (st, x) => { if (x.crossed && x.foe.alive && x.foe.name !== 'Takoras') hurtToken(st, x.me, x.foe, x.foe.hp, { true: true }); else if (!x.crossed) hurtPlayer(st, 1 - x.me.side, 10, x.me); } },
    'Takoras': { pre: (x, st) => { x.force = true; st.guard[x.me.side] += 6; emit(st, { t: 'guardup', side: x.me.side, n: 6 }); } }, // Jugement
  };

  // ---------- Résoudre une manche. picks : [{ i, lane, abil }, { i, lane, abil }] (joueur 0, joueur 1)
  function resolve(st, picks) {
    if (st.over) return [];
    st.ev = [];
    st.teams.forEach(t => t.forEach(u => { u.guarded = false; u.stuck = false; }));
    const frozenNow = [...st.frozen]; st.frozen = [-1, -1];
    const c = picks.map((p, side) => {
      const me = st.teams[side][p.i];
      const lane = frozenNow[side] === p.lane ? (p.lane + 1) % LANES : p.lane; // jamais sur un endroit gelé
      const abil = p.abil && !me.used && ABIL[me.name] ? ABIL[me.name] : null;
      if (abil) me.used = true;
      me.plays++;
      return { me, lane, abil, side };
    });
    c[0].foe = c[1].me; c[1].foe = c[0].me;
    st.last = [c[0].me.i, c[1].me.i];
    emit(st, { t: 'reveal', picks: c.map(x => ({ i: x.me.i, lane: x.lane, abil: !!x.abil })) });
    c.forEach(x => { if (x.abil) { emit(st, { t: 'abil', u: ref(x.me) }); x.abil.pre?.(x, st); } });
    const forced = c[0].force || c[1].force, crossed = c[0].lane === c[1].lane || forced;
    c.forEach(x => { x.crossed = crossed; });
    const dazz = st.dazzle; st.dazzle = [false, false];
    if (crossed) {
      emit(st, { t: 'clash', lane: forced ? -1 : c[0].lane });
      const dmg = c.map((x, side) => {
        if (dazz[side]) { emit(st, { t: 'dazzled', u: ref(x.me) }); return 0; }
        return clashDmg(st, x.me, x.foe, x) * (x.abil?.mult || 1) * (x.abil?.crit ? 2 : 1);
      });
      c.forEach((x, side) => {
        if (x.slip) { if (!dazz[side]) x.dealt = hurtPlayer(st, 1 - side, faceDmg(st, x.me) * 2, x.me); return; } // Nyx passe à travers
        if (c[1 - side].slip) return;                                                                        // … et n'est pas touché
        if (dmg[side] > 0) x.dealt = hurtToken(st, x.me, x.foe, dmg[side], { crit: !!x.abil?.crit });
        if (x.abil?.both && !dazz[side]) hurtPlayer(st, 1 - side, faceDmg(st, x.me), x.me);
        if (x.me.name === 'Vyolis' && x.foe.alive && dmg[side] > 0 && st.rnd() < .25) hurtToken(st, x.me, x.foe, dmg[side] * .5); // Écho
      });
      c.forEach(x => {
        if (x.me.name === 'Mobu' && x.me.alive && x.foe.alive) x.foe.stuck = true;                         // Collant
        if (x.me.name === 'Astra' && !x.foe.alive) st.stars[x.side] = Math.min(5, st.stars[x.side] + 1);  // Constellation
      });
    } else {
      c.forEach((x, side) => {
        if (dazz[side]) { emit(st, { t: 'dazzled', u: ref(x.me) }); return; }
        x.dealt = hurtPlayer(st, 1 - side, faceDmg(st, x.me) * (x.abil?.crit ? 2 : 1), x.me, { crit: !!x.abil?.crit });
      });
    }
    c.forEach(x => x.abil?.post?.(st, x));
    // fin de manche : malédictions, Pollen
    st.teams.forEach(team => team.forEach(u => {
      if (u.alive && u.curse > 0) { u.curse--; hurtToken(st, null, u, u.max * .12, { true: true }); }
      if (u.alive && u.name === 'Pikko' && !c.some(x => x.me === u)) team.forEach(a => healToken(st, a, 5));
    }));
    st.curseFace.forEach((n, side) => { if (n > 0) { st.curseFace[side]--; hurtPlayer(st, side, 3, null); } });
    const out = [0, 1].map(s => st.life[s] <= 0 || !st.teams[s].some(u => u.alive));
    st.round++;
    if (out[0] || out[1] || st.round > MAX_ROUNDS) {
      st.over = true;
      // égalité de PV : celui dont les jetons ont le plus de PV restants (en %) gagne
      const hpPct = s => st.teams[s].reduce((a, u) => a + u.hp / u.max, 0);
      const byLife = st.life[0] !== st.life[1] ? (st.life[0] > st.life[1] ? 0 : 1) : Math.abs(hpPct(0) - hpPct(1)) < .001 ? -1 : hpPct(0) > hpPct(1) ? 0 : 1;
      st.winner = out[0] && out[1] ? byLife : out[0] ? 1 : out[1] ? 0 : byLife;
      emit(st, { t: 'end', winner: st.winner });
    }
    return st.ev;
  }

  // ---------- Robot
  function aiToken(st, side) { // choisit un jeton sans voir celui d'en face
    const opts = playable(st, side).map(i => st.teams[side][i]);
    const w = opts.map(u => (u.hp / u.max) * (1 + u.atk / 100) + st.rnd() * .6);
    return opts[w.indexOf(Math.max(...w))].i;
  }
  function aiLane(st, side, myI) { // choisit l'endroit (au hasard : c'est du bluff) et s'il lance sa capacité
    const me = st.teams[side][myI], L = lanes(st, side);
    const late = st.round >= 3 || st.life[side] < 25 || me.hp < me.max * .6;
    const zenithWait = me.name === 'Zénith' && !st.teams[side].some(u => !u.alive) && st.round < 6;
    return { i: myI, lane: L[Math.floor(st.rnd() * L.length)], abil: !me.used && late && !zenithWait && st.rnd() < .5 };
  }

  return { LIFE, MAX_ROUNDS, LANES, EL, elOf, elMult, stats, power, create, resolve, playable, lanes, aiToken, aiLane };
})();
if (typeof window !== 'undefined') window.CB = CB;
