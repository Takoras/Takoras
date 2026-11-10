import { useLayoutEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
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
import { useSwing, useSwingAll } from '@/ui/useSwing';
import { useStaggerIn } from '@/ui/useStaggerIn';
import { useNow } from '../eco/eco';
import { Effects } from '../home/Effects';
import { openInfo } from '../info/store';
import s from './Shop.module.css';

type Item = ShopItem & { price: number; base_price: number | null; stock: number; bought: number; owned: boolean };
// une case mystère (pas encore révélée) : le serveur ne dit que son rayon
type Hidden = { slot: number; hidden: true; group: string };
type Slot = (Item & { slot?: number; hidden?: false }) | Hidden;
type ShopData = {
  items: Slot[];
  reset_in: number;
  featured?: string | null;
  featured_slot?: number | null;
  off?: number | null;
  reveal_gain?: number;
};
const isHidden = (x: Slot): x is Hidden => !!(x as Hidden).hidden;
const slotOf = (x: Slot, i: number) => x.slot ?? i + 1;
// rayons de la boutique (l'icône est un objet du rayon)
const CATS: { k: string; label: Key; icon: string }[] = [
  { k: 'potion', label: 'ui.cat_potions', icon: '/img/potions/chance-10.png' },
  { k: 'util', label: 'ui.cat_pulls', icon: '/img/objets/sablier.png' },
  { k: 'banner', label: 'ui.cat_cosm', icon: '/img/pp/bleu.png' },
];
const catOf = (it: Slot) =>
  isHidden(it)
    ? it.group
    : it.kind === 'potion'
      ? 'potion'
      : it.kind === 'banner' || it.kind === 'avatar'
        ? 'banner'
        : 'util';
// rareté d'un objet (en « 1 sur X », comme les jetons) : le fond de la vedette et le son de la révélation en dépendent
const POTION_ODDS: Record<number, number> = { 1.3: 1, 2: 100, 5: 1000, 10: 10_000, 25: 50_000, 50: 100_000, 100: 500_000 };
const oddsOf = (it: Item) =>
  it.kind === 'potion' ? (POTION_ODDS[it.data.mult ?? 0] ?? ((it.data.mult ?? 0) >= 250 ? 1_000_000 : 1)) : 100;
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
const Coin = ({ size = 14 }: { size?: number }) => (
  <img className="px" src="/img/piece.png" alt="" width={size} height={size} />
);

// Boutique mystère, renouvelée chaque jour à minuit : chaque objet en stock est caché dans une case. La révéler est
// gratuit et rapporte 100 pièces (une fois par objet et par jour) ; ensuite on peut l'acheter. En haut, l'objet à la
// une (sa réduction se voit, pas ce que c'est), sur le fond pixel des fiches de jetons. Pas d'argent réel.
export default function Shop() {
  const t = useT();
  const lang = useSettings((x) => x.lang);
  const user = useAuth((x) => x.user);
  const me = useMe();
  const qc = useQueryClient();
  const now = useNow();
  const [cat, setCat] = useState('potion');
  const shop = useQuery({
    queryKey: ['shop'],
    queryFn: async () => ({ ...((await publicApi.shopToday()) as unknown as ShopData), at: Date.now() }),
  });
  const pageRef = useRef<HTMLElement>(null);
  const revealing = useRef(new Set<number>());
  const gridRef = useRef<HTMLUListElement>(null);
  const shelvesRef = useRef<HTMLDivElement>(null);
  useStaggerIn(pageRef, `.${s.head}, .${s.hero}, .${s.shelf}, .${s.card}, .${s.ticket}`, !!shop.data);
  useSwingAll(
    gridRef,
    `.${s.box}`,
    0.35,
    cat + (shop.data?.items.map((x) => (isHidden(x) ? 'h' : 'r')).join('') ?? ''),
  );
  // changer de rayon : les cases du nouveau rayon apparaissent en fondu, l'une après l'autre (comme à l'arrivée)
  const switched = useRef(false);
  useLayoutEffect(() => {
    if (!switched.current || !gridRef.current || reducedFx()) return;
    [...gridRef.current.children].forEach((c, i) =>
      (c as HTMLElement).animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 380,
        delay: i * 45,
        easing: 'ease-out',
        fill: 'backwards',
      }),
    );
  }, [cat]);
  const pick = (k: string) => {
    if (k === cat) return;
    switched.current = true;
    sfx.click();
    setCat(k);
  };
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
      // achat : la case se tasse doucement, l'objet s'élève et s'efface, puis revient (posé, sans à-coup)
      if (!reducedFx()) {
        card.animate([{ scale: '1' }, { scale: '0.97', offset: 0.4 }, { scale: '1' }], {
          duration: 700,
          easing: 'cubic-bezier(.4,0,.2,1)',
        });
        card.querySelector(`.${s.art} img, .${s.heroArt} img`)?.animate(
          [
            { opacity: 1, transform: 'none' },
            { opacity: 0, transform: 'translateY(-26px) scale(.9)', offset: 0.5 },
            { opacity: 0, transform: 'translateY(10px)', offset: 0.6 },
            { opacity: 1, transform: 'none' },
          ],
          { duration: 1100, easing: 'cubic-bezier(.4,0,.2,1)' },
        );
      }
      qc.setQueryData(['shop'], {
        ...data,
        items: data.items.map((x) =>
          !isHidden(x) && x.id === it.id
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

  // révéler une case : le cache grossit très légèrement et blanchit (≈ 1,2 s), puis éclair blanc et l'objet apparaît,
  // de cette taille vers sa taille normale (+100 pièces). Que des transformations : rien ne bouge autour.
  const reveal = async (slot: number, el: HTMLElement) => {
    if (!data || !user) return;
    if (revealing.current.has(slot)) return;
    revealing.current.add(slot);
    const cover = el.querySelector<HTMLElement>(`.${s.cover}`);
    const fast = reducedFx();
    try {
      sfx.riser(fast ? 0.2 : 1.2);
      const swell =
        fast || !cover
          ? Promise.resolve()
          : cover.animate(
              [
                { transform: 'scale(1)', filter: 'brightness(1) saturate(1) drop-shadow(0 0 0 rgb(255 255 255 / 0%))' },
                { transform: 'scale(1.06)', filter: 'brightness(6) saturate(0) drop-shadow(0 0 16px rgb(255 255 255 / 75%))' },
              ],
              { duration: 1200, easing: 'cubic-bezier(.45,0,.75,.6)', fill: 'forwards' },
            ).finished;
      cover?.classList.add(s.whiten ?? '');
      const [r] = (await Promise.all([shopApi.reveal(slot), swell])) as [
        { gain: number; state: object; shop: ShopData },
        unknown,
      ];
      // éclair blanc par-dessus la case, puis l'objet est là
      const flash = document.createElement('div');
      flash.className = s.flash ?? '';
      el.appendChild(flash);
      qc.setQueryData(['me', user.id], (old: object | undefined) => ({ ...old, ...r.state }));
      qc.setQueryData(['shop'], { ...r.shop, at: Date.now() });
      await new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
      const it = r.shop.items.find((x) => slotOf(x, 0) === slot);
      sfx.reveal(it && !isHidden(it) ? oddsOf(it) : 1);
      if (!fast)
        // l'objet arrive à la taille où la case s'est arrêtée, puis redescend doucement à sa taille (sans rebond)
        el.animate([{ scale: '1.06' }, { scale: '1' }], { duration: 650, easing: 'cubic-bezier(.2,.7,.3,1)' });
      flash
        .animate([{ opacity: 1 }, { opacity: 0 }], { duration: fast ? 120 : 420, easing: 'ease-out', fill: 'forwards' })
        .finished.then(
          () => flash.remove(),
          () => flash.remove(),
        );
    } catch (e) {
      sfx.deny();
      cover?.getAnimations().forEach((a) => a.cancel());
      cover?.classList.remove(s.whiten ?? '');
      toast(errorText(e, lang), true);
    } finally {
      revealing.current.delete(slot);
    }
  };

  const items = data?.items ?? [];
  // la grille du bas : le rayon choisi, sans l'objet à la une (il est déjà en grand en haut)
  const list = items.filter((it, i) => catOf(it) === cat && slotOf(it, i) !== data?.featured_slot);
  // la vedette : sa case (révélée ou non) et sa réduction, tirées par le serveur
  const fSlot = data?.featured_slot ?? null;
  const fIdx = fSlot == null ? -1 : items.findIndex((x, i) => slotOf(x, i) === fSlot);
  const featured = fIdx >= 0 ? items[fIdx] : undefined;
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
            {featured && fSlot != null ? (
              isHidden(featured) ? (
                <MysteryHero off={data.off ?? 0} gain={data.reveal_gain ?? 100} logged={!!user} onReveal={(el) => void reveal(fSlot, el)} />
              ) : (
                <Hero it={featured} off={data.off ?? 0} coins={coins} logged={!!user} left={left} onBuy={buy} />
              )
            ) : null}
            <div ref={shelvesRef} className={s.shelves} role="group" aria-label={t('ui.shop_title')}>
              {CATS.map((c) => {
                // les rayons restent toujours accessibles, même vides aujourd'hui
                const inCat = items.filter((it) => catOf(it) === c.k);
                return (
                  <button
                    key={c.k}
                    type="button"
                    className={s.shelf}
                    aria-pressed={cat === c.k}
                    onClick={() => pick(c.k)}
                  >
                    <img className="px" src={c.icon} alt="" />
                    <span>
                      <b>{t(c.label)}</b>
                      <small>{inCat.length}</small>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <ul ref={gridRef} className={s.grid}>
            {list.map((it) => {
              const slot = slotOf(it, items.indexOf(it));
              return isHidden(it) ? (
                <Mystery key={slot} slot={slot} gain={data.reveal_gain ?? 100} logged={!!user} onReveal={(el) => void reveal(slot, el)} />
              ) : (
                <Card key={slot} slot={slot} it={it} coins={coins} logged={!!user} left={left} onBuy={buy} />
              );
            })}
          </ul>
          {user ? <Redeem items={items.filter((x): x is Item => !isHidden(x))} /> : <p className="muted">{t('ui.acc_need')}</p>}
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
function Hero(p: CardProps & { off: number }) {
  const t = useT();
  const lang = useSettings((x) => x.lang);
  const { it, left, off } = p;
  const ref = useRef<HTMLDivElement>(null);
  useSwing(ref, 0.12); // il se balance un peu quand la souris passe dessus
  const art = useRef<HTMLDivElement>(null);
  const [name, desc] = itemText(it, lang),
    img = itemImg(it);
  const stockLeft = Math.max(0, it.stock - it.bought);
  const glow = glowOf(it);
  return (
    <div ref={ref} className={s.hero} style={{ '--g': glow } as CSSProperties}>
      {/* fond selon la rareté de l'objet (comme les jetons), à sa couleur */}
      <PixelBg className={s.heroBg} odds={oddsOf(it)} glow={hexOf(glow)} center={art} still={reducedFx()} />
      <div ref={art} className={s.heroArt}>
        <img
          className={`px ${img.wide ? s.wide : ''}`}
          src={img.src}
          alt=""
          style={img.tint ? ({ '--df': img.tint } as CSSProperties) : undefined}
        />
      </div>
      <div className={s.heroInfo}>
        <span className={s.featRow}>
          <span className={s.feat}>{t('ui.shop_feat')}</span>
          {off > 0 ? <b className={s.off}>−{off}%</b> : null}
        </span>
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

// Une case de la vitrine : droite et posée comme les jetons de l'inventaire ; elle se balance au survol
function Card(p: CardProps & { slot: number }) {
  const t = useT();
  const lang = useSettings((x) => x.lang);
  const { it, slot } = p;
  const ref = useRef<HTMLLIElement>(null);
  const [name, desc] = itemText(it, lang),
    img = itemImg(it);
  const stockLeft = Math.max(0, it.stock - it.bought),
    out = it.owned || stockLeft <= 0;
  return (
    <li
      ref={ref}
      className={`${s.card} ${out ? s.out : ''}`}
      data-key={slot}
      style={{ '--g': glowOf(it) } as CSSProperties}
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
        {/* ligne réservée même sans description : toutes les cases gardent la même taille */}
        <p className="muted">{it.kind === 'potion' ? desc : '\u00a0'}</p>
        <Buy {...p} card={() => ref.current} />
      </div>
    </li>
  );
}

// Case pas encore révélée : la même case qu'un objet (même taille), entièrement recouverte d'un cache ; la toucher la
// révèle (+100 pièces)
function Mystery({ slot, gain, logged, onReveal }: { slot: number; gain: number; logged: boolean; onReveal: (el: HTMLElement) => void }) {
  const t = useT();
  const ref = useRef<HTMLLIElement>(null);
  return (
    <li ref={ref} className={`${s.card} ${s.myst}`} data-key={slot}>
      <div className={s.box} aria-hidden>
        <div className={s.art} />
        <h3>&nbsp;</h3>
        <p>&nbsp;</p>
        <div className={s.buy}>
          <b className={s.price}>&nbsp;</b>
          <Button size="sm" tabIndex={-1}>
            &nbsp;
          </Button>
        </div>
      </div>
      <button
        type="button"
        className={s.cover}
        disabled={!logged}
        aria-label={t('ui.shop_reveal_a', { n: gain })}
        onClick={() => ref.current && onReveal(ref.current)}
      >
        <span className={s.gainTag}>
          +{gain} <Coin size={16} />
        </span>
      </button>
    </li>
  );
}

// La vedette tant qu'elle n'est pas révélée : toute la case est cachée, on ne voit que « À la une » et sa réduction
function MysteryHero({ off, gain, logged, onReveal }: { off: number; gain: number; logged: boolean; onReveal: (el: HTMLElement) => void }) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  useSwing(ref, 0.12);
  return (
    <div ref={ref} className={`${s.hero} ${s.myst}`}>
      <button
        type="button"
        className={s.cover}
        disabled={!logged}
        aria-label={t('ui.shop_reveal_a', { n: gain })}
        onClick={() => ref.current && onReveal(ref.current)}
      >
        <span className={s.featRow}>
          <span className={s.feat}>{t('ui.shop_feat')}</span>
          {off > 0 ? <b className={s.off}>−{off}%</b> : null}
        </span>
        <span className={`${s.gainTag} ${s.gainBig}`}>
          +{gain} <Coin size={18} />
        </span>
      </button>
    </div>
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
