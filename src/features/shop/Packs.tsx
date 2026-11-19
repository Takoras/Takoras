import { useRef } from 'react';
import { useT } from '@/i18n/useT';
import type { Key } from '@/i18n';
import { locale, useSettings } from '@/lib/settings';
import { useSwingAll } from '@/ui/useSwing';
import s from './Shop.module.css';

// Packs en euros (aperçu : les paiements ne sont pas encore ouverts). Plus le pack est gros, plus il est avantageux.
type Line = { img: string; n: number; key: Key; m?: number; worth: number };
const POTION_PRICE: Record<number, number> = { 25: 4500, 50: 10000, 100: 30000, 250: 60000, 500: 65000 };
const pot = (m: number, n: number): Line => ({
  img: `/img/potions/luck-${m}.png`,
  n,
  key: 'ui.pay_potion',
  m,
  worth: POTION_PRICE[m] ?? 0,
});
const glass = (n: number): Line => ({ img: '/img/items/hourglass.png', n, key: 'ui.pay_glass', worth: 600 });
// cosmétique propre aux packs : dessin à venir, il ne compte pas dans la valeur affichée
const cosm: Line = { img: '/img/tokens/mystery.png', n: 1, key: 'ui.pay_cosm', worth: 0 };
const PACKS: { name: Key; price: number; coins: number; lines: Line[]; best?: boolean }[] = [
  { name: 'ui.pay_p1', price: 2.99, coins: 8000, lines: [pot(25, 2), pot(50, 1), glass(1)] },
  { name: 'ui.pay_p2', price: 4.99, coins: 20000, lines: [pot(50, 2), pot(100, 1), glass(2)] },
  { name: 'ui.pay_p3', price: 9.99, coins: 50000, lines: [pot(100, 2), pot(250, 1), glass(3), cosm] },
  { name: 'ui.pay_p4', price: 19.99, coins: 200000, lines: [pot(250, 2), pot(500, 1), glass(5), cosm], best: true },
];
const valueOf = (p: (typeof PACKS)[number]) => p.coins + p.lines.reduce((v, l) => v + l.n * l.worth, 0);

export function Packs() {
  const t = useT();
  const lang = useSettings((x) => x.lang);
  const root = useRef<HTMLDivElement>(null);
  useSwingAll(root, `.${s.pack}`, 0.3);
  const loc = locale(lang);
  const n = (v: number) => v.toLocaleString(loc);
  const eur = (v: number) => v.toLocaleString(loc, { style: 'currency', currency: 'EUR' });
  return (
    <section className={s.packs} aria-labelledby="packs-t">
      <h2 id="packs-t">{t('ui.pay_title')}</h2>
      <div ref={root} className={s.packGrid}>
        {PACKS.map((p) => (
          <article key={p.name} className={`${s.pack} ${p.best ? s.packBest : ''}`}>
            {p.best ? <span className={s.packTag}>{t('ui.pay_best')}</span> : null}
            <h3>{t(p.name)}</h3>
            <p className={s.packCoins}>
              <img className="px" src="/img/coin.png" alt="" width={22} height={22} />
              {n(p.coins)}
            </p>
            <ul>
              {p.lines.map((l) => (
                <li key={l.img}>
                  <img className="px" src={l.img} alt="" width={30} height={30} />
                  <span>
                    {l.n} × {t(l.key, { m: l.m ?? 0 })}
                  </span>
                </li>
              ))}
            </ul>
            <small className={s.packValue}>{t('ui.pay_value', { n: n(valueOf(p)) })}</small>
            <button type="button" className={s.packBuy} disabled title={t('ui.packs_soon')}>
              <b>{eur(p.price)}</b>
              <small>{t('ui.pk_soon')}</small>
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
