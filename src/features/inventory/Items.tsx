import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { errorText, invApi } from '@/api';
import { itemImg, itemText, type ShopItem } from '@/data/items';
import { moPlay, moSnap } from '@/engines/motion.js';
import { sfx } from '@/engines/sound.js';
import { useAuth } from '@/lib/auth';
import { useSettings } from '@/lib/settings';
import { useT } from '@/i18n/useT';
import { Button } from '@/ui/Button';
import { toast } from '@/ui/toast';
import { Effects } from '../home/Effects';
import { NeedLogin } from '@/app/NeedLogin';
import { InvTabs } from './Bestiary';
import s from './Inventory.module.css';

type Row = { item: string; kind: string; data: ShopItem['data']; qty: number };

// Objets (potions, sabliers, recharges) achetés en boutique, à utiliser quand on veut
export default function Items() {
  const t = useT();
  const user = useAuth((x) => x.user);
  const items = useQuery({
    queryKey: ['items', user?.id],
    enabled: !!user,
    queryFn: async () => (await invApi.items()) as unknown as Row[],
  });
  const box = useRef<HTMLUListElement>(null);
  const snap = useRef<Map<string, DOMRect> | null>(null);
  useLayoutEffect(() => {
    if (snap.current && box.current) moPlay(snap.current, box.current, '[data-key]', { dissolve: true });
    snap.current = null;
  }, [items.data]);
  if (!user) return <NeedLogin title={t('ui.nav_inv')} />;
  const list = items.data ?? [];
  return (
    <section className={s.page}>
      <header className={s.head}>
        <div>
          <h1>{t('ui.inv_items_title')}</h1>
          <p className="muted">{t('ui.items_n', { n: list.reduce((n, x) => n + x.qty, 0) })}</p>
        </div>
      </header>
      <InvTabs />
      <Effects />
      {items.isError ? (
        <p className="muted">{t('ui.err_generic')}</p>
      ) : !items.data ? (
        <p className="muted" aria-busy>
          …
        </p>
      ) : list.length ? (
        <ul ref={box} className={s.items}>
          {list.map((it) => (
            <ItemCard
              key={it.item}
              it={it}
              before={() => {
                if (box.current) snap.current = moSnap(box.current, '[data-key]');
              }}
            />
          ))}
        </ul>
      ) : (
        <div className={s.empty}>
          <p className="muted">{t('ui.inv_items_empty')}</p>
          <Link className={s.link} to="/boutique">
            {t('ui.nav_shop')}
          </Link>
        </div>
      )}
    </section>
  );
}

function ItemCard({ it, before }: { it: Row; before: () => void }) {
  const t = useT();
  const lang = useSettings((x) => x.lang);
  const user = useAuth((x) => x.user);
  const qc = useQueryClient();
  const [n, setN] = useState(1);
  const [busy, setBusy] = useState(false);
  const [name, desc] = itemText({ id: it.item, kind: it.kind, data: it.data }, lang);
  const img = itemImg({ id: it.item, kind: it.kind });
  const use = async (qty: number) => {
    setBusy(true);
    try {
      const r = (await invApi.useItems(it.item, qty)) as { used: number; state: unknown };
      qc.setQueryData(['me', user?.id], r.state);
      sfx.upgrade();
      setN(1);
    } catch (e) {
      sfx.deny();
      toast(errorText(e, lang), true);
    }
    before();
    await qc.invalidateQueries({ queryKey: ['items'] });
    setBusy(false);
  };
  const clamp = (v: number) => Math.max(1, Math.min(it.qty, v || 1));
  return (
    <li className={s.item} data-key={it.item} data-sig={it.qty} style={{ '--g': '139, 92, 246' } as CSSProperties}>
      <span className={s.qty}>×{it.qty}</span>
      <div className={s.itemIcon}>
        <img
          className="px"
          src={img.src}
          alt=""
          style={img.tint ? ({ '--df': img.tint } as React.CSSProperties) : undefined}
        />
      </div>
      <h2>{name}</h2>
      <p className="muted">{desc}</p>
      <div className={s.use}>
        {it.qty > 1 ? (
          <div className={s.stepper}>
            <button type="button" onClick={() => setN(clamp(n - 1))} aria-label="−">
              −
            </button>
            <input
              type="number"
              min={1}
              max={it.qty}
              value={n}
              onChange={(e) => setN(clamp(+e.target.value))}
              aria-label={t('ui.use')}
            />
            <button type="button" onClick={() => setN(clamp(n + 1))} aria-label="+">
              +
            </button>
          </div>
        ) : null}
        <Button variant="primary" size="sm" loading={busy} onClick={() => void use(n)}>
          {t('ui.use')}
        </Button>
        {it.qty > 1 ? (
          <Button size="sm" disabled={busy} onClick={() => void use(it.qty)}>
            {t('ui.use_all')}
          </Button>
        ) : null}
      </div>
    </li>
  );
}
