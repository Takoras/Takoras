import { useEffect, useRef, type ReactNode } from 'react';
import type { Lang } from '@/i18n';
import { reducedFx } from '@/lib/settings';
import s from './Cosmetics.module.css';

// Cosmétiques de profil (boutique) : effet de pseudo (n_…), contour de la photo (au_…), effet de bannière (fx_…).
// Même DA que le jeu : dessinés en vrais pixels (anneaux en orbite et étoiles en croix de PixelBg), aux couleurs
// des mutations. Chacun a une rareté, comme les jetons : plus il est rare, plus il a de couches et de mouvement.
export type CRar = 'common' | 'rare' | 'epic' | 'legend';
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
};
const ids = (p: string) => Object.keys(DEF).filter((k) => k.startsWith(p));
export const COSMETICS = { name: ids('n_'), aura: ids('au_'), bfx: ids('fx_') };
export const cosmName = (id: string, lang: Lang) => DEF[id]?.[lang === 'en' ? 1 : 0] ?? id;
export const cosmRar = (id: string): CRar => DEF[id]?.[2] ?? 'common';
/** rareté → « chance » du fond pixel (même échelle que les jetons : plus c'est rare, plus il est chargé) */
export const RAR_ODDS: Record<CRar, number> = { common: 60, rare: 5000, epic: 100_000, legend: 1_000_000 };
/** rareté → clé de traduction et variable de couleur du site */
export const rarKey = (r: CRar) => `ui.r_${r}` as const;
export const rarCol = (r: CRar) => `var(--r-${r})`;
export const isCosmetic = (kind: string) => kind === 'name' || kind === 'aura' || kind === 'bfx';

// classe à mettre sur un pseudo (rien si pas d'effet)
export const nameCls = (id?: string | null) => (id?.startsWith('n_') && s[id] ? `${s.name} ${s[id]}` : '');

// ---------- contour : un cadre en pixels autour de la photo ----------
const G = 48; // grille du dessin (48×48 pixels), agrandie sans lissage autour de la photo (les plus rares débordent)
const C = G / 2 - 0.5; // centre
const R = 17; // rayon de l'anneau, juste autour de la photo
const TAU = Math.PI * 2;
type Px = (x: number, y: number, col: string, size?: number) => void;
const at = (a: number, r: number): [number, number] => [C + Math.cos(a) * r, C + Math.sin(a) * r];
const ring = (p: Px, r: number, col: string, every = 1, from = 0) => {
  const n = Math.round(TAU * r);
  for (let i = from; i < n; i += every) {
    const [x, y] = at((i / n) * TAU, r);
    p(x, y, col);
  }
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
  | { t: 'ring'; c: string; r?: number; every?: number; w?: 2 }
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
  | { t: 'blink'; c: string; dim: string; per: number };
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
};
const drawLayer = (p: Px, L: AL, t: number) => {
  switch (L.t) {
    case 'ring':
      ring(p, L.r ?? R, L.c, L.every ?? 1);
      if (L.w) ring(p, (L.r ?? R) + 0.8, L.c, L.every ?? 1);
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
        star(p, Math.round(x), Math.round(y), Math.max(0, Math.sin(t * (L.sp ?? 1.5) - i * 1.4)), L.c);
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
      x.fillRect(Math.round(px), Math.round(py), size, size);
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
    | 'fire';
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
export function CosmeticPreview({ id, label = 'Pseudo', big }: { id: string; label?: string; big?: boolean }) {
  const lg = big ? ` ${s.pvBig}` : '';
  if (id.startsWith('n_'))
    return (
      <span className={s.pvName + lg}>
        <b className={nameCls(id)}>{label}</b>
      </span>
    );
  if (id.startsWith('au_'))
    return (
      <span className={s.pvAura + lg}>
        <Aura id={id}>
          <span className={s.pvQ}>?</span>
        </Aura>
      </span>
    );
  return (
    <span className={s.pvBanner + lg}>
      <BannerFx id={id} />
    </span>
  );
}
