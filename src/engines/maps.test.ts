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

test('une seule arène, vide (pas d’obstacle), plus grande que l’ancien ring', () => {
  expect(RCFG.MAPS.map((m) => m.id)).toEqual(['arene']);
  const m = RCFG.MAPS[0];
  expect(m?.walls).toEqual([]);
  expect(m?.zones).toEqual([]);
  const st = RG.create([A, B], 'arene');
  expect(RG.ringR(st)).toBe(1450);
});

test('arène : déterministe (même partie = même résultat)', () => {
  const a = fight('arene', 7),
    b = fight('arene', 7);
  expect(a.log).toEqual(b.log);
  expect(a.log.length).toBeGreaterThan(0);
}, 20_000);

test('murs (toujours gérés par le moteur) : la pierre amortit, le rebondisseur renvoie plus vite', () => {
  const after = (k: number) => {
    const st = RG.create([A, B], 'arene');
    st.map?.walls.push({ x1: -300, y1: 0, x2: 300, y2: 0, w: 46, k });
    const res = RG.resolve(st, [{ i: 1, ax: 0, ay: -1000, f: 1, pow: false }, null]);
    const wall = res.ev.find((e) => e.t === 'wall');
    expect(wall).toBeTruthy();
    for (const b of st.bodies.filter((x) => x.alive)) expect(RG.touchesWall(st, b.x, b.y, b.r - 1)).toBe(false);
    return wall?.k;
  };
  expect(after(0.75)).toBe(0.75);
  expect(after(1.4)).toBe(1.4);
});

test('sans map : le terrain d’avant (rayon 1000, aucun mur)', () => {
  const st = RG.create([A, B]);
  expect(st.map).toBeUndefined();
  expect(RG.ringR(st)).toBe(1000);
});

test('le ring rétrécit doucement à chaque tour et fait tomber ceux restés au bord', () => {
  const st = RG.create([A, B], 'arene');
  const R0 = RG.ringR(st);
  // personne ne tire : seul le ring bouge
  RG.resolve(st, [null, null]);
  expect(RG.ringR(st)).toBeCloseTo(R0 * (1 - RCFG.SHRINK.step), 3);
  expect(RCFG.SHRINK.step).toBeLessThanOrEqual(0.02); // lent
  let fell = 0;
  for (let k = 0; k < 80 && !st.over; k++) fell += RG.resolve(st, [null, null]).ev.filter((e) => e.t === 'out').length;
  expect(RG.ringR(st)).toBeCloseTo(R0 * RCFG.SHRINK.min, 3); // plancher
  // les 6 jetons restés au départ finissent dehors, puis mort subite au centre ; la partie se termine toujours
  expect(fell).toBe(6);
  expect(st.sudden).toBe(true);
  expect(st.over).toBe(true);
});

test('plusieurs pouvoirs dans le même tour, mais un seul jeton tire', () => {
  const T = (n: string[]) => n.map((name) => ({ name, lvl: 1, variant: '' }));
  const st = RG.create([T(['Mobu', 'Zénith', 'Carmin']), T(['Pikko', 'Givre', 'Nyx'])], 'arene');
  // Carmin tire avec Frappe ×2, Mobu gonfle et Zénith met son Bouclier en même temps
  const res = RG.resolve(st, [{ i: 2, ax: 0, ay: -1000, f: 1, pow: true, pows: [0, 1] }, null]);
  const used = res.ev.filter((e) => e.t === 'power').map((e) => e.pw);
  expect(used.sort()).toEqual(['double', 'grow', 'shield']);
  expect(res.ev.filter((e) => e.t === 'shot')).toHaveLength(1); // un seul tireur
  const mine = st.bodies.filter((b) => b.side === 0);
  expect(mine.every((b) => b.cd > 0)).toBe(true); // les 3 pouvoirs sont en recharge
});
