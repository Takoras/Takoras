import { useRef, useState, type CSSProperties } from 'react';
import { BANNER_IMG, itemImg, itemText, type ShopItem } from '@/data/items';
import { useMe } from '@/api/queries';
import { Avatar } from '@/ui/Avatar';
import { sfx } from '@/engines/sound.js';
import { useT } from '@/i18n/useT';
import type { Key } from '@/i18n';
import { locale, useSettings } from '@/lib/settings';
import { Aura, BannerFx, cosmRar, nameCls, picRar, rarCol, rarKey, RANK, type CRar } from '@/ui/Cosmetics';
import { Modal } from '@/ui/Modal';
import { Segmented } from '@/ui/Segmented';
import { Swap } from '@/ui/Swap';
import { Button } from '@/ui/Button';
import { useSwingAll } from '@/ui/useSwing';
import s from './Shop.module.css';

// Offres en euros (aperçu : les paiements ne sont pas encore ouverts). Un clic montre tout le contenu.
type Line =
  | { kind: 'coins'; n: number }
  | { kind: 'potion'; n: number; m: number }
  | { kind: 'hourglass'; n: number }
  | { kind: 'cosm'; id: string };
type Cat = 'cosm' | 'potion' | 'coins' | 'pack' | 'other';
type Offer = { id: string; cat: Cat; name: [string, string]; price: number; lines: Line[]; tag?: 'best' | 'hot' };

const POTION: Record<number, { price: number; rolls: number }> = {
  25: { price: 4500, rolls: 8 },
  50: { price: 10000, rolls: 8 },
  100: { price: 30000, rolls: 10 },
  250: { price: 60000, rolls: 10 },
  500: { price: 65000, rolls: 5 },
};
const c = (n: number): Line => ({ kind: 'coins', n });
const p = (m: number, n: number): Line => ({ kind: 'potion', n, m });
const h = (n: number): Line => ({ kind: 'hourglass', n });
const k = (id: string): Line => ({ kind: 'cosm', id });
const OFFERS: Offer[] = [
  {
    id: 'dragon',
    cat: 'cosm',
    name: ['Set Dragon', 'Dragon set'],
    price: 5.99,
    lines: [k('a_dragon'), k('b_dragon')],
    tag: 'hot',
  },
  {
    id: 'galaxy',
    cat: 'cosm',
    name: ['Set Galaxie', 'Galaxy set'],
    price: 4.99,
    lines: [k('au_galaxy'), k('fx_galaxy')],
  },
  {
    id: 'aurora',
    cat: 'cosm',
    name: ['Set Aurore', 'Aurora set'],
    price: 4.99,
    lines: [k('n_aurora'), k('fx_aurora')],
  },
  { id: 'eclipse', cat: 'cosm', name: ['Éclipse', 'Eclipse'], price: 3.99, lines: [k('fx_eclipse')] },
  { id: 'phoenix', cat: 'cosm', name: ['Phénix', 'Phoenix'], price: 3.49, lines: [k('au_phoenix')] },
  { id: 'tv', cat: 'cosm', name: ['Set Télé', 'TV set'], price: 2.99, lines: [k('a_tv'), k('b_tv')] },
  { id: 'lava', cat: 'cosm', name: ['Set Lave', 'Lava set'], price: 3.99, lines: [k('n_lava'), k('au_lava')] },
  { id: 'sun', cat: 'cosm', name: ['Soleil', 'Sun'], price: 3.49, lines: [k('au_sun')] },
  { id: 'doodle', cat: 'cosm', name: ['Gribouillis', 'Doodle'], price: 2.99, lines: [k('b_doodle')] },
  { id: 'pot25', cat: 'potion', name: ['Fioles', 'Vials'], price: 3.99, lines: [p(25, 8)] },
  { id: 'pot50', cat: 'potion', name: ['Flacons', 'Flasks'], price: 4.99, lines: [p(50, 7)] },
  { id: 'pot250', cat: 'potion', name: ['Grands élixirs', 'Great elixirs'], price: 9.99, lines: [p(250, 4)] },
  { id: 'pot100', cat: 'potion', name: ['Élixirs', 'Elixirs'], price: 7.99, lines: [p(100, 6)], tag: 'hot' },
  {
    id: 'pot500',
    cat: 'potion',
    name: ['Potions légendaires', 'Legendary potions'],
    price: 14.99,
    lines: [p(500, 4), p(250, 2)],
  },
  { id: 'c1', cat: 'coins', name: ['Bourse de pièces', 'Coin purse'], price: 2.99, lines: [c(15000)] },
  { id: 'c15', cat: 'coins', name: ['Poche de pièces', 'Coin pocket'], price: 4.99, lines: [c(30000)] },
  { id: 'c2', cat: 'coins', name: ['Sac de pièces', 'Coin bag'], price: 9.99, lines: [c(70000)] },
  { id: 'c25', cat: 'coins', name: ['Coffre de pièces', 'Coin chest'], price: 14.99, lines: [c(110000)] },
  {
    id: 'c3',
    cat: 'coins',
    name: ['Montagne de pièces', 'Coin mountain'],
    price: 19.99,
    lines: [c(160000)],
    tag: 'best',
  },
  { id: 'p1', cat: 'pack', name: ['Sachet', 'Pouch'], price: 2.99, lines: [c(8000), p(25, 4), p(50, 2), h(1)] },
  { id: 'p2', cat: 'pack', name: ['Sac', 'Bag'], price: 4.99, lines: [c(20000), p(50, 4), p(100, 2), h(2)] },
  {
    id: 'p3',
    cat: 'pack',
    name: ['Coffre', 'Chest'],
    price: 9.99,
    lines: [c(50000), p(100, 4), p(250, 2), h(3)],
    tag: 'hot',
  },
  {
    id: 'p35',
    cat: 'pack',
    name: ['Malle', 'Trunk'],
    price: 14.99,
    lines: [c(110000), p(250, 3), p(500, 2), h(4)],
  },
  {
    id: 'p4',
    cat: 'pack',
    name: ['Trésor', 'Treasure'],
    price: 19.99,
    lines: [c(260000), p(250, 5), p(500, 4), h(10)],
  },
  {
    id: 'p25',
    cat: 'pack',
    name: ['Caisse', 'Crate'],
    price: 7.99,
    lines: [c(35000), p(100, 3), p(250, 1), h(2)],
  },
  {
    id: 'p30',
    cat: 'pack',
    name: ['Réserve', 'Stockpile'],
    price: 12.99,
    lines: [c(80000), p(250, 3), p(500, 1), h(4)],
  },
  {
    id: 'p45',
    cat: 'pack',
    name: ['Gros butin', 'Big loot'],
    price: 16.99,
    lines: [c(220000), p(250, 5), p(500, 3), h(8)],
  },
  {
    id: 'p5',
    cat: 'pack',
    name: ['Trésor royal', 'Royal treasure'],
    price: 19.99,
    lines: [c(320000), p(250, 6), p(500, 5), h(12)],
    tag: 'best',
  },
  { id: 'h1', cat: 'other', name: ['Sabliers', 'Hourglasses'], price: 2.99, lines: [h(5)] },
  { id: 'h2', cat: 'other', name: ['Caisse de sabliers', 'Hourglass crate'], price: 6.99, lines: [h(15)], tag: 'best' },
  { id: 'h3', cat: 'other', name: ['Réserve de sabliers', 'Hourglass stock'], price: 12.99, lines: [h(30)] },
];
const CATS: [Cat, Key][] = [
  ['pack', 'ui.pay_title'],
  ['cosm', 'ui.cat_cosm'],
  ['potion', 'ui.cat_potions'],
  ['coins', 'ui.pay_coins'],
  ['other', 'ui.pay_other'],
];

const kindOf = (id: string) =>
  id.startsWith('a_')
    ? 'avatar'
    : id.startsWith('b_')
      ? 'banner'
      : id.startsWith('au_')
        ? 'aura'
        : id.startsWith('fx_')
          ? 'bfx'
          : id.startsWith('nf_')
            ? 'font'
            : 'name';
const itemOf = (l: Line): ShopItem =>
  l.kind === 'cosm'
    ? { id: l.id, kind: kindOf(l.id), data: {} }
    : l.kind === 'potion'
      ? { id: `potion${l.m}`, kind: 'potion', data: { mult: l.m, rolls: POTION[l.m]?.rolls ?? 5 } }
      : { id: 'hourglass', kind: 'hourglass', data: { minutes: 60 } };
const rarOf = (id: string): CRar =>
  id.startsWith('a_') ? picRar('pp', id.slice(2)) : id.startsWith('b_') ? picRar('banner', id.slice(2)) : cosmRar(id);
const worth = (o: Offer) =>
  o.lines.reduce(
    (v, l) =>
      v +
      (l.kind === 'coins'
        ? l.n
        : l.kind === 'potion'
          ? l.n * (POTION[l.m]?.price ?? 0)
          : l.kind === 'hourglass'
            ? l.n * 600
            : 0),
    0,
  );
const bestRar = (o: Offer) =>
  o.lines.reduce<CRar | null>((b, l) => {
    if (l.kind !== 'cosm') return b;
    const r = rarOf(l.id);
    return !b || RANK[r] > RANK[b] ? r : b;
  }, null);

// l'image d'un objet (pièces, potion, sablier)
function Art({ l }: { l: Line }) {
  if (l.kind === 'coins') return <img className="px" src="/img/coin.png" alt="" />;
  if (l.kind === 'potion') return <img className="px" src={`/img/potions/luck-${l.m}.png`} alt="" />;
  if (l.kind === 'hourglass') return <img className="px" src="/img/items/hourglass.png" alt="" />;
  const im = itemImg(itemOf(l));
  return <img className={`px ${im.wide ? s.wide : ''}`} src={im.src} alt="" />;
}

const isCosmOffer = (o: Offer) => o.lines.some((l) => l.kind === 'cosm');

// un set cosmétique porté : bannière, photo avec son aura, pseudo du joueur avec son style (comme sur le profil)
function SetCard({ o, pseudo, av: mine, lg }: { o: Offer; pseudo: string; av: string; lg?: boolean }) {
  const ids = o.lines.flatMap((l) => (l.kind === 'cosm' ? [l.id] : []));
  const pick = (p: string) => ids.find((i) => i.startsWith(p));
  const av = pick('a_')?.slice(2);
  const bn = pick('b_')?.slice(2);
  const bsrc = bn ? BANNER_IMG[bn] : undefined;
  return (
    <span className={`${s.setCard} ${lg ? s.setLg : ''}`}>
      <span className={s.setBanner}>
        {bsrc ? <img className="px" src={bsrc} alt="" /> : null}
        <BannerFx id={pick('fx_')} />
      </span>
      <span className={s.setId}>
        <span className={s.setPp}>
          <Aura id={pick('au_')}>
            <Avatar pseudo={pseudo} avatar={av ?? mine} size={lg ? 88 : 40} />
          </Aura>
        </span>
        <b className={nameCls(pick('n_'), pick('nf_'))}>{pseudo || 'Takoras'}</b>
      </span>
    </span>
  );
}

// le nom affiché : pour une offre d'un seul objet, le même nom que dans la boutique (« Potion de chance ×100 »)
const single = (o: Offer) => (o.lines.length === 1 && o.lines[0]?.kind !== 'cosm' ? o.lines[0] : undefined);

export function Packs() {
  const t = useT();
  const lang = useSettings((x) => x.lang);
  const root = useRef<HTMLDivElement>(null);
  const [cat, setCat] = useState<Cat>('pack');
  const [open, setOpen] = useState<Offer | null>(null);
  const me = useMe().data;
  const pseudo = me?.pseudo ?? '';
  const myAv = typeof me?.avatar === 'string' ? me.avatar : 'blue';
  useSwingAll(root, `.${s.box}`, 0.35, cat);
  const loc = locale(lang);
  const n = (v: number) => v.toLocaleString(loc);
  const eur = (v: number) => v.toLocaleString(loc, { style: 'currency', currency: 'EUR' });
  const itemName = (l: Line) =>
    l.kind === 'coins' ? t('ui.pay_coins_n', { n: n(l.n) }) : itemText(itemOf(l), lang)[0];
  const name = (o: Offer) => {
    const one = single(o);
    return one ? itemName(one) : o.name[lang === 'en' ? 1 : 0];
  };
  const many = (l: Line) => (l.kind === 'potion' || l.kind === 'hourglass' ? l.n : 0);
  const list = OFFERS.filter((o) => o.cat === cat);
  // la grosse promo : la meilleure offre du rayon, sinon la plus populaire
  const promo = list.find((o) => o.tag === 'best') ?? list.find((o) => o.tag === 'hot') ?? list[0];
  // les petites offres, de la moins chère à la plus chère
  const rest = list.filter((o) => o !== promo).sort((a, b) => a.price - b.price);
  const rc = (o: Offer) => {
    const r = bestRar(o);
    return r ? rarCol(r) : 'var(--gold)';
  };
  // tout ce qu'il faut savoir sans ouvrir l'offre : contenu, effet, rareté, valeur
  const info = (o: Offer) => {
    const one = single(o);
    const r = bestRar(o);
    const w = worth(o);
    return (
      <>
        {r ? (
          <p className={s.rar} style={{ color: rarCol(r) }}>
            {t(rarKey(r))}
          </p>
        ) : null}
        <ul className={s.offerLines}>
          {one ? (
            one.kind !== 'coins' ? (
              <li>{itemText(itemOf(one), lang)[1]}</li>
            ) : null
          ) : (
            o.lines.map((l, i) => (
              <li key={i}>
                {itemName(l)}
                {many(l) ? <span className={s.badgeIn}>×{many(l)}</span> : null}
              </li>
            ))
          )}
          {w && (!one || one.kind !== 'coins') ? (
            <li className={s.offerWorth}>{t('ui.pay_value', { n: n(w) })}</li>
          ) : null}
        </ul>
      </>
    );
  };
  // petite case : une seule ligne (rareté, effet, ou le gros du contenu)
  const short = (o: Offer) => {
    const r = bestRar(o);
    if (r)
      return (
        <p className={s.rar} style={{ color: rarCol(r) }}>
          {t(rarKey(r))}
        </p>
      );
    const one = single(o);
    const head = o.lines[0];
    return (
      <p className={s.offerShort}>
        {one
          ? one.kind === 'coins'
            ? '\u00a0'
            : itemText(itemOf(one), lang)[1]
          : head
            ? t('ui.pay_worth', { n: n(worth(o)) })
            : '\u00a0'}
      </p>
    );
  };
  const visual = (o: Offer, lg?: boolean) => {
    if (isCosmOffer(o)) return <SetCard o={o} pseudo={pseudo} av={myAv} lg={lg} />;
    const one = single(o);
    if (one) return <Art l={one} />;
    return (
      <span className={s.offerStack}>
        {o.lines.slice(0, 3).map((l, i) => (
          <Art key={i} l={l} />
        ))}
      </span>
    );
  };
  const qty = (o: Offer) => {
    const one = single(o);
    return one && one.kind !== 'coins' ? one.n : 0;
  };
  const see = (o: Offer) => (sfx.click(), setOpen(o));
  return (
    <section className={s.packs} aria-labelledby="packs-t">
      <div className={s.packHead}>
        <h2 id="packs-t">{t('ui.pay_shop')}</h2>
        <Segmented
          value={cat}
          onChange={setCat}
          label={t('ui.pay_shop')}
          options={CATS.map(([v, key]) => [v, t(key)] as const)}
        />
      </div>
      <Swap k={cat}>
        <div ref={root} className={s.offers}>
          {promo ? (
            <div className={`${s.hero} ${s.offerHero}`} style={{ '--rc': rc(promo) } as CSSProperties}>
              <div className={s.heroArt}>{visual(promo, true)}</div>
              <div className={s.heroInfo}>
                <span className={s.featRow}>
                  <span className={s.feat}>
                    {t(promo.tag === 'hot' ? 'ui.pay_hot' : promo.tag === 'best' ? 'ui.pay_best' : 'ui.shop_feat')}
                  </span>
                  {qty(promo) ? <span className={s.badgeIn}>×{qty(promo)}</span> : null}
                </span>
                <h2>{name(promo)}</h2>
                {info(promo)}
                <div className={s.buy}>
                  <b className={`${s.price} ${s.eur}`}>{eur(promo.price)}</b>
                  <Button variant="gold" onClick={() => see(promo)}>
                    {t('ui.pay_see')}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
          <ul className={`${s.grid} ${s.offerCards}`}>
            {rest.map((o) => (
              <li key={o.id} className={`${s.card} ${o.tag === 'best' ? s.bmDeal : ''}`}>
                <div className={s.box} style={{ '--rc': rc(o) } as CSSProperties}>
                  {qty(o) ? <span className={s.badge}>×{qty(o)}</span> : null}
                  {o.tag ? (
                    <span className={s.offerTag}>{t(o.tag === 'best' ? 'ui.pay_best' : 'ui.pay_hot')}</span>
                  ) : null}
                  <div className={s.art}>{visual(o)}</div>
                  <h3>{name(o)}</h3>
                  {short(o)}
                  <div className={s.buy}>
                    <b className={`${s.price} ${s.eur}`}>{eur(o.price)}</b>
                    <Button size="sm" variant="gold" onClick={() => see(o)}>
                      {t('ui.pay_see')}
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Swap>
      <Modal open={!!open} onClose={() => setOpen(null)} title={open ? name(open) : ''} wide>
        {open ? (
          <div className={s.packView}>
            {isCosmOffer(open) ? (
              <div className={s.packViewSet} style={{ '--rc': rc(open) } as CSSProperties}>
                <SetCard o={open} pseudo={pseudo} av={myAv} lg />
              </div>
            ) : null}
            <ul>
              {open.lines.map((l, i) => {
                const rr = l.kind === 'cosm' ? rarOf(l.id) : null;
                return (
                  <li key={i} style={{ '--rc': rr ? rarCol(rr) : 'var(--gold)' } as CSSProperties}>
                    {l.kind !== 'cosm' ? (
                      <span className={s.packViewArt}>
                        <Art l={l} />
                      </span>
                    ) : null}
                    {many(l) ? <span className={s.badge}>×{many(l)}</span> : null}
                    <b>{itemName(l)}</b>
                    {rr ? <small style={{ color: rarCol(rr) }}>{t(rarKey(rr))}</small> : null}
                    {l.kind !== 'coins' ? <small>{itemText(itemOf(l), lang)[1]}</small> : null}
                  </li>
                );
              })}
            </ul>
            {worth(open) ? <p className={s.packValue}>{t('ui.pay_value', { n: n(worth(open)) })}</p> : null}
            <button type="button" className={s.packBuy} disabled title={t('ui.packs_soon')}>
              <b>{eur(open.price)}</b>
              <small>{t('ui.pk_soon')}</small>
            </button>
          </div>
        ) : null}
      </Modal>
    </section>
  );
}
