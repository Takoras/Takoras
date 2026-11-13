import SERIES_JSON from './series.json';

// Catalogue des jetons et règles d'affichage partagées (mêmes valeurs que le serveur et que l'ancien site).
export type Jeton = { name: string; odds: number; glow: string; img?: string; grid?: number };
export const SERIES: Record<string, Jeton[]> = SERIES_JSON;
export const TEMPLATE = '/img/jetons/template.png';
export const MYSTERE = '/img/jetons/mystere.png';

export const texOf = (j: Pick<Jeton, 'img'>) => j.img ?? TEMPLATE;
// Les dessins de jetons sont sur une grille de 80×80 (le jeton au centre, de la place autour pour ses effets).
// Le corps d'un jeton fait toujours la taille d'un ancien dessin 64×64 : on affiche donc l'image 80/64 fois plus grande
// que sa case. (Le modèle et le mystère restent en 64.) Un dessin sur une autre grille peut le préciser avec « grid ».
export const GRID = 80;
export const texScale = (j?: Pick<Jeton, 'grid' | 'img'>) => (j?.grid ?? (j?.img ? GRID : 64)) / 64;
// même chose à partir d'une adresse d'image (canvas, moteurs)
export const isGridImg = (src?: string) => !!src && src.includes('/img/jetons/serie-');
export const srcScale = (src?: string) => (isGridImg(src) ? GRID / 64 : 1);
export const hexRGB = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(', ');

// Un jeton par son nom (et sa collection si on la connaît)
export const jetonOf = (name: string, serie?: string): Jeton =>
  (serie ? SERIES[serie]?.find((j) => j.name === name) : undefined) ??
  Object.values(SERIES)
    .flat()
    .find((j) => j.name === name) ?? { name, odds: 1, glow: '#ffffff' };

// Raretés (bornes en « 1 sur X »)
export type Tier = 'r_common' | 'r_rare' | 'r_epic' | 'r_legend' | 'r_myth';
const TIER_NAMES: [number, Tier][] = [
  [60, 'r_common'],
  [1000, 'r_rare'],
  [10000, 'r_epic'],
  [100000, 'r_legend'],
  [Infinity, 'r_myth'],
];
export const tierKey = (odds: number): Tier => TIER_NAMES.find(([m]) => odds < m)?.[1] ?? 'r_myth';

// Variantes : chance d'apparition (1 sur X) et multiplicateur de revente
export type Variant = 'gold' | 'celeste' | 'ombre';
export const VARIANTS: Record<Variant, { odds: number; mult: number; col: string }> = {
  gold: { odds: 20, mult: 3, col: '250, 204, 21' },
  celeste: { odds: 200, mult: 10, col: '224, 231, 255' },
  ombre: { odds: 500, mult: 25, col: '168, 85, 247' },
};
const isVariant = (v: string | null | undefined): v is Variant => !!v && v in VARIANTS;
// Couleur d'un jeton tel qu'il est (hexa) : celle de sa mutation s'il en a une (Ombre = violet…), sinon la sienne
export const colorOf = (j: Pick<Jeton, 'glow'>, v?: string | null) =>
  isVariant(v)
    ? '#' +
      VARIANTS[v].col
        .split(', ')
        .map((n) => (+n).toString(16).padStart(2, '0'))
        .join('')
    : j.glow;
// Variables CSS d'un jeton : sa couleur (--g) et si son halo s'allume (--ga). Le halo est une récompense :
// seulement pour les jetons très rares (1/100 000 et plus) et les mutations (cahier de refonte § 3.3).
// Muté : la couleur est celle de la mutation (Ombre = violet, Doré = or, Céleste = blanc bleuté), partout.
export const glowVars = (j: { glow: string; odds: number }, v?: string | null) =>
  ({
    '--g': isVariant(v) ? VARIANTS[v].col : hexRGB(j.glow),
    '--ga': j.odds >= 100000 || isVariant(v) ? 1 : 0,
  }) as Record<string, string | number>;
export const vOdds = (odds: number, v?: string | null) => odds * (isVariant(v) ? VARIANTS[v].odds : 1);
// Valeur de revente : même règle que le serveur (_sell_value × multiplicateur de variante)
export const sellValue = (odds: number, v?: string | null) =>
  Math.max(1, Math.round(odds * 0.5)) * (isVariant(v) ? VARIANTS[v].mult : 1);

// Couleur d'une rareté et classe d'image d'une variante
export const tierCol = (t: string) => `var(--${t.replace('_', '-')})`;
export const vImg = (v?: string | null) => (isVariant(v) ? `px v-${v}` : 'px');
