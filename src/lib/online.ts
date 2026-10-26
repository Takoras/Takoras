import { useEffect } from 'react';
import { create } from 'zustand';
import { sb } from './supabase';

// Joueurs en ligne : chaque onglet ouvert rejoint le canal « online » (Realtime Presence, rien n'est stocké en base).
// Un joueur connecté compte une fois même avec plusieurs onglets (clé = son id).
export const useOnline = create<{ n: number }>(() => ({ n: 0 }));

export function useOnlinePresence(uid: string | undefined) {
  useEffect(() => {
    const key = uid ?? `anon-${Math.random().toString(36).slice(2, 10)}`;
    const ch = sb.channel('online', { config: { presence: { key } } });
    ch.on('presence', { event: 'sync' }, () => useOnline.setState({ n: Object.keys(ch.presenceState()).length }));
    ch.subscribe((st) => {
      if (st === 'SUBSCRIBED') void ch.track({});
    });
    return () => void sb.removeChannel(ch);
  }, [uid]);
}
