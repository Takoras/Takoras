import { useQuery } from '@tanstack/react-query';
import { create } from 'zustand';
import { tables } from '@/api';
import { openUI } from '@/app/ui-store';
import { useAuth } from '@/lib/auth';
import { lsSet } from '../social/social';

// Bêta : patch notes (fenêtre + popup des nouveautés), menu des testeurs choisis par l'admin,
// bouton « Donner un avis », et tuto de première visite. Mêmes clés de stockage que l'ancien site.
// Ce fichier est petit et toujours chargé ; les fenêtres elles-mêmes (BetaWindows.tsx) arrivent à l'ouverture.
export type Win = 'pn' | 'pop' | 'tuto' | 'fb' | 'tester' | null;
export const useBeta = create<{ win: Win }>(() => ({ win: null }));
export const openPatchnotes = () => useBeta.setState({ win: 'pn' });
export const openTuto = () => useBeta.setState({ win: 'tuto' });
export const openFeedback = () => {
  if (!useAuth.getState().user) return openUI('account');
  useBeta.setState({ win: 'fb' });
};
export const openTester = () => useBeta.setState({ win: 'tester' });
export const close = () => useBeta.setState({ win: null });

export const TUTO_KEY = 'takoras-tuto-done',
  PN_KEY = 'takoras-pn-seen';
export type Line = { t: 'new' | 'change' | 'fix' | 'removed'; x: string };
export type Note = {
  id: number;
  title: string;
  title_en: string | null;
  lines: Line[] | null;
  lines_en: Line[] | null;
  created_at: string;
};

export function useBetaOpen() {
  return useQuery({
    queryKey: ['beta-open'],
    queryFn: async () => (await tables.betaSetting()).data?.v === 'on',
    staleTime: 5 * 60_000,
  });
}
export function usePatchnotes(enabled = true) {
  return useQuery({
    queryKey: ['patchnotes'],
    enabled,
    queryFn: async () => ((await tables.patchnotes()).data ?? []) as unknown as Note[],
    staleTime: 10 * 60_000,
  });
}

export const markSeen = (notes?: Note[]) => lsSet(PN_KEY, notes?.[0]?.id ?? 0);
