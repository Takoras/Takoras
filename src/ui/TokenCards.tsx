import { forwardRef, type ReactNode } from 'react';
import { locale, useSettings } from '@/lib/settings';
import { SerieName } from './SerieName';
import { Tween } from './Tween';
import s from './TokenCards.module.css';

// Les deux fiches d'un jeton, avec la DA de la révélation du tirage (la référence) : partout où un jeton est
// montré en grand (ouverture, inventaire, profil, combat), c'est le même rendu.
// Couleur : --tc (la couleur du jeton) ; à défaut rgb(var(--g)).

/** Fiche d'identité : logo de la série, nom, chance en pastille, puis ce qu'on veut dessous (« Tu en as 4 »…) */
export const TokenId = forwardRef<
  HTMLDivElement,
  { serie?: string; name: ReactNode; odds: number | null; className?: string; children?: ReactNode }
>(function TokenId({ serie, name, odds, className, children }, ref) {
  const lang = useSettings((x) => x.lang);
  const fmt = (n: number) => Math.round(n).toLocaleString(locale(lang));
  return (
    <div ref={ref} className={`${s.card} ${s.id} ${className ?? ''}`}>
      {serie ? (
        <span className={s.serie}>
          <SerieName name={serie} h="2.2em" />
        </span>
      ) : null}
      {/* jeton rare : un reflet à sa couleur balaie le nom (comme à la révélation du tirage) */}
      <h2 className={`${s.name} ${odds != null && odds >= 1000 ? s.shine : ''}`}>{name}</h2>
      {/* la chance défile jusqu'à sa nouvelle valeur (changement de mutation) */}
      <span className={s.rarity}>
        {odds == null ? (
          '1/?'
        ) : (
          <>
            1/
            <Tween value={odds} format={fmt} ms={600} />
          </>
        )}
      </span>
      {children}
    </div>
  );
});
