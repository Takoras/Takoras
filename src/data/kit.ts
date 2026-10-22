import { RG } from '@/engines/ring-engine.js';
import { RCFG } from '@/engines/ring-config.js';
import { CB } from '@/engines/combat-engine.js';
import { dictOf, type Lang } from '@/i18n';

// Infos de combat d'un jeton (élément, pouvoir, stats du Ring) sans charger tout l'écran du Ring.
export type El = 'fire' | 'water' | 'plant' | 'light' | 'shadow';
export const ELS: Record<El, { ico: string; col: string; fr: string; en: string }> = {
  fire: { ico: '🔥', col: '#fb923c', fr: 'Feu', en: 'Fire' },
  water: { ico: '💧', col: '#38bdf8', fr: 'Eau', en: 'Water' },
  plant: { ico: '🌿', col: '#4ade80', fr: 'Plante', en: 'Plant' },
  light: { ico: '✨', col: '#fde68a', fr: 'Lumière', en: 'Light' },
  shadow: { ico: '🌑', col: '#a78bfa', fr: 'Ténèbres', en: 'Dark' },
};
export const elOf = (name: string) => CB.elOf(name) as El;

// Couleur de chaque pouvoir (mêmes valeurs que le Ring)
export const PW_COL: Record<string, string> = {
  grow: '#7dd3fc',
  bounce: '#f9a8d4',
  scrap: '#fb923c',
  slide: '#a5f3fc',
  eruption: '#f97316',
  curve: '#60a5fa',
  double: '#f43f5e',
  ghost: '#c4b5fd',
  rescue: '#4ade80',
  shrink: '#818cf8',
  magnet: '#fde68a',
  anchor: '#94a3b8',
  second: '#fb7185',
  roots: '#86efac',
  shield: '#f1f5f9',
  void: '#a855f7',
  split: '#ffffff',
  none: '#888888',
};

type PwDict = Record<string, readonly [string, string]>;
export function powerInfo(name: string, lang: Lang) {
  const k = RG.kit(name),
    r = dictOf(lang).ring;
  const pw = r.pw as unknown as PwDict;
  const [n, d] = pw[k.pw] ?? pw.none ?? ['', ''];
  const when = k.pw === 'none' ? '' : k.cd ? r.every.replace('{n}', String(k.cd)) : r.once;
  return { pw: k.pw, name: n, desc: d, when, col: PW_COL[k.pw] ?? '#888888' };
}

export const ringStats = (name: string, lvl = 1, variant = '') => RG.stats(name, lvl, variant);
export const RING_MAX = RCFG.STAT_MAX;
export const LEVEL_MAX = RCFG.LEVEL_MAX;
