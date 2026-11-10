import { useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { errorText, publicApi, shopApi } from '@/api';
import { useMe } from '@/api/queries';
import { bannerName, hms, itemImg, itemText, type ShopItem } from '@/data/items';
import { useAuth } from '@/lib/auth';
import { locale, reducedFx, useSettings } from '@/lib/settings';
import { useT } from '@/i18n/useT';
import type { Key } from '@/i18n';
import { sfx } from '@/engines/sound.js';
import { moDissolve } from '@/engines/motion.js';
import { Button } from '@/ui/Button';
import { PixelBg } from '@/ui/PixelBg';
import { toast } from '@/ui/toast';
import { useSwingAll } from '@/ui/useSwing';
import { useStaggerIn } from '@/ui/useStaggerIn';
import { useNow } from '../eco/eco';
import { Effects } from '../home/Effects';
import { openInfo } from '../info/store';
import s from './Shop.module.css';

type Item = ShopItem & { price: number; base_price: number | null; stock: number; bought: number; owned: boolean };
type ShopData = { items: Item[]; reset_in: number };
// rayons de la boutique (l'icône est un objet du rayon)
const CATS: { k: string; label: Key; icon: string }[] = [
  { k: 'all', label: 'ui.all', icon: '/img/piece.png' },
  { k: 'potion', label: 'ui.cat_potions', icon: '/img/potions/chance-10.png' },
  { k: 'util', label: 'ui.cat_pulls', icon: '/img/objets/sablier.png' },
  { k: 'banner', label: 'ui.cat_cosm', icon: '/img/pp/bleu.png' },
];
const catOf = (it: Item) =>
  it.kind === 'potion' ? 'potion' : it.kind === 'banner' || it.kind === 'avatar' ? 'banner' : 'util';
// Couleur de chaque objet (celle de la potion), pour son fond et sa lumière
const POTION_GLOW: Record<number, string> = {
  1.3: '134, 239, 172',
  2: '196, 181, 253',
  5: '242, 194, 48',
  10: '103, 232, 249',
  25: '244, 114, 182',
  50: '245, 205, 82',
  100: '255, 255, 255',
};
const glowOf = (it: Item) =>
  it.kind === 'potion'
    ? (POTION_GLOW[it.data.mult ?? 0] ?? '61, 107, 255')
    : it.kind === 'banner'
      ? '242, 194, 48'
      : '142, 170, 255';
const hexOf = (rgb: string) => '#' + rgb.split(',').map((n) => (+n).toString(16).padStart(2, '0')).join('');
const avail = (it: Item) => !it.owned && it.stock - it.bought > 0;
// penchés comme des étiquettes accrochées, chacun un peu différemment (même DA que l'inventaire et l'accueil)
const TILT = [-2.2, 1.6, -1, 2.4, -1.8, 0.9, -2.6, 1.3];
const Coin = ({ size = 14 }: { size?: number }) => (
  <img className="px" src="/img/piece.png" alt="" width={size} height={size} />
);

// Boutique : une vitrine vivante. En haut, l'objet vedette (le plus précieux en stock) sur le fond pixel de la fiche
// d'un jeton ; à côté, les rayons ; puis les objets dans des cases qui flottent, se balancent au survol et suivent la
// souris. Stock commun renouvelé toutes les 5 h. Pas d'achat en argent réel pour l'instant.
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
  const pageRef = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLUListElement>(null);
  const shelvesRef = useRef<HTMLDivElement>(null);
  useStaggerIn(pageRef, `.${s.head}, .${s.hero}, .${s.shelf}, .${s.card}, .${s.ticket}`, !!shop.data);
  useSwingAll(gridRef, `.${s.box}`, 0.4, cat + (shop.data?.items.length ?? 0));
  useSwingAll(shelvesRef, `.${s.shelf}`, 0.5);
  const coins = me.data?.coins ?? 0;
  if (shop.isError) return <p className="muted">{t('ui.err_generic')}</p>;
  const data = shop.data;
  const left = data ? Math.max(0, data.reset_in - Math.round((now - data.at) / 1000)) : 0;
  if (data && left === 0 && !shop.isFetching) void shop.refetch();

  const buy = async (it: Item, card: HTMLElement) => {
    if (!data) return;
    if (coins < it.price) {
      sfx.deny();
      card.animate(
        [
          { transform: 'translateX(0)' },
          { transform: 'translateX(-6px) rotate(-1deg)' },
          { transform: 'translateX(6px) rotate(1deg)' },
          { transform: 'translateX(0)' },
        ],
        { duration: 260 },
      );
      return toast(t('ui.err_coins'), true);
    }
    try {
      const st = await shopApi.buy(it.id);
      qc.setQueryData(['me', user?.id], (old: object | undefined) => ({ ...old, ...(st as object) }));
      sfx.upgrade();
      const name = itemText(it, lang)[0];
      toast(
        t('ui.bought', { n: name }) +
          (it.kind === 'banner' ? '' : it.kind === 'avatar' ? ` → ${t('ui.edit_profile')}` : ` → ${t('ui.nav_inv')}`),
      );
      // la case rebondit, l'objet part en pixels vers l'inventaire
      if (!reducedFx())
        card.animate([{ scale: '1' }, { scale: '1.06', offset: 0.35 }, { scale: '0.98', offset: 0.7 }, { scale: '1' }], {
          duration: 420,
          easing: 'cubic-bezier(.2,.8,.3,1)',
        });
      const ic = card.querySelector<HTMLImageElement>(`.${s.art} img`);
      if (ic) moDissolve(ic, ic.getBoundingClientRect(), 0.4);
      qc.setQueryData(['shop'], {
        ...data,
        items: data.items.map((x) =>
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

  const items = data?.items ?? [];
  const list = items.filter((it) => cat === 'all' || catOf(it) === cat);
  // vedette : l'objet le plus précieux encore en stock (sinon le plus précieux tout court)
  const featured = [...items].sort((a, b) => Number(avail(b)) - Number(avail(a)) || b.price - a.price)[0];
  return (
    <section ref={pageRef} className={s.page} aria-busy={!data}>
      <header className={s.head}>
        <h1>{t('ui.shop_title')}</h1>
        <span className={s.restock}>
          {t('ui.shop_reset')} <b>{hms(left)}</b>
        </span>
        <Button size="sm" variant="ghost" onClick={openInfo}>
          {t('ui.odds_info')}
        </Button>
      </header>
      {user ? <Effects /> : null}
      {data ? (
        <>
          <div className={s.top}>
            {featured ? (
              <Hero it={featured} coins={coins} logged={!!user} left={left} onBuy={buy} />
            ) : null}
            <div ref={shelvesRef} className={s.shelves} role="group" aria-label={t('ui.shop_title')}>
              {CATS.map((c) => {
                const inCat = items.filter((it) => c.k === 'all' || catOf(it) === c.k);
                if (c.k !== 'all' && !inCat.length) return null;
                return (
                  <button
                    key={c.k}
                    type="button"
                    className={s.shelf}
                    aria-pressed={cat === c.k}
                    onClick={() => {
                      sfx.click();
                      setCat(c.k);
                    }}
                  >
                    <img className="px" src={c.icon} alt="" />
                    <span>
                      <b>{t(c.label)}</b>
                      <small>{t('ui.in_stock', { n: inCat.filter(avail).length, m: inCat.length })}</small>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <ul ref={gridRef} className={s.grid}>
            {list.map((it, i) => (
              <Card key={it.id} it={it} i={i} coins={coins} logged={!!user} left={left} onBuy={buy} />
            ))}
          </ul>
          {user ? <Redeem items={items} /> : <p className="muted">{t('ui.acc_need')}</p>}
        </>
      ) : null}
    </section>
  );
}

type CardProps = {
  it: Item;
  coins: number;
  logged: boolean;
  left: number;
  onBuy: (it: Item, card: HTMLElement) => void;
};

// Prix (avec l'ancien prix barré et la variation quand il a bougé) et bouton d'achat
function Buy({ it, coins, logged, left, onBuy, card, big }: CardProps & { card: () => HTMLElement | null; big?: boolean }) {
  const t = useT();
  const lang = useSettings((x) => x.lang);
  const n = (v: number) => v.toLocaleString(locale(lang));
  const name = itemText(it, lang)[0];
  const stockLeft = Math.max(0, it.stock - it.bought);
  const changed = it.base_price != null && it.price !== it.base_price,
    pct = changed && it.base_price ? Math.round((it.price / it.base_price - 1) * 100) : 0;
  return (
    <div className={s.buy}>
      <b className={s.price}>
        {changed && it.base_price ? <s>{n(it.base_price)}</s> : null}
        {n(it.price)} <Coin size={big ? 18 : 14} />
        {changed ? <span className={`${s.deal} ${pct > 0 ? s.up : ''}`}>{`${pct > 0 ? '+' : ''}${pct}%`}</span> : null}
      </b>
      {it.owned ? (
        <Button size={big ? 'md' : 'sm'} disabled>
          {t('ui.owned')}
        </Button>
      ) : stockLeft <= 0 ? (
        <Button size={big ? 'md' : 'sm'} disabled>
          {hms(left)}
        </Button>
      ) : (
        <Button
          size={big ? 'md' : 'sm'}
          variant={coins >= it.price ? 'primary' : 'ghost'}
          disabled={!logged}
          aria-label={`${t('ui.buy')} · ${name} · ${n(it.price)}`}
          onClick={() => {
            const c = card();
            if (c) onBuy(it, c);
          }}
        >
          {t('ui.buy')}
        </Button>
      )}
    </div>
  );
}

// L'objet vedette : grand, il flotte sur le fond pixel animé de la fiche d'un jeton
function Hero(p: CardProps) {
  const t = useT();
  const lang = useSettings((x) => x.lang);
  const { it, left } = p;
  const ref = useRef<HTMLDivElement>(null);
  const art = useRef<HTMLDivElement>(null);
  const [name, desc] = itemText(it, lang),
    img = itemImg(it);
  const stockLeft = Math.max(0, it.stock - it.bought);
  const glow = glowOf(it);
  return (
    <div ref={ref} className={s.hero} style={{ '--g': glow } as CSSProperties}>
      <PixelBg className={s.heroBg} odds={it.kind === 'potion' ? 2500 * Math.max(1, it.data.mult ?? 1) : 2500} glow={hexOf(glow)} center={art} still={reducedFx()} />
      <div ref={art} className={s.heroArt}>
        <img
          className={`px ${img.wide ? s.wide : ''}`}
          src={img.src}
          alt=""
          style={img.tint ? ({ '--df': img.tint } as CSSProperties) : undefined}
        />
      </div>
      <div className={s.heroInfo}>
        <span className={s.feat}>{t('ui.shop_feat')}</span>
        <h2>{name}</h2>
        {it.kind === 'potion' ? <p>{desc}</p> : null}
        <span className={s.stock}>
          {it.owned ? t('ui.unlocked_b') : stockLeft ? t('ui.stock_n', { n: stockLeft }) : `${t('ui.sold_out')} · ${hms(left)}`}
        </span>
        <Buy {...p} card={() => ref.current} big />
      </div>
    </div>
  );
}

// Une case de la vitrine : penchée, elle flotte, se balance au survol et l'objet saute quand on passe dessus
function Card(p: CardProps & { i: number }) {
  const t = useT();
  const lang = useSettings((x) => x.lang);
  const { it, i } = p;
  const ref = useRef<HTMLLIElement>(null);
  const [name, desc] = itemText(it, lang),
    img = itemImg(it);
  const stockLeft = Math.max(0, it.stock - it.bought),
    out = it.owned || stockLeft <= 0;
  return (
    <li
      ref={ref}
      className={`${s.card} ${out ? s.out : ''}`}
      style={{ '--g': glowOf(it), '--tilt': `${TILT[i % TILT.length]}deg`, '--fl': `${6 + (i % 4) * 0.6}s`, '--dl': `${-i * 0.9}s` } as CSSProperties}
    >
      <div className={s.box}>
        <span className={`${s.badge} ${it.owned ? s.ok : stockLeft ? '' : s.none}`}>
          {it.owned ? t('ui.unlocked_b') : stockLeft ? `×${stockLeft}` : t('ui.sold_out')}
        </span>
        <div className={s.art}>
          <img
            className={`px ${img.wide ? s.wide : ''}`}
            src={img.src}
            alt=""
            style={img.tint ? ({ '--df': img.tint } as CSSProperties) : undefined}
          />
        </div>
        <h3>{name}</h3>
        {it.kind === 'potion' ? <p className="muted">{desc}</p> : null}
        <Buy {...p} card={() => ref.current} />
      </div>
    </li>
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
      qc.setQueryData(['me', user?.id], (old: object | undefined) => ({ ...old, ...(r.state as object) }));
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
    <section className={s.ticket} aria-labelledby="promo-t">
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
