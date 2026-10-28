// Écran d'ouverture des pulls (transitions.js + opening.js de l'ancien site, portés tels quels).
// buy(n, plan, variants, lucks, ids) : joue l'ouverture de n jetons déjà tirés par le serveur (take_pulls).
export function buy(n: number, plan?: string[] | null, vars?: (string | null)[] | null, lucks?: number[] | null, ids?: (number | null)[] | null): void;
export function leave(): Promise<void>;
export function canClose(): boolean;
export function startOpening(): void;
export function closeOpening(): void;
export function renderAutoCfg(): void;
export function renderDebug(): void;
export const debug: { luck: number; force: string; variant?: string };
export let sess: { total: number; idx: number; results: unknown[]; recap?: boolean } | null;
