import { useEffect, useRef, type ReactNode } from 'react';
import type { Lang } from '@/i18n';
import { reducedFx } from '@/lib/settings';
import s from './Cosmetics.module.css';

// Cosmétiques de profil (boutique) : effet de pseudo (n_…), contour de la photo (au_…), effet de bannière (fx_…).
// Même DA que le jeu : dessinés en vrais pixels (anneaux en orbite et étoiles en croix de PixelBg), aux couleurs
// des mutations. Chacun a une rareté, comme les jetons : plus il est rare, plus il a de couches et de mouvement.
export type CRar = 'common' | 'rare' | 'epic' | 'legend' | 'myth' | 'secret';
// id → [nom FR, nom EN, rareté] ; l'ordre est celui des rayons du vestiaire (du plus commun au plus rare)
const DEF: Record<string, [string, string, CRar]> = {
  // pseudo
  n_rose: ['Rose', 'Pink', 'common'],
  n_glace: ['Glace', 'Ice', 'common'],
  n_or: ['Doré', 'Gold', 'rare'],
  n_celeste: ['Céleste', 'Celestial', 'rare'],
  n_braise: ['Braise', 'Ember', 'epic'],
  n_ombre: ['Ombre', 'Shadow', 'epic'],
  n_arc: ['Arc-en-ciel', 'Rainbow', 'legend'],
  // contour
  au_blanc: ['Craie', 'Chalk', 'common'],
  au_acier: ['Acier', 'Steel', 'common'],
  au_rubis: ['Rubis', 'Ruby', 'common'],
  au_jade: ['Jade', 'Jade', 'common'],
  au_rose: ['Bonbon', 'Candy', 'common'],
  au_lagon: ['Lagon', 'Lagoon', 'common'],
  au_ambre: ['Ambre', 'Amber', 'common'],
  au_menthe: ['Menthe', 'Mint', 'common'],
  au_lilas: ['Lilas', 'Lilac', 'common'],
  au_corail: ['Corail', 'Coral', 'common'],
  au_bleue: ['Orbite', 'Orbit', 'common'],
  au_clous: ['Rivets', 'Rivets', 'common'],
  au_tourne: ['Engrenage', 'Gear', 'rare'],
  au_bulles: ['Bulles', 'Bubbles', 'rare'],
  au_feuilles: ['Lierre', 'Ivy', 'rare'],
  au_pulse: ['Battement', 'Heartbeat', 'rare'],
  au_neon: ['Néon', 'Neon', 'rare'],
  au_sable: ['Sablier', 'Hourglass', 'rare'],
  au_or: ['Couronne', 'Crown', 'rare'],
  au_etoile: ['Étoiles', 'Stars', 'rare'],
  au_vague: ['Marée', 'Tide', 'rare'],
  au_comete: ['Comète', 'Comet', 'epic'],
  au_givre: ['Givre', 'Frost', 'epic'],
  au_eclair: ['Éclair', 'Lightning', 'epic'],
  au_flamme: ['Flamme', 'Flame', 'epic'],
  au_ombre: ['Ombre', 'Shadow', 'epic'],
  au_lave: ['Lave', 'Lava', 'epic'],
  au_galaxie: ['Galaxie', 'Galaxy', 'legend'],
  au_prisme: ['Prisme', 'Prism', 'legend'],
  au_soleil: ['Soleil', 'Sun', 'legend'],
  au_ocre: ['Ocre', 'Ochre', 'common'],
  au_nuit: ['Nuit', 'Night', 'common'],
  au_sapin: ['Sapin', 'Pine', 'common'],
  au_peche: ['Pêche', 'Peach', 'common'],
  au_radar: ['Radar', 'Radar', 'rare'],
  au_chaine: ['Chaîne', 'Chain', 'rare'],
  au_scintille: ['Scintillant', 'Sparkle', 'rare'],
  au_coeurs: ['Cœurs', 'Hearts', 'rare'],
  au_orage: ['Orage', 'Storm', 'epic'],
  au_spirale: ['Spirale', 'Spiral', 'epic'],
  au_runes: ['Runes', 'Runes', 'epic'],
  au_phenix: ['Phénix', 'Phoenix', 'legend'],
  au_abysse: ['Abysse', 'Abyss', 'legend'],
  au_epee: ['Excalibur', 'Excalibur', 'myth'],
  au_inconnu: ['???', '???', 'secret'],
  // effet de bannière
  fx_poussiere: ['Poussière', 'Dust', 'common'],
  fx_pluie: ['Pluie', 'Rain', 'common'],
  fx_bulles: ['Bulles', 'Bubbles', 'common'],
  fx_feuilles: ['Feuilles', 'Leaves', 'common'],
  fx_points: ['Lueurs', 'Glimmers', 'common'],
  fx_cendres: ['Cendres', 'Ash', 'common'],
  fx_pollen: ['Pollen', 'Pollen', 'common'],
  fx_gouttes: ['Gouttes', 'Drops', 'common'],
  fx_sable: ['Vent de sable', 'Sandstorm', 'common'],
  fx_neige: ['Neige', 'Snow', 'common'],
  fx_etoiles: ['Étoiles', 'Stars', 'common'],
  fx_givre: ['Cristaux', 'Crystals', 'common'],
  fx_petales: ['Pétales', 'Petals', 'rare'],
  fx_lucioles: ['Lucioles', 'Fireflies', 'rare'],
  fx_coeurs: ['Cœurs', 'Hearts', 'rare'],
  fx_notes: ['Mélodie', 'Melody', 'rare'],
  fx_confettis: ['Confettis', 'Confetti', 'rare'],
  fx_braises: ['Braises', 'Embers', 'rare'],
  fx_pixels: ['Bug', 'Glitch', 'rare'],
  fx_magie: ['Magie', 'Magic', 'rare'],
  fx_pieces: ['Pluie d’or', 'Gold rain', 'rare'],
  fx_meteores: ['Météores', 'Meteors', 'epic'],
  fx_eclairs: ['Éclairs', 'Lightning', 'epic'],
  fx_aurore: ['Aurore', 'Aurora', 'epic'],
  fx_feu: ['Brasier', 'Blaze', 'epic'],
  fx_orage: ['Orage', 'Storm', 'epic'],
  fx_ombre: ['Ombres', 'Shadows', 'epic'],
  fx_galaxie: ['Galaxie', 'Galaxy', 'legend'],
  fx_prisme: ['Prisme', 'Prism', 'legend'],
  fx_celeste: ['Céleste', 'Celestial', 'legend'],
  fx_vent: ['Vent', 'Wind', 'common'],
  fx_plumes: ['Plumes', 'Feathers', 'common'],
  fx_fumee: ['Fumée', 'Smoke', 'common'],
  fx_paillettes: ['Paillettes', 'Glitter', 'common'],
  fx_arcbulles: ['Bulles irisées', 'Iridescent bubbles', 'rare'],
  fx_blizzard: ['Blizzard', 'Blizzard', 'rare'],
  fx_automne: ['Automne', 'Autumn', 'rare'],
  fx_disco: ['Disco', 'Disco', 'rare'],
  fx_matrix: ['Code', 'Code', 'epic'],
  fx_lave: ['Lave', 'Lava', 'epic'],
  fx_portail: ['Portail', 'Portal', 'epic'],
  fx_ocean: ['Océan', 'Ocean', 'legend'],
  fx_eclipse: ['Éclipse', 'Eclipse', 'legend'],
  fx_epees: ['Pluie d’épées', 'Sword rain', 'myth'],
  fx_inconnu: ['???', '???', 'secret'],
};
const RANK: Record<CRar, number> = { common: 0, rare: 1, epic: 2, legend: 3, myth: 4, secret: 5 };
const ids = (p: string) =>
  Object.keys(DEF)
    .filter((k) => k.startsWith(p))
    .sort((a, b) => RANK[DEF[a]?.[2] ?? 'common'] - RANK[DEF[b]?.[2] ?? 'common']);
export const COSMETICS = { name: ids('n_'), aura: ids('au_'), bfx: ids('fx_') };
export const cosmName = (id: string, lang: Lang) => DEF[id]?.[lang === 'en' ? 1 : 0] ?? id;
export const cosmRar = (id: string): CRar => DEF[id]?.[2] ?? 'common';
/** rareté → « chance » du fond pixel (même échelle que les jetons : plus c'est rare, plus il est chargé) */
export const RAR_ODDS: Record<CRar, number> = {
  common: 60,
  rare: 5000,
  epic: 100_000,
  legend: 1_000_000,
  myth: 10_000_000,
  secret: 100_000_000,
};
/** rareté « ??? » : on ne voit qu'une silhouette noire tant qu'on ne l'a pas, et on ne peut pas l'essayer */
export const isSecret = (id: string) => cosmRar(id) === 'secret';
/** rareté → clé de traduction et variable de couleur du site */
export const rarKey = (r: CRar) => `ui.r_${r}` as const;
export const rarCol = (r: CRar) => `var(--r-${r})`;
export const isCosmetic = (kind: string) => kind === 'name' || kind === 'aura' || kind === 'bfx';

// classe à mettre sur un pseudo (rien si pas d'effet)
export const nameCls = (id?: string | null) => (id?.startsWith('n_') && s[id] ? `${s.name} ${s[id]}` : '');

// ---------- contour : un cadre en pixels autour de la photo ----------
const G = 48; // grille du dessin (48×48 pixels), agrandie sans lissage autour de la photo (les plus rares débordent)
const C = G / 2; // centre (entre les pixels 23 et 24 : le dessin est symétrique gauche / droite et haut / bas)
const R = 16; // rayon de l'anneau : posé sur le bord de la photo (pas de vide entre les deux)
const TAU = Math.PI * 2;
type Px = (x: number, y: number, col: string, size?: number) => void;
// position → pixel, en miroir exact autour du centre (le pixel 24 + k a pour reflet 23 − k)
export const q = (v: number) => (v >= C ? Math.floor(v) : C - 1 - Math.floor(C - v));
const at = (a: number, r: number): [number, number] => [C + Math.cos(a) * r, C + Math.sin(a) * r];
// anneau en vrais pixels : tous les pixels dont le centre est à la bonne distance du centre. Rond parfait, symétrique,
// sans trou. `every` : un pixel sur N (pointillés, symétriques gauche / droite) ; `w` : épaisseur.
const RINGS = new Map<string, [number, number, number][]>();
const ringPx = (r: number, w: number) => {
  const key = `${r}|${w}`;
  let out = RINGS.get(key);
  if (out) return out;
  out = [];
  for (let j = 0; j < G; j++)
    for (let i = 0; i < G; i++) {
      const dx = i + 0.5 - C,
        dy = j + 0.5 - C,
        d = Math.hypot(dx, dy);
      // angle depuis le haut, le même à gauche et à droite (pointillés en miroir)
      if (d >= r - 0.5 && d < r - 0.5 + w) out.push([i, j, Math.atan2(Math.abs(dx), -dy)]);
    }
  RINGS.set(key, out);
  return out;
};
const ring = (p: Px, r: number, col: string, every = 1, w = 1) => {
  const n = Math.max(8, Math.round(Math.PI * r)); // nombre de crans sur un demi-tour
  for (const [i, j, a] of ringPx(r, w)) if (every <= 1 || Math.floor((a / Math.PI) * n) % every === 0) p(i + 0.5, j + 0.5, col);
};
const star = (p: Px, x: number, y: number, k: number, col: string) => {
  // étoile en croix du fond pixel : un point, puis la croix à son pic
  if (k < 0.25) return;
  p(x, y, '#ffffff');
  if (k > 0.6)
    [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ].forEach(([a = 0, b = 0]) => p(x + a, y + b, col));
  if (k > 0.9)
    [
      [-2, 0],
      [2, 0],
      [0, -2],
      [0, 2],
    ].forEach(([a = 0, b = 0]) => p(x + a, y + b, col));
};
// une graine fixe par pixel (le même dessin à chaque image)
const hash = (i: number) => {
  const x = Math.sin(i * 127.1) * 43758.5453;
  return x - Math.floor(x);
};
// couches d'un contour (on les empile : plus le contour est rare, plus il en a)
type AL =
  | { t: 'ring'; c: string; r?: number; every?: number; w?: number }
  | { t: 'dash'; c: string; n: number; len: number; v: number; r?: number }
  | { t: 'studs'; c: string; l: string; n: number; v?: number }
  | { t: 'orbit'; c: string; l: string; n: number; v: number; r?: number; big?: boolean }
  | { t: 'stars'; c: string; n: number; sp?: number; r?: number }
  | { t: 'flame'; a: string; b: string; tip: string; n: number; h: number; sp?: number }
  | { t: 'wave'; c: string; l: string; amp: number; k: number; v: number }
  | { t: 'pulse'; c: string; per: number }
  | { t: 'comet'; c: string; l: string; v: number; len: number; r?: number; off?: number }
  | { t: 'sweep'; c: string; l: string; per: number }
  | { t: 'bolt'; c: string; l: string; n: number; len?: number }
  | { t: 'spikes'; c: string; l: string; n: number; h: number; v?: number }
  | { t: 'hue'; v: number; r?: number; s?: number }
  | { t: 'rise'; c: string; l: string; n: number; sp: number; len?: number }
  | { t: 'blink'; c: string; dim: string; per: number }
  | { t: 'fx'; f: (p: Px, t: number) => void };
// ---------- dessins des contours rares (sprites et animations) ----------
type Sp = string[]; // '#' couleur, 'o' clair, autres lettres : couleurs fixes de PAL
const PAL: Record<string, string> = { g: '#f2c230', G: '#fff3b0', b: '#7c4a1e', s: '#cbd5e1', S: '#f8fafc', d: '#64748b', r: '#ef4444', k: '#0b0b10', w: '#ffffff', p: '#a855f7' };
const HEART: Sp = ['#.#', '###', '.#.'];
const RUNE: Sp = ['#o#', '.#.', '#.#'];
const FEATHER: Sp = ['.o', 'o#', '#.'];
const blitA = (p: Px, sp: Sp, cx: number, cy: number, c: string, l: string, alpha = 1) => {
  const h = sp.length,
    w = sp[0]?.length ?? 0;
  sp.forEach((row, j) =>
    [...row].forEach((ch, i) => {
      if (ch === '.' || (alpha < 1 && hash(i * 31 + j * 7 + Math.floor(alpha * 10)) > alpha)) return;
      p(cx - w / 2 + i + 0.5, cy - h / 2 + j + 0.5, ch === '#' ? c : ch === 'o' ? l : (PAL[ch] ?? c));
    }),
  );
};
const orbitSprite = (p: Px, t: number, sp: Sp, n: number, v: number, r: number, c: string, l: string, blink = false) => {
  for (let i = 0; i < n; i++) {
    const [x, y] = at(t * v + (i / n) * TAU - Math.PI / 2, r);
    if (blink && Math.sin(t * 2 + i * 1.7) < -0.6) continue;
    blitA(p, sp, x, y, c, l);
  }
};
const radar = (p: Px, t: number, c: string, l: string) => {
  const a0 = t * 1.6;
  for (let k = 0; k < 14; k++) {
    const a = a0 - k * 0.05;
    for (let r = R + 1; r <= R + 4; r++) {
      if (k > 9 && (r + k) % 2) continue;
      const [x, y] = at(a, r);
      p(x, y, k < 2 ? l : c);
    }
  }
};
const chain = (p: Px, t: number, c: string, l: string) => {
  // maillons qui tournent doucement : deux couleurs en alternance, un reflet par maillon
  const off = Math.floor(t * 3);
  for (const [i, j, a] of ringPx(R, 2)) {
    const k = Math.floor((a / Math.PI) * 24 + off) % 4;
    p(i + 0.5, j + 0.5, k === 0 ? l : k === 2 ? '#4b5563' : c);
  }
};
const sparkle = (p: Px, t: number, c: string, l: string, n: number) => {
  const step = Math.floor(t * 6);
  for (let i = 0; i < n; i++) {
    const ph = (step + i * 3) % 12;
    if (ph > 4) continue;
    const [x, y] = at(hash(i * 13 + Math.floor((step + i * 3) / 12) * 101) * TAU, R + 1 + hash(i) * 2);
    star(p, x, y, ph === 2 ? 1 : ph === 1 || ph === 3 ? 0.7 : 0.3, l);
    if (ph === 2) p(x, y, c);
  }
};
const rainDrops = (p: Px, t: number, c: string) => {
  for (let i = 0; i < 10; i++) {
    const x = (hash(i * 7) * G) | 0;
    const y = ((t * 30 + hash(i * 3) * G) % (G + 6)) - 3;
    const d = Math.hypot(x + 0.5 - C, y - C);
    if (d < R + 1) continue; // la pluie tombe autour, pas sur la photo
    p(x + 0.5, y, c);
    p(x + 0.5, y - 1, c);
  }
};
const spiral = (p: Px, t: number, arms: number, c: string, l: string) => {
  for (let k = 0; k < arms; k++)
    for (let s2 = 0; s2 < 9; s2++) {
      const r = R + 1 + s2 * 0.75;
      const a = t * 1.2 + (k / arms) * TAU + s2 * 0.32;
      const [x, y] = at(a, r);
      p(x, y, s2 < 2 ? l : c);
    }
};
const tentacles = (p: Px, t: number, c: string, l: string) => {
  for (let k = 0; k < 5; k++) {
    const a0 = (k / 5) * TAU + Math.sin(t * 0.8 + k) * 0.25 + Math.PI / 2;
    for (let s2 = 0; s2 < 7; s2++) {
      const a = a0 + Math.sin(t * 2.4 + k * 1.3 + s2 * 0.5) * 0.12 * s2;
      const [x, y] = at(a, R + 1 + s2);
      p(x, y, s2 === 6 ? l : c);
      if (s2 < 3) {
        const [x2, y2] = at(a + 0.05, R + 1 + s2);
        p(x2, y2, c);
      }
    }
  }
};
// ---------- MYTHIQUE : l'épée qui se plante ----------
const SWORD: Sp = [
  '..ggg..',
  '..gGg..',
  '...b...',
  '...b...',
  '...b...',
  'ggggggg',
  '.gGgGg.',
  '..sSs..',
  '..sSs..',
  '..sSs..',
  '..sSs..',
  '..sSs..',
  '..sSs..',
  '..sSs..',
  '..sSs..',
  '...S...',
  '...s...',
];
const sword = (p: Px, t: number) => {
  const P = 4.6,
    ph = t % P;
  const FALL = 0.42; // chute de plus en plus vite
  const restY = 0; // au repos : la poignée et la garde dépassent au-dessus de l'anneau, seule la lame entre dans la photo
  const h = SWORD.length;
  let y = restY;
  if (ph < FALL) y = restY - 40 * (1 - (ph / FALL) ** 2.2);
  const out = ph > P - 0.6 ? (P - ph) / 0.6 : 1; // elle s'efface en se dissolvant
  if (ph > P - 0.1) return;
  // choc : onde, éclats, petite secousse
  const since = ph - FALL;
  const shake = since > 0 && since < 0.2 ? (Math.floor(t * 30) % 2 ? 1 : -1) : 0;
  const tipY = y + h - 1;
  if (since > 0 && since < 0.55) {
    const k = since / 0.55;
    ring(p, R + k * 7, k < 0.5 ? '#ffffff' : '#94a3b8', k < 0.6 ? 1 : 2);
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i - 4.5) * 0.32;
      const d = 2 + k * (6 + hash(i) * 4);
      p(C + Math.cos(a + Math.PI) * d * 0.9, C - R + Math.sin(a + Math.PI) * -d * 0.6, i % 2 ? '#fde68a' : '#ffffff');
    }
  }
  // fissures dans la photo autour de la lame, tant qu'elle est plantée
  if (since > 0 && out > 0.2)
    [
      [-1, 0],
      [-2, 1],
      [-3, 1],
      [1, 0],
      [2, 1],
      [3, 2],
      [-1, 2],
      [1, 2],
    ].forEach(([dx = 0, dy = 0]) => p(C + dx + (dx < 0 ? 0 : 0.5) - 0.5, tipY - 3 + dy + 0.5, '#1f2937'));
  blitA(p, SWORD, C + shake, y + h / 2, '#cbd5e1', '#f8fafc', out);
  // reflet qui descend le long de la lame
  if (since > 0.6 && out === 1) {
    const g = ((t * 1.3) % 1.6) / 1.6;
    if (g < 1) {
      const gy = Math.floor(restY + 7 + g * 10);
      p(C - 1 + 0.5, gy + 0.5, '#ffffff');
      p(C + 0.5, gy + 0.5, '#ffffff');
      p(C + 0.5, gy - 0.5, '#ffffff');
    }
  }
  // braises qui montent autour de l'épée plantée
  if (since > 0)
    for (let i = 0; i < 6; i++) {
      const life = (t * 0.7 + hash(i * 5)) % 1;
      const x = C + (hash(i * 11) - 0.5) * 18;
      p(x, C - R + 2 - life * 10, life < 0.5 ? '#fde68a' : '#f59e0b');
    }
};
// ---------- ??? : l'œil dans le vide ----------
const voidEye = (p: Px, t: number) => {
  // anneau de vide qui se déchire (tranches décalées par moments)
  const tear = Math.floor(t * 8) % 23 < 3;
  for (const [i, j, a] of ringPx(R, 2)) {
    const off = tear && ((j >> 2) & 1) ? 1 : 0;
    p(i + 0.5 + off, j + 0.5, hash(i * 7 + j * 3 + Math.floor(t * 4)) > 0.85 ? '#7f1d1d' : '#0b0b10');
    void a;
  }
  // l'œil en haut : il s'ouvre, regarde autour, se referme
  const P = 5,
    ph = t % P;
  const open = ph < 0.4 ? ph / 0.4 : ph > P - 0.5 ? (P - ph) / 0.5 : 1;
  const ex = C,
    ey = C - R - 1;
  const lid = Math.round(open * 3);
  for (let dx = -5; dx <= 5; dx++) {
    const hh = Math.round(Math.sqrt(Math.max(0, 1 - (dx / 5.5) ** 2)) * lid);
    for (let dy = -hh; dy <= hh; dy++) p(ex + dx - 0.5 + 0.5, ey + dy, Math.abs(dy) === hh ? '#0b0b10' : '#e5e7eb');
  }
  if (open > 0.5) {
    const look = Math.round(Math.sin(t * 1.3) * 2);
    p(ex + look - 0.5, ey, '#dc2626');
    p(ex + look + 0.5, ey, '#dc2626');
    p(ex + look, ey - 0.5, '#7f1d1d');
  }
  // parasites autour
  for (let i = 0; i < 8; i++) {
    if (hash(i + Math.floor(t * 5) * 13) > 0.5) continue;
    const [x, y] = at(hash(i * 3 + Math.floor(t * 5)) * TAU, R + 3 + hash(i * 9) * 4);
    p(x, y, i % 3 ? '#1f1f2a' : '#991b1b');
  }
};

const AURAS: Record<string, AL[]> = {
  // communs : un anneau net, d'une couleur, avec un petit détail
  au_blanc: [{ t: 'ring', c: '#e8ecf4' }],
  au_acier: [
    { t: 'ring', c: '#7d8799', w: 2 },
    { t: 'ring', c: '#c9d1de', every: 3 },
  ],
  au_rubis: [
    { t: 'ring', c: '#c81e3a' },
    { t: 'studs', c: '#ff5c7a', l: '#ffd0da', n: 4 },
  ],
  au_jade: [
    { t: 'ring', c: '#1f9d63' },
    { t: 'ring', c: '#5be3a0', r: R + 1.5, every: 4 },
  ],
  au_rose: [{ t: 'ring', c: '#ff8fc0', w: 2 }],
  au_lagon: [
    { t: 'ring', c: '#0ea5b7' },
    { t: 'ring', c: '#7ff0ff', r: R + 1.5, every: 2 },
  ],
  au_ambre: [
    { t: 'ring', c: '#d97706', w: 2 },
    { t: 'studs', c: '#fbbf24', l: '#fff1c2', n: 2 },
  ],
  au_menthe: [
    { t: 'ring', c: '#6ee7b7', every: 2 },
    { t: 'ring', c: '#2fbf8a', r: R + 1 },
  ],
  au_lilas: [
    { t: 'ring', c: '#a78bfa' },
    { t: 'ring', c: '#a78bfa', r: R + 2, every: 2 },
  ],
  au_corail: [
    { t: 'ring', c: '#ff7a59', w: 2 },
    { t: 'ring', c: '#ffd0c2', every: 5 },
  ],
  au_bleue: [
    { t: 'ring', c: '#2c4fd6' },
    { t: 'orbit', c: '#a9c2ff', l: '#ffffff', n: 2, v: 0.9, r: R + 1, big: true },
  ],
  au_clous: [
    { t: 'ring', c: '#5b6474', w: 2 },
    { t: 'studs', c: '#c9d1de', l: '#ffffff', n: 8 },
  ],
  // rares : ça bouge
  au_tourne: [
    { t: 'ring', c: '#155e75' },
    { t: 'dash', c: '#38bdf8', n: 8, len: 3, v: 0.8, r: R + 1.5 },
  ],
  au_bulles: [
    { t: 'ring', c: '#1e6fd9' },
    { t: 'orbit', c: '#9fd8ff', l: '#ffffff', n: 5, v: 0.5, r: R + 1.5, big: true },
    { t: 'orbit', c: '#5aa9ff', l: '#cfe8ff', n: 3, v: -0.35, r: R + 2.5 },
  ],
  au_feuilles: [
    { t: 'ring', c: '#166534', w: 2 },
    { t: 'orbit', c: '#4ade80', l: '#bbf7d0', n: 6, v: 0.25, r: R + 1.5, big: true },
  ],
  au_pulse: [
    { t: 'ring', c: '#be185d' },
    { t: 'pulse', c: '#ff7ab6', per: 1.1 },
  ],
  au_neon: [
    { t: 'blink', c: '#5cff9d', dim: '#1b6b3f', per: 2.4 },
    { t: 'ring', c: '#b6ffd4', r: R + 1.5, every: 6 },
  ],
  au_sable: [
    { t: 'ring', c: '#a16207', w: 2 },
    { t: 'orbit', c: '#fcd34d', l: '#fff7d6', n: 10, v: 0.3, r: R + 1.5 },
  ],
  au_or: [
    { t: 'ring', c: '#c98a12' },
    { t: 'studs', c: '#f2c230', l: '#fff3b0', n: 8 },
    { t: 'sweep', c: '#fff3b0', l: '#ffffff', per: 4 },
  ],
  au_etoile: [
    { t: 'ring', c: '#8ea8ff', every: 2 },
    { t: 'stars', c: '#cfe0ff', n: 4, sp: 1.7 },
  ],
  au_vague: [
    { t: 'ring', c: '#0f4c81' },
    { t: 'wave', c: '#38bdf8', l: '#e0f7ff', amp: 1.6, k: 6, v: 2 },
  ],
  // épiques : plusieurs couches qui vivent ensemble, et ça déborde de la photo
  au_comete: [
    { t: 'ring', c: '#1e3a8a', w: 2 },
    { t: 'comet', c: '#60a5fa', l: '#ffffff', v: 2.2, len: 16, r: R + 2.5 },
    { t: 'comet', c: '#a78bfa', l: '#ffffff', v: -1.6, len: 12, r: R + 4.5, off: 2 },
    { t: 'stars', c: '#bfdbfe', n: 4, sp: 1.3, r: R + 5 },
  ],
  au_givre: [
    { t: 'ring', c: '#7dd3fc', w: 2 },
    { t: 'spikes', c: '#bae6fd', l: '#ffffff', n: 12, h: 3 },
    { t: 'stars', c: '#e0f2fe', n: 6, sp: 1.1, r: R + 5 },
  ],
  au_eclair: [
    { t: 'ring', c: '#eab308', w: 2 },
    { t: 'bolt', c: '#fde047', l: '#ffffff', n: 3, len: 6 },
    { t: 'orbit', c: '#fde047', l: '#ffffff', n: 5, v: 1.4, r: R + 2, big: true },
  ],
  au_flamme: [
    { t: 'ring', c: '#e2550b', w: 2 },
    { t: 'flame', a: '#ff8a00', b: '#ff8a00', tip: '#ffd166', n: 24, h: 2.4 },
  ],
  au_ombre: [
    { t: 'ring', c: '#5b21b6', w: 2 },
    { t: 'orbit', c: '#a855f7', l: '#f3e8ff', n: 16, v: 0.7, r: R + 2 },
    { t: 'orbit', c: '#a855f7', l: '#f3e8ff', n: 11, v: -0.45, r: R + 4 },
    { t: 'orbit', c: '#7c3aed', l: '#e9d5ff', n: 6, v: 0.3, r: R + 6, big: true },
  ],
  au_lave: [
    { t: 'ring', c: '#991b1b', w: 2 },
    { t: 'flame', a: '#dc2626', b: '#f97316', tip: '#fde047', n: 26, h: 2.8, sp: 1.3 },
    { t: 'rise', c: '#f97316', l: '#fde047', n: 10, sp: 0.9, len: 6 },
  ],
  // légendaires : tout à la fois, des couleurs qu'on ne voit nulle part ailleurs, et ça rayonne loin
  au_galaxie: [
    { t: 'ring', c: '#4f46e5', w: 2 },
    { t: 'orbit', c: '#a5b4fc', l: '#ffffff', n: 18, v: 0.55, r: R + 2.5 },
    { t: 'orbit', c: '#f0abfc', l: '#ffffff', n: 12, v: -0.4, r: R + 4.5 },
    { t: 'comet', c: '#c4b5fd', l: '#ffffff', v: 1.3, len: 14, r: R + 3.5 },
    { t: 'comet', c: '#f0abfc', l: '#ffffff', v: -0.9, len: 10, r: R + 6, off: 3 },
    { t: 'stars', c: '#e9d5ff', n: 8, sp: 1.5, r: R + 5.5 },
  ],
  au_prisme: [
    { t: 'hue', v: 0.35 },
    { t: 'hue', v: 0.35, r: R + 0.8 },
    { t: 'hue', v: -0.5, r: R + 3, s: 2 },
    { t: 'hue', v: 0.8, r: R + 5.5, s: 4 },
    { t: 'comet', c: '#ffffff', l: '#ffffff', v: 1.8, len: 12, r: R + 2 },
    { t: 'stars', c: '#ffffff', n: 8, sp: 1.9, r: R + 5 },
  ],
  au_soleil: [
    { t: 'ring', c: '#d97706', w: 2 },
    { t: 'spikes', c: '#f59e0b', l: '#fde68a', n: 16, h: 4, v: 0.35 },
    { t: 'flame', a: '#f59e0b', b: '#fbbf24', tip: '#fff7d6', n: 22, h: 1.8, sp: 0.8 },
    { t: 'sweep', c: '#fff7d6', l: '#ffffff', per: 3 },
    { t: 'stars', c: '#fde68a', n: 6, sp: 1.2, r: R + 6 },
  ],
  // ---------- nouveaux ----------
  au_ocre: [{ t: 'ring', c: '#b45309' }, { t: 'ring', c: '#fcd34d', r: R + 1, every: 3 }],
  au_nuit: [{ t: 'ring', c: '#1e3a8a', w: 2 }, { t: 'ring', c: '#93c5fd', r: R + 2, every: 4 }],
  au_sapin: [{ t: 'ring', c: '#14532d', w: 2 }, { t: 'studs', c: '#22c55e', l: '#bbf7d0', n: 6 }],
  au_peche: [{ t: 'ring', c: '#fb923c' }, { t: 'ring', c: '#fed7aa', r: R + 1 }],
  au_radar: [
    { t: 'ring', c: '#064e3b' },
    { t: 'ring', c: '#065f46', r: R + 3, every: 2 },
    { t: 'fx', f: (p, t) => radar(p, t, '#34d399', '#d1fae5') },
  ],
  au_chaine: [{ t: 'fx', f: (p, t) => chain(p, t, '#9ca3af', '#e5e7eb') }],
  au_scintille: [{ t: 'ring', c: '#a78bfa' }, { t: 'fx', f: (p, t) => sparkle(p, t, '#ffffff', '#ddd6fe', 10) }],
  au_coeurs: [
    { t: 'ring', c: '#be123c' },
    { t: 'fx', f: (p, t) => orbitSprite(p, t, HEART, 4, 0.5, R + 3, '#fb7185', '#ffe4e6') },
  ],
  au_orage: [
    { t: 'ring', c: '#334155', w: 2 },
    { t: 'bolt', c: '#e0f2fe', l: '#ffffff', n: 2, len: 6 },
    { t: 'fx', f: (p, t) => rainDrops(p, t, '#7dd3fc') },
  ],
  au_spirale: [{ t: 'ring', c: '#7e22ce', w: 2 }, { t: 'fx', f: (p, t) => spiral(p, t, 4, '#c084fc', '#f5d0fe') }],
  au_runes: [
    { t: 'ring', c: '#0f766e', w: 2 },
    { t: 'fx', f: (p, t) => orbitSprite(p, t, RUNE, 6, 0.18, R + 4, '#2dd4bf', '#ccfbf1', true) },
  ],
  au_phenix: [
    { t: 'ring', c: '#c2410c', w: 2 },
    { t: 'flame', a: '#ea580c', b: '#f97316', tip: '#fde047', n: 26, h: 2.2, sp: 1.2 },
    { t: 'fx', f: (p, t) => orbitSprite(p, t, FEATHER, 3, 0.6, R + 5, '#fb923c', '#fef3c7') },
    { t: 'sweep', c: '#fde68a', l: '#ffffff', per: 3.5 },
  ],
  au_abysse: [
    { t: 'ring', c: '#082f49', w: 2 },
    { t: 'wave', c: '#0369a1', l: '#7dd3fc', amp: 2.2, k: 5, v: -1.4 },
    { t: 'fx', f: (p, t) => tentacles(p, t, '#0c4a6e', '#38bdf8') },
    { t: 'rise', c: '#38bdf8', l: '#e0f2fe', n: 8, sp: 0.6, len: 6 },
  ],
  // mythique : une épée tombe du ciel et se plante dans la photo, choc, éclats ; elle brille, puis repart
  au_epee: [
    { t: 'ring', c: '#475569', w: 2 },
    { t: 'fx', f: (p, t) => sword(p, t) },
  ],
  // ??? : un œil s'ouvre dans le vide, l'anneau se déchire par moments
  au_inconnu: [{ t: 'fx', f: (p, t) => voidEye(p, t) }],
};
const drawLayer = (p: Px, L: AL, t: number) => {
  switch (L.t) {
    case 'ring':
      ring(p, L.r ?? R, L.c, L.every ?? 1, L.w ?? 1);
      return;
    case 'fx':
      L.f(p, t);
      return;
    case 'dash': {
      const r = L.r ?? R;
      for (let i = 0; i < L.n; i++)
        for (let k = 0; k < L.len; k++) {
          const [x, y] = at(t * L.v + (i / L.n) * TAU + k * 0.07, r);
          p(x, y, L.c);
        }
      return;
    }
    case 'studs':
      for (let i = 0; i < L.n; i++) {
        const [x, y] = at((i / L.n) * TAU - Math.PI / 2 + t * (L.v ?? 0), R + 1);
        p(x - 0.5, y - 0.5, L.c, 2);
        p(x - 0.5, y - 0.5, L.l);
      }
      return;
    case 'orbit':
      for (let i = 0; i < L.n; i++) {
        const [x, y] = at(t * L.v + (i / L.n) * TAU, L.r ?? R + 1);
        if (L.big) {
          p(x - 0.5, y - 0.5, L.c, 2);
          p(x, y, L.l);
        } else p(x, y, i % 3 ? L.c : L.l);
      }
      return;
    case 'stars':
      for (let i = 0; i < L.n; i++) {
        const [x, y] = at(Math.PI / 4 + (i / L.n) * TAU, L.r ?? R + 1.5);
        star(p, x, y, Math.max(0, Math.sin(t * (L.sp ?? 1.5) - i * 1.4)), L.c);
      }
      return;
    case 'flame':
      for (let i = 0; i < L.n; i++) {
        const a = (i / L.n) * TAU;
        const h = Math.round(L.h + Math.sin(i * 2.3 + t * 5 * (L.sp ?? 1)) + Math.sin(i * 0.9 - t * 3) * 0.8);
        for (let k = 1; k <= h; k++) {
          const [x, y] = at(a, R + k);
          p(x, y, k === h ? L.tip : k > 1 ? L.b : L.a);
        }
      }
      return;
    case 'wave': {
      const n = Math.round(TAU * R);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU;
        const d = Math.sin(a * L.k + t * L.v) * L.amp;
        const [x, y] = at(a, R + 1 + d);
        p(x, y, d > L.amp * 0.6 ? L.l : L.c);
      }
      return;
    }
    case 'pulse': {
      const ph = (t % L.per) / L.per;
      ring(p, R + ph * 3, ph < 0.5 ? L.c : '#ffffff', ph < 0.7 ? 1 : 2);
      return;
    }
    case 'comet':
      for (let k = 0; k < L.len; k++) {
        const [x, y] = at(t * L.v + (L.off ?? 0) - Math.sign(L.v) * k * 0.05, L.r ?? R + 1);
        if (k === 0) p(x - 0.5, y - 0.5, L.l, 2);
        else if (k < L.len * 0.4 || k % 2 === 0) p(x, y, k < 3 ? L.l : L.c);
      }
      return;
    case 'sweep': {
      const ph = (t % L.per) / 1.2;
      if (ph < 1) {
        const a = -Math.PI / 2 + ph * TAU;
        for (let k = 0; k < 5; k++) {
          const [x, y] = at(a - k * 0.06, R);
          p(x, y, k ? L.c : L.l);
        }
      }
      return;
    }
    case 'bolt': {
      // un éclair en zigzag part de l'anneau, change de place à chaque coup
      const shot = Math.floor(t * 2.5);
      if (hash(shot) < 0.45) return;
      for (let b = 0; b < L.n; b++) {
        const a0 = hash(shot * 7 + b) * TAU;
        let rr = R;
        let a = a0;
        while (rr < R + (L.len ?? 3.5)) {
          const [x, y] = at(a, rr);
          p(x, y, rr < R + 1 ? L.l : L.c);
          rr += 0.8;
          a += (hash(shot * 13 + b + rr) - 0.5) * 0.25;
        }
      }
      return;
    }
    case 'spikes':
      for (let i = 0; i < L.n; i++) {
        const a = (i / L.n) * TAU + t * (L.v ?? 0);
        const h = i % 2 ? L.h : L.h + 1;
        for (let k = 1; k <= h; k++) {
          const [x, y] = at(a, R + k);
          p(x, y, k === h ? L.l : L.c);
        }
      }
      return;
    case 'hue': {
      const r = L.r ?? R;
      const n = Math.round(TAU * r);
      for (let i = 0; i < n; i += L.s ?? 1) {
        const a = (i / n) * TAU;
        const [x, y] = at(a, r);
        p(x, y, `hsl(${Math.round(((a / TAU) * 360 + t * L.v * 120) % 360)} 95% 65%)`);
      }
      return;
    }
    case 'rise':
      for (let i = 0; i < L.n; i++) {
        const ph = (t * L.sp + hash(i)) % 1;
        const [x, y] = at(hash(i + 9) * TAU, R + 1 + ph * (L.len ?? 3));
        if (ph < 0.85) p(x, y, ph < 0.4 ? L.l : L.c);
      }
      return;
    case 'blink': {
      // néon : allumé, avec un petit clignement de temps en temps
      const ph = t % L.per;
      const on = !(ph > 1.9 && ph < 2.0) && !(ph > 2.1 && ph < 2.15);
      ring(p, R, on ? L.c : L.dim);
      if (on) ring(p, R + 0.8, L.c, 2);
      return;
    }
  }
};

export function Aura({ id, children }: { id?: string | null; children: ReactNode }) {
  const layers = id ? AURAS[id] : undefined;
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current,
      x = cv?.getContext('2d');
    if (!cv || !x || !layers) return;
    cv.width = cv.height = G;
    const p: Px = (px, py, col, size = 1) => {
      x.fillStyle = col;
      // positions en miroir exact autour du centre (dessin symétrique)
      const fx = q(px),
        fy = q(py);
      x.fillRect(fx - (size > 1 ? Math.floor((size - 1) / 2) : 0), fy - (size > 1 ? Math.floor((size - 1) / 2) : 0), size, size);
    };
    const frame = (t: number) => {
      x.clearRect(0, 0, G, G);
      for (const L of layers) drawLayer(p, L, t);
    };
    if (reducedFx()) {
      frame(1);
      return;
    }
    // 12 images par seconde : ça bouge par crans, comme un sprite ; à l'arrêt hors de l'écran
    let raf = 0,
      last = -1,
      seen = true;
    const io = new IntersectionObserver(([e]) => {
      seen = !!e?.isIntersecting;
    });
    io.observe(cv);
    const t0 = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (!seen) return;
      const step = Math.floor((now - t0) / 83);
      if (step === last) return;
      last = step;
      frame(step / 12);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [layers]);
  if (!layers) return <>{children}</>;
  return (
    <span className={s.aura}>
      {children}
      <canvas ref={ref} className={s.ring} aria-hidden />
    </span>
  );
}

// ---------- effet de bannière : des sprites pixel PAR-DESSUS la bannière (elle reste visible) ----------
// Dessinés à la main (grille agrandie sans lissage), animés image par image à 10 i/s.
const PXS = 3; // taille d'un pixel de sprite à l'écran
type Spr = string[]; // '#' = couleur principale, 'o' = couleur claire
const SP: Record<string, Spr[]> = {
  plume: [['..o', '.o#', 'o#.', '#..'], ['o.', '#o', '.#']],
  leafA: [['.##', '#o#', '##.'], ['##.', '#o#', '.##']],
  ring2: [['.##.', '#..#', '#.o#', '.##.'], ['.#.', '#.#', '.#.']],
  fish: [['.##..#', '#o###.', '.##..#']],
  star: [['o'], ['.#.', '#o#', '.#.'], ['..#..', '..#..', '##o##', '..#..', '..#..']],
  flake: [['#.#.#', '.#o#.', '#ooo#', '.#o#.', '#.#.#'], ['.o.', 'o#o', '.o.'], ['o']],
  ember: [['o#', '##'], ['#o', '#'], ['o']],
  dot: [['o'], ['#']],
  dust: [['#'], ['o'], ['#.', '.o']],
  drop: [['o', '#', '#']],
  bead: [['o#', '##'], ['o']],
  bubble: [
    ['.#.', '#.o', '.#.'],
    ['.##.', '#..o', '#..#', '.##.'],
  ],
  leaf: [
    ['.##', '###', '#..'],
    ['##.', '###', '..#'],
  ],
  petal: [
    ['.o#', 'o##', '##.'],
    ['#o.', '##o', '.##'],
  ],
  heart: [
    ['.#.#.', '#o###', '#####', '.###.', '..#..'],
    ['#.#', '###', '.#.'],
  ],
  note: [
    ['..##', '..#.', '..#.', '###.', '##..'],
    ['.#', '.#', '##'],
  ],
  coin: [
    ['.##.', '#oo#', '#oo#', '.##.'],
    ['.#.', '#o#', '.#.'],
    ['#', '#'],
  ],
  sq: [['##', '##'], ['###', '###'], ['#']],
  crys: [
    ['.o.', 'o#o', '.o.'],
    ['..o..', '.###.', 'o#o#o', '.###.', '..o..'],
  ],
  wisp: [
    ['.o.', '###', '#.#'],
    ['o#', '#.'],
  ],
  feather: [
    ['..o', '.o#', 'o#.', '#..'],
    ['.o', 'o#', '#.'],
  ],
};
// une couche d'effet : un mouvement, ses sprites, sa densité (par 32 px de large), sa vitesse, ses couleurs
type BL = {
  m:
    | 'twinkle'
    | 'fall'
    | 'rise'
    | 'drift'
    | 'rain'
    | 'wander'
    | 'meteor'
    | 'flash'
    | 'band'
    | 'glitch'
    | 'spiral'
    | 'rays'
    | 'fire'
    | 'streak'
    | 'puff'
    | 'code'
    | 'swirl'
    | 'ocean'
    | 'swords'
    | 'static';
  spr?: keyof typeof SP;
  n?: number;
  v?: number;
  c: string[]; // [principale, claire, autres couleurs possibles…]
  sway?: number;
};
const BFXS: Record<string, BL[]> = {
  fx_poussiere: [{ m: 'drift', spr: 'dust', n: 0.8, v: 0.25, c: ['#9aa3b5', '#dfe4ee'], sway: 2 }],
  fx_pluie: [{ m: 'rain', spr: 'drop', n: 1.4, v: 2.4, c: ['#5b8bd6', '#cfe0ff'] }],
  fx_bulles: [{ m: 'rise', spr: 'bubble', n: 0.6, v: 0.45, c: ['#7fd6ff', '#ffffff'], sway: 2 }],
  fx_feuilles: [{ m: 'fall', spr: 'leaf', n: 0.5, v: 0.4, c: ['#3faa5a', '#a7f3b8'], sway: 4 }],
  fx_points: [{ m: 'twinkle', spr: 'dot', n: 1.2, c: ['#8ea8ff', '#ffffff'] }],
  fx_cendres: [{ m: 'fall', spr: 'dust', n: 1, v: 0.3, c: ['#6b6f7a', '#a3a7b1'], sway: 3 }],
  fx_pollen: [{ m: 'drift', spr: 'bead', n: 0.7, v: 0.35, c: ['#e8c547', '#fff7c2'], sway: 3 }],
  fx_gouttes: [{ m: 'fall', spr: 'bead', n: 0.8, v: 0.9, c: ['#ff8fc0', '#ffe4f0'] }],
  fx_sable: [{ m: 'drift', spr: 'dust', n: 1.6, v: 1.4, c: ['#c9a66b', '#f1dcb0'], sway: 1 }],
  fx_neige: [{ m: 'fall', spr: 'flake', n: 1, v: 0.45, c: ['#cfe8ff', '#ffffff'], sway: 2 }],
  fx_etoiles: [{ m: 'twinkle', spr: 'star', n: 1, c: ['#a9c2ff', '#ffffff'] }],
  fx_givre: [{ m: 'twinkle', spr: 'crys', n: 0.7, c: ['#7dd3fc', '#ffffff'] }],
  fx_petales: [{ m: 'fall', spr: 'petal', n: 0.7, v: 0.5, c: ['#f472b6', '#ffd1e8'], sway: 5 }],
  fx_lucioles: [
    { m: 'wander', spr: 'dot', n: 0.8, v: 0.5, c: ['#d9f99d', '#fefce8'] },
    { m: 'twinkle', spr: 'dot', n: 0.4, c: ['#84cc16', '#ecfccb'] },
  ],
  fx_coeurs: [{ m: 'rise', spr: 'heart', n: 0.45, v: 0.4, c: ['#f43f5e', '#ffd1da'], sway: 2 }],
  fx_notes: [{ m: 'rise', spr: 'note', n: 0.45, v: 0.35, c: ['#a78bfa', '#ede9fe', '#38bdf8'], sway: 3 }],
  fx_confettis: [
    {
      m: 'fall',
      spr: 'sq',
      n: 1,
      v: 0.7,
      c: ['#f43f5e', '#ffffff', '#f2c230', '#4ade80', '#38bdf8', '#a78bfa'],
      sway: 3,
    },
  ],
  fx_braises: [{ m: 'rise', spr: 'ember', n: 1, v: 0.55, c: ['#ff7a1a', '#ffd166'] }],
  fx_pixels: [{ m: 'glitch', spr: 'sq', n: 0.7, c: ['#22d3ee', '#ffffff', '#f43f5e', '#a3e635'] }],
  fx_magie: [
    { m: 'spiral', spr: 'star', n: 0.6, v: 0.45, c: ['#c084fc', '#ffffff'] },
    { m: 'twinkle', spr: 'dot', n: 0.6, c: ['#e9d5ff', '#ffffff'] },
  ],
  fx_pieces: [
    { m: 'fall', spr: 'coin', n: 0.5, v: 0.8, c: ['#f2c230', '#fff3b0'], sway: 1 },
    { m: 'twinkle', spr: 'star', n: 0.4, c: ['#fde68a', '#ffffff'] },
  ],
  fx_meteores: [
    { m: 'twinkle', spr: 'dot', n: 0.8, c: ['#c7d2fe', '#ffffff'] },
    { m: 'meteor', n: 2, v: 3, c: ['#93c5fd', '#ffffff'] },
  ],
  fx_eclairs: [
    { m: 'flash', n: 1, c: ['#fde047', '#ffffff'] },
    { m: 'twinkle', spr: 'dot', n: 0.5, c: ['#fde047', '#ffffff'] },
  ],
  fx_aurore: [
    { m: 'band', c: ['#34d399', '#a7f3d0', '#818cf8'] },
    { m: 'twinkle', spr: 'star', n: 0.6, c: ['#d1fae5', '#ffffff'] },
  ],
  fx_feu: [
    { m: 'fire', c: ['#dc2626', '#fde047', '#f97316'] },
    { m: 'rise', spr: 'ember', n: 0.9, v: 0.7, c: ['#ff7a1a', '#ffd166'] },
  ],
  fx_orage: [
    { m: 'rain', spr: 'drop', n: 1.6, v: 2.8, c: ['#64748b', '#cbd5e1'] },
    { m: 'flash', n: 1, c: ['#e0f2fe', '#ffffff'] },
  ],
  fx_ombre: [
    { m: 'rise', spr: 'wisp', n: 0.6, v: 0.35, c: ['#7c3aed', '#e9d5ff'], sway: 3 },
    { m: 'twinkle', spr: 'dot', n: 0.5, c: ['#a855f7', '#f3e8ff'] },
  ],
  fx_galaxie: [
    { m: 'band', c: ['#6d28d9', '#f0abfc', '#3b82f6'] },
    { m: 'twinkle', spr: 'star', n: 1.1, c: ['#c4b5fd', '#ffffff'] },
    { m: 'meteor', n: 1, v: 3.4, c: ['#f0abfc', '#ffffff'] },
    { m: 'spiral', spr: 'dot', n: 0.5, v: 0.3, c: ['#e9d5ff', '#ffffff'] },
  ],
  fx_prisme: [
    { m: 'rays', c: ['#ffffff'] },
    {
      m: 'fall',
      spr: 'crys',
      n: 0.7,
      v: 0.5,
      c: ['#f43f5e', '#ffffff', '#f2c230', '#4ade80', '#38bdf8', '#a78bfa'],
      sway: 2,
    },
    { m: 'twinkle', spr: 'star', n: 0.8, c: ['#ffffff', '#ffffff'] },
    { m: 'meteor', n: 1, v: 3.2, c: ['#fbcfe8', '#ffffff'] },
  ],
  fx_celeste: [
    { m: 'rays', c: ['#dbeafe'] },
    { m: 'fall', spr: 'feather', n: 0.45, v: 0.35, c: ['#e0f2fe', '#ffffff'], sway: 5 },
    { m: 'twinkle', spr: 'star', n: 0.9, c: ['#bfdbfe', '#ffffff'] },
    { m: 'spiral', spr: 'dot', n: 0.5, v: 0.35, c: ['#fde68a', '#ffffff'] },
  ],
  fx_vent: [{ m: 'streak', n: 0.6, v: 2.2, c: ['#cbd5e1', '#ffffff'] }],
  fx_plumes: [{ m: 'fall', spr: 'plume', n: 0.5, v: 0.3, c: ['#e5e7eb', '#ffffff'], sway: 5 }],
  fx_fumee: [{ m: 'puff', n: 0.5, v: 0.35, c: ['#6b7280', '#9ca3af'] }],
  fx_paillettes: [{ m: 'twinkle', spr: 'dot', n: 1.6, c: ['#f2c230', '#fff3b0'] }],
  fx_arcbulles: [
    { m: 'rise', spr: 'ring2', n: 0.6, v: 0.45, c: ['#f472b6', '#ffffff', '#38bdf8', '#a3e635', '#c084fc'], sway: 2 },
  ],
  fx_blizzard: [
    { m: 'drift', spr: 'flake', n: 1.4, v: 1.6, c: ['#e0f2fe', '#ffffff'], sway: 2 },
    { m: 'streak', n: 0.4, v: 3, c: ['#bae6fd', '#ffffff'] },
  ],
  fx_automne: [{ m: 'fall', spr: 'leafA', n: 0.7, v: 0.45, c: ['#ea580c', '#fde68a', '#dc2626', '#f59e0b'], sway: 5 }],
  fx_disco: [
    { m: 'glitch', spr: 'sq', n: 0.8, c: ['#f43f5e', '#ffffff', '#f2c230', '#22d3ee', '#a78bfa'] },
    { m: 'twinkle', spr: 'star', n: 0.6, c: ['#ffffff', '#ffffff'] },
  ],
  fx_matrix: [{ m: 'code', n: 1, v: 1, c: ['#16a34a', '#bbf7d0'] }],
  fx_lave: [
    { m: 'fire', c: ['#991b1b', '#fde047', '#ea580c'] },
    { m: 'rise', spr: 'bubble', n: 0.5, v: 0.4, c: ['#f97316', '#fde047'], sway: 1 },
  ],
  fx_portail: [
    { m: 'swirl', n: 1, v: 1, c: ['#7c3aed', '#e9d5ff', '#22d3ee'] },
    { m: 'twinkle', spr: 'dot', n: 0.6, c: ['#c4b5fd', '#ffffff'] },
  ],
  fx_ocean: [
    { m: 'ocean', c: ['#0369a1', '#e0f2fe', '#0ea5e9'] },
    { m: 'drift', spr: 'fish', n: 0.25, v: 0.5, c: ['#f59e0b', '#fde68a', '#fb7185', '#38bdf8'], sway: 2 },
    { m: 'rise', spr: 'bead', n: 0.5, v: 0.4, c: ['#7dd3fc', '#ffffff'], sway: 1 },
  ],
  fx_eclipse: [
    { m: 'rays', c: ['#fde68a'] },
    { m: 'band', c: ['#f59e0b', '#fff7d6', '#7c2d12'] },
    { m: 'twinkle', spr: 'star', n: 1, c: ['#fde68a', '#ffffff'] },
    { m: 'meteor', n: 1, v: 3.4, c: ['#fdba74', '#ffffff'] },
  ],
  // mythique : des épées tombent du ciel et se plantent en bas, avec un choc et des éclats
  fx_epees: [
    { m: 'swords', n: 0.35, v: 1, c: ['#cbd5e1', '#ffffff', '#f2c230', '#7c4a1e'] },
    { m: 'twinkle', spr: 'star', n: 0.4, c: ['#fde68a', '#ffffff'] },
  ],
  // ??? : parasites, la bannière se déchire, un œil rouge s'allume par moments
  fx_inconnu: [{ m: 'static', n: 1, c: ['#0b0b10', '#dc2626', '#1f1f2a'] }],
};
type P = { x: number; y: number; v: number; p: number; k: number; c: number };
export function BannerFx({ id }: { id?: string | null }) {
  const layers = id ? BFXS[id] : undefined;
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current,
      x = cv?.getContext('2d');
    if (!cv || !x || !layers) return;
    let W = 0,
      H = 0,
      parts: P[][] = [];
    const rnd = Math.random;
    const make = (L: BL): P => ({
      x: rnd() * W,
      y: rnd() * H,
      v: (L.v ?? 0.5) * (0.6 + rnd() * 0.8),
      p: rnd() * 10,
      k: Math.floor(rnd() * (SP[L.spr ?? 'dot']?.length ?? 1)),
      c: 2 + Math.floor(rnd() * Math.max(1, L.c.length - 2)),
    });
    const size = () => {
      W = cv.width = Math.max(1, Math.ceil(cv.clientWidth / PXS));
      H = cv.height = Math.max(1, Math.ceil(cv.clientHeight / PXS));
      parts = layers.map((L) =>
        Array.from({ length: Math.max(2, Math.round(((W * PXS) / 32) * (L.n ?? 1))) }, () => make(L)),
      );
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(cv);
    const px = (a: number, b: number, col: string) => {
      x.fillStyle = col;
      x.fillRect(Math.round(a), Math.round(b), 1, 1);
    };
    const blit = (spr: Spr | undefined, cx: number, cy: number, main: string, light: string) => {
      if (!spr) return;
      const h = spr.length,
        w = spr[0]?.length ?? 0;
      spr.forEach((row, j) =>
        [...row].forEach((ch, i) => {
          if (ch === '.') return;
          px(cx - w / 2 + i, cy - h / 2 + j, ch === 'o' ? light : main);
        }),
      );
    };
    const wrapY = (o: P, down: boolean) => {
      if (down && o.y > H + 5) {
        o.y = -5;
        o.x = rnd() * W;
      }
      if (!down && o.y < -5) {
        o.y = H + 5;
        o.x = rnd() * W;
      }
    };
    const frame = (f: number) => {
      x.clearRect(0, 0, W, H);
      layers.forEach((L, li) => {
        const ps = parts[li] ?? [];
        const [c0 = '#fff', c1 = '#fff'] = L.c;
        const multi = L.c.length > 2;
        const spr = SP[L.spr ?? 'dot'] ?? [];
        if (L.m === 'band') {
          // aurore : une bande ondulée de pixels en haut, qui respire et change de teinte
          for (let i = 0; i < W; i++) {
            const y = H * 0.28 + Math.sin(i * 0.07 + f * 0.08) * H * 0.12 + Math.sin(i * 0.023 - f * 0.05) * H * 0.08;
            const hgt = 3 + Math.round((Math.sin(i * 0.11 + f * 0.13) + 1) * 2.5);
            for (let k = 0; k < hgt; k++) {
              if ((i + k + f) % 3 === 0) continue;
              x.globalAlpha = 0.5 * (1 - k / (hgt + 1));
              px(i, y + k, k === 0 ? c1 : (i >> 4) % 2 ? c0 : (L.c[2] ?? c0));
            }
          }
          x.globalAlpha = 1;
          return;
        }
        if (L.m === 'code') {
          // pluie de code : des colonnes de caractères pixel qui tombent, la tête plus claire
          const cols = Math.ceil(W / 4);
          for (let ci = 0; ci < cols; ci++) {
            const sp = 0.4 + hash(ci * 3) * 0.8;
            const head = ((f * sp + hash(ci) * H * 2) % (H + 24)) - 4;
            for (let k = 0; k < 12; k++) {
              const y = Math.floor(head - k * 2);
              if (y < 0 || y >= H) continue;
              if (hash(ci * 97 + y * 13 + Math.floor(f / 3)) > 0.75) continue;
              x.globalAlpha = k === 0 ? 1 : 0.85 - k * 0.07;
              px(ci * 4 + 1, y, k === 0 ? c1 : c0);
              if (hash(ci + y) > 0.5) px(ci * 4 + 2, y, c0);
            }
          }
          x.globalAlpha = 1;
          return;
        }
        if (L.m === 'swirl') {
          // portail : bras de pixels qui tournent en spirale autour du centre de la bannière
          const cx = W / 2,
            cy = H / 2,
            mr = Math.min(W, H) * 0.48;
          for (let k = 0; k < 4; k++)
            for (let s2 = 0; s2 < 40; s2++) {
              const r = (s2 / 40) * mr;
              const a = f * 0.12 + (k / 4) * Math.PI * 2 + s2 * 0.18;
              x.globalAlpha = 0.25 + (1 - s2 / 40) * 0.6;
              px(cx + Math.cos(a) * r * 1.6, cy + Math.sin(a) * r, s2 < 6 ? c1 : s2 % 7 === 0 ? (L.c[2] ?? c0) : c0);
            }
          x.globalAlpha = 1;
          return;
        }
        if (L.m === 'ocean') {
          // vagues pixel en bas : deux couches qui ondulent en sens inverse, écume sur la crête
          for (let i = 0; i < W; i++)
            for (const [lvl, sp, colr] of [
              [0.18, 0.09, L.c[2] ?? c0],
              [0.1, -0.13, c0],
            ] as [number, number, string][]) {
              const top = Math.round(H - H * lvl - Math.sin(i * 0.12 + f * sp) * 2 - Math.sin(i * 0.05 - f * sp * 0.6) * 1.5);
              for (let y = top; y < H; y++) px(i, y, y === top ? c1 : colr);
            }
          return;
        }
        if (L.m === 'static') {
          // ??? : neige de parasites, bandes qui se décalent, œil rouge par instants
          for (let k = 0; k < Math.round(W * H * 0.01); k++)
            px(hash(k * 7 + f) * W, hash(k * 13 + f * 3) * H, k % 3 ? c0 : (L.c[2] ?? c0));
          if (f % 23 < 3) {
            const y0 = Math.floor(hash(f) * H);
            x.globalAlpha = 0.6;
            for (let i = 0; i < W; i++) for (let y = y0; y < y0 + 3; y++) px((i + 4) % W, y, (i >> 2) % 2 ? c0 : '#2a2a35');
            x.globalAlpha = 1;
          }
          const ph = f % 50;
          if (ph < 14) {
            const ex = W * 0.5,
              ey = H * 0.45,
              op = ph < 3 ? ph / 3 : ph > 11 ? (14 - ph) / 3 : 1;
            for (let dx = -6; dx <= 6; dx++) {
              const hh = Math.round(Math.sqrt(Math.max(0, 1 - (dx / 6.5) ** 2)) * 3 * op);
              for (let dy = -hh; dy <= hh; dy++) px(ex + dx, ey + dy, Math.abs(dy) === hh ? c0 : '#e5e7eb');
            }
            if (op > 0.6) {
              px(ex, ey, c1);
              px(ex - 1, ey, c1);
              px(ex, ey - 1, '#7f1d1d');
            }
          }
          return;
        }
        if (L.m === 'fire') {
          // brasier : des flammes en bas de la bannière, qui dansent
          for (let i = 0; i < W; i++) {
            const u = Math.max(2, H * 0.09);
            const h = Math.max(
              0,
              Math.round(u + Math.sin(i * 0.5 + f * 0.9) * u * 0.6 + Math.sin(i * 0.17 - f * 0.6) * u * 0.8),
            );
            for (let k = 0; k < h; k++) px(i, H - 1 - k, k > h - 2 ? c1 : k > h / 2 ? (L.c[2] ?? c0) : c0);
          }
          return;
        }
        if (L.m === 'rays') {
          // rayons de lumière qui glissent en diagonale, très légers
          for (let r = 0; r < 3; r++) {
            const base = ((f * 0.5 + r * (W / 2.4)) % (W * 1.4)) - W * 0.2;
            for (let y = 0; y < H; y++)
              for (let w = 0; w < 2; w++) {
                x.globalAlpha = (w ? 0.05 : 0.1) * (1 - y / H);
                px(base + w - y * 0.5, y, c0);
              }
          }
          x.globalAlpha = 1;
          return;
        }
        if (L.m === 'flash') {
          // éclair : un zigzag du haut vers le bas, et un flash pâle sur la bannière
          const shot = Math.floor(f / 14);
          const ph = f % 14;
          if (hash(shot) > 0.5 && ph < 3) {
            let bx = hash(shot * 3) * W;
            x.globalAlpha = ph === 0 ? 0.18 : 0.08;
            x.fillStyle = c1;
            x.fillRect(0, 0, W, H);
            x.globalAlpha = 1;
            for (let y = 0; y < H * (0.6 + hash(shot * 5) * 0.4); y++) {
              bx += (hash(shot * 31 + y) - 0.5) * 2.4;
              px(bx, y, ph === 2 ? c0 : c1);
              if (ph === 0) px(bx + 1, y, c0);
            }
          }
          return;
        }
        for (const o of ps) {
          const main = multi ? (L.c[o.c] ?? c0) : c0;
          const sw = L.sway ? Math.round(Math.sin(f * 0.12 + o.p) * L.sway) : 0;
          switch (L.m) {
            case 'streak': {
              // trait de vent : une ligne qui file à l'horizontale et s'estompe aux bouts
              o.x += o.v * 2;
              if (o.x > W + 20) {
                o.x = -20;
                o.y = rnd() * H;
              }
              const len = 6 + (o.k % 3) * 4;
              for (let k = 0; k < len; k++) {
                x.globalAlpha = 0.9 * (1 - k / len);
                px(o.x - k, o.y + (k > len / 2 ? 0 : 0), k < 2 ? c1 : main);
              }
              x.globalAlpha = 1;
              break;
            }
            case 'puff': {
              // fumée : une bouffée qui monte, grossit et se dissout
              o.y -= o.v * 0.5;
              if (o.y < -6) {
                o.y = H + 4;
                o.x = rnd() * W;
              }
              const life = 1 - o.y / H;
              const r = 1 + life * 3;
              x.globalAlpha = 0.55 * (1 - life);
              for (let dy = -r; dy <= r; dy++)
                for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r) px(o.x + dx + Math.sin(f * 0.1 + o.p) * 2, o.y + dy, (dx + dy) % 2 ? main : c1);
              x.globalAlpha = 1;
              break;
            }
            case 'swords': {
              // épée qui tombe, se plante en bas (choc + éclats), reste un instant, puis disparaît
              const P = 70;
              const ph = (f + Math.floor(o.p * P)) % P;
              if (ph === 0) o.x = 6 + rnd() * (W - 12);
              const ground = H - 2;
              const fall = 9;
              const len = 12;
              const tipY = ph < fall ? -len + (ground + len) * (ph / fall) ** 2 : ground;
              if (ph > 54) break;
              const top = tipY - len;
              const [st, li, gold, wood] = [L.c[0] ?? c0, L.c[1] ?? c1, L.c[2] ?? c0, L.c[3] ?? c0];
              px(o.x, top, gold);
              px(o.x, top + 1, wood);
              px(o.x, top + 2, wood);
              for (let k = -2; k <= 2; k++) px(o.x + k, top + 3, gold);
              for (let k = 4; k < len; k++) {
                px(o.x, top + k, li);
                px(o.x - 1, top + k, st);
                px(o.x + 1, top + k, st);
              }
              px(o.x, top + len, li);
              if (ph >= fall && ph < fall + 6) {
                const k = ph - fall;
                for (let s2 = 0; s2 < 6; s2++) {
                  const a = Math.PI + (s2 / 5) * Math.PI;
                  px(o.x + Math.cos(a) * k * 1.5, ground + Math.sin(a) * k, s2 % 2 ? gold : li);
                }
                for (let s2 = -k; s2 <= k; s2++) px(o.x + s2 * 1.5, ground + 1, st);
              }
              break;
            }
            case 'twinkle': {
              // point → petite croix → grande croix → petite croix → point → éteinte
              const ph = Math.floor((f / 3 + o.p) % 10);
              const st = [0, 1, 2, 1, 0, -1, -1, -1, -1, -1][ph] ?? -1;
              const sp = st >= 0 ? spr[Math.min(st, spr.length - 1)] : undefined;
              blit(sp, o.x, o.y, main, c1);
              if (ph === 9) {
                o.x = rnd() * W;
                o.y = rnd() * H;
              }
              break;
            }
            case 'fall':
              o.y += o.v * 0.5;
              wrapY(o, true);
              blit(spr[(o.k + (multi ? Math.floor(f / 4 + o.p) : 0)) % spr.length], o.x + sw, o.y, main, c1);
              break;
            case 'rise': {
              o.y -= o.v * 0.6;
              wrapY(o, false);
              const life = o.y / H;
              const sp = L.spr === 'ember' ? spr[life > 0.6 ? 0 : life > 0.25 ? 1 : 2] : spr[o.k];
              if (L.spr !== 'ember' || life > 0.1 || f % 2) blit(sp, o.x + sw, o.y, main, c1);
              break;
            }
            case 'drift':
              o.x += o.v * 0.6;
              if (o.x > W + 4) {
                o.x = -4;
                o.y = rnd() * H;
              }
              blit(spr[o.k], o.x, o.y + sw, main, c1);
              break;
            case 'rain':
              o.y += o.v;
              o.x -= o.v * 0.25;
              wrapY(o, true);
              if (o.x < -3) o.x = W + 3;
              blit(spr[0], o.x, o.y, main, c1);
              break;
            case 'wander': {
              o.x += Math.cos(f * 0.05 + o.p * 3) * o.v * 0.5;
              o.y += Math.sin(f * 0.07 + o.p * 2) * o.v * 0.4;
              if (o.x < 0 || o.x > W || o.y < 0 || o.y > H) {
                o.x = rnd() * W;
                o.y = rnd() * H;
              }
              const glow = Math.sin(f * 0.25 + o.p * 4) > -0.2;
              if (glow) {
                px(o.x, o.y, c1);
                px(o.x - 1, o.y, main);
                px(o.x + 1, o.y, main);
                px(o.x, o.y - 1, main);
                px(o.x, o.y + 1, main);
              }
              break;
            }
            case 'spiral': {
              o.y -= o.v * 0.5;
              wrapY(o, false);
              const sx = o.x + Math.sin(o.y * 0.15 + o.p) * 6;
              const sp = spr[Math.floor((f / 3 + o.p) % spr.length)];
              blit(sp, sx, o.y, main, c1);
              break;
            }
            case 'glitch': {
              // des carrés qui apparaissent une image ou deux, puis sautent ailleurs
              if ((f + Math.floor(o.p * 7)) % 6 < 2) blit(spr[o.k], o.x, o.y, main, c1);
              else if (rnd() < 0.15) {
                o.x = rnd() * W;
                o.y = rnd() * H;
                o.c = 2 + Math.floor(rnd() * 2);
              }
              break;
            }
            case 'meteor': {
              // étoile filante : traverse en diagonale avec sa traîne, de temps en temps
              const per = 40;
              const ph = (f + Math.floor(o.p * per)) % per;
              if (ph === 0) {
                o.x = rnd() * W * 0.9 + W * 0.2;
                o.y = rnd() * H * 0.4;
              }
              if (ph < 12) {
                const hx = o.x - ph * o.v,
                  hy = o.y + ph * o.v * 0.5;
                for (let k = 0; k < 9; k++) {
                  if (k > 4 && k % 2) continue;
                  px(hx + k, hy - k * 0.5, k < 2 ? c1 : c0);
                }
              }
              break;
            }
          }
        }
      });
    };
    if (reducedFx()) {
      frame(6);
      return () => ro.disconnect();
    }
    let raf = 0,
      last = -1,
      seen = true;
    const io = new IntersectionObserver(([e]) => {
      seen = !!e?.isIntersecting;
    });
    io.observe(cv);
    const t0 = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (!seen) return;
      const step = Math.floor((now - t0) / 100); // 10 images par seconde, comme un sprite
      if (step === last) return;
      last = step;
      frame(step);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, [layers]);
  if (!layers) return null;
  return <canvas ref={ref} className={s.bfx} aria-hidden />;
}

// aperçu d'un cosmétique (case de la boutique, choix dans l'éditeur)
// `big` : en grand (objet à la une de la boutique)
export function CosmeticPreview({
  id,
  label = 'Pseudo',
  big,
  hidden,
}: {
  id: string;
  label?: string;
  big?: boolean;
  /** rareté « ??? » pas encore à toi : rien qu'une silhouette noire (pour donner envie) */
  hidden?: boolean;
}) {
  const lg = big ? ` ${s.pvBig}` : '';
  const hd = hidden ? ` ${s.secret}` : '';
  if (id.startsWith('n_'))
    return (
      <span className={s.pvName + lg + hd}>
        <b className={nameCls(id)}>{label}</b>
      </span>
    );
  if (id.startsWith('au_'))
    return (
      <span className={s.pvAura + lg + hd}>
        <Aura id={id}>
          <span className={s.pvQ}>?</span>
        </Aura>
      </span>
    );
  return (
    <span className={s.pvBanner + lg + hd}>
      <BannerFx id={id} />
    </span>
  );
}
