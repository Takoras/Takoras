import type { CSSProperties } from 'react';
import s from './MutationStamp.module.css';

// Tampon d'une mutation (Doré, Céleste, Ombre) à TAILLE FIXE : xs 16 px, sm 20 px, md 28 px.
// C'est un <span> avec l'image en fond : aucune règle « img { width: 100% } » d'une page ne peut l'agrandir.
export function MutationStamp({ v, size = 'xs' }: { v?: string | null; size?: 'xs' | 'sm' | 'md' }) {
  if (v !== 'gold' && v !== 'celeste' && v !== 'ombre') return null;
  return (
    <span
      className={`${s.stamp} ${s[size]}`}
      style={{ backgroundImage: `url(/img/stamps/${v}.png)` } as CSSProperties}
      aria-hidden
    />
  );
}
