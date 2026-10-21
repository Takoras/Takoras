import { fr } from './fr';
import { en } from './en';
import type { Dict, Key } from './types';

export type Lang = 'fr' | 'en';
export type { Key };
const DICTS: Record<Lang, Dict> = { fr, en };

// Texte traduit, avec les {variables} remplacées. Le résultat est du texte (jamais du HTML) :
// les <b> du dictionnaire sont rendus par <Rich>, voir Rich.tsx.
export function translate(lang: Lang, key: Key, vars: Record<string, string | number> = {}): string {
  const get = (d: Dict) => key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], d);
  const raw = get(DICTS[lang]) ?? get(DICTS.fr) ?? key;
  return String(raw).replace(/\{(\w+)\}/g, (_, x: string) => String(vars[x] ?? ''));
}
