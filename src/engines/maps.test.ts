import { createHash } from 'node:crypto';
import { RG } from './ring-engine.js';
import { RCFG } from './ring-config.js';

// Maps du Ring : terrain plus grand, murs en diagonale (pierre qui amortit, rebondisseur qui renvoie plus vite).
// Le moteur doit rester 100 % déterministe (le classé rejouera les tours sur le serveur)
// et ne jamais laisser un jeton coincé dans un mur.
const seeded = (seed: number) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const hash = (x: unknown) => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const TEAM = (names: string[]) => names.map((name) => ({ name, lvl: 3, variant: '' }));
const A = TEAM(['Mobu', 'Pikko', 'Soléo']),
  B = TEAM(['Kraïos', 'Azura', 'Carmin']);
type Wall = (typeof RCFG.MAPS)[number]['walls'][number];
// demi-tour : (x, y) → (−x, −y). Chaque camp voit le même terrain depuis son côté.
const turn = (o: Wall) => ({ ...o, x1: -o.x1, y1: -o.y1, x2: -o.x2, y2: -o.y2 });
const same = (a: Wall, b: Wall) =>
  a.w === b.w &&
  a.k === b.k &&
  ((a.x1 === b.x1 && a.y1 === b.y1 && a.x2 === b.x2 && a.y2 === b.y2) ||
    (a.x1 === b.x2 && a.y1 === b.y2 && a.x2 === b.x1 && a.y2 === b.y1));

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

test('5 maps plus grandes, équilibrées par demi-tour, que des murs, départs hors des murs', () => {
  expect(RCFG.MAPS.map((m) => m.id)).toEqual(['arene', 'jardin', 'volcan', 'glace', 'ruines']);
  for (const m of RCFG.MAPS) {
    expect(m.R).toBeGreaterThanOrEqual(1450);
    for (const o of m.walls) expect(m.walls.some((p) => same(p, turn(o)))).toBe(true);
    expect(m.zones).toEqual([]);
    expect(m.walls.some((o) => o.x1 !== o.x2 && o.y1 !== o.y2)).toBe(true); // au moins des diagonales
    const st = RG.create([A, B], m.id);
    expect(RG.ringR(st)).toBe(m.R);
    for (const b of st.bodies) expect(RG.touchesWall(st, b.x, b.y, b.r + 5)).toBe(false);
  }
});

test.each(RCFG.MAPS.map((m) => m.id))(
  'map %s : déterministe (même partie = même résultat), jamais coincé dans un mur',
  (id) => {
    const a = fight(id, 7),
      b = fight(id, 7);
    expect(a.log).toEqual(b.log);
    expect(a.log.length).toBeGreaterThan(0);
  },
  20_000, // parties plus longues depuis le ring qui rétrécit (plus de limite à 12 tours)
);

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
  // jardin : le petit mur rebondisseur au centre
  expect(after('jardin', { i: 1, ax: 0, ay: -1000 })).toBe(1.4);
  // volcan : le X central est rebondisseur
  expect(after('volcan', { i: 1, ax: 0, ay: -1000 })).toBe(1.4);
});

test('sans map : le terrain d’avant (rayon 1000, aucun mur)', () => {
  const st = RG.create([A, B]);
  expect(st.map).toBeUndefined();
  expect(RG.ringR(st)).toBe(1000);
});

test('le ring rétrécit à chaque tour (plus de limite de 12 tours) et fait tomber ceux restés au bord', () => {
  const st = RG.create([A, B], 'arene');
  const R0 = RG.ringR(st);
  // personne ne tire : seul le ring bouge
  RG.resolve(st, [null, null]);
  expect(RG.ringR(st)).toBeCloseTo(R0 * (1 - RCFG.SHRINK.step), 3);
  let fell = 0;
  for (let k = 0; k < 60 && !st.over; k++) fell += RG.resolve(st, [null, null]).ev.filter((e) => e.t === 'out').length;
  expect(RG.ringR(st)).toBeCloseTo(R0 * RCFG.SHRINK.min, 3); // plancher
  // les 6 jetons restés au départ finissent dehors, puis mort subite au centre ; la partie se termine toujours
  expect(fell).toBe(6);
  expect(st.sudden).toBe(true);
  expect(st.over).toBe(true);
});
