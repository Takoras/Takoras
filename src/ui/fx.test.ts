import { describe, expect, it } from 'vitest';
import { revealTier } from './fx';

describe('revealTier', () => {
  it('suit la rareté des objets', () => {
    expect([60, 5000, 100_000, 1_000_000, 10_000_000, 100_000_000].map(revealTier)).toEqual([0, 1, 2, 3, 4, 5]);
  });
});
