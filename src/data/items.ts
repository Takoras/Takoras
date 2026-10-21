import type { Key, Lang } from '@/i18n';
import { translate } from '@/i18n';
import { AVATARS } from '@/lib/avatars';

// Objets de la boutique / de l'inventaire : image et textes (mêmes règles que l'ancien site)
export const BANNER_IMG: Record<string, string> = { plaine: '/img/bannieres/plaine.png', doodle: '/img/bannieres/doodle.png' };
const POTION5 = '/img/potions/chance-5.png';
export const ITEM_IMG: Record<string, { src: string; tint?: string }> = {
  potion1: { src: '/img/potions/chance-1-3.png' },
  potion2: { src: '/img/potions/chance-2.png' },
  potion3: { src: POTION5 },
  potion10: { src: POTION5, tint: 'hue-rotate(150deg) saturate(1.6)' },
  potion25: { src: POTION5, tint: 'hue-rotate(290deg) saturate(1.8)' },
  potion50: { src: POTION5, tint: 'hue-rotate(-20deg) saturate(2.2)' },
  potion100: { src: POTION5, tint: 'grayscale(1) brightness(1.6)' },
  hourglass: { src: '/img/objets/sablier.png' },
  instant: { src: '/img/objets/recharge.png' },
};
export type ShopItem = { id: string; kind: string; data: { mult?: number; rolls?: number; minutes?: number } & Record<string, unknown> };
export function itemImg(it: Pick<ShopItem, 'id' | 'kind'>): { src: string; tint?: string; wide?: boolean } {
  if (it.kind === 'avatar') return { src: AVATARS[it.id.slice(2)] ?? '' };
  if (it.kind === 'banner') return { src: BANNER_IMG[it.id.slice(2)] ?? '', wide: true };
  return ITEM_IMG[it.id] ?? ITEM_IMG.instant ?? { src: '' };
}
// Nombre « à la française » (1,3) ou anglaise (1.3)
export const dec = (n: number, lang: Lang) => String(Math.round(n * 100) / 100).replace('.', lang === 'fr' ? ',' : '.');
export const hms = (s: number) => [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map((n) => String(Math.max(0, n)).padStart(2, '0')).join(':');
export function bannerName(id: string, lang: Lang) {
  const k = `ui.bn_${id}` as Key, n = translate(lang, k);
  return n === k ? id.charAt(0).toUpperCase() + id.slice(1) : n;
}
export function itemText(it: ShopItem, lang: Lang): [string, string] {
  const t = (k: string, v?: Record<string, string | number>) => translate(lang, `ui.${k}` as Key, v);
  if (it.kind === 'potion') return [t('it_potion', { m: dec(it.data.mult ?? 1, lang) }), t('it_potion_d', { m: dec(it.data.mult ?? 1, lang), n: it.data.rolls ?? 0 })];
  if (it.kind === 'instant') return [t('it_instant'), t('it_instant_d')];
  if (it.kind === 'hourglass') return [t('it_hourglass'), t('it_hourglass_d', { n: it.data.minutes ?? 0 })];
  if (it.kind === 'avatar') return [t('it_pp', { n: t('pp_' + it.id.slice(2)) }), t('it_pp_d')];
  return [t('it_banner', { n: bannerName(it.id.slice(2), lang) }), t('it_banner_d')];
}
