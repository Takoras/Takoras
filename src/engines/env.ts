// Environnement des moteurs portés de l'ancien site (cinéma, motion, ouverture) : les mêmes petits outils que les globales
// d'autrefois (SETTINGS, t, esc, jetonOf…), mais branchés sur les réglages, les traductions et le catalogue React.
import { locale, potatoFx, reducedFx as rfx, speedFactor, useSettings } from '@/lib/settings';
import { dictOf, translate, type Key } from '@/i18n';
import { hexRGB, jetonOf, SERIES, texOf, VARIANTS } from '@/data/jetons';
import { sfx } from './sound.js';

export { hexRGB, jetonOf, SERIES, texOf, sfx };

// Les moteurs lisent SETTINGS.lang, SETTINGS.speed… et l'ouverture auto écrit SETTINGS.autoMin / autoVars
type St = ReturnType<typeof useSettings.getState>;
export const SETTINGS = new Proxy({} as St, {
  // qualité « patate » : l'ouverture est toujours instantanée (pas de transition, pas de fissures, pas de mouvement)
  get: (_o, k) => (k === 'speed' && potatoFx() ? 'instant' : useSettings.getState()[k as keyof St]),
  set: (_o, k, v) => (useSettings.getState().set({ [k]: v } as Partial<St>), true),
});
export const reducedFx = () => rfx();
export const speed = () => speedFactor();
export const fmt = (n: number) => Number(n).toLocaleString(locale());

// Échappement HTML : les moteurs construisent un peu de HTML, toute donnée y passe par esc()
const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c] ?? c);

// Textes : t('cle') → espace « ui », at('cle') → espace « arena » (comme l'ancien site)
export const t = (k: string, v?: Record<string, string | number>) =>
  translate(useSettings.getState().lang, `ui.${k}` as Key, v);
export const at = (k: string, v?: Record<string, string | number>) =>
  translate(useSettings.getState().lang, `arena.${k}` as Key, v);

// Noms des jetons (quelques-uns sont traduits en anglais)
export const jn = (name: string) => (useSettings.getState().lang === 'en' && dictOf('en').names[name]) || name;
export const jnH = (name: string) => esc(jn(name));

// Variantes : classe CSS et petite étiquette
export const vCls = (v: string) => (v in VARIANTS ? ' v-' + v : '');
export const vTag = (v: string) =>
  v in VARIANTS
    ? `<span class="vtag v-${v}"><i class="vstamp" style="background-image:url(/img/stamps/${v}.png)" aria-hidden="true"></i>${esc(t('v_' + v))}</span>`
    : '';

// ---------- Pour le moteur d'ouverture (opening + transitions de l'ancien site)
import { sb } from '@/lib/supabase';
import { qc } from '@/lib/queryClient';
import { useAuth } from '@/lib/auth';
import { errorText } from '@/api/rpc';
import { toast as toastUI } from '@/ui/toast';
import type { Me } from '@/api/queries';
export { sb, VARIANTS };
export { vOdds } from '@/data/jetons';
export { sparkStyle } from './sparks.js';

export const $ = (id: string) => document.getElementById(id);
export const LOCALE = () => locale();
export const fmtLuck = (l: number | string) => Number(l).toLocaleString(locale(), { maximumFractionDigits: 2 });
// Les toasts de l'ancien site peuvent contenir un peu de HTML : on n'affiche que le texte
export const toast = (text: string, bad = false) => toastUI(String(text).replace(/<[^>]*>/g, ''), bad);
export const errText = (e: unknown) => errorText(e, useSettings.getState().lang);
export const saveSettings = () => undefined; // les réglages se sauvegardent tout seuls (SETTINGS écrit dans le store)

// Le joueur, vu par les moteurs : session (useAuth) + état serveur (cache ['me'])
const me = () => qc.getQueryData<Me>(['me', useAuth.getState().user?.id]);
export const ACC = {
  get user() {
    return useAuth.getState().user;
  },
  get pseudo() {
    return me()?.pseudo ?? null;
  },
  get isAdmin() {
    return !!me()?.admin;
  },
  get tester() {
    return !!me()?.tester;
  },
  get beta() {
    return !!me()?.beta;
  },
  hist: [] as unknown[],
};

// Couleurs de chaque série (même DA, autre teinte) : fond de l'ouverture, pluie de l'accueil, cubes de transition.
// main / clair / second, en « r g b » pour les mettre dans rgb(var(--serie) / x%)
// Séries payées en pièces (pas de stock de tirages) : prix d'un tirage, et prix des 10 (-10 %)
export const COIN_PULL = { one: 300, ten: 2700 };

export const SERIE_THEME: Record<string, { main: string; hi: string; alt: string }> = {
  Takoras: { main: '39 71 181', hi: '71 194 234', alt: '61 107 255' },
  Bodako: { main: '31 122 61', hi: '139 211 106', alt: '20 92 72' }, // nature : feuilles, mousse
};
const TAKORAS_THEME = { main: '39 71 181', hi: '71 194 234', alt: '61 107 255' };
export const serieTheme = (name?: string) => SERIE_THEME[name ?? ''] ?? TAKORAS_THEME;

// Le seul type de pull (même objet que l'ancien site)
export const PULLS = [
  { group: '', name: 'Takoras', color: 'takoras', price: 100, free: true, img: '/img/jetons/takoras.png' },
  // Bodako : on peut la choisir et voir sa collection ; l'ouverture attend le tirage par série côté serveur
  { group: '', name: 'Bodako', color: 'bodako', price: 300, free: false, img: '/img/jetons/bodako.png', soon: true },
] as { group: string; name: string; color: string; price: number; free: boolean; img: string; soon?: boolean }[];

// Crochets : ce que le moteur demande au reste du site (économie, historique…). React les branche au démarrage.
export const host = {
  openPulls: (n: number | 'all', serie?: string) => {
    void n;
    void serie;
  },
  applyState: (st: unknown) => {
    void st;
  },
  ecoDecorate: (): void => undefined,
  accRecordPull: (j: unknown, serie?: string) => {
    void j;
    void serie;
    return false;
  },
  loadLocalHist: (): unknown[] => [],
  renderHist: (): void => undefined,
  toggleAdmin: (): void => undefined,
  // Confirmation (abandon du Ring…) : remplacée au démarrage par la fenêtre maison du site
  ask: (text: string): Promise<boolean> => Promise.resolve(window.confirm(text)),
  // Fiche d'un jeton pendant un match (React : features/combat/RingSheet.tsx) ; null = fermer
  ringSheet: (p: unknown): void => {
    void p;
  },
};
