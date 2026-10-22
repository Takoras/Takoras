import { createHash } from 'node:crypto';
import { RG } from './ring-engine.js';
import { RCFG } from './ring-config.js';

// Maps du Ring : terrain plus grand, obstacles, glace. Le moteur doit rester 100 % déterministe
// (le classé rejouera les tours sur le serveur) et ne jamais laisser un jeton coincé dans un obstacle.
const seeded = (seed: number) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const hash = (x: unknown) => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const TEAM = (names: string[]) => names.map((name) => ({ name, lvl: 3, variant: '' }));
const A = TEAM(['Mobu', 'Pikko', 'Soléo']),
  B = TEAM(['Kraïos', 'Azura', 'Carmin']);

function fight(mapId: string, seed: number) {
  const st = RG.create([A, B], mapId),
    ai = seeded(seed),
    log: string[] = [];
  while (!st.over && log.length < 30) {
    const res = RG.resolve(st, [RG.aiShot(st, 0, 'normal', ai), RG.aiShot(st, 1, 'normal', ai)]);
    // aucun jeton vivant à l'intérieur d'un obstacle à la fin du tour
    for (const b of st.bodies.filter((x) => x.alive))
      for (const o of st.map?.obs ?? []) expect(Math.hypot(b.x - o.x, b.y - o.y)).toBeGreaterThanOrEqual(b.r + o.r - 1);
    log.push(hash([res.ev, st]));
  }
  return { log, winner: st.winner };
}

test('5 maps, toutes symétriques haut/bas (équitables), départs hors des obstacles', () => {
  expect(RCFG.MAPS.map((m) => m.id)).toEqual(['arene', 'jardin', 'volcan', 'glace', 'ruines']);
  for (const m of RCFG.MAPS) {
    expect(m.R).toBeGreaterThan(RCFG.RING_R); // terrain plus grand que l'ancien
    for (const o of m.obs)
      expect(m.obs.some((p) => p.x === o.x && p.y === -o.y && p.r === o.r && p.k === o.k)).toBe(true);
    const st = RG.create([A, B], m.id);
    expect(RG.ringR(st)).toBe(m.R);
    for (const b of st.bodies)
      for (const o of m.obs) expect(Math.hypot(b.x - o.x, b.y - o.y)).toBeGreaterThan(b.r + o.r);
  }
});

test.each(RCFG.MAPS.map((m) => m.id))('map %s : déterministe (même partie = même résultat)', (id) => {
  const a = fight(id, 7),
    b = fight(id, 7);
  expect(a.log).toEqual(b.log);
  expect(a.log.length).toBeGreaterThan(0);
});

test('un tir droit sur un obstacle rebondit (rocher amortit, champignon renvoie plus fort)', () => {
  const speedAfter = (mapId: string) => {
    const st = RG.create([TEAM(['Mobu', 'Pikko', 'Soléo']), B], mapId);
    // le jeton du milieu (x = 0) tire droit vers le centre, où est l'obstacle central
    const res = RG.resolve(st, [{ i: 1, ax: 0, ay: -1000, f: 1, pow: false }, null]);
    const wall = res.ev.find((e) => e.t === 'wall');
    expect(wall).toBeTruthy();
    return wall;
  };
  expect(speedAfter('arene')?.k).toBe(0.8);
  expect(speedAfter('volcan')?.k).toBe(1.35);
});

test('sans map : le terrain d’avant (rayon 1000, aucun obstacle)', () => {
  const st = RG.create([A, B]);
  expect(st.map).toBeUndefined();
  expect(RG.ringR(st)).toBe(1000);
});

test('glace : un même tir va plus loin', () => {
  const dist = (mapId: string) => {
    const st = RG.create([A, B], mapId);
    const x0 = st.bodies.find((b) => b.side === 0 && b.i === 0)?.x ?? 0;
    RG.resolve(st, [{ i: 0, ax: -1000, ay: 0, f: 0.3, pow: false }, null]);
    return Math.abs((st.bodies.find((x) => x.side === 0 && x.i === 0)?.x ?? 0) - x0);
  };
  expect(dist('glace')).toBeGreaterThan(dist('ruines'));
});
