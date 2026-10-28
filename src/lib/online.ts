import { create } from 'zustand';
import { publicApi } from '@/api';
import { usePoll } from './poll';

// Joueurs en ligne : ceux qui ont joué dans les 2 dernières minutes (le serveur compte les « pings » de temps de jeu).
// Plus de connexion en direct ouverte par joueur juste pour ça.
export const useOnline = create<{ n: number }>(() => ({ n: 0 }));

export function useOnlinePresence(_uid: string | undefined) {
  void _uid;
  usePoll(async () => {
    const n = Number(await publicApi.onlineCount());
    useOnline.setState({ n: Math.max(1, n || 0) });
  }, 60_000);
}
