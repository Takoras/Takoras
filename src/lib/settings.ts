import { create } from 'zustand';
import type { Lang } from '@/i18n';

// Réglages du joueur, sauvegardés dans le navigateur sous la même clé que l'ancien site (takoras-settings) :
// passer de l'ancien au nouveau site garde la langue, la vitesse, le volume, les effets et l'ouverture auto.
export type Speed = 'normal' | 'rapide' | 'instant';
export type Fx = 'auto' | 'full' | 'reduced';
export type Variant = 'gold' | 'celeste' | 'ombre';
export type Settings = { speed: Speed; lang: Lang; volume: number; fx: Fx; autoMin: number; autoVars: Variant[] };

const KEY = 'takoras-settings';
export const DEFAULTS: Settings = {
  speed: 'normal',
  lang: 'fr',
  volume: 70,
  fx: 'auto',
  autoMin: 1000,
  autoVars: ['gold', 'celeste', 'ombre'],
};

function load(): Settings {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<Settings> | null;
    const s = { ...DEFAULTS, ...(raw ?? {}) };
    // valeurs inattendues (ancien format, modification à la main) → valeur par défaut
    if (!['normal', 'rapide', 'instant'].includes(s.speed)) s.speed = DEFAULTS.speed;
    if (s.lang !== 'fr' && s.lang !== 'en') s.lang = DEFAULTS.lang;
    if (!['auto', 'full', 'reduced'].includes(s.fx)) s.fx = DEFAULTS.fx;
    s.volume = Math.max(0, Math.min(100, Number(s.volume) || 0));
    return s;
  } catch {
    return { ...DEFAULTS };
  }
}

type Store = Settings & { set: (patch: Partial<Settings>) => void };
export const useSettings = create<Store>((set, get) => ({
  ...load(),
  set: (patch) => {
    set(patch);
    const { set: _omit, ...data } = get();
    void _omit;
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      /* navigation privée : on garde en mémoire */
    }
  },
}));

// Appareil vraiment faible (2 cœurs ou 2 Go max) : effets allégés en mode « Auto »
const nav = typeof navigator === 'undefined' ? undefined : (navigator as Navigator & { deviceMemory?: number });
export const LOWFX = (nav?.hardwareConcurrency ?? 8) <= 2 || (nav?.deviceMemory ?? 8) <= 2;
export const reducedFx = (fx: Fx = useSettings.getState().fx) => fx === 'reduced' || (fx === 'auto' && LOWFX);
export const speedFactor = () => ({ normal: 1, rapide: 0.5, instant: 0 })[useSettings.getState().speed];
export const locale = (lang: Lang = useSettings.getState().lang) => (lang === 'en' ? 'en-US' : 'fr-FR');

// Safari et iPhone/iPad (WebKit) n'appliquent pas le filtre SVG « dessin » des jetons : effet coupé chez eux
export const WEBKIT_ONLY = (() => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return ios || (/AppleWebKit/.test(ua) && !/Chrome|Chromium|Edg|OPR|Android/.test(ua));
})();
