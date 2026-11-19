import { useRef, useState, type CSSProperties } from 'react';
import { itemImg, itemText, type ShopItem } from '@/data/items';
import { sfx } from '@/engines/sound.js';
import { useT } from '@/i18n/useT';
import type { Key } from '@/i18n';
import { locale, useSettings } from '@/lib/settings';
import { CosmeticPreview, cosmRar, picRar, rarCol, rarKey, RANK, type CRar } from '@/ui/Cosmetics';
import { Modal } from '@/ui/Modal';
import { Segmented } from '@/ui/Segmented';
import { Swap } from '@/ui/Swap';
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
  { id: 'glitch', cat: 'cosm', name: ['Glitch', 'Glitch'], price: 2.99, lines: [k('n_glitch')] },
  { id: 'gothic', cat: 'cosm', name: ['Gothique', 'Gothic'], price: 2.99, lines: [k('nf_gothic')] },
  { id: 'doodle', cat: 'cosm', name: ['Gribouillis', 'Doodle'], price: 2.99, lines: [k('b_doodle')] },
  { id: 'pot25', cat: 'potion', name: ['Fioles', 'Vials'], price: 3.99, lines: [p(25, 5)] },
  { id: 'pot50', cat: 'potion', name: ['Flacons', 'Flasks'], price: 4.99, lines: [p(50, 4)] },
  { id: 'pot250', cat: 'potion', name: ['Grands élixirs', 'Great elixirs'], price: 9.99, lines: [p(250, 2)] },
  { id: 'pot100', cat: 'potion', name: ['Élixirs', 'Elixirs'], price: 7.99, lines: [p(100, 3)], tag: 'hot' },
  {
    id: 'pot500',
    cat: 'potion',
    name: ['Potions légendaires', 'Legendary potions'],
    price: 14.99,
    lines: [p(500, 2), p(250, 1)],
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
  { id: 'p1', cat: 'pack', name: ['Sachet', 'Pouch'], price: 2.99, lines: [c(8000), p(25, 2), p(50, 1), h(1)] },
  { id: 'p2', cat: 'pack', name: ['Sac', 'Bag'], price: 4.99, lines: [c(20000), p(50, 2), p(100, 1), h(2)] },
  {
    id: 'p3',
    cat: 'pack',
    name: ['Coffre', 'Chest'],
    price: 9.99,
    lines: [c(50000), p(100, 2), p(250, 1), h(3)],
    tag: 'hot',
  },
  {
    id: 'p35',
    cat: 'pack',
    name: ['Malle', 'Trunk'],
    price: 14.99,
    lines: [c(110000), p(250, 1), p(500, 1), h(4)],
  },
  {
    id: 'p4',
    cat: 'pack',
    name: ['Trésor', 'Treasure'],
    price: 19.99,
    lines: [c(200000), p(250, 2), p(500, 1), h(5)],
    tag: 'best',
  },
  { id: 'h1', cat: 'other', name: ['Sabliers', 'Hourglasses'], price: 2.99, lines: [h(5)] },
  { id: 'h2', cat: 'other', name: ['Caisse de sabliers', 'Hourglass crate'], price: 6.99, lines: [h(15)], tag: 'best' },
  { id: 'h3', cat: 'other', name: ['Réserve de sabliers', 'Hourglass stock'], price: 12.99, lines: [h(30)] },
];
const CATS: [Cat, Key][] = [
  ['cosm', 'ui.cat_cosm'],
  ['potion', 'ui.cat_potions'],
  ['coins', 'ui.pay_coins'],
  ['pack', 'ui.pay_title'],
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

// l'image d'un élément : aperçu vivant pour un cosmétique, sinon l'objet en pixel art
function Art({ l, big }: { l: Line; big?: boolean }) {
  if (l.kind === 'coins') return <img className="px" src="/img/coin.png" alt="" />;
  if (l.kind === 'potion') return <img className="px" src={`/img/potions/luck-${l.m}.png`} alt="" />;
  if (l.kind === 'hourglass') return <img className="px" src="/img/items/hourglass.png" alt="" />;
  if (l.id.startsWith('a_') || l.id.startsWith('b_')) {
    const im = itemImg(itemOf(l));
    return <img className={`px ${im.wide ? s.wide : ''}`} src={im.src} alt="" />;
  }
  return <CosmeticPreview id={l.id} big={big} />;
}

export function Packs() {
  const t = useT();
  const lang = useSettings((x) => x.lang);
  const root = useRef<HTMLDivElement>(null);
  const [cat, setCat] = useState<Cat>('cosm');
  const [open, setOpen] = useState<Offer | null>(null);
  useSwingAll(root, `.${s.pack}`, 0.3, cat);
  const loc = locale(lang);
  const n = (v: number) => v.toLocaleString(loc);
  const eur = (v: number) => v.toLocaleString(loc, { style: 'currency', currency: 'EUR' });
  const name = (o: Offer) => o.name[lang === 'en' ? 1 : 0];
  const label = (l: Line) =>
    l.kind === 'coins'
      ? t('ui.pay_coins_n', { n: n(l.n) })
      : `${l.kind === 'cosm' ? '' : `${l.n} × `}${itemText(itemOf(l), lang)[0]}`;
  const list = OFFERS.filter((o) => o.cat === cat);
  // la grosse promo : la meilleure offre du rayon, sinon la plus populaire
  const promo = list.find((o) => o.tag === 'best') ?? list.find((o) => o.tag === 'hot') ?? list[0];
  const rest = list.filter((o) => o !== promo);
  const cols = rest.length <= 4 ? 2 : rest.length <= 6 ? 3 : 5;
  const rc = (o: Offer) => {
    const r = bestRar(o);
    return r ? rarCol(r) : 'var(--gold)';
  };
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
            <button
              type="button"
              className={s.promo}
              style={{ '--rc': rc(promo) } as CSSProperties}
              onClick={() => (sfx.click(), setOpen(promo ?? null))}
            >
              <span className={s.promoArt}>
                {promo.lines.slice(0, 3).map((l, i) => (
                  <span key={i}>
                    <Art l={l} big />
                  </span>
                ))}
              </span>
              <span className={s.promoInfo}>
                <span className={s.feat}>
                  {t(promo.tag === 'hot' ? 'ui.pay_hot' : promo.tag === 'best' ? 'ui.pay_best' : 'ui.shop_feat')}
                </span>
                <b className={s.promoName}>{name(promo)}</b>
                <span className={s.promoLines}>
                  {promo.lines.map((l, i) => (
                    <small key={i}>{label(l)}</small>
                  ))}
                </span>
                <span className={s.promoPrice}>{eur(promo.price)}</span>
              </span>
            </button>
          ) : null}
          <div className={s.offerGrid} style={{ '--cols': cols } as CSSProperties}>
            {rest.map((o) => {
              const first =
                o.lines.find((l) => l.kind === 'cosm') ?? o.lines.find((l) => l.kind !== 'coins') ?? o.lines[0];
              return (
                <button
                  key={o.id}
                  type="button"
                  className={`${s.pack} ${o.tag === 'best' ? s.packBest : ''}`}
                  style={{ '--rc': rc(o) } as CSSProperties}
                  onClick={() => (sfx.click(), setOpen(o))}
                >
                  <span className={s.packArt}>
                    {first ? <Art l={first} /> : null}
                    {o.lines.length > 1 ? <b className={s.packMore}>+{o.lines.length - 1}</b> : null}
                  </span>
                  <b className={s.packName}>{name(o)}</b>
                  <span className={s.packPrice}>{eur(o.price)}</span>
                </button>
              );
            })}
          </div>
        </div>
      </Swap>
      <Modal open={!!open} onClose={() => setOpen(null)} title={open ? name(open) : ''} wide>
        {open ? (
          <div className={s.packView}>
            <ul>
              {open.lines.map((l, i) => {
                const rr = l.kind === 'cosm' ? rarOf(l.id) : null;
                return (
                  <li key={i} style={{ '--rc': rr ? rarCol(rr) : 'var(--gold)' } as CSSProperties}>
                    <span className={s.packViewArt}>
                      <Art l={l} big />
                    </span>
                    <b>{label(l)}</b>
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
