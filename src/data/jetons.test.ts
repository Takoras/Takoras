import fs from 'node:fs';
import vm from 'node:vm';
import { SERIES, sellValue, tierKey, vOdds } from './jetons';

// Mêmes règles que l'ancien site (et donc que le serveur)
const legacy = (() => {
  const ctx = vm.createContext({ Math, Object });
  vm.runInContext(fs.readFileSync('legacy/ui.js', 'utf8').split('\n').filter((l) => /^const (TIER_NAMES|tierKey|sellValue) /.test(l)).join('\n') + '\nconst VARIANTS = { gold: { odds: 20, mult: 3 }, celeste: { odds: 200, mult: 10 }, ombre: { odds: 500, mult: 25 } };\nthis.f = { tierKey, sellValue };', ctx);
  return (ctx as unknown as { f: { tierKey: typeof tierKey; sellValue: typeof sellValue } }).f;
})();

test('catalogue : 17 jetons Takoras, chemins d’images absolus', () => {
  expect(SERIES.Takoras).toHaveLength(17);
  for (const j of SERIES.Takoras!) if (j.img) expect(j.img.startsWith('/img/')).toBe(true);
});
test('rareté et revente identiques à l’ancien site', () => {
  for (const odds of [1, 2, 59, 60, 999, 1000, 9999, 10000, 99999, 100000, 1e6]) {
    expect(tierKey(odds)).toBe(legacy.tierKey(odds));
    for (const v of ['', 'gold', 'celeste', 'ombre']) expect(sellValue(odds, v)).toBe(legacy.sellValue(odds, v));
  }
  expect(vOdds(1000, 'ombre')).toBe(500_000);
});
