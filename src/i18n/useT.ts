import { useCallback } from 'react';
import { useSettings } from '@/lib/settings';
import { translate, type Key } from './index';

// Traduction dans la langue choisie ; changer de langue re-rend la page sans la recharger.
export function useT() {
  const lang = useSettings((s) => s.lang);
  return useCallback((key: Key, vars?: Record<string, string | number>) => translate(lang, key, vars), [lang]);
}
