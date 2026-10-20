// Moteur de combat semi-automatique (règles seulement, aucun affichage). Voir docs/COMBAT.md.
// Déterministe : mêmes équipes + même graine + mêmes capacités lancées aux mêmes tics = même combat
// (le serveur pourra rejouer un combat classé pour le vérifier).
//
// Un combat avance par tics de 100 ms. Chaque jeton remplit sa jauge d'attaque selon sa vitesse et attaque tout seul
// le premier ennemi encore debout. Son énergie monte avec le temps et les coups ; à 100, le joueur peut lancer sa capacité.

const CB = (() => {
  const TICK = 100, MAX_TICKS = 900; // 90 s maximum
  // ---------- Éléments
  const EL = {
    'Mobu': 'water', 'Pikko': 'plant', 'Rouillé': 'fire', 'Givre': 'water', 'Soléo': 'fire', 'Azura': 'water', 'Carmin': 'fire',
    'Vyolis': 'shadow', 'Lumis': 'plant', 'Nyx': 'shadow', 'Astra': 'light', 'Kraïos': 'water', 'Koi': 'fire', 'Néphéris': 'plant',
    'Zénith': 'light', 'Oblivion': 'shadow', 'Takoras': 'light',
  };
  const BEATS = { fire: 'plant', plant: 'water', water: 'fire' };
  const elOf = name => EL[name] || 'water';
  // ×1,3 si avantage, ×0,8 si désavantage
  function elMult(a, b) {
    if ((a === 'light' && b === 'shadow') || (a === 'shadow' && b === 'light')) return 1.3;
    if (BEATS[a] === b) return 1.3;
    if (BEATS[b] === a) return .8;
    return 1;
  }
  const VBONUS = { gold: 1.05, celeste: 1.1, ombre: 1.15 };

  // ---------- Stats (niveau 1, sans variante) : un peu plus fort quand c'est rare, les niveaux comptent autant
  const strHash = s => [...String(s ?? '')].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  function stats(name, odds, lvl = 1, variant = '') {
    const r = Math.log10(Math.max(1, odds)) / 6, h = strHash(name);
    const v = i => ((h >>> (i * 5)) % 31) / 30 - .5;
    const m = (1 + .08 * (Math.max(1, lvl) - 1)) * (VBONUS[variant] || 1);
    return {
      hp: Math.round((1150 + 600 * r + 70 * v(0)) * m),
      atk: Math.round((50 + 28 * r + 4 * v(1)) * m),
      def: Math.round((16 + 14 * r + 3 * v(2)) * m),
      spd: Math.round(98 + 22 * r + 8 * v(3)), // la vitesse ne monte pas avec le niveau
    };
  }
  const power = s => Math.round(s.hp / 4 + s.atk * 4 + s.def * 6 + s.spd * 2);

  // ---------- Hasard déterministe
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  // ---------- Création du combat
  // teams : [[{ name, odds, lvl, variant }×3], [...]]
  function create(teams, seed = 1) {
    const st = { tick: 0, over: false, winner: null, rnd: rng(seed), ev: [], teams: [] };
    st.teams = teams.map((team, side) => {
      const crown = team.some(j => j.name === 'Takoras') ? 1.15 : 1; // passif Couronne : +15 % à toute l'équipe
      return team.map((j, i) => {
        const s = stats(j.name, j.odds, j.lvl, j.variant);
        const hp = Math.round(s.hp * crown);
        return { side, i, name: j.name, odds: j.odds, lvl: j.lvl || 1, variant: j.variant || '', el: elOf(j.name),
          max: hp, hp, atk: Math.round(s.atk * crown), def: Math.round(s.def * crown), spd: s.spd * (j.name === 'Nyx' ? 1.2 : 1),
          shield: 0, energy: j.name === 'Soléo' ? 50 : 0, atb: 20 * i, alive: true,
          st: { slow: 0, freeze: 0, blind: 0, evade: 0, curse: 0, curseDmg: 0, rust: 0, wither: 0, x2: false, fury: 0 }, revived: false, pollen: 0 };
      });
    });
    return st;
  }

  const allies = (st, u) => st.teams[u.side].filter(x => x.alive);
  const enemies = (st, u) => st.teams[1 - u.side].filter(x => x.alive);
  const front = (st, u) => enemies(st, u)[0];
  const ref = u => ({ side: u.side, i: u.i });
  const emit = (st, e) => st.ev.push({ ...e, tick: st.tick });

  // ---------- Dégâts, soins, boucliers
  function hit(st, from, to, mult, o = {}) {
    if (!to.alive) return 0;
    if (!o.ability && from.st.blind > 0) { from.st.blind--; emit(st, { t: 'miss', from: ref(from), to: ref(to) }); return 0; }
    if (!o.true && (to.st.evade > 0 || (to.name === 'Koi' && st.rnd() < .1))) { emit(st, { t: 'dodge', from: ref(from), to: ref(to) }); return 0; }
    let atk = from.atk * (1 + .05 * from.st.fury);
    if (from.name === 'Carmin') atk *= 1 + .4 * (1 - from.hp / from.max); // Rage
    const def = to.def * (to.st.rust > 0 ? .7 : 1);
    const em = elMult(from.el, to.el);
    let crit = o.crit || st.rnd() < .12;
    let d = atk * mult * (o.true ? 1 : 100 / (100 + def)) * em * (.85 + st.rnd() * .3);
    if (crit) d *= from.name === 'Lumis' ? 2.25 : 1.5;
    if (from.name === 'Givre' && (to.st.slow > 0 || to.st.freeze > 0)) d *= 1.25; // Froid
    if (st.teams[to.side].some(x => x.alive && x.name === 'Zénith')) d *= .9;       // Halo
    d = Math.max(1, Math.round(d));
    let sh = 0;
    if (!o.true && to.shield) { sh = Math.min(to.shield, d); to.shield -= sh; d -= sh; }
    to.hp = Math.max(0, to.hp - d);
    to.energy = Math.min(100, to.energy + 4);
    emit(st, { t: 'hit', from: ref(from), to: ref(to), d, sh, crit, em, ability: !!o.ability, hp: to.hp, shield: to.shield });
    if (crit) st.teams[from.side].forEach(a => { if (a.alive && a.name === 'Astra') a.energy = Math.min(100, a.energy + 12); }); // Constellation
    if (from.name === 'Oblivion') to.st.wither = 30;                                   // Vide
    if (to.name === 'Néphéris' && d > 0 && from.alive && !o.reflect) {                  // Racines
      const back = Math.max(1, Math.round(d * .2)); from.hp = Math.max(0, from.hp - back);
      emit(st, { t: 'hit', from: ref(to), to: ref(from), d: back, sh: 0, crit: false, em: 1, reflect: true, hp: from.hp, shield: from.shield });
      if (from.hp <= 0) ko(st, from);
    }
    if (to.hp <= 0) ko(st, to);
    return d + sh;
  }
  function heal(st, u, n) {
    if (!u.alive) return;
    const h = Math.min(Math.round(n * (u.st.wither > 0 ? .5 : 1)), u.max - u.hp);
    if (h <= 0) return;
    u.hp += h; emit(st, { t: 'heal', u: ref(u), n: h, hp: u.hp });
  }
  function shieldOf(st, u, n) { if (!u.alive) return; u.shield += Math.round(n); emit(st, { t: 'shield', u: ref(u), n: Math.round(n), shield: u.shield }); }
  function status(st, u, k, v) { u.st[k] = Math.max(u.st[k] || 0, v); emit(st, { t: 'status', u: ref(u), k }); }
  function ko(st, u) {
    if (!u.alive) return;
    u.alive = false; u.hp = 0; u.shield = 0;
    emit(st, { t: 'ko', u: ref(u) });
    if (u.name === 'Rouillé') enemies(st, u).forEach(e => hit(st, u, e, 1.5, { true: true, ability: true })); // Ferraille
    checkEnd(st);
  }
  function checkEnd(st) {
    if (st.over) return;
    const dead = st.teams.map(t => !t.some(u => u.alive));
    if (!dead[0] && !dead[1]) return;
    st.over = true; st.winner = dead[0] && dead[1] ? -1 : dead[0] ? 1 : 0;
    emit(st, { t: 'end', winner: st.winner });
  }

  // ---------- Capacités (actives)
  const ABIL = {
    'Mobu': (st, u) => { const a = allies(st, u).sort((x, y) => x.hp / x.max - y.hp / y.max)[0]; shieldOf(st, a, a.max * .2); },
    'Pikko': (st, u) => { for (let k = 0; k < 3; k++) { const e = enemies(st, u); if (!e.length) break; hit(st, u, e[Math.floor(st.rnd() * e.length)], .7, { ability: true }); } },
    'Rouillé': (st, u) => { const e = front(st, u); status(st, e, 'rust', 60); hit(st, u, e, 1, { ability: true }); },
    'Givre': (st, u) => { const e = front(st, u); status(st, e, 'freeze', 20); hit(st, u, e, .8, { ability: true }); },
    'Soléo': (st, u) => allies(st, u).forEach(a => heal(st, a, a.max * .15)),
    'Azura': (st, u) => enemies(st, u).forEach(e => hit(st, u, e, 1, { ability: true })),
    'Carmin': (st, u) => { const d = hit(st, u, front(st, u), 2.2, { ability: true }); heal(st, u, d * .5); },
    'Vyolis': (st, u) => allies(st, u).forEach(a => shieldOf(st, a, u.max * .12)),
    'Lumis': (st, u) => { const e = front(st, u); status(st, e, 'blind', 2); hit(st, u, e, .8, { ability: true }); },
    'Nyx': (st, u) => { status(st, u, 'evade', 30); u.st.x2 = true; },
    'Astra': (st, u) => { const e = enemies(st, u).sort((x, y) => x.hp - y.hp)[0]; hit(st, u, e, 2, { ability: true, crit: true }); },
    'Kraïos': (st, u) => enemies(st, u).forEach(e => { hit(st, u, e, .9, { ability: true }); if (e.alive) status(st, e, 'slow', 30); }),
    'Koi': (st, u) => { allies(st, u).forEach(a => { if (a !== u) a.energy = Math.min(100, a.energy + 50); }); hit(st, u, front(st, u), 1, { ability: true }); },
    'Néphéris': (st, u) => { const e = front(st, u); e.st.curse = 60; e.st.curseDmg = u.atk * 3 / 60; emit(st, { t: 'status', u: ref(e), k: 'curse' }); },
    'Zénith': (st, u) => {
      const dead = st.teams[u.side].find(a => !a.alive && !a.revived);
      if (dead) { dead.alive = true; dead.revived = true; dead.hp = Math.round(dead.max * .4); dead.atb = 0; emit(st, { t: 'revive', u: ref(dead), hp: dead.hp }); }
      else { const a = allies(st, u).sort((x, y) => x.hp / x.max - y.hp / y.max)[0]; heal(st, a, a.max * .35); }
    },
    'Oblivion': (st, u) => hit(st, u, front(st, u), 3, { ability: true, true: true }),
    'Takoras': (st, u) => { enemies(st, u).forEach(e => hit(st, u, e, 1.4, { ability: true })); allies(st, u).forEach(a => shieldOf(st, a, a.max * .1)); },
  };
  const canCast = u => u.alive && u.energy >= 100 && u.st.freeze <= 0;
  function cast(st, u) {
    if (!canCast(u) || st.over) return false;
    u.energy = 0;
    emit(st, { t: 'abil', u: ref(u), name: u.name });
    (ABIL[u.name] || ABIL.Mobu)(st, u);
    st.teams[u.side].forEach(a => { if (a !== u && a.alive && a.name === 'Azura') a.energy = Math.min(100, a.energy + 15); }); // Courant
    checkEnd(st);
    return true;
  }

  // ---------- Un tic de combat. inputs : [{ side, i }] = capacités lancées par les joueurs à ce tic
  function step(st, inputs = []) {
    if (st.over) return [];
    st.ev = [];
    st.tick++;
    inputs.forEach(({ side, i }) => { const u = st.teams[side]?.[i]; if (u) cast(st, u); });
    for (const side of [0, 1]) for (const u of st.teams[side]) {
      if (!u.alive || st.over) continue;
      const s = u.st;
      for (const k of ['slow', 'freeze', 'evade', 'rust', 'wither']) if (s[k] > 0) s[k]--;
      if (s.curse > 0) { s.curse--; const d = Math.max(1, Math.round(s.curseDmg)); u.hp = Math.max(0, u.hp - d); emit(st, { t: 'dot', u: ref(u), d, hp: u.hp }); if (u.hp <= 0) { ko(st, u); continue; } }
      u.energy = Math.min(100, u.energy + .25); // +2,5 par seconde
      if (u.name === 'Pikko' && ++u.pollen >= 50) { u.pollen = 0; allies(st, u).forEach(a => heal(st, a, a.max * .02)); } // Pollen
      if (s.freeze > 0) continue;
      const interval = 1300 * 100 / (u.spd * (s.slow > 0 ? .75 : 1));
      u.atb += 100 * TICK / interval;
      if (u.atb >= 100) {
        u.atb -= 100;
        const e = front(st, u); if (!e) continue;
        const mult = s.x2 ? 2 : 1; s.x2 = false;
        emit(st, { t: 'atk', from: ref(u), to: ref(e) });
        hit(st, u, e, mult);
        if (u.alive) u.energy = Math.min(100, u.energy + 7);
        if (u.name === 'Mobu' && e.alive) status(st, e, 'slow', 20);                        // Collant
        if (u.name === 'Kraïos') s.fury = Math.min(10, s.fury + 1);                        // Fureur
        if (u.name === 'Vyolis' && st.rnd() < .2 && !st.over) { const e2 = front(st, u); if (e2) hit(st, u, e2, 1); } // Écho
      }
    }
    if (!st.over && st.tick >= MAX_TICKS) {
      // temps écoulé : l'équipe à qui il reste le plus de PV (en %) gagne
      const pct = st.teams.map(t => t.reduce((s, u) => s + u.hp / u.max, 0));
      st.over = true; st.winner = pct[0] === pct[1] ? -1 : pct[0] > pct[1] ? 0 : 1;
      emit(st, { t: 'end', winner: st.winner, timeout: true });
    }
    return st.ev;
  }

  // ---------- IA (robot, et plus tard l'adversaire absent) : lance ses capacités au bon moment
  const SUPPORT = { 'Mobu': .8, 'Soléo': .75, 'Vyolis': .85, 'Zénith': .6 };
  function ai(st, side) {
    const out = [];
    for (const u of st.teams[side]) {
      if (!canCast(u)) continue;
      const need = SUPPORT[u.name];
      if (need) {
        const team = st.teams[side];
        const low = team.some(a => a.alive && a.hp / a.max < need) || (u.name === 'Zénith' && team.some(a => !a.alive && !a.revived));
        if (!low && u.energy < 100) continue;
        if (!low && st.rnd() > .02) continue; // attend un peu qu'un allié soit blessé
      } else if (st.rnd() > .25) continue;     // petit temps de réaction
      out.push({ side, i: u.i });
    }
    return out;
  }

  return { TICK, MAX_TICKS, EL, elOf, elMult, stats, power, create, step, ai, canCast };
})();
if (typeof window !== 'undefined') window.CB = CB;
