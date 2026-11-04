import { forwardRef, type ReactNode } from 'react';
import { statsOf, STAT_MAX } from '@/engines/env';
import { powerInfo } from '@/data/kit';
import { locale, useSettings } from '@/lib/settings';
import { useT } from '@/i18n/useT';
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
      <h2 className={s.name}>{name}</h2>
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

/** Fiche de stats : poids, puissance, taille en barres à la couleur du jeton, puis sa capacité */
export const TokenStats = forwardRef<
  HTMLDivElement,
  { name: string; odds: number; variant?: string; lvl?: number; className?: string; children?: ReactNode }
>(function TokenStats({ name, odds, variant = '', lvl = 1, className, children }, ref) {
  const t = useT();
  const lang = useSettings((x) => x.lang);
  const S = statsOf(name, odds, variant, lvl);
  const k = powerInfo(name, lang);
  const rows = [
    ['s_mass', S.s_mass, (n: number) => n.toFixed(2)],
    ['s_pow', S.s_pow, (n: number) => String(Math.round(n))],
    ['s_size', S.s_size, (n: number) => String(Math.round(n))],
  ] as const;
  return (
    <div ref={ref} className={`${s.card} ${s.stats} ${className ?? ''}`}>
      {rows.map(([key, v, txt]) => (
        <div key={key} className={s.stat}>
          <span>{t(`ui.${key}`)}</span>
          <div className={s.bar}>
            <i style={{ width: `${Math.min(100, (v / STAT_MAX[key]) * 100)}%` }} />
          </div>
          <b>
            <Tween value={v} format={txt} />
          </b>
        </div>
      ))}
      {k.pw !== 'none' ? (
        <div className={s.abil}>
          <b>
            {k.name}
            {k.when ? <small> {k.when}</small> : null}
          </b>
          <p>{k.desc}</p>
        </div>
      ) : null}
      {children}
    </div>
  );
});
