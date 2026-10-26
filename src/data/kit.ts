import { RG } from '@/engines/ring-engine.js';
import { RCFG } from '@/engines/ring-config.js';
import { dictOf, type Lang } from '@/i18n';

// Infos de combat d'un jeton (pouvoir, stats du Ring) sans charger tout l'écran du Ring.
// Plus de catégories (combattant, tank…) : chaque jeton se définit par ses stats et son pouvoir.

// Couleur de chaque pouvoir (mêmes valeurs que le Ring)
export const PW_COL: Record<string, string> = {
  grow: '#7dd3fc',
  bounce: '#f9a8d4',
  scrap: '#fb923c',
  slide: '#a5f3fc',
  eruption: '#f97316',
  flare: '#fb923c',
  zerog: '#93c5fd',
  sun: '#fbbf24',
  cyclone: '#d9364f',
  rift: '#3fc7b6',
  current: '#f0453a',
  avatar: '#9fb6ff',
  jelly: '#7dd3fc',
  pinball: '#f9a8d4',
  rampart: '#d97706',
  icetrail: '#a5f3fc',
  surf: '#38bdf8',
  ora: '#f43f5e',
  blink: '#c9a6f2',
  mirror: '#f7a8d8',
  shade: '#7c8cf8',
  starfall: '#f6d39a',
  grab: '#6366f1',
  yinyang: '#f0453a',
  telekinesis: '#f08a3c',
  stun: '#d9364f',
  blackhole: '#3fc7b6',
  freeze: '#a5f3fc',
  wave: '#38bdf8',
  curve: '#60a5fa',
  double: '#f43f5e',
  ghost: '#c4b5fd',
  rescue: '#4ade80',
  shrink: '#818cf8',
  magnet: '#fde68a',
  anchor: '#94a3b8',
  second: '#fb7185',
  roots: '#e879f9',
  shield: '#f1f5f9',
  void: '#a855f7',
  split: '#ffffff',
  haste: '#86efac',
  guard: '#7dd3fc',
  none: '#888888',
};

type PwDict = Record<string, readonly [string, string]>;
export function powerInfo(name: string, lang: Lang) {
  const k = RG.kit(name),
    r = dictOf(lang).ring;
  const pw = r.pw as unknown as PwDict;
  const [n, d] = pw[k.pw] ?? pw.none ?? ['', ''];
  const when =
    k.pw === 'none'
      ? ''
      : k.uses
        ? r.uses.replace('{n}', String(k.uses))
        : k.cd
          ? r.every.replace('{n}', String(k.cd))
          : r.once;
  return { pw: k.pw, name: n, desc: d, when, col: PW_COL[k.pw] ?? '#888888' };
}

export const ringStats = (name: string, lvl = 1, variant = '') => RG.stats(name, lvl, variant);
export const RING_MAX = RCFG.STAT_MAX;
export const LEVEL_MAX = RCFG.LEVEL_MAX;
