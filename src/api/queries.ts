import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { ecoApi } from './index';

// État du joueur renvoyé par eco_state (source de vérité : le serveur)
export type Me = {
  coins: number;
  stock: number;
  max: number;
  admin: boolean;
  pseudo: string | null;
  banned: boolean;
  beta: boolean;
  tester: boolean;
  [k: string]: unknown;
};

export function useMe() {
  const uid = useAuth((s) => s.user?.id);
  return useQuery({
    queryKey: ['me', uid],
    queryFn: async () => (await ecoApi.state()) as unknown as Me,
    enabled: !!uid,
    staleTime: 15_000,
  });
}

import { publicApi, tables } from './index';

// Mes derniers tirages (connecté) — lecture directe filtrée par la RLS
export function useHistory() {
  const uid = useAuth((s) => s.user?.id);
  return useQuery({
    queryKey: ['history', uid],
    queryFn: async () => {
      if (!uid) return [];
      const { data, error } = await tables.myRecentPulls(uid);
      if (error) throw error;
      return data;
    },
    enabled: !!uid,
    refetchInterval: 60_000,
  });
}

// En direct : les beaux tirages de tous les joueurs, toutes les 15 s
export function useLive() {
  return useQuery({ queryKey: ['live'], queryFn: () => publicApi.liveFeed(20), refetchInterval: 15_000 });
}

import { questApi } from './index';
export type Quest = { id: string; stat: string; target: number; value: number; claimed: boolean; coins: number; item: string | null; qty: number };
export type Daily = { available: boolean; amount: number; next_streak: number; tomorrow: number };
// Quêtes du jour + bonus quotidien (connecté)
export function useQuests() {
  const uid = useAuth((s) => s.user?.id);
  return useQuery({
    queryKey: ['quests', uid],
    queryFn: async () => {
      const [q, d] = await Promise.all([questApi.quests(), questApi.daily()]);
      return { ...(q as { quests: Quest[]; reset_in: number }), daily: d as Daily | null, at: Date.now() };
    },
    enabled: !!uid,
  });
}
