import { useQuery } from '@tanstack/react-query';
import { combatApi } from '@/api';
import { RCFG } from '@/engines/ring-config.js';
import { useAuth } from '@/lib/auth';

// Classé : mon Elo et mes rangs (la route des rangs).

export type RankedMe = {
  elo: number;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  best_elo: number;
  tuto_done: boolean;
  top: number;
  live: string | null;
  queued: boolean;
};
export function useRanked() {
  const uid = useAuth((s) => s.user?.id);
  return useQuery({
    queryKey: ['ranked', uid],
    enabled: !!uid,
    queryFn: async () => (await combatApi.rankedMe()) as unknown as RankedMe,
    refetchOnWindowFocus: true,
  });
}

// ---------- Rangs : Bois 1-2-3, Pierre 1-2-3 … Rubis 3, puis Maître et Takoras (RCFG.RANKS, 50 Elo par division)
export type Rank = { k: string; col: string; div: number; divs: number; min: number; max: number | null; idx: number };
const RANKS = RCFG.RANKS,
  DIV = RCFG.DIV;

// Toutes les marches de la route, de la plus basse à la plus haute
export const ROAD: Rank[] = RANKS.flatMap((r, ri) => {
  const next = RANKS[ri + 1];
  const top = next ? next.min : null;
  return Array.from({ length: r.divs }, (_, d) => {
    const min = r.divs > 1 && top != null ? top - (r.divs - d) * DIV : r.min;
    const max = d < r.divs - 1 ? min + DIV : top;
    return { k: r.k, col: r.col, div: d + 1, divs: r.divs, min: d === 0 ? r.min : min, max, idx: 0 };
  });
}).map((r, idx) => ({ ...r, idx }));

export const rankOf = (elo: number): Rank => [...ROAD].reverse().find((r) => elo >= r.min) ?? (ROAD[0] as Rank);
