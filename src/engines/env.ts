// Environnement des moteurs portés de l'ancien site (ring, cinéma, motion) : les mêmes petits outils que les globales
// d'autrefois (SETTINGS, t, esc, jetonOf…), mais branchés sur les réglages, les traductions et le catalogue React.
import { locale, reducedFx as rfx, speedFactor, useSettings } from '@/lib/settings';
import { translate, type Key } from '@/i18n';
import { en } from '@/i18n/en';
import { hexRGB, jetonOf, SERIES, texOf, VARIANTS } from '@/data/jetons';
import { sfx } from './sound.js';

export { hexRGB, jetonOf, SERIES, texOf, sfx };

// Lecture seule : les moteurs lisent SETTINGS.lang, SETTINGS.speed…
export const SETTINGS = new Proxy({} as ReturnType<typeof useSettings.getState>, { get: (_o, k) => useSettings.getState()[k as keyof ReturnType<typeof useSettings.getState>] });
export const reducedFx = () => rfx();
export const speed = () => speedFactor();
export const fmt = (n: number) => Number(n).toLocaleString(locale());

// Échappement HTML : les moteurs construisent un peu de HTML, toute donnée y passe par esc()
const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c] ?? c);

// Textes : t('cle') → espace « ui », at('cle') → espace « arena » (comme l'ancien site)
export const t = (k: string, v?: Record<string, string | number>) => translate(useSettings.getState().lang, `ui.${k}` as Key, v);
export const at = (k: string, v?: Record<string, string | number>) => translate(useSettings.getState().lang, `arena.${k}` as Key, v);

// Noms des jetons (quelques-uns sont traduits en anglais)
export const jn = (name: string) => (useSettings.getState().lang === 'en' && en.names[name]) || name;
export const jnH = (name: string) => esc(jn(name));

// Variantes : classe CSS et petite étiquette
export const vCls = (v: string) => (v in VARIANTS ? ' v-' + v : '');
export const vTag = (v: string) => (v in VARIANTS ? `<span class="vtag v-${v}">${esc(t('v_' + v))}</span>` : '');
