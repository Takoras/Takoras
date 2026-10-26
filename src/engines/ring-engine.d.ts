// Types du moteur physique déterministe du Ring (ring-engine.js, repris tel quel de l'ancien site).
import type { TokenKit } from './ring-config';
export type Body = {
  id: number; side: 0 | 1; i: number; name: string; lvl: number; variant: string; pw: string;
  base: { mass: number; power: number; r: number }; mass: number; power: number; r: number;
  x: number; y: number; vx: number; vy: number; alive: boolean; cd: number; spent: boolean; tmp?: boolean;
};
export type Wall = { x1: number; y1: number; x2: number; y2: number; w: number; k: number; hp?: number; dead?: boolean };
export type Zone = { x: number; y: number; w: number; h: number; fric: number };
export type RingMap = { id: string; R: number; fric: number; walls: Wall[]; zones: Zone[] };
export type RingState = { turn: number; over: boolean; winner: 0 | 1 | null; sudden: boolean; bodies: Body[]; map?: RingMap };
export type Shot = { i: number; ax: number; ay: number; f: number; pow: boolean; pows?: number[] }; // pows : pouvoirs des autres jetons activés ce tour
export type RingEvent = { t: string; at?: number; [k: string]: unknown };
export type Resolved = { frames: ([number, number, number] | null)[][]; ev: RingEvent[]; ids?: number[]; firstHit?: number };
export const RG: {
  kit(name: string): TokenKit;
  roleOf(name: string): 'fighter' | 'tank' | 'support';
  stats(name: string, lvl?: number, variant?: string): { mass: number; power: number; r: number };
  create(teams: { name: string; lvl?: number; variant?: string }[][], mapId?: string): RingState;
  clone(st: RingState): RingState;
  alive(st: RingState, side?: 0 | 1): Body[];
  ready(b: Body): boolean;
  resolve(st: RingState, shots: (Shot | null)[], opts?: { preview?: number }): Resolved;
  aiShot(st: RingState, side: 0 | 1, level?: string, rnd?: () => number): Shot | null;
  aiSmart(st: RingState, side: 0 | 1, rnd?: () => number): Shot | null;
  len(x: number, y: number): number;
  ringR(st: RingState): number;
  nearest(o: Wall, px: number, py: number): [number, number];
  touchesWall(st: RingState, x: number, y: number, r: number): boolean;
};
