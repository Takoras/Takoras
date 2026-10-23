import { useQuery } from '@tanstack/react-query';
import { combatApi } from '@/api';
import { RCFG } from '@/engines/ring-config.js';
import { useAuth } from '@/lib/auth';
import type { Group } from '../inventory/inv';

// Équipe de combat : 3 jetons (un par place), chacun dans une version (normale ou variante) que le joueur possède
export type Member = { id: number; serie: string; name: string; odds: number; variant: string };
export type Team = (Member | null)[];
// Un jeton possédé, avec un exemplaire par version : { '': id, gold: id… }
export type Owned = { k: string; serie: string; name: string; odds: number; vars: Record<string, number> };

export const VRANK: Record<string, number> = { '': 0, gold: 1, celeste: 2, ombre: 3 };
export const ownKey = (serie: string, name: string) => `${serie}|${name}`;

export function ownedTokens(groups: Group[]): Owned[] {
  const by: Record<string, Owned> = {};
  groups.forEach((g) => {
    const k = ownKey(g.serie, g.name);
    const o = (by[k] ??= { k, serie: g.serie, name: g.name, odds: g.odds, vars: {} });
    if (g.ids[0] !== undefined) o.vars[g.variant] = g.ids[0];
  });
  return Object.values(by);
}
// Par défaut : la version la plus commune (normale d'abord)
export const baseVariant = (o: Owned) => Object.keys(o.vars).sort((a, b) => (VRANK[a] ?? 0) - (VRANK[b] ?? 0))[0] ?? '';
type DeckRow = { id: number; jeton: string; lvl: number; odds: number; serie: string | null; variant: string | null };
export function useDeck() {
  const uid = useAuth((s) => s.user?.id);
  return useQuery({
    queryKey: ['deck', uid],
    enabled: !!uid,
    queryFn: async (): Promise<Team> => {
      const rows = (await combatApi.deck()) as DeckRow[];
      return [0, 1, 2].map((i) => {
        const r = rows[i];
        return r
          ? { id: r.id, serie: r.serie || 'Takoras', name: r.jeton, odds: r.odds, variant: r.variant || '' }
          : null;
      });
    },
  });
}

// Adversaire d'entraînement : 3 jetons au hasard, au niveau moyen de mon équipe (±1)
export function botTeam(myLevels: number[], rnd: () => number = Math.random) {
  const avg = Math.round(myLevels.reduce((a, b) => a + b, 0) / (myLevels.length || 1));
  const pool = Object.keys(RCFG.TOKENS)
    .sort(() => rnd() - 0.5)
    .slice(0, 3);
  return pool.map((name) => ({
    name,
    lvl: Math.max(1, Math.min(RCFG.LEVEL_MAX, avg + Math.round(rnd() * 2 - 1))),
    variant: '',
  }));
}
