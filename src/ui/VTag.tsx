import type { Variant } from '@/data/jetons';
import { useT } from '@/i18n/useT';
import s from './VTag.module.css';

// Étiquette de variante (Doré, Céleste, Ombre)
export function VTag({ v }: { v?: string | null }) {
  const t = useT();
  if (v !== 'gold' && v !== 'celeste' && v !== 'ombre') return null;
  return <span className={`${s.tag} ${s[v as Variant]}`}>{t(`ui.v_${v}`)}</span>;
}
