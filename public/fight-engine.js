// Moteur du combat 1v1 en temps réel (règles seulement, aucun affichage). Toutes les valeurs : fight-config.js (FCFG).
//
// Le combat avance par pas fixes (FCFG.TICK_MS). Les jetons attaquent tout seuls la cible de leur équipe.
// Un joueur n'a que deux actions : lancer l'abilité d'un de ses jetons, ou choisir la cible de toute son équipe.
// Déterministe : mêmes équipes + même graine + mêmes actions (horodatées en pas) = même combat.
// Le serveur pourra donc rejouer un match classé à partir des actions pour vérifier le résultat (FE.replay).
const FE = (() => {
  const C = FCFG, TPS = Math.round(1000 / C.TICK_MS);
  const sec = s => Math.round(s * TPS);
  const DEBUFFS = ['burn', 'poison', 'freeze', 'shock', 'vuln'];
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const kit = name => C.TOKENS[name] || C.DEFAULT_TOKEN;

  // Stats d'un jeton : base × niveau × mutation
  function stats(name, lvl = 1, variant = '') {
    const k = kit(name), m = (1 + C.LEVEL_BONUS * (Math.max(1, lvl) - 1)) * (C.MUTATION[variant] || 1);
    return { hp: Math.round(k.hp * m), atk: Math.round(k.atk * m), spd: k.spd };
  }
  // Bonus de famille (élément) d'une équipe : { atk, hp, regen, cdr, crit, list: [[élément, nombre]] }
  function families(team) {
    const n = {}; team.forEach(j => { const e = CB.elOf(j.name); n[e] = (n[e] || 0) + 1; });
    const b = { atk: 0, hp: 0, regen: 0, cdr: 0, crit: 0, list: [] };
    Object.entries(n).forEach(([e, c]) => { if (c < 2 || !C.FAMILY[e]) return; const f = C.FAMILY[e]; b[f.stat] += f.v[Math.min(c, 3) - 2]; b.list.push([e, c]); });
    return b;
  }

  // ---------- Création. teams : [[{ name, lvl, variant }×3], [...]]
  function create(teams, seed = 1) {
    const st = { tick: 0, end: sec(C.MATCH_S), over: false, winner: null, rnd: rng(seed), ev: [], target: [0, 0], fam: teams.map(families) };
    st.units = teams.map((team, side) => team.map((j, i) => {
      const k = kit(j.name), s = stats(j.name, j.lvl, j.variant), f = st.fam[side];
      const max = Math.round(s.hp * (1 + f.hp));
      return { side, i, name: j.name, el: CB.elOf(j.name), lvl: j.lvl || 1, variant: j.variant || '', kind: k.kind, id: k.id, p: k.p,
        max, hp: max, atk: s.atk * (1 + f.atk), spdT: sec(s.spd), next: sec(s.spd * (.55 + .2 * i)),
        cdMax: k.kind === 'abil' ? sec(k.cd * (1 - f.cdr)) : 0, cd: k.kind === 'abil' ? Math.round(sec(k.cd * (1 - f.cdr)) * C.START_CD) : 0,
        s: { burn: 0, poison: 0, freeze: 0, shock: 0, rage: 0, stun: 0, vuln: 0 }, shield: 0, alive: true, revived: false, hits: 0, pt: 0, dealt: 0 };
    }));
    return st;
  }
  const ref = u => ({ side: u.side, i: u.i });
  const emit = (st, e) => st.ev.push({ ...e, tick: st.tick });
  const on = (st, u, s) => u.s[s] > st.tick;
  const alive = (st, side) => st.units[side].filter(u => u.alive);
  // Cible actuelle d'une équipe : celle choisie, ou le premier ennemi encore debout
  function targetOf(st, side) {
    const foes = st.units[1 - side], t = foes[st.target[side]];
    if (t?.alive) return t;
    const n = foes.find(u => u.alive); if (n) st.target[side] = n.i;
    return n || null;
  }
  const elMult = (a, b) => { const m = CB.elMult(a, b); return m > 1 ? C.ELEMENT_MULT.strong : m < 1 ? C.ELEMENT_MULT.weak : 1; };

  // ---------- Dégâts, soins, statuts
  function hurt(st, from, to, base, kind) {
    if (!to?.alive || base <= 0) return 0;
    let m = 1 + (on(st, to, 'shock') ? C.STATUS.shock.vuln : 0) + (on(st, to, 'vuln') ? C.REACTIONS.corrosion.vuln : 0);
    let crit = false;
    if (kind === 'atk' && from && st.fam[from.side].crit && st.rnd() < st.fam[from.side].crit) { crit = true; m *= C.CRIT_MULT; }
    let d = Math.max(1, Math.round(base * m)), abs = 0;
    if (to.shield > 0) { abs = Math.min(to.shield, d); to.shield -= abs; d -= abs; }
    to.hp = Math.max(0, to.hp - d);
    if (from) from.dealt += d + abs;
    emit(st, { t: 'hit', from: from && ref(from), to: ref(to), d, abs, crit, kind, big: d >= to.max * C.BIG_HIT });
    if (kind === 'atk' && from?.alive && to.id === 'thorns' && st.rnd() < to.p.chance) addStatus(st, from, 'poison', to);
    if (to.hp <= 0) ko(st, to);
    return d;
  }
  function heal(st, u, n, quiet) {
    if (!u.alive) return;
    if (on(st, u, 'poison')) n *= C.STATUS.poison.healCut;
    const h = Math.min(Math.round(n), u.max - u.hp); if (h <= 0) return;
    u.hp += h; if (!quiet) emit(st, { t: 'heal', u: ref(u), n: h });
  }
  function shield(st, u, frac) {
    if (!u.alive) return;
    const cap = Math.round(u.max * C.STATUS.shield.max), add = Math.min(Math.round(u.max * frac), cap - u.shield);
    if (add > 0) { u.shield += add; emit(st, { t: 'shield', u: ref(u), n: add }); }
  }
  function ko(st, u) {
    if (!u.alive) return;
    if (u.id === 'phoenix' && !u.revived) { // Takoras : renaît une fois
      u.revived = true; u.hp = Math.round(u.max * u.p.revive); DEBUFFS.forEach(s => { u.s[s] = 0; }); u.s.stun = 0;
      return emit(st, { t: 'revive', u: ref(u) });
    }
    u.alive = false; u.hp = 0; u.shield = 0;
    emit(st, { t: 'ko', u: ref(u) });
  }
  // Pose un statut. S'il croise un statut compatible déjà présent : réaction (les deux sont consommés).
  function addStatus(st, u, s, from, noReact) {
    if (!u?.alive) return;
    if (s === 'rage') { u.s.rage = Math.max(u.s.rage, st.tick + sec(C.STATUS.rage.dur)); return emit(st, { t: 'status', u: ref(u), s }); }
    if (!noReact) for (const [name, r] of Object.entries(C.REACTIONS)) {
      const other = r.a === s ? r.b : r.b === s ? r.a : null;
      if (other && on(st, u, other)) { u.s[other] = 0; return react(st, u, name, r, from); }
    }
    u.s[s] = st.tick + sec(C.STATUS[s].dur);
    emit(st, { t: 'status', u: ref(u), s });
  }
  function react(st, u, name, r, from) {
    emit(st, { t: 'react', u: ref(u), r: name });
    if (r.stun) u.s.stun = Math.max(u.s.stun, st.tick + sec(r.stun));
    if (r.vuln) u.s.vuln = st.tick + sec(r.dur);
    if (name === 'overload') alive(st, u.side).forEach(v => hurt(st, from, v, v.max * r.pct, 'react'));
    else if (r.pct) hurt(st, from, u, u.max * r.pct, 'react');
    if (name === 'contagion') alive(st, u.side).forEach(v => { if (v !== u) addStatus(st, v, 'poison', from, true); });
  }

  // ---------- Abilités
  const CAST = {
    sting(st, u, t) { hurt(st, u, t, u.atk * u.p.dmg, 'abil'); addStatus(st, t, 'poison', u); },
    blizzard(st, u) { alive(st, 1 - u.side).forEach(v => { hurt(st, u, v, u.atk * u.p.dmg, 'abil'); addStatus(st, v, 'freeze', u); }); },
    eruption(st, u, t) { hurt(st, u, t, u.atk * u.p.dmg, 'abil'); addStatus(st, t, 'burn', u); },
    venom(st, u) { alive(st, 1 - u.side).forEach(v => addStatus(st, v, 'poison', u)); },
    bloom(st, u) { alive(st, u.side).forEach(v => { DEBUFFS.forEach(s => { v.s[s] = 0; }); heal(st, v, v.max * u.p.heal); }); },
    starfall(st, u) { alive(st, 1 - u.side).forEach(v => { hurt(st, u, v, u.atk * u.p.dmg, 'abil'); addStatus(st, v, 'shock', u); }); },
    leap(st, u) { alive(st, u.side).forEach(v => { v.s.rage = Math.max(v.s.rage, st.tick + sec(u.p.dur)); emit(st, { t: 'status', u: ref(v), s: 'rage' }); }); },
    surge(st, u, t) {
      hurt(st, u, t, u.atk * u.p.dmg, 'abil'); addStatus(st, t, 'shock', u);
      alive(st, u.side).forEach(v => { if (v !== u && v.cdMax) { v.cd = Math.max(0, v.cd - sec(u.p.refund)); emit(st, { t: 'charge', u: ref(v) }); } });
    },
    void(st, u, t) { hurt(st, u, t, t.hp / t.max < u.p.below ? t.hp + t.shield : u.atk * u.p.dmg, 'abil'); },
  };
  const canCast = (st, u) => u.alive && u.kind === 'abil' && u.cd <= 0 && !on(st, u, 'stun') && !st.over;
  function cast(st, u) {
    const t = targetOf(st, u.side); if (!t) return;
    u.cd = u.cdMax;
    emit(st, { t: 'abil', u: ref(u), id: u.id, to: ref(t) });
    CAST[u.id]?.(st, u, t);
  }

  // ---------- Attaque automatique
  function attack(st, u) {
    const t = targetOf(st, u.side); if (!t) return;
    u.hits++;
    let d = u.atk * elMult(u.el, t.el) * (on(st, u, 'rage') ? 1 + C.STATUS.rage.atk : 1) * (C.RAND[0] + st.rnd() * (C.RAND[1] - C.RAND[0]));
    if (u.id === 'execute' && t.hp / t.max < u.p.below) d *= u.p.mult;
    emit(st, { t: 'atk', u: ref(u), to: ref(t) });
    hurt(st, u, t, d, 'atk');
    if (u.id === 'sparks' && u.hits % u.p.every === 0) addStatus(st, t, 'burn', u);
    if (u.id === 'abyss' && u.hits % u.p.every === 0) alive(st, t.side).forEach(v => { if (v !== t) hurt(st, u, v, d * u.p.splash, 'splash'); });
  }

  // ---------- Un pas de combat. actions : [{ side, type: 'abil' | 'target', i }]
  function step(st, actions = []) {
    if (st.over) return st;
    for (const a of actions) {
      if (a.type === 'target') { const v = st.units[1 - a.side][a.i]; if (v?.alive) { st.target[a.side] = a.i; emit(st, { t: 'target', side: a.side, i: a.i }); } }
      if (a.type === 'abil') { const u = st.units[a.side][a.i]; if (u && canCast(st, u)) cast(st, u); }
    }
    const everySec = st.tick % TPS === 0;
    for (const side of [0, 1]) for (const u of st.units[side]) {
      if (!u.alive) continue;
      if (u.cd > 0) u.cd--;
      if (everySec && st.tick) {
        if (on(st, u, 'burn')) hurt(st, null, u, u.max * C.STATUS.burn.pct, 'dot');
        if (u.alive && on(st, u, 'poison')) hurt(st, null, u, u.max * C.STATUS.poison.pct, 'dot');
        if (u.alive && st.fam[side].regen) heal(st, u, u.max * st.fam[side].regen, true);
      }
      if (!u.alive) continue;
      // passifs à minuterie
      if (u.p.every && u.id !== 'sparks' && u.id !== 'abyss' && ++u.pt >= sec(u.p.every)) {
        u.pt = 0;
        const low = alive(st, side).sort((a, b) => a.hp / a.max - b.hp / b.max)[0];
        if (u.id === 'bubble') shield(st, low, u.p.shield);
        if (u.id === 'tide' && low.hp < low.max) heal(st, low, low.max * u.p.heal);
      }
      if (u.id === 'bloodrage' && u.hp / u.max < u.p.below && u.s.rage < 1e9) { u.s.rage = 1e9; emit(st, { t: 'status', u: ref(u), s: 'rage' }); }
      // attaque
      if (on(st, u, 'stun')) { u.next = Math.max(u.next, u.s.stun); continue; }
      if (st.tick >= u.next) {
        attack(st, u);
        u.next = st.tick + Math.max(2, Math.round(u.spdT * (on(st, u, 'freeze') ? C.STATUS.freeze.slow : 1) / (on(st, u, 'rage') ? C.STATUS.rage.speed : 1)));
      }
    }
    const up = [0, 1].map(s => alive(st, s).length);
    st.tick++;
    if (!up[0] || !up[1] || st.tick >= st.end) {
      st.over = true;
      if (!up[0] && !up[1]) st.winner = null;
      else if (!up[0]) st.winner = 1;
      else if (!up[1]) st.winner = 0;
      else { const p = pct(st); st.winner = p[0] === p[1] ? null : p[0] > p[1] ? 0 : 1; }
      emit(st, { t: 'end', winner: st.winner, time: !(!up[0] || !up[1]) });
    }
    return st;
  }
  const pct = st => [0, 1].map(s => { const u = st.units[s]; return u.reduce((x, v) => x + v.hp, 0) / u.reduce((x, v) => x + v.max, 0); });

  // ---------- IA : lance ses abilités de façon assez intelligente (pas parfaitement) et change parfois de cible
  function ai(st, side, mem, level = 'normal') {
    const L = C.AI[level], out = [], r = mem.rnd ||= rng((mem.seed || 7) * 7919);
    const foes = alive(st, 1 - side), mine = alive(st, side);
    if (!foes.length) return out;
    if (L.smart && st.tick >= (mem.retarget || 0)) {
      mem.retarget = st.tick + sec(3 + r() * 3);
      if (r() < L.smart) { const low = foes.sort((a, b) => a.hp / a.max - b.hp / b.max)[0]; if (low.i !== st.target[side]) out.push({ side, type: 'target', i: low.i }); }
    }
    const t = targetOf(st, side);
    for (const u of mine) {
      if (!canCast(st, u)) { mem[u.i] = null; continue; }
      if (mem[u.i] == null) mem[u.i] = st.tick + sec(L.react[0] + r() * (L.react[1] - L.react[0]));
      if (st.tick < mem[u.i]) continue;
      const waited = st.tick - mem[u.i], smart = r() < L.smart || waited > sec(8);
      let go = true;
      if (smart && waited < sec(8)) {
        if (u.id === 'bloom') go = mine.some(v => v.hp / v.max < .6 || DEBUFFS.some(s => on(st, v, s)));
        if (u.id === 'void') go = t && t.hp / t.max < u.p.below;
        if (u.id === 'starfall' || u.id === 'surge') go = !t || on(st, t, 'freeze') || on(st, t, 'burn') || on(st, t, 'poison') || waited > sec(4);
        if (u.id === 'leap') go = foes.length > 0 && waited > sec(1);
      }
      if (go) { out.push({ side, type: 'abil', i: u.i }); mem[u.i] = null; }
    }
    return out;
  }

  // Rejoue un match entier à partir des actions horodatées (pour vérifier un résultat côté serveur)
  function replay(teams, seed, actions) {
    const st = create(teams, seed), by = {};
    actions.forEach(a => { (by[a.tick] ||= []).push(a); });
    while (!st.over) step(st, by[st.tick]);
    return st;
  }

  return { TPS, sec, kit, stats, families, create, step, ai, replay, targetOf, canCast, on, pct, DEBUFFS };
})();
