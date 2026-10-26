import { RG } from './ring-engine.js';
import type { RingState } from './ring-engine';

// Pouvoirs « à la JoJo » : chacun fait ce que dit sa fiche (arène vide, jetons placés à la main).
// Rien ne se déclenche à l'arrêt : tout part au lancer ou au premier choc.
const T = (n: string[]) => n.map((name) => ({ name, lvl: 1, variant: '' }));
type Body = RingState['bodies'][number];
function duel(me: string, foe = 'Carmin', pos: [number, number, number, number] = [0, 300, 0, 0], foe2 = false) {
  const st = RG.create([T([me, 'Mobu', 'Pikko']), T([foe, 'Rouillé', 'Nyx'])], 'arene');
  for (const b of st.bodies) b.alive = b.i === 0 || (foe2 && b.side === 1 && b.i === 1);
  const a = st.bodies.find((b) => b.side === 0 && b.i === 0) as Body,
    o = st.bodies.find((b) => b.side === 1 && b.i === 0) as Body;
  [a.x, a.y, o.x, o.y] = pos;
  const get = (id: number) => st.bodies.find((b) => b.id === id) as Body;
  return { st, a: () => get(a.id), o: () => get(o.id), o2: () => get(4) };
}
const shot = (ax: number, ay: number, f: number, pow = true) => ({ i: 0, ax, ay, f, pow });
const evs = (r: { ev: { t: string }[] }, t: string) => r.ev.filter((e) => e.t === t).length;

test('aucun pouvoir ne se déclenche à l’arrêt', () => {
  for (const n of [
    'Mobu',
    'Pikko',
    'Rouillé',
    'Givre',
    'Soléo',
    'Azura',
    'Carmin',
    'Vyolis',
    'Lumis',
    'Nyx',
    'Astra',
    'Kraïos',
    'Koi',
    'Néphéris',
    'Zénith',
    'Oblivion',
    'Takoras',
  ])
    expect(['eruption', 'magnet']).not.toContain(RG.kit(n).pw);
});

test('Gélatine (Mobu) : l’ennemi touché part plus loin', () => {
  const far = (pow: boolean) => {
    const d = duel('Mobu');
    RG.resolve(d.st, [shot(0, -1000, 0.6, pow), null]);
    return d.o().y;
  };
  expect(far(true)).toBeLessThan(far(false));
});

test('Flipper (Pikko) : rebondit sur le bord au lieu de sortir (3 fois par match)', () => {
  const d = duel('Pikko', 'Carmin', [0, 0, 900, 900]);
  const r = RG.resolve(d.st, [shot(0, -1000, 1), null]);
  expect(evs(r, 'edge')).toBeGreaterThan(0);
  expect(d.a().alive).toBe(true);
  expect(d.a().left).toBe(2);
});

test('Rempart (Rouillé) : ne bouge pas et renvoie l’ennemi plus fort', () => {
  const d = duel('Rouillé', 'Carmin', [0, 0, 0, -400]);
  const r = RG.resolve(d.st, [shot(0, -1, 0, true), { i: 0, ax: 0, ay: 1000, f: 0.7, pow: false }]);
  expect(evs(r, 'reflect')).toBeGreaterThan(0);
  expect(d.a().x).toBe(0);
  expect(d.a().y).toBe(0);
});

test('Patinoire (Givre) : la glace reste 2 tours', () => {
  const d = duel('Givre', 'Carmin', [0, 600, 900, 900]);
  const r = RG.resolve(d.st, [shot(0, -1000, 1), null]);
  expect(evs(r, 'ice')).toBe(1);
  expect(d.st.ice?.length).toBeGreaterThan(0);
  RG.resolve(d.st, [null, null]);
  expect(d.st.ice).toBeDefined();
  RG.resolve(d.st, [null, null]);
  expect(d.st.ice).toBeUndefined();
});

test('Ressac (Azura) : ne bouge pas, la vague pousse l’ennemi dans la direction visée', () => {
  const d = duel('Azura');
  const r = RG.resolve(d.st, [shot(0, -1000, 1), null]);
  expect(evs(r, 'surf')).toBe(1);
  expect(d.a().y).toBe(300);
  expect(d.o().y).toBeLessThan(-100);
});

test('Ora Ora (Carmin) : frappe ×2 et l’ennemi glisse', () => {
  const far = (pow: boolean) => {
    const d = duel('Carmin', 'Mobu');
    RG.resolve(d.st, [shot(0, -1000, 0.6, pow), null]);
    return d.o().y;
  };
  expect(far(true)).toBeLessThan(far(false));
});

test('Téléportation (Vyolis) : apparaît là où on vise', () => {
  const d = duel('Vyolis', 'Carmin', [0, 300, 900, 900]);
  const r = RG.resolve(d.st, [shot(0, -1000, 0.5), null]);
  expect(evs(r, 'blink')).toBe(1);
  expect(d.a().y).toBeCloseTo(300 - 450, 0);
});

test('Miroir (Lumis) : ton jeton ne bouge pas et renvoie l’attaquant', () => {
  const d = duel('Lumis', 'Carmin', [0, 0, 0, -400]);
  const r = RG.resolve(d.st, [shot(1, 0, 0.1, true), { i: 0, ax: 0, ay: 1000, f: 0.7, pow: false }]);
  expect(evs(r, 'reflect')).toBeGreaterThan(0);
  expect(d.o().y).toBeLessThan(-400); // renvoyé vers chez lui
});

test('Ombre (Nyx) : traverse les jetons', () => {
  const d = duel('Nyx', 'Carmin', [0, 300, 0, 0]);
  const r = RG.resolve(d.st, [shot(0, -1000, 0.7), null]);
  expect(evs(r, 'hit')).toBe(0);
  expect(d.a().y).toBeLessThan(0);
});

test('Pluie d’étoiles (Astra) : ne bouge pas, explosion là où on vise', () => {
  const d = duel('Astra', 'Carmin', [0, 600, 400, 0]);
  const r = RG.resolve(d.st, [shot(400, -600, 0.655), null]);
  expect(evs(r, 'starfall')).toBe(1);
  expect(d.a().x).toBe(0);
  expect(d.a().y).toBe(600); // Astra ne bouge pas
  expect(d.o().x !== 400 || d.o().y !== 0).toBe(true); // l'ennemi est soufflé
});

test('Tentacules (Kraïos) : agrippe l’ennemi et part avec son élan — il peut l’emporter dans le vide avec lui', () => {
  const d = duel('Kraïos', 'Carmin', [0, -950, 0, -1220]);
  const r = RG.resolve(d.st, [shot(0, -1000, 1), null]);
  const out = r.ev.filter((e) => e.t === 'out').map((e) => (e as unknown as { id: number }).id);
  expect(evs(r, 'grab')).toBe(1);
  expect(out).toContain(d.o().id); // l'ennemi part dans le vide…
  expect(out).toContain(d.a().id); // … et Kraïos avec lui (sacrifice)
});

test('Yin-Yang (Koi) : se coupe en deux ; l’ennemi pris entre les moitiés est lié, si Koi tombe il tombe aussi', () => {
  const d = duel('Koi', 'Carmin', [0, 500, 0, -150]);
  const r = RG.resolve(d.st, [shot(0, -1000, 0.75), null]);
  expect(evs(r, 'split')).toBe(1);
  if (evs(r, 'link')) {
    expect(d.a().link).toBe(d.o().id);
    d.a().x = 5000; // Koi poussé dehors au tour suivant (on le place hors de l'arène)
    RG.resolve(d.st, [null, null]);
    expect(d.o().alive).toBe(false);
  }
});

test('Télékinésie (Néphéris) : ne bouge pas, ton tir pousse l’ennemi visé', () => {
  const d = duel('Néphéris', 'Carmin', [0, 600, 100, 0]);
  const r = RG.resolve(d.st, [shot(0, -1000, 0.8), null]);
  expect(evs(r, 'tk')).toBe(1);
  expect(d.a().y).toBe(600);
  expect(d.o().y).toBeLessThan(-200);
});

test('Regard (Zénith) : l’ennemi touché ne peut pas tirer au tour suivant (2 fois par match)', () => {
  const d = duel('Zénith');
  RG.resolve(d.st, [shot(0, -1000, 0.4), null]);
  expect(d.o().stun).toBe(1);
  const r = RG.resolve(d.st, [null, { i: 0, ax: 0, ay: 1000, f: 1, pow: false }]);
  expect(evs(r, 'stunned')).toBe(1);
  expect(evs(r, 'shot')).toBe(0);
  expect(d.o().stun).toBe(0);
});

test('Trou noir (Oblivion) : s’ouvre au premier choc, puis se referme après 2 tours', () => {
  const d = duel('Oblivion');
  const r = RG.resolve(d.st, [shot(0, -1000, 0.5), null]);
  expect(evs(r, 'hole')).toBe(1);
  RG.resolve(d.st, [null, null]);
  RG.resolve(d.st, [null, null]);
  expect(d.st.holes).toBeUndefined();
});
