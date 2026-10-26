// Moteur du Ring (repris de legacy/ring-engine.js, puis ring qui rétrécit, plusieurs pouvoirs par tour, rôles des jetons).
// 100 % déterministe : replay.test.ts le vérifie (même partie = même résultat, aussi après un passage en JSON).
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
  // Stats physiques : base × (1 + bonus), bonus = niveau (rendements décroissants) + mutation, plafonné (C.POWER_CAP).
  // Poids et puissance ; la taille ne change pas. Le rôle (Combattant, Tank, Soutien) est juste une étiquette.
  // Arrondi au millionième : Math.exp pourrait différer d'un poil selon le navigateur, l'arrondi rend le résultat identique partout.
  const RG_bonus = (lvl = 1, variant = '') =>
    Math.round(Math.min(C.POWER_CAP, C.LEVEL_BONUS * (1 - Math.exp(-(Math.max(1, lvl) - 1) / C.LEVEL_CURVE)) + ((C.MUTATION[variant] || 1) - 1)) * 1e6) / 1e6;
  const roleOf = name => kit(name).role || 'fighter';
  function stats(name, lvl = 1, variant = '') {
    const k = kit(name), m = 1 + RG_bonus(lvl, variant);
    return { mass: k.mass * m, power: k.power * m, r: k.r };
  }
  // teams : [[{ name, lvl, variant }×3] ×2]
  // map (facultative) : un id de C.MAPS. Le terrain grandit avec la map, les départs aussi.
  function create(teams, mapId) {
    const st = { turn: 1, over: false, winner: null, sudden: false, bodies: [] };
    const map = mapId ? C.MAPS.find(m => m.id === mapId) : null;
    if (map) st.map = { id: map.id, R: map.R, R0: map.R, fric: map.fric, walls: map.walls.map(o => ({ ...o })), zones: map.zones.map(z => ({ ...z })) };
    const k0 = map ? map.R / C.RING_R : 1;
    teams.forEach((team, side) => team.forEach((j, i) => {
      const s = stats(j.name, j.lvl, j.variant), k = kit(j.name);
      st.bodies.push({ id: side * 3 + i, side, i, name: j.name, lvl: j.lvl || 1, variant: j.variant || '', pw: k.pw, base: s, mass: s.mass, power: s.power, r: s.r,
        x: map ? q(C.START_X[i] * k0) : C.START_X[i], y: (side ? -1 : 1) * (map ? q(C.START_Y * k0) : C.START_Y), vx: 0, vy: 0, alive: true, cd: 0, spent: false });
    }));
    return st;
  }
  const ringR = st => st.map ? st.map.R : C.RING_R;
  const wallsOf = st => st.map ? st.map.walls : [];
  const zonesOf = st => st.map ? st.map.zones : [];
  // Mur = segment épais (capsule) de (x1, y1) à (x2, y2), épaisseur w. Point du mur le plus proche de (px, py).
  function nearest(o, px, py) {
    const ex = o.x2 - o.x1, ey = o.y2 - o.y1, L2 = ex * ex + ey * ey;
    const u = L2 ? Math.max(0, Math.min(1, ((px - o.x1) * ex + (py - o.y1) * ey) / L2)) : 0;
    return [o.x1 + ex * u, o.y1 + ey * u];
  }
  const touchesWall = (st, x, y, r) => wallsOf(st).some(o => { const [cx, cy] = nearest(o, x, y); return len(x - cx, y - cy) < r + o.w / 2; });
  // Zones au sol (rectangles centrés en x, y) : boue (fric > 1, ralentit) ou glace (fric < 1, fait filer)
  const zoneFric = (Z, x, y) => { let f = 1; for (const z of Z) if (Math.abs(x - z.x) <= z.w / 2 && Math.abs(y - z.y) <= z.h / 2) f *= z.fric; return f; };
  const clone = st => JSON.parse(JSON.stringify(st));
  const alive = (st, side) => st.bodies.filter(b => b.alive && !b.tmp && (side == null || b.side === side));
  const ready = b => b.alive && b.pw !== 'none' && b.cd === 0 && !b.spent;

  // ---------- Un tour : les deux tirs partent en même temps. Renvoie { frames, ev } pour l'animation.
  // shots : [tir du joueur 0 | null, tir du joueur 1 | null]. opts.preview : on s'arrête peu après le premier choc.
  function resolve(st, shots, opts = {}) {
    const B = st.bodies, ev = [], frames = [], start = [0, 1].map(s => alive(st, s).length);
    const dt = C.DT, RR = ringR(st), WALLS = wallsOf(st), ZONES = zonesOf(st), GF = st.map ? st.map.fric : 1;
    B.forEach(b => { b.t = { fric: 1, bounce: false, ghost: false, shield: false, anchor: false, shooter: false, v0: 0, hit: false, stopped: false, el: 0, pw: null }; });
    // pouvoirs et lancers
    // Un tir : un seul jeton tire (s.i), mais on peut activer les pouvoirs de plusieurs jetons (s.pow pour le tireur,
    // s.pows = les autres jetons de l'équipe). Chaque pouvoir prêt s'active une fois.
    const act = (b, side) => {
      const T = b.t, k = kit(b.name);
      if (!ready(b) || T.pw) return;
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
      // Coup de pouce (Soutien) : les pouvoirs de tes alliés reviennent plus vite
      if (b.pw === 'haste') alive(st, side).forEach(a => { if (a !== b && a.cd > 0) { a.cd = Math.max(0, a.cd - k.p.cd); ev.push({ t: 'haste', id: a.id, by: b.id, at: 0 }); } });
      // Bulle (Soutien) : ton allié le plus proche ne peut pas être poussé par les ennemis ce tour
      if (b.pw === 'guard') {
        const al = alive(st, side).filter(a => a !== b).sort((a, c) => len(a.x - b.x, a.y - b.y) - len(c.x - b.x, c.y - b.y))[0];
        if (al) { al.t.shield = true; ev.push({ t: 'guard', id: al.id, by: b.id, at: 0 }); }
      }
      if (b.pw === 'rescue') {
        const far = alive(st, side).filter(a => a !== b).sort((a, c) => len(c.x, c.y) - len(a.x, a.y))[0];
        if (far) { const d = len(far.x, far.y), m = Math.min(k.p.pull, d) / (d || 1); far.x = q(far.x - far.x * m); far.y = q(far.y - far.y * m); ev.push({ t: 'rescue', id: far.id, by: b.id, at: 0 }); }
      }
      b.cd = k.cd; if (!k.cd) b.spent = true;
    };
    const fired = [];
    shots.forEach((s, side) => {
      if (!s) return;
      const mine = i => B.find(x => x.side === side && x.i === i && x.alive && !x.tmp);
      // pouvoirs des autres jetons d'abord (dans l'ordre 0, 1, 2), puis celui du tireur
      [...new Set(s.pows || [])].filter(i => i !== s.i).sort((a, c) => a - c).forEach(i => { const o = mine(i); if (o) act(o, side); });
      const b = mine(s.i); if (!b) return;
      if (s.pow) act(b, side);
      const T = b.t, k = kit(b.name);
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
        if (s > 0) { const zf = ZONES.length ? zoneFric(ZONES, b.x, b.y) : 1, ns = Math.max(0, s - C.FRICTION * T.fric * GF * zf * dt) * (1 - C.DRAG * dt), k = ns / s; b.vx *= k; b.vy *= k; }
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
      // murs (fixes) : le jeton rebondit dessus (k < 1 amortit, k > 1 renvoie plus vite)
      if (WALLS.length) for (const b of list) {
        if (!b.alive) continue;
        for (const o of WALLS) {
          const [cx, cy] = nearest(o, b.x, b.y), dx = b.x - cx, dy = b.y - cy, d = len(dx, dy), rr = b.r + o.w / 2;
          if (d >= rr) continue;
          const nx = d ? dx / d : 0, ny = d ? dy / d : 1;
          b.x = cx + nx * rr; b.y = cy + ny * rr;
          const vn = b.vx * nx + b.vy * ny;
          if (vn >= 0) continue;
          b.vx -= (1 + o.k) * vn * nx; b.vy -= (1 + o.k) * vn * ny;
          if (b.t.shooter) b.t.hit = true;
          ev.push({ t: 'wall', id: b.id, x: q(cx + nx * o.w / 2), y: q(cy + ny * o.w / 2), k: o.k, j: Math.round(-vn), at: tm });
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
    // sur une map : le ring rétrécit, ceux qui se retrouvent dehors tombent
    if (st.map) {
      const S = C.SHRINK, R0 = st.map.R0 || st.map.R;
      st.map.R = q(R0 * Math.max(S.min, 1 - S.step * st.turn));
      for (const b of alive(st)) if (len(b.x, b.y) > st.map.R) { b.alive = false; ev.push({ t: 'out', id: b.id, x: b.x, y: b.y, vx: 0, vy: 0, at: tm, shrink: true }); }
    }
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
        while (touchesWall(st, 0, s ? -y : y, b.base.r + 10) && y + 20 < ringR(st) * .7) y += 20;
        Object.assign(b, { alive: true, x: 0, y: s ? -y : y, vx: 0, vy: 0 });
      });
      ev.push({ t: 'sudden' });
      st.turn++;
      return;
    }
    st.turn++;
    if (st.turn > (st.map ? C.SHRINK.maxTurns : C.TURNS) + (st.sudden ? 3 : 0)) {
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
    if (L.smart) return aiSmart(st, side, rnd);
    let best = null, bestS = -Infinity;
    const base = score(st, side);
    for (const b of alive(st, side)) for (const pow of ready(b) ? [false, true] : [false]) {
      if (pow && b.pw === 'anchor') {
        const s = score(st, side) + 150; // rester planté si on est menacé : petit bonus
        if (s > bestS && alive(st, side).some(x => len(x.x, x.y) > 650)) { bestS = s; best = { i: b.i, ax: 0, ay: -1, f: 0, pow: true }; }
        continue;
      }
      // avec des obstacles, l'IA essaie aussi des tirs un peu de biais (bandes, contournements)
      const tilts = wallsOf(st).length ? [0, .22, -.22] : [0];
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

  // ---------- IA « smart » (entraînement) : elle prédit ton tir et joue en conséquence.
  // - Elle calcule le meilleur tir que TU pourrais faire (ta prédiction).
  // - Ses coups possibles : attaquer chacun de tes jetons (3 forces, tout droit ou en biais pour jouer les murs),
  //   ESQUIVER (ramener vers le centre un de ses jetons au bord du vide), ou ne rien faire.
  // - Chaque coup est simulé deux fois : avec ton tir prédit en même temps, et si tu ne bouges pas. Elle garde le meilleur compromis.
  // Son hasard (rnd) ne sert qu'à départager et à l'imprécision : la simulation du tour reste déterministe.
  function aiSmart(st, side, rnd = Math.random) {
    const L = C.AI.smart, foeSide = 1 - side, R = ringR(st);
    const pred = aiShot(st, foeSide, 'normal', () => .5); // ton meilleur tir, sans imprécision
    const outcome = sim => sim.over ? (sim.winner === side ? 1e6 : sim.winner === foeSide ? -1e6 : 0) : score(sim, side);
    const play = mine => {
      const a = clone(st), b = clone(st), A = [null, null], B = [null, null];
      A[side] = mine; A[foeSide] = pred; B[side] = mine;
      resolve(a, A); resolve(b, B);
      return .65 * outcome(a) + .35 * outcome(b);
    };
    const tilts = wallsOf(st).length ? [0, .22, -.22] : [0];
    const cands = [null];
    for (const b of alive(st, side)) for (const pow of ready(b) ? [false, true] : [false]) {
      if (pow && b.pw === 'anchor') { cands.push({ i: b.i, ax: 0, ay: -1, f: 0, pow: true }); continue; }
      for (const foe of alive(st, foeSide)) for (const f of [.55, .8, 1]) for (const tl of tilts) {
        const dx = foe.x - b.x, dy = foe.y - b.y;
        cands.push({ i: b.i, ax: Math.round(dx - dy * tl), ay: Math.round(dy + dx * tl), f, pow });
      }
      // au bord du vide (ou visé par ton tir prédit) : on prévoit de l'écarter vers le centre
      const aimed = pred && pred.f && alive(st, foeSide).some(o => o.i === pred.i && Math.abs((b.x - o.x) * pred.ay - (b.y - o.y) * pred.ax) / (len(pred.ax, pred.ay) || 1) < b.r + o.r);
      if (len(b.x, b.y) > R * .55 || aimed) for (const tl of [0, .6, -.6]) for (const f of [.25, .45, .65]) {
        const dx = -b.x, dy = -b.y;
        cands.push({ i: b.i, ax: Math.round(dx - dy * tl), ay: Math.round(dy + dx * tl), f, pow });
      }
    }
    let best = null, bestS = -Infinity;
    for (const c of cands) {
      const sc = play(c) - (c && c.pow ? 120 : 0) + rnd() * 30;
      if (sc > bestS) { bestS = sc; best = c; }
    }
    if (best && best.f) {
      const e = (rnd() * 2 - 1) * L.aimErr, px = -best.ay, py = best.ax;
      best = { ...best, ax: Math.round(best.ax + px * e), ay: Math.round(best.ay + py * e), f: Math.round(Math.max(.2, Math.min(1, best.f * (1 + (rnd() * 2 - 1) * L.forceErr))) * 100) / 100 };
    }
    return best;
  }

  return { kit, roleOf, bonus: RG_bonus, stats, create, clone, alive, ready, resolve, aiShot, aiSmart, len, ringR, nearest, touchesWall };
})();

export { RG };
