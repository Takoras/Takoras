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

test('route des rangs : Fer 1 → Légende, 3 divisions de 50 Elo', () => {
  expect(ROAD.map((r) => `${r.k}${r.divs > 1 ? r.div : ''}`).join(' ')).toBe(
    'iron1 iron2 iron3 bronze1 bronze2 bronze3 silver1 silver2 silver3 gold1 gold2 gold3 plat1 plat2 plat3 diam1 diam2 diam3 master legend',
  );
  expect(rankOf(1000)).toMatchObject({ k: 'iron', div: 1 }); // départ
  expect(rankOf(400)).toMatchObject({ k: 'iron', div: 1 }); // on ne descend pas plus bas que Fer 1
  expect(rankOf(1050)).toMatchObject({ k: 'iron', div: 2 });
  expect(rankOf(1149)).toMatchObject({ k: 'iron', div: 3 });
  expect(rankOf(1150)).toMatchObject({ k: 'bronze', div: 1 });
  expect(rankOf(1480)).toMatchObject({ k: 'gold', div: 1 });
  expect(rankOf(1899)).toMatchObject({ k: 'diam', div: 3 });
  expect(rankOf(1900).k).toBe('master');
  expect(rankOf(2400).k).toBe('legend');
});
