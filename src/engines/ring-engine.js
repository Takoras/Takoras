// Moteur du Ring (repris de legacy/ring-engine.js). Référence depuis la phase 8 : maps (taille, glisse, obstacles).
// Sans map (create(teams)), le résultat est EXACTEMENT celui de l'ancien moteur : replay.test.ts le vérifie.
import { RCFG } from './ring-config.js';
// « Ring » : moteur physique maison (règles seulement, aucun affichage). Valeurs : ring-config.js (RCFG).
//
// Cercles, chocs élastiques, frottement du sol, pas de temps fixe. 100 % déterministe :
// pas de Math.random ni de trigonométrie dans la simulation (seulement + − × ÷ et √, exacts partout),
// et positions / vitesses arrondies à chaque pas. Mêmes positions + mêmes tirs = exactement le même résultat,
// sur tous les navigateurs et sur le serveur (qui rejouera les tours du classé).
// Un tir : { i (jeton), ax, ay (direction, entiers), f (force 0..1, au centième), pow (pouvoir activé ?) }
const RG = (() => {
  const C = RCFG, Q = C.QUANT, q = x => Math.round(x * Q) / Q;
  const kit = name => C.TOKENS[name] || C.DEFAULT_TOKEN;
  const len = (x, y) => Math.sqrt(x * x + y * y);
  // Stats physiques : base × niveau × mutation (poids et puissance ; la taille ne change pas)
  function stats(name, lvl = 1, variant = '') {
    const k = kit(name), m = (1 + C.LEVEL_BONUS * (Math.max(1, lvl) - 1)) * (C.MUTATION[variant] || 1);
    return { mass: k.mass * m, power: k.power * m, r: k.r };
  }
  // teams : [[{ name, lvl, variant }×3] ×2]
  // map (facultative) : un id de C.MAPS. Le terrain grandit avec la map, les départs aussi.
  function create(teams, mapId) {
    const st = { turn: 1, over: false, winner: null, sudden: false, bodies: [] };
    const map = mapId ? C.MAPS.find(m => m.id === mapId) : null;
    if (map) st.map = { id: map.id, R: map.R, fric: map.fric, obs: map.obs.map(o => ({ ...o })) };
    const k0 = map ? map.R / C.RING_R : 1;
    teams.forEach((team, side) => team.forEach((j, i) => {
      const s = stats(j.name, j.lvl, j.variant), k = kit(j.name);
      st.bodies.push({ id: side * 3 + i, side, i, name: j.name, lvl: j.lvl || 1, variant: j.variant || '', pw: k.pw, base: s, mass: s.mass, power: s.power, r: s.r,
        x: map ? q(C.START_X[i] * k0) : C.START_X[i], y: (side ? -1 : 1) * (map ? q(C.START_Y * k0) : C.START_Y), vx: 0, vy: 0, alive: true, cd: 0, spent: false });
    }));
    return st;
  }
  const ringR = st => st.map ? st.map.R : C.RING_R;
  const obsOf = st => st.map ? st.map.obs : [];
  const clone = st => JSON.parse(JSON.stringify(st));
  const alive = (st, side) => st.bodies.filter(b => b.alive && !b.tmp && (side == null || b.side === side));
  const ready = b => b.alive && b.pw !== 'none' && b.cd === 0 && !b.spent;

  // ---------- Un tour : les deux tirs partent en même temps. Renvoie { frames, ev } pour l'animation.
  // shots : [tir du joueur 0 | null, tir du joueur 1 | null]. opts.preview : on s'arrête peu après le premier choc.
  function resolve(st, shots, opts = {}) {
    const B = st.bodies, ev = [], frames = [], start = [0, 1].map(s => alive(st, s).length);
    const dt = C.DT, RR = ringR(st), OBS = obsOf(st), GF = st.map ? st.map.fric : 1;
    B.forEach(b => { b.t = { fric: 1, bounce: false, ghost: false, shield: false, anchor: false, shooter: false, v0: 0, hit: false, stopped: false, el: 0, pw: null }; });
    // pouvoirs et lancers
    const fired = [];
    shots.forEach((s, side) => {
      if (!s) return;
      const b = B.find(x => x.side === side && x.i === s.i && x.alive && !x.tmp); if (!b) return;
      const T = b.t, k = kit(b.name), usePw = s.pow && ready(b);
      if (usePw) {
        T.pw = b.pw; ev.push({ t: 'power', id: b.id, pw: b.pw, at: 0 });
        if (b.pw === 'grow') { b.r = b.base.r * k.p.r; b.mass = b.base.mass * k.p.mass; }
        if (b.pw === 'scrap') b.mass = b.base.mass * k.p.mass;
        if (b.pw === 'slide') T.fric = k.p.friction;
        if (b.pw === 'bounce') T.bounce = true;
        if (b.pw === 'ghost') T.ghost = true;
        if (b.pw === 'shrink') b.r = b.base.r * k.p.r;
        if (b.pw === 'anchor') T.anchor = true;
        if (b.pw === 'shield') T.shield = true;
        if (b.pw === 'roots') alive(st, side).forEach(a => { a.t.bounce = true; });
        if (b.pw === 'rescue') {
          const far = alive(st, side).filter(a => a !== b).sort((a, c) => len(c.x, c.y) - len(a.x, a.y))[0];
          if (far) { const d = len(far.x, far.y), m = Math.min(k.p.pull, d) / (d || 1); far.x = q(far.x - far.x * m); far.y = q(far.y - far.y * m); ev.push({ t: 'rescue', id: far.id, by: b.id, at: 0 }); }
        }
        b.cd = k.cd; if (!k.cd) b.spent = true;
      }
      if (T.anchor) return; // l'ancre ne tire pas
      const f = Math.max(0, Math.min(1, s.f)), d = len(s.ax, s.ay);
      if (f < C.MIN_FORCE || !d) return;
      const sp = f * b.power * (T.pw === 'shrink' ? k.p.power : 1);
      b.vx = q(s.ax / d * sp); b.vy = q(s.ay / d * sp);
      T.shooter = true; T.v0 = sp; fired.push(b.id);
      ev.push({ t: 'shot', id: b.id, at: 0, f });
    });
    let tm = 0, steps = 0, firstHit = -1;
    const maxSteps = Math.round(C.MAX_SIM_S / dt);
    const rec = () => frames.push(B.map(b => b.alive ? [b.x, b.y, b.r] : null));
    rec();
    for (; steps < maxSteps; steps++) {
      tm = q((steps + 1) * dt);
      const list = B.filter(b => b.alive);
      // déplacement + pouvoirs pendant le trajet
      for (const b of list) {
        const T = b.t; let s = len(b.vx, b.vy);
        if (T.pw === 'curve' && s > C.STOP_SPEED && !T.hit) {
          const foe = alive(st, 1 - b.side).sort((a, c) => len(a.x - b.x, a.y - b.y) - len(c.x - b.x, c.y - b.y))[0];
          if (foe) { const dx = foe.x - b.x, dy = foe.y - b.y, dd = len(dx, dy) || 1, k = kit(b.name).p.turn * dt; const nx = b.vx / s + dx / dd * k, ny = b.vy / s + dy / dd * k, nn = len(nx, ny); b.vx = nx / nn * s; b.vy = ny / nn * s; }
        }
        if (T.pw === 'split' && !T.split && T.shooter && tm >= kit(b.name).p.at) {
          T.split = true;
          const sp = kit(b.name).p.spread, px = -b.vy, py = b.vx;
          const c = { ...b, id: 100 + b.id, tmp: true, t: { ...T, split: true } };
          const rot = (vx, vy, sg) => { const nx = vx + px * sp * sg, ny = vy + py * sp * sg, k = s / (len(nx, ny) || 1); return [nx * k, ny * k]; };
          [b.vx, b.vy] = rot(b.vx, b.vy, 1); [c.vx, c.vy] = rot(c.vx, c.vy, -1);
          B.push(c); list.push(c); ev.push({ t: 'split', id: b.id, cid: c.id, at: tm });
        }
        if (T.pw === 'second' && !T.boost && T.shooter && s > 0 && s < T.v0 * kit(b.name).p.at) {
          T.boost = true; const k = T.v0 * kit(b.name).p.boost / s; b.vx *= k; b.vy *= k; s = len(b.vx, b.vy); ev.push({ t: 'boost', id: b.id, at: tm });
        }
        b.x += b.vx * dt; b.y += b.vy * dt;
        // frottement
        if (s > 0) { const ns = Math.max(0, s - C.FRICTION * T.fric * GF * dt) * (1 - C.DRAG * dt), k = ns / s; b.vx *= k; b.vy *= k; }
      }
      // chocs entre jetons
      for (let a = 0; a < list.length; a++) for (let c = a + 1; c < list.length; c++) {
        const A = list[a], Cc = list[c];
        if (!A.alive || !Cc.alive) continue;
        if ((A.t.ghost && len(A.vx, A.vy) > C.STOP_SPEED) || (Cc.t.ghost && len(Cc.vx, Cc.vy) > C.STOP_SPEED)) continue;
        if (A.tmp && Cc.tmp) continue;
        if ((A.tmp && Cc.id === A.id - 100) || (Cc.tmp && A.id === Cc.id - 100)) continue; // un double ne tape pas son original
        let dx = Cc.x - A.x, dy = Cc.y - A.y; const d = len(dx, dy), rr = A.r + Cc.r;
        if (d >= rr) continue;
        const nx = d ? dx / d : 0, ny = d ? dy / d : 1;
        const inv = (X, Y) => X.t.anchor || (X.t.shield && X.side !== Y.side) ? 0 : 1 / X.mass;
        const iA = inv(A, Cc), iC = inv(Cc, A); if (!iA && !iC) continue;
        const ov = rr - d;
        A.x -= nx * ov * iA / (iA + iC); A.y -= ny * ov * iA / (iA + iC);
        Cc.x += nx * ov * iC / (iA + iC); Cc.y += ny * ov * iC / (iA + iC);
        const vrel = (Cc.vx - A.vx) * nx + (Cc.vy - A.vy) * ny;
        if (vrel >= 0) continue;
        const j = -(1 + C.RESTITUTION) * vrel / (iA + iC);
        A.vx -= j * iA * nx; A.vy -= j * iA * ny; Cc.vx += j * iC * nx; Cc.vy += j * iC * ny;
        // frappe ×2 et néant : sur le premier choc du tireur
        for (const [S, O, sg] of [[A, Cc, 1], [Cc, A, -1]]) {
          if (S.t.hit || !S.t.shooter) continue;
          const iO = O === Cc ? iC : iA;
          if (S.t.pw === 'double') { const k = (kit(S.name).p.mult - 1) * j * iO * sg; O.vx += k * nx; O.vy += k * ny; ev.push({ t: 'double', id: S.id, to: O.id, at: tm }); }
          if (S.t.pw === 'void' && O.side !== S.side && iO) { const dd = len(O.x, O.y) || 1, k = kit(S.name).p.push / O.mass; O.vx = O.x / dd * k; O.vy = O.y / dd * k; ev.push({ t: 'void', id: S.id, to: O.id, at: tm }); }
          S.t.hit = true;
        }
        A.t.hit = A.t.hit || A.t.shooter; Cc.t.hit = Cc.t.hit || Cc.t.shooter;
        ev.push({ t: 'hit', a: A.id, b: Cc.id, j: Math.round(Math.abs(j)), x: q(A.x + nx * A.r), y: q(A.y + ny * A.r), at: tm });
        if (firstHit < 0) firstHit = steps;
      }
      // obstacles (fixes) : le jeton rebondit dessus (k < 1 amortit, k > 1 renvoie plus fort)
      if (OBS.length) for (const b of list) {
        if (!b.alive) continue;
        for (const o of OBS) {
          const dx = b.x - o.x, dy = b.y - o.y, d = len(dx, dy), rr = b.r + o.r;
          if (d >= rr) continue;
          const nx = d ? dx / d : 0, ny = d ? dy / d : 1;
          b.x = o.x + nx * rr; b.y = o.y + ny * rr;
          const vn = b.vx * nx + b.vy * ny;
          if (vn >= 0) continue;
          b.vx -= (1 + o.k) * vn * nx; b.vy -= (1 + o.k) * vn * ny;
          if (b.t.shooter) b.t.hit = true;
          ev.push({ t: 'wall', id: b.id, x: q(o.x + nx * o.r), y: q(o.y + ny * o.r), k: o.k, j: Math.round(-vn), at: tm });
        }
      }
      // bord du ring
      for (const b of list) {
        if (!b.alive) continue;
        const d = len(b.x, b.y);
        if (d <= RR) continue;
        const nx = b.x / d, ny = b.y / d;
        if (b.t.bounce && !b.tmp) {
          const vn = b.vx * nx + b.vy * ny;
          if (vn > 0) { b.vx -= 2 * vn * nx; b.vy -= 2 * vn * ny; ev.push({ t: 'edge', id: b.id, x: q(nx * RR), y: q(ny * RR), at: tm }); }
          b.x = nx * RR; b.y = ny * RR;
        } else {
          b.alive = false;
          if (!b.tmp) ev.push({ t: 'out', id: b.id, x: q(b.x), y: q(b.y), vx: q(b.vx), vy: q(b.vy), at: tm });
        }
      }
      // à l'arrêt : éruption (repousse tout) et aimant (attire les ennemis)
      for (const b of list) {
        const T = b.t, s = len(b.vx, b.vy);
        if (s > C.STOP_SPEED) continue;
        b.vx = 0; b.vy = 0;
        if (!b.alive || T.stopped || !(T.pw === 'eruption' || T.pw === 'magnet')) continue;
        T.stopped = true;
        const p = kit(b.name).p;
        ev.push({ t: T.pw, id: b.id, x: q(b.x), y: q(b.y), at: tm });
        for (const o of B) {
          if (o === b || !o.alive || o.tmp || (T.pw === 'magnet' && o.side === b.side)) continue;
          const dx = o.x - b.x, dy = o.y - b.y, d = len(dx, dy);
          if (d > p.radius || !d) continue;
          const k = (T.pw === 'eruption' ? 1 : -1) * p[T.pw === 'eruption' ? 'push' : 'pull'] * (1 - d / p.radius) / (o.t.anchor ? 1e9 : o.mass);
          o.vx += dx / d * k; o.vy += dy / d * k;
        }
      }
      // arrondi : chaque pas donne exactement le même résultat partout
      for (const b of B) { b.x = q(b.x); b.y = q(b.y); b.vx = q(b.vx); b.vy = q(b.vy); }
      rec();
      if (opts.preview && firstHit >= 0 && steps - firstHit > opts.preview) break;
      const moving = B.some(b => b.alive && len(b.vx, b.vy) > C.STOP_SPEED);
      const pending = B.some(b => b.alive && (b.t.pw === 'eruption' || b.t.pw === 'magnet') && !b.t.stopped && b.t.shooter);
      if (!moving && !pending) break;
    }
    // séparation douce des jetons qui se chevauchent encore (fantôme arrêté sur un autre)
    for (let it = 0; it < 30; it++) {
      let any = false;
      const list = B.filter(b => b.alive && !b.tmp);
      for (let a = 0; a < list.length; a++) for (let c = a + 1; c < list.length; c++) {
        const A = list[a], Cc = list[c], dx = Cc.x - A.x, dy = Cc.y - A.y, d = len(dx, dy), rr = A.r + Cc.r;
        if (d >= rr) continue; any = true;
        const nx = d ? dx / d : 0, ny = d ? dy / d : 1, h = (rr - d) / 2 + .5;
        A.x = q(A.x - nx * h); A.y = q(A.y - ny * h); Cc.x = q(Cc.x + nx * h); Cc.y = q(Cc.y + ny * h);
      }
      for (const b of list) { const d = len(b.x, b.y); if (d > RR) { b.alive = false; ev.push({ t: 'out', id: b.id, x: b.x, y: b.y, vx: 0, vy: 0, at: tm }); } }
      if (!any) break;
    }
    if (opts.preview) return { frames, ev, firstHit };
    // fin du tour : les doubles disparaissent, les pouvoirs du tour s'arrêtent, recharges
    st.bodies = B.filter(b => !b.tmp);
    st.bodies.forEach(b => {
      b.r = b.base.r; b.mass = b.base.mass; b.vx = 0; b.vy = 0;
      if (b.cd > 0) b.cd--; // recharge « 3 tours » : utilisé au tour 1, de nouveau prêt au tour 4
      delete b.t;
    });
    endTurn(st, start, ev);
    return { frames, ev, ids: B.map(b => b.id) };
  }

  // ---------- Fin de tour : victoire, mort subite, limite de tours
  function endTurn(st, start, ev) {
    const n = [0, 1].map(s => alive(st, s).length);
    if (!n[0] || !n[1]) {
      if (n[0] || n[1]) return finish(st, n[0] ? 0 : 1, ev, 'out');
      if (start[0] !== start[1]) return finish(st, start[0] > start[1] ? 0 : 1, ev, 'count');
      if (st.sudden) return finish(st, null, ev, 'draw');
      // mort subite : 1 jeton chacun près du centre
      st.sudden = true;
      [0, 1].forEach(s => {
        const b = st.bodies.find(x => x.side === s && x.i === 0) || st.bodies.find(x => x.side === s);
        // sur une map : on recule le jeton tant qu'il touche un obstacle (toujours pareil, donc déterministe)
        let y = C.SUDDEN_Y;
        while (obsOf(st).some(o => len(0 - o.x, (s ? -y : y) - o.y) < b.base.r + o.r + 10)) y += 20;
        Object.assign(b, { alive: true, x: 0, y: s ? -y : y, vx: 0, vy: 0 });
      });
      ev.push({ t: 'sudden' });
      st.turn++;
      return;
    }
    st.turn++;
    if (st.turn > C.TURNS + (st.sudden ? 3 : 0)) {
      if (n[0] !== n[1]) return finish(st, n[0] > n[1] ? 0 : 1, ev, 'turns');
      const dist = s => alive(st, s).reduce((x, b) => x + len(b.x, b.y), 0);
      const d = [dist(0), dist(1)];
      return finish(st, d[0] === d[1] ? null : d[0] < d[1] ? 0 : 1, ev, 'center');
    }
  }
  function finish(st, w, ev, why) { st.over = true; st.winner = w; ev.push({ t: 'end', winner: w, why }); }

  // ---------- IA : essaie plein de tirs dans la simulation (en supposant que l'adversaire ne bouge pas) et garde le meilleur,
  // puis ajoute une petite imprécision pour rester crédible. rnd : hasard hors simulation (fourni par l'écran).
  function score(st, side) {
    const me = alive(st, side), foe = alive(st, 1 - side);
    if (!foe.length && me.length) return 1e6;
    return (3 - foe.length) * 1000 - (3 - me.length) * 1200 + foe.reduce((x, b) => x + len(b.x, b.y), 0) * .45 - me.reduce((x, b) => x + len(b.x, b.y), 0) * .3;
  }
  function aiShot(st, side, level = 'normal', rnd = Math.random) {
    const L = C.AI[level]; if (!L?.shoots) return null;
    let best = null, bestS = -Infinity;
    const base = score(st, side);
    for (const b of alive(st, side)) for (const pow of ready(b) ? [false, true] : [false]) {
      if (pow && b.pw === 'anchor') {
        const s = score(st, side) + 150; // rester planté si on est menacé : petit bonus
        if (s > bestS && alive(st, side).some(x => len(x.x, x.y) > 650)) { bestS = s; best = { i: b.i, ax: 0, ay: -1, f: 0, pow: true }; }
        continue;
      }
      // avec des obstacles, l'IA essaie aussi des tirs un peu de biais (bandes, contournements)
      const tilts = obsOf(st).length ? [0, .22, -.22] : [0];
      for (const foe of alive(st, 1 - side)) for (const f of [.55, .8, 1]) for (const tl of tilts) {
        const dx0 = foe.x - b.x, dy0 = foe.y - b.y;
        const shot = { i: b.i, ax: Math.round(dx0 - dy0 * tl), ay: Math.round(dy0 + dx0 * tl), f, pow };
        const sim = clone(st), sh = [null, null]; sh[side] = shot;
        resolve(sim, sh);
        const s = (sim.over ? (sim.winner === side ? 1e6 : sim.winner === 1 - side ? -1e6 : 0) : score(sim, side)) - (pow ? 120 : 0) + rnd() * 60;
        if (s > bestS) { bestS = s; best = shot; }
      }
    }
    if (!best || bestS < base - 400) return null;
    if (best.f) { // imprécision : petit décalage d'angle et de force
      const e = (rnd() * 2 - 1) * L.aimErr, px = -best.ay, py = best.ax;
      best = { ...best, ax: Math.round(best.ax + px * e), ay: Math.round(best.ay + py * e), f: Math.round(Math.max(.2, Math.min(1, best.f * (1 + (rnd() * 2 - 1) * L.forceErr))) * 100) / 100 };
    }
    return best;
  }

  return { kit, stats, create, clone, alive, ready, resolve, aiShot, len, ringR };
})();

export { RG };
