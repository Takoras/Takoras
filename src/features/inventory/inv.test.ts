import { describe, expect, it } from 'vitest';
import { SERIES } from '@/data/jetons';
import {
  levelInfo,
  needsConfirm,
  parseColl,
  parseGroups,
  quickSelect,
  selTotals,
  visibleCards,
  type InvData,
} from './inv';

const all = SERIES.Takoras ?? [];
const pick = (f: (o: number) => boolean) => all.find((j) => f(j.odds)) ?? { name: '?', odds: 1, glow: '#fff' };
const common = pick((o) => o < 60),
  rare = pick((o) => o >= 1000);
const groups = parseGroups([
  { jeton: common.name, odds: common.odds, ids: [1, 2, 3], free: [1, 2, 3], last: '2026-10-01T00:00:00Z' },
  { jeton: rare.name, odds: rare.odds, ids: [4], free: [4], last: '2026-10-02T00:00:00Z' },
  { jeton: common.name, variant: 'gold', odds: common.odds, ids: [5], free: [], last: '2026-10-03T00:00:00Z' },
]);
const d: InvData = {
  groups,
  coll: parseColl([
    { jeton: common.name, total: 4, owned: 3 },
    { jeton: common.name, variant: 'gold', total: 1, owned: 1 },
  ]),
  levels: new Map(),
};
const view = { serie: 'Takoras', vtab: '', tier: 'all' as const, own: false, q: '', sort: 'rarity' as const };
const jn = (n: string) => n;

describe('inventaire', () => {
  it('regroupe par variante et garde tous les jetons de la collection', () => {
    expect(groups.map((g) => g.key)).toContain(`Takoras|${common.name}|gold`);
    expect(visibleCards(d, view, jn)).toHaveLength(all.length);
    expect(visibleCards(d, { ...view, own: true }, jn)).toHaveLength(2);
    expect(visibleCards(d, { ...view, vtab: 'gold', own: true }, jn)).toHaveLength(1);
  });
  it('sélection rapide et total', () => {
    const cards = visibleCards(d, view, jn);
    expect(selTotals(groups, quickSelect(cards, 'dupes')).n).toBe(2);
    expect(selTotals(groups, quickSelect(cards, 'common')).ids).toEqual([1, 2, 3]);
    expect(selTotals(groups, quickSelect(cards, 'all')).n).toBe(4);
  });
  it('confirmation seulement pour les jetons rares', () => {
    expect(needsConfirm(groups, [1, 2])).toBe(false);
    expect(needsConfirm(groups, [4])).toBe(true);
  });
  it('monter de niveau demande L doublons libres', () => {
    expect(levelInfo(d, 'Takoras', common.name)).toMatchObject({ L: 1, owned: 4, free: 3, can: true });
    expect(levelInfo(d, 'Takoras', rare.name).can).toBe(false);
  });
});
