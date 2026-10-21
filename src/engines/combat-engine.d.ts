// Types de CB : éléments des jetons et stats affichées (combat-engine.js, repris tel quel).
export type Element = 'fire' | 'water' | 'plant' | 'light' | 'shadow';
export const CB: {
  EL: Record<string, Element>;
  elOf(name: string): Element;
  elMult(a: Element, b: Element): number;
  stats(name: string, odds: number, lvl?: number, variant?: string): { mass: number; power: number; r: number };
  power(s: { mass: number; power: number; r: number }): number;
};
