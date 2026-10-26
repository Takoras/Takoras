import type { Variant } from '@/data/jetons';
import { useT } from '@/i18n/useT';
import { MutationStamp } from './MutationStamp';
import s from './VTag.module.css';

// Étiquette de variante (Doré, Céleste, Ombre)
export function VTag({ v }: { v?: string | null }) {
  const t = useT();
  if (v !== 'gold' && v !== 'celeste' && v !== 'ombre') return null;
  // le tampon de la mutation (pixel art) + son nom
  return (
    <span className={`${s.tag} ${s[v as Variant]}`}>
      <span className={s.stampBox}>
        <MutationStamp v={v} size="xs" />
      </span>
      {t(`ui.v_${v}`)}
    </span>
  );
}
