import { useQuery } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import { combatApi } from '@/api';
import { RCFG } from '@/engines/ring-config.js';
import { useAuth } from '@/lib/auth';
import { SB_KEY, SB_URL, sb } from '@/lib/supabase';

// Classé : mon Elo, mes rangs, la recherche d'adversaire et le lien avec le serveur (fonction « ranked »).
// Le serveur apparie par Elo, garde les tirs secrets et calcule chaque tour. Le site ne fait que viser et rejouer.

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
export type Match = {
  id: string;
  p1: string;
  p2: string;
  names: [string, string];
  map: string;
  state: unknown;
  turn: number;
  ready1: boolean;
  ready2: boolean;
  deadline: string;
  status: 'live' | 'done';
  winner: 0 | 1 | null;
  why: string | null;
  elo: { before: [number, number]; after: [number, number] } | null;
  last: unknown;
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

// ---------- Rangs : Fer 1-2-3, Bronze 1-2-3 … Diamant 3, puis Maître et Légende (RCFG.RANKS, 50 Elo par division)
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

// ---------- Appels au serveur
export type ServerReply = {
  error?: string;
  now: number;
  match?: string;
  queued?: boolean;
  window?: number;
  ok?: boolean;
};
let skew = 0; // horloge locale − horloge du serveur (ms)
export async function call(op: string, body: Record<string, unknown> = {}): Promise<ServerReply> {
  const token = (await sb.auth.getSession()).data.session?.access_token;
  const t0 = Date.now();
  const r = await fetch(`${SB_URL}/functions/v1/ranked`, {
    method: 'POST',
    headers: { apikey: SB_KEY, Authorization: `Bearer ${token ?? ''}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ op, ...body }),
  });
  const j = (await r.json().catch(() => ({ error: 'network', now: Date.now() }))) as ServerReply;
  if (j.now) skew = (t0 + Date.now()) / 2 - j.now;
  return j;
}
export const toLocal = (iso: string) => Date.parse(iso) + skew;

// La base n'a pas (encore) ces tables dans ses types générés : client non typé, lecture seule
const raw = sb as unknown as SupabaseClient;
export async function fetchMatch(id: string): Promise<Match | null> {
  const { data } = await raw.from('ranked_matches').select('*').eq('id', id).maybeSingle();
  return (data as Match | null) ?? null;
}
// Suit un match : temps réel + relecture toutes les 4 s (si un message se perd). Renvoie de quoi arrêter.
export function watchMatch(id: string, onRow: (m: Match) => void) {
  const ch = raw
    .channel(`ranked-${id}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'ranked_matches', filter: `id=eq.${id}` },
      (p) => onRow(p.new as Match),
    )
    .subscribe();
  const poll = setInterval(() => void fetchMatch(id).then((m) => m && onRow(m)), 4000);
  return () => {
    clearInterval(poll);
    void raw.removeChannel(ch);
  };
}
