// Animations de listes (FLIP) et dissolution en pixels (motion.js de l'ancien site, porté tel quel).
export const MO: { parts: unknown[]; raf: number; last: number; cv: HTMLCanvasElement | null };
export function moDissolve(img: HTMLImageElement, rect?: DOMRect, part?: number, fallback?: string): void;
export function moEmit(p: object): void;
export function moSnap(root: Element, sel: string): Map<string, DOMRect>;
export function moPlay(old: Map<string, DOMRect>, root: Element, sel: string, o?: { dissolve?: boolean; appear?: boolean }): void;
