import { RG } from '@/engines/ring-engine.js';
import { RCFG } from '@/engines/ring-config.js';
import { dictOf, type Lang } from '@/i18n';

// Infos de combat d'un jeton (rôle, pouvoir, stats du Ring) sans charger tout l'écran du Ring.
// Les rôles remplacent les anciens éléments : Combattant, Tank, Soutien. Simple étiquette, visible dans les stats de base.
export type Role = 'fighter' | 'tank' | 'support';
export const ROLES: Record<Role, { ico: string; col: string; fr: string; en: string }> = {
  fighter: { ico: '⚔️', col: '#fb7185', fr: 'Combattant', en: 'Fighter' },
  tank: { ico: '🛡️', col: '#60a5fa', fr: 'Tank', en: 'Tank' },
  support: { ico: '✚', col: '#4ade80', fr: 'Soutien', en: 'Support' },
};
export const roleOf = (name: string): Role => RG.roleOf(name);

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
  const when = k.pw === 'none' ? '' : k.cd ? r.every.replace('{n}', String(k.cd)) : r.once;
  return { pw: k.pw, name: n, desc: d, when, col: PW_COL[k.pw] ?? '#888888' };
}

export const ringStats = (name: string, lvl = 1, variant = '') => RG.stats(name, lvl, variant);
export const RING_MAX = RCFG.STAT_MAX;
export const LEVEL_MAX = RCFG.LEVEL_MAX;
