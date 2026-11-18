import { useRef, type CSSProperties } from 'react';
import { Link } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { bourseApi, errorText } from '@/api';
import { itemGlow, itemImg, itemText, type ShopItem } from '@/data/items';
import { sfx } from '@/engines/sound.js';
import { useT } from '@/i18n/useT';
import { useAuth } from '@/lib/auth';
import { burstAt } from '@/lib/pfx';
import { locale, reducedFx, useSettings } from '@/lib/settings';
import { Button } from '@/ui/Button';
import { CosmeticPreview, cosmRar, isCosmetic, isSecret, rarCol, rarKey } from '@/ui/Cosmetics';
import { Bump } from '@/ui/motion';
import { PixelBg } from '@/ui/PixelBg';
import { toast } from '@/ui/toast';
import { useSwingAll } from '@/ui/useSwing';
import s from './Shop.module.css';

export type BmItem = ShopItem & {
  base: number;
  koo: number;
  deal: boolean;
  stock: number;
  bought: number;
  owned: boolean;
};
export type BmData = {
  open: boolean;
  locked?: boolean;
  have?: number;
  need?: number;
  ends_in?: number;
  items?: BmItem[];
};

function BmCard({ it, spend, onBuy }: { it: BmItem; spend: number; onBuy: (it: BmItem, el: HTMLElement) => void }) {
  const t = useT();
  const lang = useSettings((x) => x.lang);
  const img = itemImg(it);
  const [name, desc] = itemText(it, lang);
  const left = Math.max(0, it.stock - it.bought);
  const n = (v: number) => v.toLocaleString(locale(lang));
  const off = Math.round((1 - it.koo / it.base) * 100);
  return (
    <li
      className={`${s.card} ${it.deal ? s.bmDeal : ''} ${it.owned || !left ? s.out : ''}`}
      style={{ '--g': itemGlow(it) } as CSSProperties}
    >
      <div className={s.box}>
        <span className={s.bmOff}>-{off} %</span>
        <Bump v={`${it.owned}|${left}`} kind="stamp" className={`${s.badge} ${it.owned ? s.ok : left ? '' : s.none}`}>
          {it.owned ? t('ui.unlocked_b') : left ? `×${left}` : t('ui.sold_out')}
        </Bump>
        <div className={s.art}>
          {isCosmetic(it.kind) ? (
            <CosmeticPreview id={it.id} hidden={isSecret(it.id) && !it.owned} />
          ) : (
            <img
              className={`px ${img.wide ? s.wide : ''}`}
              src={img.src}
              alt=""
              style={img.tint ? ({ '--df': img.tint } as CSSProperties) : undefined}
            />
          )}
        </div>
        <h3>{name}</h3>
        {isCosmetic(it.kind) ? (
          <p className={s.rar} style={{ color: rarCol(cosmRar(it.id)) }}>
            {t(rarKey(cosmRar(it.id)))}
          </p>
        ) : (
          <p className="muted">{it.kind === 'potion' ? desc : ' '}</p>
        )}
        <div className={s.buy}>
          <b className={s.price}>
            <s>{n(it.base)}</s> {n(it.koo)} <img className="px" src="/img/koo.png" alt="" width={14} height={14} />
          </b>
          <Button
            size="sm"
            variant="primary"
            className={`${s.bmBuy} ${spend >= it.koo ? s.can : s.poor}`}
            disabled={it.owned || !left}
            aria-label={`${t('ui.buy')} · ${name} · ${n(it.koo)}`}
            onClick={(e) => onBuy(it, e.currentTarget)}
          >
            {t('ui.buy')}
          </Button>
        </div>
      </div>
    </li>
  );
}

// Le Black Market : une boutique à part, ouverte le week-end, payée en Market Coins
export function BlackMarket({ data, spend }: { data: BmData; spend: number }) {
  const t = useT();
  const lang = useSettings((x) => x.lang);
  const uid = useAuth((x) => x.user?.id);
  const qc = useQueryClient();
  const root = useRef<HTMLDivElement>(null);
  const items = data.items ?? [];
  useSwingAll(root, `.${s.box}`, 0.3, items.length);
  if (data.locked)
    return (
      <div className={`${s.bm} ${s.bmLocked}`}>
        <img className="px" src="/img/koo.png" alt="" width={56} height={56} />
        <p>{t('ui.bs_need', { n: data.have ?? 0, m: data.need ?? 10 })}</p>
        <Link to="/market">{t('ui.nav_bourse')}</Link>
      </div>
    );
  const buy = async (it: BmItem, el: HTMLElement) => {
    if (spend < it.koo) {
      sfx.deny();
      return toast(t('ui.bs_err_koo'), true);
    }
    try {
      qc.setQueryData(['black-market', uid], await bourseApi.bmBuy(it.id));
      burstAt(el, '#a66bff');
      sfx.upgrade();
      void qc.invalidateQueries({ queryKey: ['bourse-shop'] });
      void qc.invalidateQueries({ queryKey: ['bourse'] });
      void qc.invalidateQueries({ queryKey: ['me'] });
      void qc.invalidateQueries({ queryKey: ['items'] });
    } catch (e) {
      sfx.deny();
      toast(errorText(e, lang), true);
    }
  };
  const deals = items.filter((x) => x.deal);
  const rest = items.filter((x) => !x.deal);
  return (
    <div ref={root} className={s.bm}>
      <section className={s.bmHero}>
        <PixelBg className={s.bmBg} odds={100000} glow="#7b3df0" still={reducedFx()} />
        <h2>{t('ui.bs_bm_deals')}</h2>
        <ul className={s.grid}>
          {deals.map((it) => (
            <BmCard key={it.id} it={it} spend={spend} onBuy={(x, el) => void buy(x, el)} />
          ))}
        </ul>
      </section>
      <ul className={s.grid}>
        {rest.map((it) => (
          <BmCard key={it.id} it={it} spend={spend} onBuy={(x, el) => void buy(x, el)} />
        ))}
      </ul>
    </div>
  );
}
