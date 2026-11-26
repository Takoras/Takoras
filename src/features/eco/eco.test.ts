import { predictEco, regenCost, upgradeCost } from './eco';

test('coûts identiques au serveur', () => {
  // mêmes valeurs que _upgrade_cost / _regen_cost (nov. 2026)
  expect(upgradeCost(20)).toBe(50);
  expect(upgradeCost(110)).toBe(1580);
  expect(upgradeCost(500)).toBe(17150);
  expect(regenCost(110)).toBe(100);
  expect(regenCost(10)).toBe(7490);
});

test('le stock remonte tout seul entre deux lectures du serveur', () => {
  const me = { coins: 10, stock: 2, max: 5, step: 120, next_in: 30 };
  expect(predictEco(me, 0, 10_000)).toMatchObject({ stock: 2, nextIn: 20_000 });
  expect(predictEco(me, 0, 30_000)).toMatchObject({ stock: 3, nextIn: 120_000 });
  expect(predictEco(me, 0, 30_000 + 3 * 120_000)).toMatchObject({ stock: 5, full: true, nextIn: 0 });
});

test('stock au-dessus du max (codes, recharge éclair) : affiché tel quel, pas ramené au max', () => {
  const e = predictEco({ stock: 65, max: 50, step: 180, next_in: 0 }, 0, 10 * 60_000);
  expect(e.stock).toBe(65);
  expect(e.full).toBe(true);
});
