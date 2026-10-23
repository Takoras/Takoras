import type { Variant } from '@/data/jetons';
import { useT } from '@/i18n/useT';
import s from './VTag.module.css';

// Étiquette de variante (Doré, Céleste, Ombre)
export function VTag({ v }: { v?: string | null }) {
  const t = useT();
  if (v !== 'gold' && v !== 'celeste' && v !== 'ombre') return null;
  // le tampon de la mutation (pixel art) + son nom
  return (
    <span className={`${s.tag} ${s[v as Variant]}`}>
      <img className={s.stamp} src={`/img/stamps/${v}.png`} alt="" aria-hidden width={14} height={14} />
      {t(`ui.v_${v}`)}
    </span>
  );
}
