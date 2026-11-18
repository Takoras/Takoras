import { useRef, type CSSProperties } from 'react';
import { Link } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { bourseApi, errorText } from '@/api';
import { itemGlow, itemImg, itemText, type ShopItem } from '@/data/items';
import { sfx } from '@/engines/sound.js';
import { useT } from '@/i18n/useT';
import { useAuth } from '@/lib/auth';
import { burstAt } from '@/lib/pfx';
import { locale, useSettings } from '@/lib/settings';
import { Button } from '@/ui/Button';
import { CosmeticPreview, cosmRar, isCosmetic, isSecret, rarCol, rarKey } from '@/ui/Cosmetics';
import { Bump, Skeleton } from '@/ui/motion';
import { Roll } from '@/ui/Roll';
import { toast } from '@/ui/toast';
import { useSwingAll } from '@/ui/useSwing';
import s from './Shop.module.css';

type KooItem = ShopItem & { koo: number; bought: boolean; owned: boolean };
type Data = { spendable: number; items: KooItem[] } | { locked: true; have: number; need: number };
const Koo = ({ size = 16 }: { size?: number }) => (
  <img className="px" src="/img/koo.png" alt="" width={size} height={size} />
);

// Boutique payée avec les bénéfices de la Bourse
export function KooShop() {
  const t = useT();
  const lang = useSettings((x) => x.lang);
  const uid = useAuth((x) => x.user?.id);
  const qc = useQueryClient();
  const grid = useRef<HTMLUListElement>(null);
  const key = ['bourse-shop', uid];
  const q = useQuery({ queryKey: key, enabled: !!uid, queryFn: async () => (await bourseApi.shop()) as Data });
  const d = q.data;
  useSwingAll(grid, `.${s.box}`, 0.35, d && !('locked' in d) ? d.items.length : 0);
  if (!d) return <Skeleton n={8} h={220} min={190} />;
  if ('locked' in d)
    return (
      <div className={s.kooLocked}>
        <Koo size={56} />
        <p>{t('ui.bs_need', { n: d.have, m: d.need })}</p>
        <Link to="/bourse">{t('ui.nav_bourse')}</Link>
      </div>
    );
  const n2 = (v: number) => v.toLocaleString(locale(lang), { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const buy = async (it: KooItem, el: HTMLElement) => {
    try {
      qc.setQueryData(key, await bourseApi.shopBuy(it.id));
      burstAt(el, '#2fa66f');
      sfx.upgrade();
      void qc.invalidateQueries({ queryKey: ['bourse'] });
      void qc.invalidateQueries({ queryKey: ['me'] });
    } catch (e) {
      sfx.deny();
      toast(errorText(e, lang), true);
    }
  };
  return (
    <div className={s.kooView}>
      <p className={s.kooSpend}>
        {t('ui.bs_spend')}
        <b>
          <Roll text={n2(d.spendable)} />
        </b>
        <Koo size={20} />
      </p>
      <ul ref={grid} className={s.grid} data-depth>
        {d.items.map((it) => {
          const img = itemImg(it);
          const [name, desc] = itemText(it, lang);
          const done = it.owned || it.bought;
          return (
            <li
              key={it.id}
              className={`${s.card} ${done ? s.out : ''}`}
              style={{ '--g': itemGlow(it) } as CSSProperties}
            >
              <div className={s.box}>
                <Bump v={done} kind="stamp" className={`${s.badge} ${done ? s.ok : ''}`}>
                  {it.owned ? t('ui.unlocked_b') : it.bought ? t('ui.sold_out') : '×1'}
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
                    <Koo size={14} /> {it.koo.toLocaleString(locale(lang))}
                  </b>
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={done || it.koo > d.spendable}
                    onClick={(e) => void buy(it, e.currentTarget)}
                  >
                    {t('ui.buy')}
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
