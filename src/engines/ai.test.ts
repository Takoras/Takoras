import { RG } from './ring-engine.js';
import type { RingState, Shot } from './ring-engine';

// IA « smart » (entraînement) : elle prédit ton tir. Au bord du vide, elle écarte son jeton ;
// si TON jeton est au bord, elle fonce dessus.
const T = (names: string[]) => names.map((name) => ({ name, lvl: 1, variant: '' }));
const still = () => 0.5;
// Place les jetons à la main : [x, y] par id (0-2 = toi, 3-5 = l'IA), les autres hors jeu
function setup(pos: Record<number, [number, number]>): RingState {
  const st = RG.create([T(['Mobu', 'Pikko', 'Soléo']), T(['Carmin', 'Azura', 'Givre'])]);
  for (const b of st.bodies) {
    const p = pos[b.id];
    if (p) [b.x, b.y] = p;
    else b.alive = false;
  }
  return st;
}
const aliveAfter = (st: RingState, shots: (Shot | null)[], id: number) => {
  const s = RG.clone(st);
  RG.resolve(s, shots);
  return !!s.bodies.find((b) => b.id === id)?.alive;
};

test('au bord du vide, menacée, l’IA smart sauve son jeton', () => {
  // jeton de l'IA (id 3) tout en haut, au bord ; ton Mobu (id 0) juste dessous, prêt à le pousser dehors
  const st = setup({ 0: [0, -560], 3: [0, -840] });
  const you = RG.aiShot(st, 0, 'normal', still); // ton meilleur tir : pousser le jeton du bord
  expect(you?.i).toBe(0);
  expect(aliveAfter(st, [you, null], 3)).toBe(false); // s'il ne fait rien, il tombe
  const smart = RG.aiShot(st, 1, 'smart', still);
  expect(aliveAfter(st, [you, smart], 3)).toBe(true);
});

test('ton jeton au bord du vide : l’IA smart fonce dessus et l’éjecte', () => {
  const st = setup({ 0: [0, 860], 3: [0, 450], 4: [600, -400] });
  const smart = RG.aiShot(st, 1, 'smart', still);
  expect(smart).toBeTruthy();
  expect(aliveAfter(st, [null, smart], 0)).toBe(false);
});

test('l’IA smart réfléchit assez vite (une fois par tour, pendant ta visée)', () => {
  const st = RG.create([T(['Mobu', 'Pikko', 'Soléo']), T(['Carmin', 'Azura', 'Givre'])], 'ruines');
  const t0 = performance.now();
  RG.aiShot(st, 1, 'smart', still);
  expect(performance.now() - t0).toBeLessThan(1500);
});
