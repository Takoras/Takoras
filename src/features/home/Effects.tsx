import { useMe } from '@/api/queries';
import { dec, hms } from '@/data/items';
import { useSettings } from '@/lib/settings';
import { useT } from '@/i18n/useT';
import { useNow } from '../eco/eco';
import s from './Home.module.css';

// Effets actifs : potions de chance (cumulées) et sablier (recharge ×2)
// reserve : la place d'une ligne est gardée même sans effet (vide et invisible), pour que la page ne s'agrandisse
// pas d'un coup quand on active une potion ; les effets y apparaissent en fondu
export function Effects({ reserve = false }: { reserve?: boolean }) {
  const t = useT();
  const lang = useSettings((x) => x.lang);
  const me = useMe();
  const now = useNow();
  const space = reserve ? <ul className={`${s.fx} ${s.fxSpace}`} aria-hidden /> : null;
  if (!me.data) return space;
  const pots = (me.data.potions as { m: number; n: number }[] | undefined) ?? [];
  // temps écoulé jamais négatif : juste après un achat, l'horloge de la page est un peu en retard sur la mise à jour du
  // compte, et un sablier fini s'affichait « actif 00:00:01 » une fraction de seconde (toute la page bougeait)
  const fast = Math.max(0, Math.floor(Number(me.data.fast_left ?? 0) - Math.max(0, now - me.dataUpdatedAt) / 1000));
  if (!pots.length && !fast) return space;
  return (
    <ul className={`${s.fx} ${reserve ? s.fxSpace : ''}`} aria-label={t('ui.fx_total', { m: dec(Number(me.data.luck ?? 1), lang) })}>
      {/* le total seulement quand plusieurs potions se cumulent (sinon il redit la même chose) */}
      {pots.length > 1 ? (
        <li className={s.fxTotal}>{t('ui.fx_total', { m: dec(Number(me.data.luck ?? 1), lang) })}</li>
      ) : null}
      {pots.map((p, i) => (
        <li key={i}>{t('ui.fx_luck', { m: dec(p.m, lang), n: p.n })}</li>
      ))}
      {fast ? (
        <li>
          <img className="px" src="/img/objets/sablier.png" alt="" width={18} height={18} /> Sablier actif ·{' '}
          {t('ui.fx_fast', { t: hms(fast) })}
        </li>
      ) : null}
    </ul>
  );
}
