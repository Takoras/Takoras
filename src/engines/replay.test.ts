import fs from 'node:fs';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { RG } from './ring-engine.js';
import { RCFG } from './ring-config.js';
import { CB } from './combat-engine.js';

// Porte de la phase 5 : le moteur du Ring importé dans React donne EXACTEMENT les mêmes combats que l'ancien site.
// 200 combats complets (IA contre IA, graines fixes), on compare l'empreinte de chaque tour (positions, évènements).
const legacy = (() => {
  const ctx = vm.createContext({ Math, JSON, Object, Array, Number, String, Infinity });
  for (const f of ['ring-config.js', 'ring-engine.js', 'combat-engine.js']) vm.runInContext(fs.readFileSync(`legacy/${f}`, 'utf8'), ctx);
  return vm.runInContext('({ RG, RCFG, CB })', ctx) as { RG: typeof RG; RCFG: typeof RCFG; CB: typeof CB };
})();

const seeded = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const hash = (x: unknown) => createHash('sha256').update(JSON.stringify(x)).digest('hex');

function fight(E: typeof RG, seed: number) {
  const r = seeded(seed);
  const names = Object.keys(RCFG.TOKENS);
  const pick = () => {
    const s = new Set<string>();
    while (s.size < 3) s.add(names[Math.floor(r() * names.length)] ?? 'Mobu');
    return [...s].map((name, k) => ({ name, lvl: 1 + Math.floor(r() * 10), variant: ['', 'gold', 'celeste', 'ombre'][k % 4] ?? '' }));
  };
  const st = E.create([pick(), pick()]);
  const log: string[] = [];
  const ai = seeded(seed + 1);
  while (!st.over && log.length < 40) {
    const res = E.resolve(st, [E.aiShot(st, 0, 'normal', ai), E.aiShot(st, 1, 'normal', ai)]);
    log.push(hash([res.ev, res.frames.at(-1), st]));
  }
  return { log, winner: st.winner, turn: st.turn };
}

test('mêmes valeurs d’équilibrage (sauf changements voulus : 30 s par tour, maps, rangs du classé)', () => {
  const { AIM_S, MAPS, AI, ELO: _e, DIV: _d, RANKS: _r, ...rest } = RCFG as typeof RCFG & { MAPS: unknown };
  const { smart, ...ai } = AI as Record<string, unknown>;
  expect(smart).toBeTruthy(); // nouvelle IA d'entraînement (l'ancienne « normal » est inchangée)
  const { AIM_S: _a, AI: oldAi, ELO: _oe, RANKS: _or, ...old } = legacy.RCFG;
  expect(JSON.stringify(ai)).toBe(JSON.stringify(oldAi));
  void [_a, _e, _d, _r, _oe, _or];
  expect(AIM_S).toBe(30);
  expect(MAPS).toHaveLength(5);
  expect(JSON.stringify(rest)).toBe(JSON.stringify(old));
  for (const n of Object.keys(RCFG.TOKENS)) expect(CB.elOf(n)).toBe(legacy.CB.elOf(n));
});

test('200 combats rejoués : identiques à l’ancien moteur', () => {
  let turns = 0;
  for (let seed = 1; seed <= 200; seed++) {
    const a = fight(RG, seed * 7919), b = fight(legacy.RG, seed * 7919);
    expect(a).toEqual(b);
    turns += a.turn;
  }
  expect(turns).toBeGreaterThan(200); // des vrais combats, pas des matchs vides
}, 120_000);
