import { createHash } from 'node:crypto';
import { RG } from './ring-engine.js';
import { RCFG } from './ring-config.js';

// Le moteur du Ring est 100 % déterministe : le serveur du classé calcule chaque tour, et les deux écrans le rejouent.
// 40 combats complets (IA contre IA, graines fixes), joués deux fois dont une en repartant d'états passés en JSON
// (comme ce que le serveur enregistre) : l'empreinte de chaque tour doit être identique.
const seeded = (seed: number) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const hash = (x: unknown) => createHash('sha256').update(JSON.stringify(x)).digest('hex');

function fight(seed: number, viaJson: boolean) {
  const r = seeded(seed);
  const names = Object.keys(RCFG.TOKENS);
  const pick = () => {
    const s = new Set<string>();
    while (s.size < 3) s.add(names[Math.floor(r() * names.length)] ?? 'Mobu');
    return [...s].map((name, k) => ({
      name,
      lvl: 1 + Math.floor(r() * 10),
      variant: ['', 'gold', 'celeste', 'ombre'][k % 4] ?? '',
    }));
  };
  const map = RCFG.MAPS[Math.floor(r() * RCFG.MAPS.length)]?.id;
  let st = RG.create([pick(), pick()], map);
  const log: string[] = [];
  const ai = seeded(seed + 1);
  while (!st.over && log.length < 30) {
    const shots = [RG.aiShot(st, 0, 'normal', ai), RG.aiShot(st, 1, 'normal', ai)];
    if (viaJson) st = JSON.parse(JSON.stringify(st)) as typeof st;
    const res = RG.resolve(st, viaJson ? (JSON.parse(JSON.stringify(shots)) as typeof shots) : shots);
    log.push(hash([res.ev, st]));
  }
  return { log, winner: st.winner, turn: st.turn };
}

test('40 combats rejoués : même résultat à chaque fois, aussi après un passage en JSON', () => {
  let turns = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const a = fight(seed * 7919, false),
      b = fight(seed * 7919, true);
    expect(b).toEqual(a);
    turns += a.turn;
  }
  expect(turns).toBeGreaterThan(80); // des vrais combats, pas des matchs vides
}, 240_000);

test('plus de rôles : les stats en match = les stats de la fiche (aucun bonus d’équipe)', () => {
  const st = RG.create(
    [
      [{ name: 'Givre' }, { name: 'Mobu' }, { name: 'Pikko' }],
      [{ name: 'Carmin' }, { name: 'Koi' }, { name: 'Nyx' }],
    ],
    'arene',
  );
  for (const b of st.bodies) expect(b.base.power).toBeCloseTo(RG.stats(b.name).power);
});
