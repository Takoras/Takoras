import type { fr } from './fr';

// Même structure que le FR, avec des chaînes quelconques : une clé EN manquante ne compile pas.
type Widen<T> = T extends string
  ? string
  : T extends readonly (infer U)[]
    ? readonly Widen<U>[]
    : { [K in keyof T]: Widen<T[K]> };
export type Dict = Omit<Widen<typeof fr>, 'names'> & { names: Record<string, string> };

// Toutes les clés « a.b.c » qui mènent à un texte
type Leaves<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? `${P}${K}`
    : T[K] extends readonly unknown[]
      ? never
      : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];
export type Key = Leaves<Omit<typeof fr, 'names'>>;
