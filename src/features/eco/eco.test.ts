import { predictEco, regenCost, upgradeCost } from './eco';

test('coûts identiques au serveur (bornes connues de l’ancien site)', () => {
  expect(upgradeCost(6)).toBe(100);
  expect(upgradeCost(50)).toBe(20650);
  expect(regenCost(170)).toBe(300);
  expect(regenCost(60)).toBe(26300);
});

test('le stock remonte tout seul entre deux lectures du serveur', () => {
  const me = { coins: 10, stock: 2, max: 5, step: 120, next_in: 30 };
  expect(predictEco(me, 0, 10_000)).toMatchObject({ stock: 2, nextIn: 20_000 });
  expect(predictEco(me, 0, 30_000)).toMatchObject({ stock: 3, nextIn: 120_000 });
  expect(predictEco(me, 0, 30_000 + 3 * 120_000)).toMatchObject({ stock: 5, full: true, nextIn: 0 });
});
