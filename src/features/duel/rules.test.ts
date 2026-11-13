import { describe, expect, it } from 'vitest';
import { RCFG } from '@/engines/ring-config.js';
import { activeOf, aiMove, legal, newDuel, play, POWERS, type Side, type State } from './rules';

const NAMES = [...Object.keys(RCFG.TOKENS), 'Coton'];
const team = (k: number) => [0, 1, 2].map((i) => ({ name: NAMES[(k * 7 + i * 3) % NAMES.length] as string }));

function run(st: State, max = 400) {
  let n = 0;
  while (st.winner === null && n++ < max) {
    const s: Side = st.need ?? st.turn;
    const a = aiMove(st, s);
    expect(legal(st, s, a)).toBe(true);
    st = play(st, s, a);
  }
  return { st, n };
}

describe('duel', () => {
  it('chaque jeton a un pouvoir', () => {
    for (const n of NAMES) expect(POWERS[n]).toBeTruthy();
  });
  it('une attaque fait des dégâts et passe la main', () => {
    const st = newDuel([{ name: 'Carmin' }, { name: 'Mobu' }, { name: 'Pikko' }], [{ name: 'Mobu' }, { name: 'Koi' }, { name: 'Nyx' }]);
    const hp = activeOf(st, 1).hp;
    const nx = play(st, 0, { t: 'attack' });
    expect(activeOf(nx, 1).hp).toBeLessThan(hp);
    expect(nx.turn).toBe(1);
  });
  it('une action illégale ne change rien', () => {
    const st = newDuel([{ name: 'Mobu' }, { name: 'Mobu' }, { name: 'Mobu' }], [{ name: 'Mobu' }, { name: 'Mobu' }, { name: 'Mobu' }]);
    expect(play(st, 1, { t: 'attack' })).toBe(st);
    expect(play(st, 0, { t: 'power' })).toBe(st); // pas encore chargé (2 crans, il en a 1)
  });
  it('300 parties IA contre IA se terminent toutes, sans blocage', () => {
    for (let k = 0; k < 300; k++) {
      const { st, n } = run(newDuel(team(k), team(k + 5), (k % 2) as Side));
      expect(st.winner).not.toBeNull();
      expect(n).toBeLessThan(400);
    }
  });
});
