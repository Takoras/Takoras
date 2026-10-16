// Copie de public/battle-engine.js (à garder identique) + export pour le serveur.
// Moteur de combat : les règles, sans aucun affichage. Le même fichier tourne dans le navigateur (combat contre le robot)
// et sur le serveur (fonction Supabase « battle », combats entre amis) : impossible de tricher en ligne.
// Chaque action renvoie la liste de ce qui s'est passé (events) ; le site les rejoue avec les animations.
//
// Un tour : je choisis un de mes jetons, une cible ; je peux lancer sa capacité (si rechargée, réussit toujours) ;
// puis l'attaque : 15 % de chance de rater, 15 % de critique ×1,5. Ensuite c'est à l'autre camp.

const ENGINE = (() => {
  // Stats : mêmes formules que statsOf() du site
  const strHash = s => [...String(s ?? '')].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  function stats(name, odds) {
    const lvl = Math.log10(Math.max(1, odds)) / 6, h = strHash(name);
    const r = i => ((h >>> (i * 5)) % 31) / 30 - .5;
    return { hp: Math.round(100 + 30 * lvl + 8 * r(0)), atk: Math.round(20 + 7 * lvl + 3 * r(1)), def: Math.round(4 + 4 * lvl + 2 * r(2)), spd: Math.round(10 + 7 * lvl + 4 * r(3)) };
  }
  // Recharge de chaque capacité (en tours)
  const CD = { 'Mobu': 2, 'Pikko': 2, 'Rouillé': 3, 'Givre': 3, 'Soléo': 3, 'Azura': 3, 'Carmin': 2, 'Vyolis': 3, 'Lumis': 3, 'Nyx': 3, 'Astra': 3, 'Kraïos': 3, 'Chronos': 4, 'Néphéris': 3, 'Zénith': 3, 'Oblivion': 3, 'Takoras': 3 };
  const cdOf = name => CD[name] || 2;

  const alive = u => u && u.hp > 0;
  const canAct = u => alive(u) && !u.frozen;
  const weakest = list => list.filter(alive).sort((a, b) => a.hp / a.max - b.hp / b.max)[0];

  function unit(name, odds, side, i) {
    const s = stats(name, odds);
    return { side, i, name, odds, hp: s.hp, max: s.hp, atk: s.atk, def: s.def, spd: s.spd, shield: 0, cd: 0, frozen: false, curse: 0, dodge: false, blind: false, rust: 0, fury: 0 };
  }

  // decks : [[{name, odds}×3], [{name, odds}×3]]
  function create(decks, rnd = Math.random) {
    const st = { teams: decks.map((d, side) => d.map((j, i) => unit(j.name, j.odds, side, i))), turn: 0, n: 1, over: false, winner: null, timeouts: [0, 0] };
    const sp = st.teams.map(t => t.reduce((s, u) => s + u.spd, 0));
    st.turn = sp[0] === sp[1] ? (rnd() < .5 ? 0 : 1) : sp[0] > sp[1] ? 0 : 1;
    const ev = [{ t: 'start', side: st.turn }];
    beginTurn(st, ev);
    return { state: st, events: ev };
  }

  // Petites actions, chacune laisse une trace dans events
  const ref = u => ({ side: u.side, i: u.i });
  function shieldOf(st, ev, u, n) { if (alive(u)) { u.shield += n; ev.push({ t: 'shield', ...ref(u), n, shield: u.shield }); } }
  function healOf(st, ev, u, n) { if (!alive(u)) return; const h = Math.min(n, u.max - u.hp); u.hp += h; ev.push({ t: 'heal', ...ref(u), n: h, hp: u.hp }); }
  function hurt(st, ev, u, n, pierce = false, crit = false) {
    if (!alive(u)) return 0;
    let d = Math.max(0, Math.round(n)), sh = 0;
    if (!pierce && u.shield) { sh = Math.min(u.shield, d); u.shield -= sh; d -= sh; }
    u.hp = Math.max(0, u.hp - d);
    ev.push({ t: 'hit', ...ref(u), d, sh, crit, hp: u.hp, shield: u.shield });
    if (!alive(u)) ev.push({ t: 'ko', ...ref(u) });
    return d;
  }

  // Effets des capacités (l'animation de chacune est côté site)
  const RUN = {
    'Mobu': (c, st, ev) => shieldOf(st, ev, c.me, 35),
    'Pikko': c => { c.mult *= 1.5; },
    'Rouillé': c => { c.foe.def = Math.max(0, c.foe.def - 4); c.foe.rust += 4; },
    'Givre': c => { c.foe.frozen = true; },
    'Soléo': (c, st, ev) => healOf(st, ev, c.heal, 40),
    'Azura': (c, st, ev) => c.enemies.forEach(e => hurt(st, ev, e, 12, true)),
    'Carmin': c => { c.steal = .6; },
    'Vyolis': (c, st, ev) => c.allies.forEach(a => shieldOf(st, ev, a, 20)),
    'Lumis': c => { c.foe.blind = true; },
    'Nyx': c => { c.me.dodge = true; },
    'Astra': c => { c.sure = true; c.critBoost = .5; },
    'Kraïos': c => { c.me.atk += 6; c.me.fury += 6; },
    'Chronos': c => { c.allies.forEach(a => { if (a !== c.me) a.cd = 0; }); c.mult *= 1.25; },
    'Néphéris': c => { c.foe.curse = 3; },
    'Zénith': (c, st, ev) => c.allies.forEach(a => healOf(st, ev, a, 22)),
    'Oblivion': (c, st, ev) => hurt(st, ev, c.foe, 30, true),
    'Takoras': (c, st, ev) => { c.mult *= 2; shieldOf(st, ev, c.me, 25); },
  };

  // Début du tour d'un camp : recharges, malédictions ; s'il ne peut rien jouer (tout gelé), on passe
  function beginTurn(st, ev, guard = 0) {
    const team = st.teams[st.turn];
    ev.push({ t: 'turn', side: st.turn, n: st.n });
    team.forEach(u => {
      if (u.cd > 0) u.cd--;
      if (alive(u) && u.curse > 0) { u.curse--; ev.push({ t: 'curse', ...ref(u) }); hurt(st, ev, u, 12, true); }
    });
    if (checkEnd(st, ev)) return;
    if (!team.some(canAct) && guard < 2) { ev.push({ t: 'skip', side: st.turn }); endTurn(st, ev, guard + 1); }
  }
  function endTurn(st, ev, guard = 0) {
    st.teams[st.turn].forEach(u => { u.frozen = false; });
    if (checkEnd(st, ev)) return;
    st.turn = 1 - st.turn;
    if (st.turn === 0) st.n++;
    beginTurn(st, ev, guard);
  }
  function checkEnd(st, ev) {
    if (st.over) return true;
    const lost = st.teams.map(t => !t.some(alive));
    if (!lost[0] && !lost[1]) return false;
    st.over = true; st.winner = lost[0] ? 1 : 0;
    ev.push({ t: 'end', winner: st.winner });
    return true;
  }

  // Jouer un tour. rig (debug robot) : 'c' = toujours critique, 'm' = toujours raté (seulement pour le camp 0)
  function act(st, side, ui, ti, useAbil, rnd = Math.random, rig = 'n') {
    if (st.over) throw new Error('battle_over');
    if (side !== st.turn) throw new Error('not_your_turn');
    const me = st.teams[side][ui], enemies = st.teams[1 - side], foe = enemies[ti];
    if (!canAct(me)) throw new Error('bad_unit');
    if (!alive(foe)) throw new Error('bad_target');
    st.timeouts[side] = 0;
    const ev = [];
    const c = { me, foe, allies: st.teams[side], enemies, mult: 1, steal: 0, sure: false, critBoost: 0, heal: null };
    if (useAbil && me.cd === 0) {
      if (me.name === 'Soléo') c.heal = weakest(c.allies);
      ev.push({ t: 'abil', ...ref(me), ti, name: me.name, heal: c.heal ? ref(c.heal) : null });
      me.cd = cdOf(me.name) + 1; // +1 : elle redescend au début de ton prochain tour
      (RUN[me.name] || RUN.Mobu)(c, st, ev);
      if (checkEnd(st, ev)) return ev;
    }
    if (alive(foe)) {
      let r = rnd();
      if (side === 0 && rig === 'c') r = .99;
      if (side === 0 && rig === 'm') r = 0;
      const miss = !c.sure && r < .15, crit = !miss && (r > .85 || rnd() < c.critBoost);
      ev.push({ t: 'atk', ...ref(me), ti, miss, crit });
      if (!miss) {
        if (foe.dodge) { foe.dodge = false; ev.push({ t: 'dodge', ...ref(foe) }); }
        else {
          let dmg = (me.atk * 2 - foe.def) * c.mult * (.9 + rnd() * .2) * (crit ? 1.5 : 1);
          if (me.blind) dmg /= 2;
          const d = hurt(st, ev, foe, Math.max(6, dmg), false, crit);
          if (c.steal && d) healOf(st, ev, me, Math.round(d * c.steal));
        }
      }
      me.blind = false;
    }
    endTurn(st, ev);
    return ev;
  }

  // Temps écoulé : le tour passe ; 3 fois de suite = défaite
  function timeout(st) {
    const ev = [];
    if (st.over) return ev;
    const side = st.turn;
    st.timeouts[side] = (st.timeouts[side] || 0) + 1;
    ev.push({ t: 'timeout', side, count: st.timeouts[side] });
    if (st.timeouts[side] >= 3) { st.over = true; st.winner = 1 - side; ev.push({ t: 'end', winner: st.winner, afk: side }); return ev; }
    endTurn(st, ev);
    return ev;
  }
  function forfeit(st, side) {
    if (st.over) return [];
    st.over = true; st.winner = 1 - side;
    return [{ t: 'end', winner: st.winner, forfeit: side }];
  }

  return { stats, cdOf, create, act, timeout, forfeit, alive, canAct };
})();
export { ENGINE };
