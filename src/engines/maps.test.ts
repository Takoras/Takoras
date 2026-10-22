import { createHash } from 'node:crypto';
import { RG } from './ring-engine.js';
import { RCFG } from './ring-config.js';

// Maps du Ring : terrain plus grand, murs (pierre qui amortit, rebondisseur qui renvoie plus vite), zones (boue, glace).
// Le moteur doit rester 100 % déterministe (le classé rejouera les tours sur le serveur)
// et ne jamais laisser un jeton coincé dans un mur.
const seeded = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const hash = (x: unknown) => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const TEAM = (names: string[]) => names.map((name) => ({ name, lvl: 3, variant: '' }));
const A = TEAM(['Mobu', 'Pikko', 'Soléo']),
  B = TEAM(['Kraïos', 'Azura', 'Carmin']);
type Wall = (typeof RCFG.MAPS)[number]['walls'][number];
const mirror = (o: Wall) => ({ ...o, y1: -o.y1, y2: -o.y2 });
const same = (a: Wall, b: Wall) =>
  a.w === b.w && a.k === b.k &&
  ((a.x1 === b.x1 && a.y1 === b.y1 && a.x2 === b.x2 && a.y2 === b.y2) || (a.x1 === b.x2 && a.y1 === b.y2 && a.x2 === b.x1 && a.y2 === b.y1));

function fight(mapId: string, seed: number) {
  const st = RG.create([A, B], mapId),
    ai = seeded(seed),
    log: string[] = [];
  while (!st.over && log.length < 30) {
    const res = RG.resolve(st, [RG.aiShot(st, 0, 'normal', ai), RG.aiShot(st, 1, 'normal', ai)]);
    for (const b of st.bodies.filter((x) => x.alive)) expect(RG.touchesWall(st, b.x, b.y, b.r - 1)).toBe(false);
    log.push(hash([res.ev, st]));
  }
  return { log, winner: st.winner };
}

test('5 maps plus grandes, symétriques haut/bas (équitables), départs hors des murs', () => {
  expect(RCFG.MAPS.map((m) => m.id)).toEqual(['arene', 'jardin', 'volcan', 'glace', 'ruines']);
  for (const m of RCFG.MAPS) {
    expect(m.R).toBeGreaterThanOrEqual(1450);
    for (const o of m.walls) expect(m.walls.some((p) => same(p, mirror(o)))).toBe(true);
    for (const z of m.zones) expect(m.zones.some((p) => p.x === z.x && p.y === -z.y && p.w === z.w && p.h === z.h && p.fric === z.fric)).toBe(true);
    const st = RG.create([A, B], m.id);
    expect(RG.ringR(st)).toBe(m.R);
    for (const b of st.bodies) expect(RG.touchesWall(st, b.x, b.y, b.r + 5)).toBe(false);
  }
});

test.each(RCFG.MAPS.map((m) => m.id))('map %s : déterministe (même partie = même résultat), jamais coincé dans un mur', (id) => {
  const a = fight(id, 7),
    b = fight(id, 7);
  expect(a.log).toEqual(b.log);
  expect(a.log.length).toBeGreaterThan(0);
});

test('murs : la pierre amortit, le rebondisseur renvoie plus vite', () => {
  const after = (mapId: string, shot: { i: number; ax: number; ay: number }) => {
    const st = RG.create([A, B], mapId);
    const res = RG.resolve(st, [{ ...shot, f: 1, pow: false }, null]);
    const wall = res.ev.find((e) => e.t === 'wall');
    expect(wall).toBeTruthy();
    return wall?.k;
  };
  // arène : le jeton du milieu tire droit vers le mur central en pierre
  expect(after('arene', { i: 1, ax: 0, ay: -1000 })).toBe(0.75);
  // volcan : le X central est rebondisseur
  expect(after('volcan', { i: 1, ax: 0, ay: -1000 })).toBe(1.4);
});

test('sans map : le terrain d’avant (rayon 1000, aucun mur)', () => {
  const st = RG.create([A, B]);
  expect(st.map).toBeUndefined();
  expect(RG.ringR(st)).toBe(1000);
});

test('zones : la boue ralentit, la glace fait filer', () => {
  // un jeton posé au centre d'une zone, tir latéral identique
  const dist = (mapId: string, zx: number) => {
    const st = RG.create([A, B], mapId);
    const b = st.bodies.find((x) => x.side === 0 && x.i === 1);
    if (!b) throw new Error('jeton absent');
    b.x = zx; b.y = 0;
    for (const o of st.bodies) if (o !== b) o.alive = false;
    RG.resolve(st, [{ i: 1, ax: 0, ay: 1000, f: 0.25, pow: false }, null]);
    return Math.abs(b.y);
  };
  const plain = (() => {
    const st = RG.create([A, B], 'arene');
    const b = st.bodies.find((x) => x.side === 0 && x.i === 1);
    if (!b) throw new Error('jeton absent');
    b.x = -600; b.y = 0;
    for (const o of st.bodies) if (o !== b) o.alive = false;
    RG.resolve(st, [{ i: 1, ax: 0, ay: 1000, f: 0.25, pow: false }, null]);
    return Math.abs(b.y);
  })();
  expect(dist('jardin', -650)).toBeLessThan(plain); // boue
  expect(dist('glace', 0)).toBeGreaterThan(plain); // glace
});
