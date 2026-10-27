// Écran du Ring (ring-ui + ring-fx de l'ancien site, portés tels quels). Il crée lui-même son overlay plein écran.
import type { RingState } from './ring-engine';
type Team = { name: string; lvl?: number; variant?: string }[];
export type RingOnline = {
  me: 0 | 1;
  state: unknown;
  turn: number;
  deadline: number;
  toLocal: (iso: string) => number;
  shoot: (shot: { i: number; ax: number; ay: number; f: number; pow: boolean } | null) => void;
  tick: () => void;
  forfeit: () => void;
};
export function startRing(teams: [Team, Team], opts?: { names?: [string, string]; ai?: string; tuto?: boolean; map?: string; online?: RingOnline; onEnd?: (r: 'again' | 'back') => void }): void;
export function ringOnline(m: unknown): void;
export function closeRing(): void;
export function ringPlayTurn(shots?: unknown[]): void;
export function startRingTuto(onEnd?: (r: 'again' | 'back') => void, opts?: { must?: boolean; onDone?: () => void }): void;
export function ringTutoSeen(): boolean;
export function powerText(name: string): { pw: string; name: string; desc: string; cd: number; when: string };
export function ringStatsHTML(name: string, lvl?: number, variant?: string, compact?: boolean): string;
export const PW_COL: Record<string, string>;
export const RT: Record<string, unknown>;
export function rt(k: string, v?: Record<string, string | number>): string;
export const RNG: { st: RingState | null; el: HTMLElement | null; raf: number; [k: string]: unknown };
export const RFX: Record<string, (...a: unknown[]) => unknown>;
export const RSND: Record<string, () => void>;
