import { create } from 'zustand';
import { fr } from './fr';
import type { Dict, Key } from './types';

export type Lang = 'fr' | 'en';
export type { Key };

// L'anglais est téléchargé seulement si le joueur l'utilise (environ 9 Ko compressés de moins pour tout le monde).
// En attendant qu'il arrive, on affiche le français ; `useDictVersion` fait se rafraîchir les écrans à son arrivée.
let EN: Dict | null = null;
let loading: Promise<void> | null = null;
export const useDictVersion = create<{ v: number }>(() => ({ v: 0 }));
export function loadEn() {
  loading ??= import('./en').then((m) => {
    EN = m.en;
    useDictVersion.setState((s) => ({ v: s.v + 1 }));
  });
  return loading;
}
export const dictOf = (lang: Lang): Dict => (lang === 'en' && EN ? EN : (fr as unknown as Dict));

// Texte traduit, avec les {variables} remplacées. Le résultat est du texte (jamais du HTML) :
// les <b> du dictionnaire sont rendus par <Rich>, voir Rich.tsx.
export function translate(lang: Lang, key: Key, vars: Record<string, string | number> = {}): string {
  const get = (d: Dict) => key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], d);
  const raw = get(dictOf(lang)) ?? get(fr as unknown as Dict) ?? key;
  return String(raw).replace(/\{(\w+)\}/g, (_, x: string) => String(vars[x] ?? ''));
}
