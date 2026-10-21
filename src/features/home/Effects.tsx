import { useMe } from '@/api/queries';
import { dec, hms } from '@/data/items';
import { useSettings } from '@/lib/settings';
import { useT } from '@/i18n/useT';
import { useNow } from '../eco/eco';
import s from './Home.module.css';

// Effets actifs : potions de chance (cumulées) et sablier (recharge ×2)
export function Effects() {
  const t = useT();
  const lang = useSettings((x) => x.lang);
  const me = useMe();
  const now = useNow();
  if (!me.data) return null;
  const pots = (me.data.potions as { m: number; n: number }[] | undefined) ?? [];
  const fast = Math.max(0, Math.round(Number(me.data.fast_left ?? 0) - (now - me.dataUpdatedAt) / 1000));
  if (!pots.length && !fast) return null;
  return (
    <ul className={s.fx} aria-label={t('ui.fx_total', { m: dec(Number(me.data.luck ?? 1), lang) })}>
      {pots.length ? <li className={s.fxTotal}>{t('ui.fx_total', { m: dec(Number(me.data.luck ?? 1), lang) })}</li> : null}
      {pots.map((p, i) => <li key={i}>{t('ui.fx_luck', { m: dec(p.m, lang), n: p.n })}</li>)}
      {fast ? <li>{t('ui.fx_fast', { t: hms(fast) })}</li> : null}
    </ul>
  );
}
