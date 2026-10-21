import { en } from '@/i18n/en';
import { useSettings } from './settings';

// Nom affiché d'un jeton (quelques-uns sont traduits en anglais)
export const jnOf = (name: string, lang = useSettings.getState().lang) => (lang === 'en' && en.names[name]) || name;
export function useJn() {
  const lang = useSettings((s) => s.lang);
  return (name: string) => jnOf(name, lang);
}
