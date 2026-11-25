import fs from 'node:fs';
import vm from 'node:vm';
import { isWeekend, SERIES, sellValue, tierKey, vOdds } from './jetons';

// Mêmes règles que l'ancien site (et donc que le serveur)
const legacy = (() => {
  const ctx = vm.createContext({ Math, Object });
  vm.runInContext(
    fs
      .readFileSync('legacy/ui.js', 'utf8')
      .split('\n')
      .filter((l) => /^const (TIER_NAMES|tierKey|sellValue) /.test(l))
      .join('\n') +
      '\nconst VARIANTS = { gold: { odds: 20, mult: 3 }, celeste: { odds: 200, mult: 10 }, ombre: { odds: 500, mult: 25 } };\nthis.f = { tierKey, sellValue };',
    ctx,
  );
  return (ctx as unknown as { f: { tierKey: typeof tierKey; sellValue: typeof sellValue } }).f;
})();

test('catalogue : 17 jetons Takoras, chemins d’images absolus', () => {
  expect(SERIES.Takoras).toHaveLength(17);
  for (const j of SERIES.Takoras ?? []) if (j.img) expect(j.img.startsWith('/img/')).toBe(true);
});
test('rareté identique à l’ancien site, revente à 1/10', () => {
  for (const odds of [1, 2, 59, 60, 999, 1000, 9999, 10000, 99999, 100000, 1e6]) {
    expect(tierKey(odds)).toBe(legacy.tierKey(odds));
    // revente : 1/10 de la rareté (nov. 2026), variantes ×3 / ×10 / ×25
    const base = Math.max(1, Math.round(odds * 0.1));
    const wk = isWeekend() ? 1.2 : 1;
    for (const [v, m] of [
      ['', 1],
      ['gold', 3],
      ['celeste', 10],
      ['ombre', 25],
    ] as const)
      expect(sellValue(odds, v)).toBe(Math.round(base * m * wk));
  }
  expect(vOdds(1000, 'ombre')).toBe(500_000);
});

import { test as t2, expect as e2 } from 'vitest';
t2('week-end : vendredi 12 h → dimanche minuit (Paris)', () => {
  e2(isWeekend(new Date('2026-11-20T10:59:00Z'))).toBe(false); // ven 11:59 Paris
  e2(isWeekend(new Date('2026-11-20T11:00:00Z'))).toBe(true); // ven 12:00
  e2(isWeekend(new Date('2026-11-22T22:59:00Z'))).toBe(true); // dim 23:59
  e2(isWeekend(new Date('2026-11-22T23:00:00Z'))).toBe(false); // lun 00:00
});
