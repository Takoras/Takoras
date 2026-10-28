import { useRef } from 'react';
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
import { openInfo } from '../info/store';
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
  const upBusy = useRef(false);
  const info = (
    <button type="button" className={s.info} onClick={openInfo}>
      {t('ui.odds_info')}
    </button>
  );
  if (!user)
    return (
      <div className={s.actions}>
        <Button variant="primary" size="lg" onClick={() => openUI('account')}>
          {t('ui.acc_login_to_open')}
        </Button>
        {info}
      </div>
    );
  if (!e)
    return (
      <div className={s.stock} aria-busy>
        …
      </div>
    );
  const n = (v: number) => v.toLocaleString(locale(lang));
  const upCost = upgradeCost(nextMax(e.max)),
    rgCost = regenCost(e.regen - 10);
  // une amélioration à la fois (spammer le bouton envoyait plusieurs achats et un message d'erreur bizarre),
  // et pas de message en cas de réussite : la tuile change, c'est suffisant
  const upgrade = async (kind: 'stock' | 'regen') => {
    if (upBusy.current) return;
    upBusy.current = true;
    try {
      const st = kind === 'stock' ? await ecoApi.upgradeStock() : await ecoApi.upgradeRegen();
      sfx.upgrade();
      qc.setQueryData(['me', user.id], st);
    } catch (err) {
      sfx.deny();
      const code = String((err as { message?: string })?.message ?? '');
      if (!/rate|max_reached/.test(code)) toast(errorText(err, lang), true);
    } finally {
      upBusy.current = false;
    }
  };
  return (
    <div className={s.actions}>
      <div className={s.stock} role="status">
        <b className={s.stockN}>{e.stock}</b>
        <span className={s.stockMax}>/{e.max}</span>
        <span className="muted">
          {t('ui.pulls_word')} · {e.full ? t('ui.stock_full') : t('ui.plus1_in', { t: mmss(e.nextIn) })}
        </span>
      </div>
      <div className={s.row}>
        <Button variant="primary" size="lg" disabled={!e.stock} onClick={() => void openPulls(1)} data-nosound>
          {t('ui.open1')}
        </Button>
        <Button size="lg" disabled={e.stock < 2} onClick={() => void openPulls('all')} data-nosound>
          {t('ui.open_all', { n: Math.min(e.stock, MAX_OPEN) })}
        </Button>
      </div>
      {/* Améliorations : bien en vue, avec la progression jusqu'au max */}
      <div className={s.ups} aria-label={t('ui.upgrades')} role="group">
        <Up
          icon="/img/objets/recharge.png"
          title={t('ui.up_stock')}
          now={String(e.max)}
          next={e.max < TOP_MAX ? String(nextMax(e.max)) : null}
          pct={(e.max - 5) / (TOP_MAX - 5)}
          top={t('ui.stock_top', { n: TOP_MAX })}
          cost={upCost}
          coins={e.coins}
          fmt={n}
          onUp={() => void upgrade('stock')}
        />
        <Up
          icon="/img/objets/sablier.png"
          title={t('ui.up_regen')}
          now={mmss(e.regen * 1000)}
          next={e.regen > 60 ? mmss((e.regen - 10) * 1000) : null}
          pct={(180 - e.regen) / 120}
          top={t('ui.regen_top')}
          cost={rgCost}
          coins={e.coins}
          fmt={n}
          onUp={() => void upgrade('regen')}
        />
      </div>
      <Effects />
      {info}
    </div>
  );
}

// Une amélioration : icône, valeur actuelle → suivante, barre jusqu'au max, bouton avec le prix (il brille quand on peut payer)
function Up(p: {
  icon: string;
  title: string;
  now: string;
  next: string | null;
  pct: number;
  top: string;
  cost: number;
  coins: number;
  fmt: (n: number) => string;
  onUp: () => void;
}) {
  const can = !!p.next && p.coins >= p.cost;
  return (
    <div className={`${s.up} ${can ? s.upCan : ''}`}>
      <img className="px" src={p.icon} alt="" width={40} height={40} />
      <div className={s.upBody}>
        <b>{p.title}</b>
        <span className={s.upVal}>
          {p.now}
          {p.next ? (
            <>
              {' '}
              → <em>{p.next}</em>
            </>
          ) : null}
        </span>
        <span className={s.upBar}>
          <i style={{ width: `${Math.max(3, Math.min(100, p.pct * 100))}%` }} />
        </span>
      </div>
      {p.next ? (
        <Button size="sm" variant={can ? 'primary' : undefined} disabled={!can} onClick={p.onUp}>
          {p.fmt(p.cost)} <Coin />
        </Button>
      ) : (
        <small className="muted">{p.top}</small>
      )}
    </div>
  );
}
