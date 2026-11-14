import type { Key, Lang } from '@/i18n';
import { translate } from '@/i18n';
import { AVATARS } from '@/lib/avatars';
import { cosmName, cosmRar, isCosmetic, RAR_ODDS, type CRar } from '@/ui/Cosmetics';

// Objets de la boutique / de l'inventaire : image et textes (mêmes règles que l'ancien site)
export const BANNER_IMG: Record<string, string> = {
  plaine: '/img/bannieres/plaine.png',
  doodle: '/img/bannieres/doodle.png',
  yeux: '/img/bannieres/yeux.png', // passe premium, saison 1
};
const POTION5 = '/img/potions/chance-5.png';
export const ITEM_IMG: Record<string, { src: string; tint?: string }> = {
  potion1: { src: '/img/potions/chance-1-3.png' },
  potion2: { src: '/img/potions/chance-2.png' },
  potion3: { src: POTION5 },
  potion10: { src: '/img/potions/chance-10.png' },
  potion25: { src: '/img/potions/chance-25.png' },
  potion50: { src: '/img/potions/chance-50.png' },
  potion100: { src: '/img/potions/chance-100.png' },
  potion250: { src: '/img/potions/chance-250.png' },
  potion500: { src: '/img/potions/chance-500.png' },
  hourglass: { src: '/img/objets/sablier.png' },
};
export type ShopItem = {
  id: string;
  kind: string;
  data: { mult?: number; rolls?: number; minutes?: number } & Record<string, unknown>;
};
// Fond d'un objet (sa couleur et sa « rareté », en 1 sur X comme les jetons) : le MÊME partout (boutique, passe…)
const POTION_ODDS: Record<number, number> = {
  1.3: 1,
  2: 100,
  5: 1000,
  10: 10_000,
  25: 50_000,
  50: 100_000,
  100: 500_000,
};
const POTION_GLOW: Record<number, string> = {
  1.3: '134, 239, 172',
  2: '196, 181, 253',
  5: '242, 194, 48',
  10: '103, 232, 249',
  25: '244, 114, 182',
  50: '245, 205, 82',
  100: '255, 255, 255',
};
// cosmétiques : la couleur de leur rareté (celle des jetons) et un fond d'autant plus chargé qu'ils sont rares
const RAR_GLOW: Record<CRar, string> = {
  common: '203, 213, 225',
  rare: '56, 189, 248',
  epic: '183, 155, 255',
  legend: '251, 191, 36',
  myth: '240, 171, 252',
  secret: '248, 113, 113',
};
export const itemOdds = (it: Pick<ShopItem, 'id' | 'kind' | 'data'>) =>
  it.kind === 'potion'
    ? (POTION_ODDS[it.data.mult ?? 0] ?? ((it.data.mult ?? 0) >= 250 ? 1_000_000 : 1))
    : isCosmetic(it.kind)
      ? RAR_ODDS[cosmRar(it.id)]
      : 100;
/** couleur « r, g, b » */
export const itemGlow = (it: Pick<ShopItem, 'id' | 'kind' | 'data'>) =>
  isCosmetic(it.kind)
    ? RAR_GLOW[cosmRar(it.id)]
    : it.kind === 'potion'
    ? (POTION_GLOW[it.data.mult ?? 0] ?? '61, 107, 255')
    : it.kind === 'banner'
      ? '242, 194, 48'
      : '142, 170, 255';
export const rgbHex = (rgb: string) =>
  '#' +
  rgb
    .split(',')
    .map((n) => (+n).toString(16).padStart(2, '0'))
    .join('');

export function itemImg(it: Pick<ShopItem, 'id' | 'kind'>): { src: string; tint?: string; wide?: boolean } {
  if (it.kind === 'avatar') return { src: AVATARS[it.id.slice(2)] ?? '' };
  if (it.kind === 'banner') return { src: BANNER_IMG[it.id.slice(2)] ?? '', wide: true };
  return ITEM_IMG[it.id] ?? { src: '' };
}
// Nombre « à la française » (1,3) ou anglaise (1.3)
export const dec = (n: number, lang: Lang) => String(Math.round(n * 100) / 100).replace('.', lang === 'fr' ? ',' : '.');
export const hms = (s: number) =>
  [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map((n) => String(Math.max(0, n)).padStart(2, '0')).join(':');
export function bannerName(id: string, lang: Lang) {
  const k = `ui.bn_${id}` as Key,
    n = translate(lang, k);
  return n === k ? id.charAt(0).toUpperCase() + id.slice(1) : n;
}
export function itemText(it: ShopItem, lang: Lang): [string, string] {
  const t = (k: string, v?: Record<string, string | number>) => translate(lang, `ui.${k}` as Key, v);
  if (it.kind === 'potion')
    return [
      t('it_potion', { m: dec(it.data.mult ?? 1, lang) }),
      t('it_potion_d', { m: dec(it.data.mult ?? 1, lang), n: it.data.rolls ?? 0 }),
    ];
  if (it.kind === 'hourglass') return [t('it_hourglass'), t('it_hourglass_d', { n: it.data.minutes ?? 0 })];
  if (it.kind === 'avatar') return [t('it_pp', { n: t('pp_' + it.id.slice(2)) }), t('it_pp_d')];
  // cosmétiques de profil
  const cn = cosmName(it.id, lang);
  if (it.kind === 'name') return [t('it_name', { n: cn }), t('it_cosm_d')];
  if (it.kind === 'aura') return [t('it_aura', { n: cn }), t('it_cosm_d')];
  if (it.kind === 'bfx') return [t('it_bfx', { n: cn }), t('it_cosm_d')];
  return [t('it_banner', { n: bannerName(it.id.slice(2), lang) }), t('it_banner_d')];
}
