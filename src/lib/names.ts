import { dictOf, useDictVersion } from '@/i18n';
import { useSettings } from './settings';

// Nom affiché d'un jeton (quelques-uns sont traduits en anglais)
export const jnOf = (name: string, lang = useSettings.getState().lang) =>
  (lang === 'en' && dictOf('en').names[name]) || name;
export function useJn() {
  const lang = useSettings((s) => s.lang);
  useDictVersion((s) => s.v); // noms anglais : rafraîchis quand le dictionnaire arrive
  return (name: string) => jnOf(name, lang);
}
