import { useQuery } from '@tanstack/react-query';
import { combatApi, invApi } from '@/api';
import { SERIES, jetonOf, sellValue, tierKey, vOdds, type Jeton, type Tier } from '@/data/jetons';
import { useAuth } from '@/lib/auth';

// Inventaire du joueur : jetons regroupés par collection + nom + variante, déjà triés par le serveur.
export type Group = {
  key: string;
  serie: string;
  name: string;
  variant: string;
  odds: number;
  ids: number[];
  free: number[]; // vendables (pas verrouillés, pas en vitrine, pas dans l'équipe)
  shown: number;
  deck: number;
  last: number;
  luck: number;
};
export type Coll = { total: number; owned: number; vars: Record<string, number> };
export type InvData = { groups: Group[]; coll: Map<string, Coll>; levels: Map<string, number> };

export const VKEYS = ['gold', 'celeste', 'ombre'] as const;
export const gKey = (serie: string, name: string, v: string) => `${serie}|${name}|${v}`;
export const cKey = (serie: string, name: string) => `${serie}|${name}`;
export const seriesList = () => Object.keys(SERIES).filter((s) => SERIES[s]?.length);

type RawGroup = {
  serie?: string | null;
  jeton: string;
  variant?: string | null;
  odds: number;
  ids: number[];
  free?: number[] | null;
  shown?: number;
  deck?: number;
  last: string;
  best_luck?: number | null;
};
type RawColl = { serie?: string | null; jeton: string; variant?: string | null; total: number; owned: number };

export function parseGroups(rows: RawGroup[] | null): Group[] {
  return (rows ?? []).map((r) => {
    const serie = r.serie || 'Takoras',
      variant = r.variant || '';
    return {
      key: gKey(serie, r.jeton, variant),
      serie,
      name: r.jeton,
      variant,
      odds: r.odds,
      ids: r.ids,
      free: r.free ?? [],
      shown: Number(r.shown ?? 0),
      deck: Number(r.deck ?? 0),
      last: Date.parse(r.last) || 0,
      luck: Number(r.best_luck ?? 0),
    };
  });
}
export function parseColl(rows: RawColl[] | null) {
  const m = new Map<string, Coll>();
  (rows ?? []).forEach((r) => {
    const k = cKey(r.serie || 'Takoras', r.jeton),
      c = m.get(k) ?? { total: 0, owned: 0, vars: {} },
      v = r.variant || '';
    c.total += +r.total;
    c.owned += +r.owned;
    c.vars[v] = (c.vars[v] ?? 0) + +r.total;
    m.set(k, c);
  });
  return m;
}

export function useInventory() {
  const uid = useAuth((s) => s.user?.id);
  return useQuery({
    queryKey: ['inv', uid],
    enabled: !!uid,
    queryFn: async (): Promise<InvData> => {
      const [g, c, l] = await Promise.all([invApi.groups(), invApi.collection(), combatApi.levels()]);
      const levels = new Map<string, number>();
      (l ?? []).forEach((r) => levels.set(cKey(r.serie || 'Takoras', r.jeton), r.lvl));
      return { groups: parseGroups(g as unknown as RawGroup[]), coll: parseColl(c as RawColl[]), levels };
    },
  });
}
export const lvlOf = (d: InvData | undefined, serie: string, name: string) => d?.levels.get(cKey(serie, name)) ?? 1;

// Filtres de la grille
export type Sort = 'rarity' | 'count' | 'recent' | 'name';
export type View = { serie: string; vtab: string; tier: 'all' | Tier; own: boolean; q: string; sort: Sort };
export type Card = { j: Jeton; num: number; g?: Group; seen: boolean };
export function visibleCards(d: InvData, v: View, jn: (n: string) => string): Card[] {
  const all = SERIES[v.serie] ?? [];
  const byKey = new Map(d.groups.map((g) => [g.key, g]));
  const list = all
    .map((j, i) => ({
      j,
      num: i + 1,
      g: byKey.get(gKey(v.serie, j.name, v.vtab)),
      seen: !!d.coll.get(cKey(v.serie, j.name))?.vars[v.vtab],
    }))
    .filter(
      (x) =>
        (v.tier === 'all' || tierKey(x.j.odds) === v.tier) &&
        (!v.own || x.g) &&
        jn(x.j.name).toLowerCase().includes(v.q.toLowerCase()),
    );
  const cnt = (x: Card) => x.g?.ids.length ?? 0,
    vo = (x: Card) => vOdds(x.j.odds, v.vtab);
  const by: Record<Sort, (a: Card, b: Card) => number> = {
    rarity: (a, b) => vo(a) - vo(b),
    count: (a, b) => cnt(b) - cnt(a) || a.j.odds - b.j.odds,
    name: (a, b) => jn(a.j.name).localeCompare(jn(b.j.name)),
    recent: (a, b) => (b.g?.last ?? 0) - (a.g?.last ?? 0),
  };
  return list.sort(by[v.sort]);
}

// Sélection rapide pour la vente : doublons, communs, tout
export function quickSelect(cards: Card[], q: 'dupes' | 'common' | 'all') {
  const sel = new Map<string, number>();
  cards.forEach(({ g }) => {
    if (!g) return;
    const n =
      q === 'all'
        ? g.free.length
        : q === 'dupes'
          ? Math.min(g.free.length, g.ids.length - 1)
          : g.odds < 60
            ? g.free.length
            : 0;
    if (n > 0) sel.set(g.key, n);
  });
  return sel;
}
export function selTotals(groups: Group[], sel: Map<string, number>) {
  let n = 0,
    v = 0;
  const ids: number[] = [];
  for (const [k, q] of sel) {
    const g = groups.find((x) => x.key === k);
    if (!g) continue;
    n += q;
    v += q * sellValue(g.odds, g.variant);
    ids.push(...g.free.slice(0, q));
  }
  return { n, v, ids };
}
// Une vente qui contient un jeton de 1/1000 ou plus rare demande confirmation
export const needsConfirm = (groups: Group[], ids: number[]) => {
  const set = new Set(ids);
  return groups.some((g) => g.ids.some((id) => set.has(id)) && vOdds(g.odds, g.variant) >= 1000);
};

// Monter de niveau : il faut L doublons libres (et en garder au moins un)
export function levelInfo(d: InvData, serie: string, name: string) {
  const L = lvlOf(d, serie, name),
    gs = d.groups.filter((g) => g.name === name && g.serie === serie);
  const owned = gs.reduce((s, g) => s + g.ids.length, 0),
    free = gs.reduce((s, g) => s + g.free.length, 0);
  return { L, owned, free, can: L < 10 && free >= L && owned - L >= 1, have: Math.max(0, Math.min(free, owned - 1)) };
}
export { jetonOf };
