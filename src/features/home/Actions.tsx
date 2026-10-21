import { useQueryClient } from '@tanstack/react-query';
import { ecoApi, errorText } from '@/api';
import { useAuth } from '@/lib/auth';
import { locale, useSettings } from '@/lib/settings';
import { useT } from '@/i18n/useT';
import { sfx } from '@/engines/sound.js';
import { openUI } from '@/app/ui-store';
import { Button } from '@/ui/Button';
import { toast } from '@/ui/toast';
import { MAX_OPEN, mmss, nextMax, regenCost, TOP_MAX, upgradeCost, useEco } from '../eco/eco';
import { openPulls } from '../eco/openPulls';
import { openInfo } from '../info/InfoModal';
import { Effects } from './Effects';
import s from './Home.module.css';

const Coin = () => <img className="px" src="/img/piece.png" alt="" width={16} height={16} />;

// Stock de pulls, boutons d'ouverture et améliorations (stock max, recharge)
export function Actions() {
  const t = useT();
  const lang = useSettings((x) => x.lang);
  const user = useAuth((x) => x.user);
  const e = useEco();
  const qc = useQueryClient();
  const info = <button type="button" className={s.info} onClick={openInfo}>{t('ui.odds_info')}</button>;
  if (!user) return <div className={s.actions}><Button variant="primary" size="lg" onClick={() => openUI('account')}>{t('ui.acc_login_to_open')}</Button>{info}</div>;
  if (!e) return <div className={s.stock} aria-busy>…</div>;
  const n = (v: number) => v.toLocaleString(locale(lang));
  const upCost = upgradeCost(nextMax(e.max)), rgCost = regenCost(e.regen - 10);
  const upgrade = async (kind: 'stock' | 'regen') => {
    try {
      const st = kind === 'stock' ? await ecoApi.upgradeStock() : await ecoApi.upgradeRegen();
      sfx.upgrade();
      if (kind === 'regen') toast(t('ui.regen_ok', { s: Number((st as { regen?: number })?.regen ?? e.regen - 10) }));
      qc.setQueryData(['me', user.id], st);
    } catch (err) {
      sfx.deny();
      toast(errorText(err, lang), true);
    }
  };
  return (
    <div className={s.actions}>
      <div className={s.stock} role="status">
        <b className={s.stockN}>{e.stock}</b>
        <span className={s.stockMax}>/{e.max}</span>
        <span className="muted">{t('ui.pulls_word')} · {e.full ? t('ui.stock_full') : t('ui.plus1_in', { t: mmss(e.nextIn) })}</span>
      </div>
      <div className={s.row}>
        <Button variant="primary" size="lg" disabled={!e.stock} onClick={() => void openPulls(1)} data-nosound>{t('ui.open1')}</Button>
        <Button size="lg" disabled={e.stock < 2} onClick={() => void openPulls('all')} data-nosound>{t('ui.open_all', { n: Math.min(e.stock, MAX_OPEN) })}</Button>
      </div>
      <div className={s.ups}>
        {e.max < TOP_MAX ? (
          <Button size="sm" disabled={e.coins < upCost} onClick={() => void upgrade('stock')}>
            {t('ui.stock_max', { a: e.max, b: nextMax(e.max) })} · {n(upCost)} <Coin />
          </Button>
        ) : <span className="muted">{t('ui.stock_top', { n: TOP_MAX })}</span>}
        {e.regen > 60 ? (
          <Button size="sm" disabled={e.coins < rgCost} onClick={() => void upgrade('regen')}>
            {t('ui.regen_up', { a: mmss(e.regen * 1000), b: mmss((e.regen - 10) * 1000) })} · {n(rgCost)} <Coin />
          </Button>
        ) : <span className="muted">{t('ui.regen_top')}</span>}
      </div>
      <Effects />
      {info}
    </div>
  );
}
