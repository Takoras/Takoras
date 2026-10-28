import { useQuery } from '@tanstack/react-query';
import { create } from 'zustand';
import { socialApi } from '@/api';
import { useAuth } from '@/lib/auth';
import { locale } from '@/lib/settings';

// Amis (acceptés, demandes reçues et envoyées) avec le nombre de messages non lus
export type Friend = {
  id: string;
  pseudo: string;
  status: string;
  incoming: boolean;
  last_at: string | null;
  unread: number;
  avatar?: string | null;
  online?: boolean;
  elo?: number | null;
  collection?: number;
};
export function useFriends() {
  const uid = useAuth((s) => s.user?.id);
  return useQuery({
    queryKey: ['friends', uid],
    enabled: !!uid,
    queryFn: async () => (await socialApi.friends()) as unknown as Friend[],
    staleTime: 30_000,
  });
}
// Pastille : demandes reçues + messages non lus
export const badgeOf = (l: Friend[] = []) => ({
  req: l.filter((f) => f.incoming).length,
  unread: 0, // plus de chat : seules les demandes d'ami comptent
});

export type Msg = { id: number; mine: boolean; body: string; created_at: string };
export const timeOf = (d: string) => new Date(d).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' });
export const dateOf = (d: string) =>
  new Date(d).toLocaleString(locale(), { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

// Petites notifications en bas à droite (message d'un ami, prix changé) : clic = action
export type Notif = {
  id: number;
  title: string;
  body: string;
  pseudo?: string;
  tone?: 'up' | 'down';
  img?: { src: string; tint?: string };
  go: () => void;
};
export const useNotifs = create<{ list: Notif[] }>(() => ({ list: [] }));
let nid = 0;
export function notify(n: Omit<Notif, 'id'>, ms = 5600) {
  const id = ++nid;
  useNotifs.setState((s) => ({ list: [...s.list, { ...n, id }].slice(-4) }));
  setTimeout(() => dismiss(id), ms);
}
export const dismiss = (id: number) => useNotifs.setState((s) => ({ list: s.list.filter((x) => x.id !== id) }));

// localStorage protégé (navigation privée, stockage bloqué…)
export const lsGet = <T>(k: string, d: T): T => {
  try {
    const v = localStorage.getItem(k);
    return v === null ? d : (JSON.parse(v) as T);
  } catch {
    return d;
  }
};
export const lsSet = (k: string, v: unknown) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* rien */
  }
};
