import { useCallback } from 'react';
import { useSettings } from '@/lib/settings';
import { dictOf, translate, useDictVersion, type Key } from './index';

// Traduction dans la langue choisie ; changer de langue re-rend la page sans la recharger.
export function useT() {
  const lang = useSettings((s) => s.lang);
  const v = useDictVersion((s) => s.v); // se met à jour quand le dictionnaire anglais arrive
  // eslint-disable-next-line react-hooks/exhaustive-deps -- v force une nouvelle fonction quand l'anglais est chargé
  return useCallback((key: Key, vars?: Record<string, string | number>) => translate(lang, key, vars), [lang, v]);
}
// Le dictionnaire complet de la langue choisie (listes : tuto, places de l'équipe…)
export function useDict() {
  const lang = useSettings((s) => s.lang);
  useDictVersion((s) => s.v);
  return dictOf(lang);
}
