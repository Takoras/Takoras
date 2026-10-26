import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { errorText, publicApi, shopApi } from '@/api';
import { useMe } from '@/api/queries';
import { bannerName, hms, itemImg, itemText, type ShopItem } from '@/data/items';
import { useAuth } from '@/lib/auth';
import { locale, useSettings } from '@/lib/settings';
import { useT } from '@/i18n/useT';
import type { Key } from '@/i18n';
import { sfx } from '@/engines/sound.js';
import { moDissolve } from '@/engines/motion.js';
import { Button } from '@/ui/Button';
import { toast } from '@/ui/toast';
import { useNow } from '../eco/eco';
import { Effects } from '../home/Effects';
import { openInfo } from '../info/store';
import s from './Shop.module.css';

type Item = ShopItem & { price: number; base_price: number | null; stock: number; bought: number; owned: boolean };
type ShopData = { items: Item[]; reset_in: number };
const CATS: [string, Key][] = [
  ['potion', 'ui.cat_potions'],
  ['util', 'ui.cat_pulls'],
  ['banner', 'ui.cat_cosm'],
];
const catOf = (it: Item) =>
  it.kind === 'potion' ? 'potion' : it.kind === 'banner' || it.kind === 'avatar' ? 'banner' : 'util';
// Halo de chaque carte (couleur de la potion)
const POTION_GLOW: Record<number, string> = {
  1.3: '134, 239, 172',
  2: '196, 181, 253',
  5: '251, 191, 36',
  10: '103, 232, 249',
  25: '244, 114, 182',
  50: '251, 146, 60',
  100: '255, 255, 255',
};
const glowOf = (it: Item) =>
  it.kind === 'potion'
    ? (POTION_GLOW[it.data.mult ?? 0] ?? '139, 92, 246')
    : it.kind === 'banner'
      ? '249, 115, 22'
      : '139, 92, 246';
const Coin = ({ size = 14 }: { size?: number }) => (
  <img className="px" src="/img/piece.png" alt="" width={size} height={size} />
);

// Boutique : stock commun renouvelé toutes les 5 h, rangé par catégorie, et codes promo
export default function Shop() {
  const t = useT();
  const lang = useSettings((x) => x.lang);
  const user = useAuth((x) => x.user);
  const me = useMe();
  const qc = useQueryClient();
  const now = useNow();
  const [cat, setCat] = useState('all');
  const shop = useQuery({
    queryKey: ['shop'],
    queryFn: async () => ({ ...((await publicApi.shopToday()) as unknown as ShopData), at: Date.now() }),
  });
  const coins = me.data?.coins ?? 0;
  if (shop.isError) return <p className="muted">{t('ui.err_generic')}</p>;
  if (!shop.data)
    return (
      <p className="muted" aria-busy>
        …
      </p>
    );
  const left = Math.max(0, shop.data.reset_in - Math.round((now - shop.data.at) / 1000));
  if (left === 0 && !shop.isFetching) void shop.refetch();

  const buy = async (it: Item, card: HTMLElement) => {
    if (coins < it.price) {
      sfx.deny();
      card.animate(
        [
          { transform: 'translateX(0)' },
          { transform: 'translateX(-6px)' },
          { transform: 'translateX(6px)' },
          { transform: 'translateX(0)' },
        ],
        { duration: 260 },
      );
      return toast(t('ui.err_coins'), true);
    }
    try {
      const st = await shopApi.buy(it.id);
      qc.setQueryData(['me', user?.id], st);
      sfx.upgrade();
      const name = itemText(it, lang)[0];
      toast(
        t('ui.bought', { n: name }) +
          (it.kind === 'banner' ? '' : it.kind === 'avatar' ? ` → ${t('ui.edit_profile')}` : ` → ${t('ui.nav_inv')}`),
      );
      const ic = card.querySelector('img');
      if (ic) moDissolve(ic, ic.getBoundingClientRect(), 0.4);
      qc.setQueryData(['shop'], {
        ...shop.data,
        items: shop.data.items.map((x) =>
          x.id === it.id
            ? { ...x, bought: x.bought + 1, owned: x.owned || x.kind === 'banner' || x.kind === 'avatar' }
            : x,
        ),
      });
      void qc.invalidateQueries({ queryKey: ['items'] });
    } catch (e) {
      sfx.deny();
      toast(errorText(e, lang), true);
      void shop.refetch();
    }
  };

  const groups = CATS.map(([k, label]) => [k, label, shop.data.items.filter((it) => catOf(it) === k)] as const).filter(
    ([k, , list]) => list.length && (cat === 'all' || cat === k),
  );
  return (
    <section className={s.page}>
      <header className={s.head}>
        <div>
          <h1>{t('ui.shop_title')}</h1>
          <p className="muted">
            {t('ui.shop_reset')} <b className={s.timer}>{hms(left)}</b>
          </p>
        </div>
        <div className={s.headBtns}>
          <Link to="/passe" className={s.passBtn}>
            {t('ui.bp_title')}
          </Link>
          <Button size="sm" onClick={openInfo}>
            {t('ui.odds_info')}
          </Button>
        </div>
      </header>
      {user ? <Effects /> : null}
      <div className={s.cats} role="group" aria-label={t('ui.shop_title')}>
        {[['all', 'ui.all'] as [string, Key], ...CATS, ['packs', 'ui.cat_packs'] as [string, Key]].map(([k, l]) => (
          <button key={k} type="button" aria-pressed={cat === k} onClick={() => setCat(k)}>
            {t(l)}
          </button>
        ))}
      </div>
      {groups.map(([k, label, list]) => (
        <section key={k} aria-labelledby={`cat-${k}`}>
          <h2 id={`cat-${k}`} className={s.h2}>
            {t(label)}{' '}
            <small className="muted">
              {t('ui.in_stock', {
                n: list.filter((it) => !it.owned && it.stock - it.bought > 0).length,
                m: list.length,
              })}
            </small>
          </h2>
          <ul className={s.grid}>
            {list.map((it) => (
              <Card key={it.id} it={it} coins={coins} logged={!!user} left={left} onBuy={buy} />
            ))}
          </ul>
        </section>
      ))}
      {cat === 'all' || cat === 'packs' ? <Packs /> : null}
      {user ? <Redeem items={shop.data.items} /> : <p className="muted">{t('ui.acc_need')}</p>}
    </section>
  );
}

function Card({
  it,
  coins,
  logged,
  left,
  onBuy,
}: {
  it: Item;
  coins: number;
  logged: boolean;
  left: number;
  onBuy: (it: Item, card: HTMLElement) => void;
}) {
  const t = useT();
  const lang = useSettings((x) => x.lang);
  const n = (v: number) => v.toLocaleString(locale(lang));
  const ref = useRef<HTMLLIElement>(null);
  const [name, desc] = itemText(it, lang),
    img = itemImg(it);
  const stockLeft = Math.max(0, it.stock - it.bought),
    out = it.owned || stockLeft <= 0;
  const changed = it.base_price != null && it.price !== it.base_price,
    pct = changed && it.base_price ? Math.round((it.price / it.base_price - 1) * 100) : 0;
  return (
    <li
      ref={ref}
      className={`${s.card} ${out ? s.out : ''} ${it.kind === 'potion' && (it.data.mult ?? 0) >= 10 ? s.epic : ''}`}
      style={{ '--g': glowOf(it) } as React.CSSProperties}
    >
      {/* gauche : le visuel ; droite : le nom en haut, stock + prix + Acheter en bas (carte large façon « Zenith Crate ») */}
      <div className={s.icon}>
        <img
          className={`px ${img.wide ? s.banner : ''}`}
          src={img.src}
          alt=""
          style={img.tint ? ({ '--df': img.tint } as React.CSSProperties) : undefined}
        />
      </div>
      <div className={s.body}>
        <div>
          <h3 title={desc}>{name}</h3>
        </div>
        <div className={s.foot}>
          <span className={s.meta}>
            <span className={`${s.stock} ${it.owned ? s.ok : stockLeft ? '' : s.none}`}>
              {it.owned ? t('ui.unlocked_b') : stockLeft ? t('ui.stock_n', { n: stockLeft }) : t('ui.sold_out')}
            </span>
            <b className={s.price}>
              {changed && it.base_price ? <s>{n(it.base_price)}</s> : null} {n(it.price)} <Coin />
              {changed ? (
                <span className={`${s.deal} ${pct > 0 ? s.up : ''}`}>
                  {pct > 0 ? '+' : ''}
                  {pct}%
                </span>
              ) : null}
            </b>
          </span>
          {it.owned ? (
            <Button size="sm" disabled>
              {t('ui.owned')}
            </Button>
          ) : out ? (
            <Button size="sm" disabled>
              {hms(left)}
            </Button>
          ) : (
            <Button
              size="sm"
              variant={coins >= it.price ? 'primary' : 'ghost'}
              disabled={!logged}
              aria-label={`${t('ui.buy')} · ${name} · ${n(it.price)}`}
              onClick={() => ref.current && onBuy(it, ref.current)}
            >
              {t('ui.buy')}
            </Button>
          )}
        </div>
      </div>
    </li>
  );
}

// Packs en euros : seulement la vitrine pour l'instant (aucun paiement réel). Contenu connu à l'avance, jamais de hasard
// payant (règles UE sur les monnaies virtuelles, loot boxes) : voir docs/achats.md avant d'activer quoi que ce soit.
const PACKS: { id: string; eur: number; img: string; coins?: number; bonus?: number }[] = [
  { id: 'coins_s', eur: 0.99, img: '/img/piece.png', coins: 1200 },
  { id: 'coins_m', eur: 4.99, img: '/img/piece.png', coins: 6500, bonus: 8 },
  { id: 'coins_l', eur: 9.99, img: '/img/piece.png', coins: 14000, bonus: 16 },
  { id: 'potions', eur: 2.99, img: '/img/potions/chance-5.png' },
  { id: 'starter', eur: 1.99, img: '/img/piece.png', coins: 3000 },
  { id: 'pass', eur: 5, img: '/img/logo.png' },
];
function Packs() {
  const t = useT();
  const lang = useSettings((x) => x.lang);
  const eur = (v: number) => v.toLocaleString(locale(lang), { style: 'currency', currency: 'EUR' });
  return (
    <section aria-labelledby="cat-packs">
      <h2 id="cat-packs" className={s.h2}>
        {t('ui.cat_packs')} <small className="muted">{t('ui.packs_soon')}</small>
      </h2>
      <ul className={s.grid}>
        {PACKS.map((p) => (
          <li key={p.id} className={`${s.card} ${s.pack}`} style={{ '--g': '249, 115, 22' } as React.CSSProperties}>
            <div className={s.icon}>
              <img className="px" src={p.img} alt="" />
            </div>
            <div className={s.body}>
              <div>
                <h3>{t(`ui.pk_${p.id}` as 'ui.pk_coins_s')}</h3>
                <p className="muted">
                  {t(`ui.pk_${p.id}_d` as 'ui.pk_coins_s_d', {
                    n: (p.coins ?? 0).toLocaleString(locale(lang)),
                    b: p.bonus ?? 0,
                  })}
                </p>
              </div>
              <div className={s.foot}>
                <b className={s.price}>{eur(p.eur)}</b>
                <Button size="sm" disabled title={t('ui.packs_soon')}>
                  {t('ui.pk_soon')}
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Redeem({ items }: { items: Item[] }) {
  const t = useT();
  const lang = useSettings((x) => x.lang);
  const user = useAuth((x) => x.user);
  const qc = useQueryClient();
  const n = (v: number) => v.toLocaleString(locale(lang));
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (!c) return;
    setBusy(true);
    try {
      const r = (await shopApi.redeem(c)) as {
        coins: number;
        pulls: number;
        items?: { item: string; qty: number }[];
        state: unknown;
      };
      qc.setQueryData(['me', user?.id], r.state);
      sfx.upgrade();
      const got: string[] = [];
      if (+r.coins) got.push(n(r.coins));
      if (+r.pulls) got.push(`${r.pulls} ${t('ui.pulls_word')}`);
      (r.items ?? []).forEach((x) => {
        const it = items.find((i) => i.id === x.item);
        got.push(
          `${x.qty > 1 ? `${x.qty}× ` : ''}${it ? itemText(it, lang)[0] : x.item.startsWith('b_') ? t('ui.it_banner', { n: bannerName(x.item.slice(2), lang) }) : x.item}`,
        );
      });
      toast(t('ui.promo_ok') + (got.length ? ` : ${got.join(' · ')}` : ''));
      const coin = document.querySelector<HTMLImageElement>('header img[src$="piece.png"]'),
        rr = input.current?.getBoundingClientRect();
      if (coin && rr)
        for (let i = 0; i < 3; i++)
          setTimeout(
            () =>
              moDissolve(
                coin,
                { left: rr.left + rr.width * (0.2 + i * 0.3) - 20, top: rr.top - 10, width: 40, height: 40 } as DOMRect,
                0.8,
              ),
            i * 120,
          );
      setCode('');
      if (r.items?.length) void qc.invalidateQueries({ queryKey: ['shop'] });
    } catch (err) {
      sfx.deny();
      input.current?.animate(
        [
          { transform: 'translateX(0)' },
          { transform: 'translateX(-8px)' },
          { transform: 'translateX(8px)' },
          { transform: 'translateX(0)' },
        ],
        { duration: 300 },
      );
      toast(errorText(err, lang), true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className={s.redeem} aria-labelledby="promo-t">
      <div>
        <h2 id="promo-t" className={s.h2}>
          {t('ui.promo_title')}
        </h2>
      </div>
      <form onSubmit={(e) => void submit(e)} className={s.form}>
        <input
          ref={input}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          maxLength={24}
          placeholder={t('ui.promo_ph')}
          autoComplete="off"
          spellCheck={false}
          aria-label={t('ui.promo_title')}
        />
        <Button type="submit" variant="primary" loading={busy}>
          {t('ui.promo_use')}
        </Button>
      </form>
    </section>
  );
}
