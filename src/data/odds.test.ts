import fs from 'node:fs';
import vm from 'node:vm';
import { SERIES } from './jetons';
import { realOdds } from './odds';

test('probabilités réelles identiques à l’ancien site, et leur somme fait 100 %', () => {
  const src = fs.readFileSync('legacy/info.js', 'utf8');
  const fn = src.slice(src.indexOf('function realOdds'), src.indexOf('const pct'));
  const ctx = vm.createContext({ Math, SERIES });
  vm.runInContext(fn + '\nthis.realOdds = realOdds;', ctx);
  const legacy = (ctx as unknown as { realOdds: (l: number) => { j: { name: string }; p: number }[] }).realOdds;
  for (const luck of [1, 1.3, 2, 6.3, 100, 500, 9999]) {
    const a = realOdds(luck),
      b = legacy(luck);
    expect(a.map((x) => [x.j.name, x.p])).toEqual(b.map((x) => [x.j.name, x.p]));
    expect(a.reduce((s, x) => s + x.p, 0)).toBeCloseTo(1, 12);
  }
});
