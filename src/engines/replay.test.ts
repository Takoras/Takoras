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

test('rôles = étiquettes qui se voient dans les stats : Tank gros, lourd et lent ; Soutien léger et rapide', () => {
  const by = (r: string) => Object.keys(RCFG.TOKENS).filter((n) => RG.roleOf(n) === r).map((n) => RG.kit(n));
  const avg = (l: ReturnType<typeof RG.kit>[], k: 'mass' | 'power' | 'r') => l.reduce((a, x) => a + x[k], 0) / l.length;
  const T = by('tank'), S = by('support'), F = by('fighter');
  expect(avg(T, 'mass')).toBeGreaterThan(avg(F, 'mass'));
  expect(avg(F, 'mass')).toBeGreaterThan(avg(S, 'mass'));
  expect(avg(S, 'power')).toBeGreaterThan(avg(F, 'power'));
  expect(avg(F, 'power')).toBeGreaterThan(avg(T, 'power'));
  expect(avg(T, 'r')).toBeGreaterThan(avg(S, 'r'));
  // plus aucun bonus d'équipe : les stats en match = les stats de la fiche
  const st = RG.create([[{ name: 'Givre' }, { name: 'Mobu' }, { name: 'Pikko' }], [{ name: 'Carmin' }, { name: 'Koi' }, { name: 'Nyx' }]], 'arene');
  for (const b of st.bodies) expect(b.base.power).toBeCloseTo(RG.stats(b.name).power);
});

test('Soutien : Coup de pouce recharge les alliés, Bulle protège l’allié le plus proche', () => {
  const team = (n: string[]) => n.map((name) => ({ name, lvl: 1, variant: '' }));
  const st = RG.create([team(['Pikko', 'Carmin', 'Azura']), team(['Mobu', 'Givre', 'Rouillé'])], 'arene');
  const carmin = st.bodies.find((x) => x.name === 'Carmin') as (typeof st.bodies)[number];
  carmin.cd = 3;
  const res = RG.resolve(st, [{ i: 0, ax: 0, ay: -1, f: 0, pow: true }, null]);
  expect(res.ev.some((e) => e.t === 'haste' && e.id === carmin.id)).toBe(true);
  expect(st.bodies.find((x) => x.name === 'Carmin')?.cd).toBe(1); // −1 (Coup de pouce) puis −1 (fin du tour)
  const st2 = RG.create([team(['Mobu', 'Givre', 'Azura']), team(['Carmin', 'Koi', 'Nyx'])], 'arene');
  const res2 = RG.resolve(st2, [{ i: 2, ax: 0, ay: -1, f: 0, pow: true }, null]);
  expect(res2.ev.some((e) => e.t === 'guard')).toBe(true);
});
