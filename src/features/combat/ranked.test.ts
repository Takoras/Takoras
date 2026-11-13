import { expect, test } from 'vitest';
import { rankOf, ROAD } from './rankedApi';

test('route des rangs : Bois 1 → Takoras, 3 divisions de 50 Elo', () => {
  expect(ROAD.map((r) => `${r.k}${r.divs > 1 ? r.div : ''}`).join(' ')).toBe(
    'wood1 wood2 wood3 stone1 stone2 stone3 silver1 silver2 silver3 topaz1 topaz2 topaz3 emerald1 emerald2 emerald3 ruby1 ruby2 ruby3 master takoras',
  );
  expect(rankOf(1000)).toMatchObject({ k: 'wood', div: 1 }); // départ
  expect(rankOf(400)).toMatchObject({ k: 'wood', div: 1 }); // on ne descend pas plus bas que Bois 1
  expect(rankOf(1050)).toMatchObject({ k: 'wood', div: 2 });
  expect(rankOf(1149)).toMatchObject({ k: 'wood', div: 3 });
  expect(rankOf(1150)).toMatchObject({ k: 'stone', div: 1 });
  expect(rankOf(1480)).toMatchObject({ k: 'topaz', div: 1 });
  expect(rankOf(1899)).toMatchObject({ k: 'ruby', div: 3, idx: 17 });
  expect(rankOf(1900).k).toBe('master');
  expect(rankOf(2400).k).toBe('takoras');
});
