import { useEffect } from 'react';
import { useMe } from '@/api/queries';

// Oublie ce que ce navigateur a retenu (tuto vu, notes de mise à jour vues, historique…) pour tout revoir
// comme un nouveau joueur. Les réglages restent.
export function forgetLocalProgress() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('takoras-') && k !== 'takoras-settings' && k !== 'takoras-muted')
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* navigation privée */
  }
}

const KEY = 'takoras-reset-seen';
// Un admin a remis ce compte à zéro (reset_at a changé) : on oublie tout et on recharge, le tuto revient.
export function useResetWatch() {
  const at = useMe().data?.reset_at ?? '';
  useEffect(() => {
    if (!at) return;
    let seen: string | null = null;
    try {
      seen = localStorage.getItem(KEY);
    } catch {
      return;
    }
    if (seen === at) return;
    if (seen === null) {
      try {
        localStorage.setItem(KEY, at); // première fois sur ce navigateur : on retient juste la date
      } catch {
        /* navigation privée */
      }
      return;
    }
    forgetLocalProgress();
    try {
      localStorage.setItem(KEY, at);
    } catch {
      /* navigation privée */
    }
    location.assign('/');
  }, [at]);
}
