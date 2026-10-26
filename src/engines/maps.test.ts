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

test('tuto : arène vide ; matchs : 5 arènes 1,4× plus grandes, avec obstacles symétriques', () => {
  expect(RCFG.MAPS.map((m) => m.id)).toEqual(['arene', 'jardin', 'psy', 'forge', 'astral', 'abysse']);
  expect(RCFG.MAPS[0]?.walls).toEqual([]);
  expect(RG.ringR(RG.create([A, B], 'arene'))).toBe(1450);
  for (const m of RCFG.MAPS.filter((x) => x.pool !== false)) {
    expect(m.R).toBe(2000);
    expect(m.walls.length).toBeGreaterThan(0);
    // même terrain pour les deux camps : chaque mur a son reflet par le centre
    for (const w of m.walls)
      expect(
        m.walls.some(
          (o) =>
            (o.x1 === -w.x1 && o.y1 === -w.y1 && o.x2 === -w.x2 && o.y2 === -w.y2) ||
            (o.x1 === -w.x2 && o.y1 === -w.y2 && o.x2 === -w.x1 && o.y2 === -w.y1),
        ),
      ).toBe(true);
    // aucun jeton ne démarre dans un mur
    const st = RG.create([A, B], m.id);
    for (const b of st.bodies) expect(RG.touchesWall(st, b.x, b.y, b.r + 20)).toBe(false);
  }
});

test('un obstacle casse au 5e vrai choc', () => {
  const st = RG.create([A, B], 'arene');
  st.map?.walls.push({ x1: -300, y1: 0, x2: 300, y2: 0, w: 46, k: 0.75, hp: 1 });
  const res = RG.resolve(st, [{ i: 1, ax: 0, ay: -1000, f: 1, pow: false }, null]);
  expect(res.ev.some((e) => e.t === 'break')).toBe(true);
  expect(st.map?.walls[0]?.dead).toBe(true);
  expect(RG.touchesWall(st, 0, 0, 10)).toBe(false); // il ne bloque plus rien
  expect(RG.create([A, B], 'jardin').map?.walls[0]?.hp).toBe(5);
});

for (const id of ['jardin', 'psy', 'forge', 'astral', 'abysse'])
  test(`${id} : déterministe, et aucun jeton coincé dans un mur`, () => {
    const a = fight(id, 3),
      b = fight(id, 3);
    expect(a.log).toEqual(b.log);
  }, 60_000);

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
  // Carmin tire avec Frappe ×2, Mobu devient gélatine et Zénith prépare son Regard en même temps
  const res = RG.resolve(st, [{ i: 2, ax: 0, ay: -1000, f: 1, pow: true, pows: [0, 1] }, null]);
  const used = res.ev.filter((e) => e.t === 'power').map((e) => e.pw);
  expect(used.sort()).toEqual(['jelly', 'ora', 'stun']);
  expect(res.ev.filter((e) => e.t === 'shot')).toHaveLength(1); // un seul tireur
  const mine = st.bodies.filter((b) => b.side === 0);
  expect(mine.every((b) => b.cd > 0 || b.left === 1)).toBe(true); // en recharge, ou une charge en moins (Zénith : 2 par match)
});
