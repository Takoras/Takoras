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
    if (map) st.map = { id: map.id, R: map.R, R0: map.R, fric: map.fric, walls: map.walls.map(o => ({ ...o, hp: o.hp ?? C.WALL_HP })), zones: map.zones.map(z => ({ ...z })) };
    const k0 = map ? map.R / C.RING_R : 1;
    teams.forEach((team, side) => team.forEach((j, i) => {
      const s = stats(j.name, j.lvl, j.variant), k = kit(j.name);
      st.bodies.push({ id: side * 3 + i, side, i, name: j.name, lvl: j.lvl || 1, variant: j.variant || '', pw: k.pw, base: s, mass: s.mass, power: s.power, r: s.r,
        x: map ? q(C.START_X[i] * k0) : C.START_X[i], y: (side ? -1 : 1) * (map ? q(C.START_Y * k0) : C.START_Y), vx: 0, vy: 0, alive: true, cd: 0, spent: false, ...(k.uses ? { left: k.uses } : {}) });
    }));
    return st;
  }
  const ringR = st => st.map ? st.map.R : C.RING_R;
  const wallsOf = st => st.map ? st.map.walls.filter(o => !o.dead) : []; // les murs cassés ne comptent plus
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
  // pouvoir prêt : à recharge (cd tours), à charges (uses fois par match, b.left restantes) ou une seule fois (cd 0)
  const ready = b => b.alive && b.pw !== 'none' && b.cd === 0 && !b.spent && (b.left == null || b.left > 0);
  const STOP_PW = new Set(['eruption', 'magnet']); // anciens pouvoirs « à l'arrêt » (plus utilisés par les jetons)

  // ---------- Un tour : les deux tirs partent en même temps. Renvoie { frames, ev } pour l'animation.
  // shots : [tir du joueur 0 | null, tir du joueur 1 | null]. opts.preview : on s'arrête peu après le premier choc.
  function resolve(st, shots, opts = {}) {
    const B = st.bodies, ev = [], frames = [], start = [0, 1].map(s => alive(st, s).length);
    const dt = C.DT, RR = ringR(st), WALLS = wallsOf(st), ZONES = zonesOf(st), GF = st.map ? st.map.fric : 1;
    B.forEach(b => { b.t = { fric: 1, bounce: false, ghost: false, shield: false, anchor: false, shooter: false, v0: 0, hit: false, stopped: false, el: 0, pw: null }; });
    // Trou noir (Oblivion) encore ouvert : au début du tour, il aspire tous les jetons autour de lui
    const holes = st.holes || [];
    const holePull = (h, scale) => { for (const o of B) { if (!o.alive || o.tmp || o.id === h.owner) continue; const dx = h.x - o.x, dy = h.y - o.y, d = len(dx, dy); if (d > h.r || !d) continue; const f = h.pull * scale * (1 - d / h.r) / o.mass; o.vx += dx / d * f; o.vy += dy / d * f; } };
    holes.forEach(h => { holePull(h, 1); ev.push({ t: 'holepull', x: h.x, y: h.y, at: 0 }); });
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
      // Gélatine (Mobu) : gonfle et rend tous ses chocs plus élastiques
      if (b.pw === 'jelly') { b.r = b.base.r * k.p.r; b.mass = b.base.mass * k.p.mass; }
      // Rempart (Rouillé) : ne tire pas, devient un mur fixe qui renvoie plus fort tout ennemi qui le touche
      if (b.pw === 'rampart') { T.anchor = true; T.reflect = k.p.mult; ev.push({ t: 'rampart', id: b.id, at: 0 }); }
      // Miroir (Lumis) : tes jetons ne bougent pas face à l'ennemi et le renvoient ×2
      if (b.pw === 'mirror') { alive(st, side).forEach(a => { if (len(a.x - b.x, a.y - b.y) > k.p.radius) return; a.t.shield = true; a.t.reflect = k.p.mult; }); ev.push({ t: 'mirror', id: b.id, at: 0 }); }
      // Gravité solaire (Soléo) : ne tire pas, devient un petit soleil fixe ; ce tour, tout ce qui bouge près de lui est attiré
      if (b.pw === 'sun') { T.anchor = true; T.sun = true; ev.push({ t: 'sun', id: b.id, at: 0 }); }
      // Œil du cyclone (Zénith) : au lancer, les ennemis autour sont pris dans un tourbillon (ils tournent et sont projetés)
      if (b.pw === 'cyclone') {
        for (const o of alive(st, 1 - side)) {
          if (o.t.anchor || o.t.shield) continue;
          const dx = o.x - b.x, dy = o.y - b.y, d = len(dx, dy);
          if (d > k.p.radius || !d) continue;
          const w = (1 - d / k.p.radius) / o.mass;
          o.vx += (-dy / d * k.p.spin + dx / d * k.p.push) * w; o.vy += (dx / d * k.p.spin + dy / d * k.p.push) * w;
        }
        ev.push({ t: 'cyclone', id: b.id, x: q(b.x), y: q(b.y), at: 0 });
      }
      // Avatar (Takoras) : devient géant, ne peut pas tomber ce tour, et chaque coup qu'il porte libère une onde de choc
      if (b.pw === 'avatar') { b.r = b.base.r * k.p.r; b.mass = b.base.mass * k.p.mass; T.bounce = true; T.avatar = true; ev.push({ t: 'avatar', id: b.id, at: 0 }); }
      // Ombre (Nyx) : plus petit et traverse tout (la vitesse en plus est appliquée au tir)
      if (b.pw === 'shade') { b.r = b.base.r * k.p.r; T.ghost = true; }
      // Raz-de-marée (Azura) : au lancer, une vague repousse les ennemis proches loin d'elle
      if (b.pw === 'wave') {
        for (const o of alive(st, 1 - side)) {
          const dx = o.x - b.x, dy = o.y - b.y, d = len(dx, dy);
          if (d > k.p.radius || !d) continue;
          const f = k.p.push * (1 - d / k.p.radius) / o.mass; o.vx += dx / d * f; o.vy += dy / d * f;
        }
        ev.push({ t: 'wave', id: b.id, x: q(b.x), y: q(b.y), at: 0 });
      }
      // Apesanteur (Astra) : ce tour, les ennemis glissent comme sur de la glace (ils volent bien plus loin quand on les tape)
      if (b.pw === 'zerog') { alive(st, 1 - side).forEach(a => { a.t.fric = Math.min(a.t.fric, k.p.friction); }); ev.push({ t: 'zerog', id: b.id, at: 0 }); }
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
      if (k.uses) b.left = (b.left ?? k.uses) - 1; // à charges : pas de recharge, juste un nombre d'utilisations
      else { b.cd = k.cd; if (!k.cd) b.spent = true; }
    };
    const fired = [];
    shots.forEach((s, side) => {
      if (!s) return;
      const mine = i => B.find(x => x.side === side && x.i === i && x.alive && !x.tmp);
      // pouvoirs des autres jetons d'abord (dans l'ordre 0, 1, 2), puis celui du tireur
      [...new Set(s.pows || [])].filter(i => i !== s.i).sort((a, c) => a - c).forEach(i => { const o = mine(i); if (o) act(o, side); });
      const b = mine(s.i); if (!b) return;
      if (b.stun) { ev.push({ t: 'stunned', id: b.id, at: 0 }); return; } // paralysé (Regard de Zénith) : ne tire pas ce tour
      if (s.pow) act(b, side);
      const T = b.t, k = kit(b.name);
      if (T.anchor) return; // l'ancre ne tire pas
      const f = Math.max(0, Math.min(1, s.f)), d = len(s.ax, s.ay);
      if (f < C.MIN_FORCE || !d) return;
      // Téléportation (Vyolis) : ne roule pas, apparaît directement là où on vise (plus loin avec plus de force)
      if (T.pw === 'blink') {
        let dist = f * k.p.range; const ux = s.ax / d, uy = s.ay / d, fx = b.x, fy = b.y;
        const ok = D => { const X = fx + ux * D, Y = fy + uy * D; return len(X, Y) < RR - b.r * 1.1 && !touchesWall(st, X, Y, b.r); };
        while (dist > 0 && !ok(dist)) dist -= 20;
        dist = Math.max(0, dist); b.x = q(fx + ux * dist); b.y = q(fy + uy * dist);
        ev.push({ t: 'blink', id: b.id, fx: q(fx), fy: q(fy), x: b.x, y: b.y, at: 0 });
        return;
      }
      // Ressac (Azura) : ne bouge pas, envoie une vague en cône dans la direction visée
      if (T.pw === 'surf') {
        const ux = s.ax / d, uy = s.ay / d;
        for (const o of B) {
          if (o === b || !o.alive || o.tmp || o.t.anchor || (o.t.shield && o.side !== b.side)) continue;
          const dx = o.x - b.x, dy = o.y - b.y, dd = len(dx, dy);
          if (!dd || dd > k.p.radius || (dx * ux + dy * uy) / dd < k.p.cone) continue;
          const g = k.p.push * f * (1 - dd / k.p.radius) / o.mass; o.vx += ux * g; o.vy += uy * g;
        }
        ev.push({ t: 'surf', id: b.id, ax: q(ux * 1000), ay: q(uy * 1000), f, at: 0 });
        return;
      }
      // Pluie d'étoiles (Astra) : ne bouge pas, les étoiles tombent là où on vise (plus loin avec plus de force) et repoussent tout
      if (T.pw === 'starfall') {
        const ux = s.ax / d, uy = s.ay / d; let X = b.x + ux * f * k.p.range, Y = b.y + uy * f * k.p.range;
        const L = len(X, Y); if (L > RR) { X = X / L * RR; Y = Y / L * RR; }
        for (const o of B) {
          if (o === b || !o.alive || o.tmp || o.t.anchor) continue;
          const dx = o.x - X, dy = o.y - Y, dd = len(dx, dy);
          if (dd > k.p.radius) continue;
          const nx = dd ? dx / dd : ux, ny = dd ? dy / dd : uy, g = k.p.push * (1 - dd / k.p.radius) / o.mass; o.vx += nx * g; o.vy += ny * g;
        }
        ev.push({ t: 'starfall', id: b.id, x: q(X), y: q(Y), at: 0 });
        return;
      }
      // Télékinésie (Néphéris) : ne bouge pas, ton tir pousse l'ennemi dans la ligne de visée (le plus proche de la ligne, devant)
      if (T.pw === 'telekinesis') {
        const ux = s.ax / d, uy = s.ay / d;
        const tg = alive(st, 1 - side).filter(o => !o.t.anchor && (o.x - b.x) * ux + (o.y - b.y) * uy > 0)
          .sort((a, c) => Math.abs((a.x - b.x) * uy - (a.y - b.y) * ux) - Math.abs((c.x - b.x) * uy - (c.y - b.y) * ux))[0];
        if (tg) { const g = f * b.power * k.p.mult; tg.vx = q(ux * g); tg.vy = q(uy * g); ev.push({ t: 'tk', id: b.id, to: tg.id, at: 0 }); }
        return;
      }
      const sp = f * b.power * (T.pw === 'shrink' || T.pw === 'shade' ? k.p.power : 1);
      b.vx = q(s.ax / d * sp); b.vy = q(s.ay / d * sp);
      T.shooter = true; T.v0 = sp; T.home = [b.x, b.y]; fired.push(b.id);
      ev.push({ t: 'shot', id: b.id, at: 0, f });
    });
    const suns = B.filter(b => b.t.sun);
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
        // attiré par un soleil (Soléo) tant qu'il bouge
        if (s > C.STOP_SPEED && !T.anchor) for (const S of suns) { if (S === b || !S.alive) continue; const dx = S.x - b.x, dy = S.y - b.y, d = len(dx, dy), p = kit(S.name).p; if (d > p.radius || d < S.r) continue; const g = p.g * dt * (1 - d / p.radius); b.vx += dx / d * g; b.vy += dy / d * g; }
        // Faille (Oblivion) : la trajectoire se fissure
        if (T.pw === 'rift' && T.shooter && s > C.STOP_SPEED && steps % 5 === 0) { if (!st.rift || st.rift.armed) st.rift = { pts: [], side: b.side, armed: false }; st.rift.pts.push([q(b.x), q(b.y), steps]); if (st.rift.pts.length === 1) ev.push({ t: 'rift', id: b.id, at: tm }); }
        if (T.pw === 'icetrail' && T.shooter && s > C.STOP_SPEED && steps % kit(b.name).p.every === 0) { (st.ice ||= []).push([q(b.x), q(b.y), steps]); if (!st.iceNew) ev.push({ t: 'ice', id: b.id, at: tm }); st.iceNew = true; }
        if (st.ice && s > C.STOP_SPEED && !b.tmp) { for (const [ix, iy] of st.ice) if (len(b.x - ix, b.y - iy) < b.r + 40) { T.fric = Math.min(T.fric, C.ICE_FRIC); break; } }
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
        const j = -(1 + C.RESTITUTION) * vrel / (iA + iC) * (A.t.pw === 'jelly' || Cc.t.pw === 'jelly' ? kit((A.t.pw === 'jelly' ? A : Cc).name).p.bounce : 1);
        A.vx -= j * iA * nx; A.vy -= j * iA * ny; Cc.vx += j * iC * nx; Cc.vy += j * iC * ny;
        // Avatar (Takoras) : chaque coup sur un ennemi libère une onde de choc autour du point d'impact
        for (const [X, O] of [[A, Cc], [Cc, A]]) if (X.t.avatar && O.side !== X.side && !O.tmp && (X.t.wave || 0) < 4) {
          X.t.wave = (X.t.wave || 0) + 1; const p = kit(X.name).p, ix = (A.x + Cc.x) / 2, iy = (A.y + Cc.y) / 2;
          for (const o of B) { if (!o.alive || o.tmp || o.side === X.side || o.t.anchor || o.t.shield) continue; const dx = o.x - ix, dy = o.y - iy, dd = len(dx, dy); if (dd > p.radius || !dd) continue; const g = p.push * (1 - dd / p.radius) / o.mass; o.vx += dx / dd * g; o.vy += dy / dd * g; }
          ev.push({ t: 'avatarhit', id: X.id, x: q(ix), y: q(iy), at: tm });
        }
        // Rempart / Miroir : l'ennemi qui touche est renvoyé plus fort
        if (A.t.reflect && Cc.side !== A.side && !A.tmp) { const g = (A.t.reflect - 1) * j / Cc.mass; Cc.vx += g * nx; Cc.vy += g * ny; ev.push({ t: 'reflect', id: A.id, to: Cc.id, at: tm }); }
        if (Cc.t.reflect && A.side !== Cc.side && !Cc.tmp) { const g = (Cc.t.reflect - 1) * j / A.mass; A.vx -= g * nx; A.vy -= g * ny; ev.push({ t: 'reflect', id: Cc.id, to: A.id, at: tm }); }
        // frappe ×2 et néant : sur le premier choc du tireur
        for (const [S, O, sg] of [[A, Cc, 1], [Cc, A, -1]]) {
          if (S.t.hit || !S.t.shooter) continue;
          const iO = O === Cc ? iC : iA;
          // Trou noir (Oblivion) : s'ouvre au point du premier choc, aspire tout de suite puis au début des 2 tours suivants
          if (S.t.pw === 'blackhole') { const p = kit(S.name).p, h = { x: q(S.x + nx * S.r * sg), y: q(S.y + ny * S.r * sg), r: p.radius, pull: p.pull, core: p.radius * p.core, left: p.turns, owner: S.id }; (st.holes ||= []).push(h); holePull(h, .6); ev.push({ t: 'hole', id: S.id, x: h.x, y: h.y, at: tm }); }
          // Contre-courant (Koi) : après son premier coup, repart vers son point de départ
          if (S.t.pw === 'current' && !S.t.back) { S.t.back = true; const hx = S.t.home[0] - S.x, hy = S.t.home[1] - S.y, hd = len(hx, hy); if (hd > 1) { const v = S.t.v0 * kit(S.name).p.back; S.vx = hx / hd * v; S.vy = hy / hd * v; ev.push({ t: 'current', id: S.id, at: tm }); } }
          // Regard (Zénith) : le premier ennemi touché est paralysé, il ne pourra pas tirer au tour suivant
          if (S.t.pw === 'stun' && O.side !== S.side && !O.tmp) { O.stunNext = true; ev.push({ t: 'stun', id: S.id, to: O.id, at: tm }); }
          // Gel (Givre) : le premier ennemi touché gèle, il glisse comme sur de la glace jusqu'à la fin du tour
          if (S.t.pw === 'freeze' && O.side !== S.side) { O.t.fric = Math.min(O.t.fric, kit(S.name).p.friction); ev.push({ t: 'freeze', id: S.id, to: O.id, at: tm }); }
          // Tentacules (Kraïos) : agrippe le premier ennemi touché et le traîne avec lui jusqu'à la fin du tour
          if (S.t.pw === 'grab' && O.side !== S.side && !O.tmp && !O.t.anchor) { S.t.grab = O.id; S.t.go = [q(O.x - S.x), q(O.y - S.y)]; S.vx = O.vx; S.vy = O.vy; ev.push({ t: 'grab', id: S.id, to: O.id, at: tm }); } // la paire part avec l'élan de l'ennemi
          // Ora Ora (Carmin) : frappe ×2 et l'ennemi touché glisse comme sur la glace
          if (S.t.pw === 'ora' && O.side !== S.side) { const k = (kit(S.name).p.mult - 1) * j * iO * sg; O.vx += k * nx; O.vy += k * ny; O.t.fric = Math.min(O.t.fric, kit(S.name).p.friction); ev.push({ t: 'double', id: S.id, to: O.id, at: tm }); }
          if (S.t.pw === 'double') { const k = (kit(S.name).p.mult - 1) * j * iO * sg; O.vx += k * nx; O.vy += k * ny; ev.push({ t: 'double', id: S.id, to: O.id, at: tm }); }
          // Éruption solaire (Soléo) : au premier choc, explosion qui repousse les ENNEMIS autour du point d'impact
          if (S.t.pw === 'flare') {
            const p = kit(S.name).p, ix = S.x + nx * S.r * sg, iy = S.y + ny * S.r * sg;
            for (const o of B) {
              if (!o.alive || o.tmp || o.side === S.side || o.t.anchor || o.t.shield) continue;
              const dx = o.x - ix, dy = o.y - iy, d = len(dx, dy);
              if (d > p.radius || !d) continue;
              const k = p.push * (1 - d / p.radius) / o.mass; o.vx += dx / d * k; o.vy += dy / d * k;
            }
            ev.push({ t: 'flare', id: S.id, x: q(ix), y: q(iy), at: tm });
          }
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
          if (o.dead) continue;
          const [cx, cy] = nearest(o, b.x, b.y), dx = b.x - cx, dy = b.y - cy, d = len(dx, dy), rr = b.r + o.w / 2;
          if (d >= rr) continue;
          const nx = d ? dx / d : 0, ny = d ? dy / d : 1;
          b.x = cx + nx * rr; b.y = cy + ny * rr;
          const vn = b.vx * nx + b.vy * ny;
          if (vn >= 0) continue;
          b.vx -= (1 + o.k) * vn * nx; b.vy -= (1 + o.k) * vn * ny;
          if (b.t.shooter) b.t.hit = true;
          ev.push({ t: 'wall', id: b.id, w: st.map.walls.indexOf(o), x: q(cx + nx * o.w / 2), y: q(cy + ny * o.w / 2), k: o.k, j: Math.round(-vn), at: tm });
          // obstacle destructible : chaque vrai choc l'abîme, au 5e il casse (et disparaît pour le reste du match)
          if (-vn > C.WALL_HIT && o.hp != null && --o.hp <= 0) { o.dead = true; ev.push({ t: 'break', w: st.map.walls.indexOf(o), x: q((o.x1 + o.x2) / 2), y: q((o.y1 + o.y2) / 2), at: tm }); }
        }
      }
      // l'ennemi agrippé suit Kraïos, collé à lui
      for (const b of list) { const g = b.t.grab != null && b.alive ? B.find(o => o.id === b.t.grab) : null; if (g && g.alive) { g.x = b.x + b.t.go[0]; g.y = b.y + b.t.go[1]; g.vx = b.vx; g.vy = b.vy; } }
      // bord du ring
      for (const b of list) {
        if (!b.alive) continue;
        const d = len(b.x, b.y);
        if (d <= RR) continue;
        const nx = b.x / d, ny = b.y / d;
        // Flipper (Pikko) : rebondit sur le bord et repart plus vite (3 rebonds au plus)
        if (b.t.pw === 'pinball' && !b.tmp && (b.t.pb || 0) < kit(b.name).p.max) {
          const vn = b.vx * nx + b.vy * ny, kb = kit(b.name).p.boost;
          if (vn > 0) { b.vx = (b.vx - 2 * vn * nx) * kb; b.vy = (b.vy - 2 * vn * ny) * kb; b.t.pb = (b.t.pb || 0) + 1; ev.push({ t: 'edge', id: b.id, x: q(nx * RR), y: q(ny * RR), at: tm, pin: b.t.pb }); }
          b.x = nx * RR; b.y = ny * RR;
        } else if (b.t.bounce && !b.tmp) {
          const vn = b.vx * nx + b.vy * ny;
          if (vn > 0) { b.vx -= 2 * vn * nx; b.vy -= 2 * vn * ny; ev.push({ t: 'edge', id: b.id, x: q(nx * RR), y: q(ny * RR), at: tm }); }
          b.x = nx * RR; b.y = ny * RR;
        } else {
          b.alive = false;
          if (!b.tmp) ev.push({ t: 'out', id: b.id, x: q(b.x), y: q(b.y), vx: q(b.vx), vy: q(b.vy), at: tm });
          // Kraïos tombe : il emporte l'ennemi qu'il tient (sacrifice)
          const g = b.t.grab != null ? B.find(o => o.id === b.t.grab) : null;
          if (g && g.alive) { g.alive = false; ev.push({ t: 'out', id: g.id, x: q(g.x), y: q(g.y), vx: q(b.vx), vy: q(b.vy), at: tm, dragged: true }); }
        }
      }
      // trou noir : un jeton dont le centre tombe dans le cœur est avalé
      for (const h of st.holes || []) for (const b of list) { if (!b.alive || b.tmp || b.id === h.owner) continue; if (len(b.x - h.x, b.y - h.y) < h.core) { b.alive = false; ev.push({ t: 'out', id: b.id, x: q(b.x), y: q(b.y), vx: 0, vy: 0, at: tm, hole: true }); } }
      // à l'arrêt : éruption (repousse tout) et aimant (attire les ennemis) — anciens pouvoirs, gardés pour d'anciennes parties
      for (const b of list) {
        const T = b.t, s = len(b.vx, b.vy);
        if (s > C.STOP_SPEED) continue;
        b.vx = 0; b.vy = 0;
        if (!b.alive || T.stopped || !STOP_PW.has(T.pw)) continue;
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
      const pending = B.some(b => b.alive && STOP_PW.has(b.t.pw) && !b.t.stopped && b.t.shooter);
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
    // Yin-Yang (Koi) : les liens du tour précédent — si l'un des deux est tombé, l'autre tombe aussi
    for (const b of B) if (b.link != null && !b.tmp) { const o = B.find(x => x.id === b.link); if (o && b.alive !== o.alive && (b.alive || o.alive)) { const v = b.alive ? b : o; v.alive = false; ev.push({ t: 'out', id: v.id, x: v.x, y: v.y, vx: 0, vy: 0, at: tm, linked: true }); } }
    for (const b of B) delete b.link;
    st.bodies = B.filter(b => !b.tmp);
    st.bodies.forEach(b => {
      b.r = b.base.r; b.mass = b.base.mass; b.vx = 0; b.vy = 0;
      if (b.cd > 0) b.cd--; // recharge « 3 tours » : utilisé au tour 1, de nouveau prêt au tour 4
      b.stun = b.stunNext ? 1 : 0; delete b.stunNext; // paralysé seulement au tour suivant
      delete b.t;
    });
    // Faille (Oblivion) : elle s'ouvre à la fin du tour SUIVANT — les ennemis restés dessus tombent dedans (on a un tour pour s'écarter)
    if (st.rift) {
      if (st.rift.armed) {
        for (const b of alive(st, 1 - st.rift.side)) if (st.rift.pts.some(([x, y]) => len(b.x - x, b.y - y) < b.r * .6 + 40)) { b.alive = false; ev.push({ t: 'out', id: b.id, x: b.x, y: b.y, vx: 0, vy: 0, at: tm, rift: true }); }
        ev.push({ t: 'riftopen', at: tm }); delete st.rift;
      } else st.rift.armed = true;
    }
    // la patinoire de Givre reste 2 tours puis fond
    if (st.ice) { st.iceLeft = st.iceNew ? 2 : (st.iceLeft || 1) - 1; delete st.iceNew; if (st.iceLeft <= 0) { delete st.ice; delete st.iceLeft; } }
    if (st.holes) { st.holes.forEach(h => { h.left--; }); st.holes = st.holes.filter(h => h.left > 0); if (!st.holes.length) delete st.holes; }
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
