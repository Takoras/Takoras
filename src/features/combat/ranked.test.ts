import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { RG } from '@/engines/ring-engine.js';
import { rankOf, ROAD } from './rankedApi';

// Le serveur du classé calcule les tours avec SA copie du moteur : elle doit être identique à celle du site,
// sinon l'écran rejouerait autre chose que ce que le serveur a décidé.
test('moteur du serveur (fonction « ranked ») = moteur du site', () => {
  for (const f of ['ring-engine.js', 'ring-config.js'])
    expect(readFileSync(`supabase/functions/ranked/${f}`, 'utf8'), f).toBe(readFileSync(`src/engines/${f}`, 'utf8'));
});

test('état du serveur passé en JSON : le rejeu donne exactement le même résultat', () => {
  const team = (n: string[]) => n.map((name) => ({ name, lvl: 3, variant: '' }));
  const st = RG.create([team(['Carmin', 'Mobu', 'Soléo']), team(['Rouillé', 'Givre', 'Takoras'])], 'ruines');
  const shots = [
    { i: 0, ax: 120, ay: -900, f: 0.9, pow: true },
    { i: 2, ax: -80, ay: 1000, f: 1, pow: true },
  ];
  const a = RG.clone(st),
    b = JSON.parse(JSON.stringify(st)) as typeof st;
  RG.resolve(a, shots);
  RG.resolve(b, JSON.parse(JSON.stringify(shots)) as typeof shots);
  expect(JSON.stringify(b)).toBe(JSON.stringify(a));
});

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
