import { useRef } from 'react';
import { useT } from '@/i18n/useT';
import type { Key } from '@/i18n';
import { locale, useSettings } from '@/lib/settings';
import { useSwingAll } from '@/ui/useSwing';
import s from './Shop.module.css';

// Packs en euros (aperçu : les paiements ne sont pas encore ouverts). Plus le pack est gros, plus il est avantageux.
type Line = { img: string; n: number; key: Key; m?: number };
const POTION_PRICE: Record<number, number> = { 2: 300, 10: 1500, 25: 4500, 50: 10000, 100: 30000 };
const HOURGLASS = 600;
const pot = (m: number, n: number): Line => ({ img: `/img/potions/chance-${m}.png`, n, key: 'ui.pay_potion', m });
const glass = (n: number): Line => ({ img: '/img/objets/sablier.png', n, key: 'ui.pay_glass' });
const PACKS: { name: Key; price: number; coins: number; lines: Line[]; best?: boolean }[] = [
  { name: 'ui.pay_p1', price: 2.99, coins: 5000, lines: [pot(2, 3), pot(10, 1), glass(1)] },
  { name: 'ui.pay_p2', price: 4.99, coins: 12000, lines: [pot(10, 3), pot(25, 1), glass(2)] },
  { name: 'ui.pay_p3', price: 9.99, coins: 30000, lines: [pot(25, 2), pot(50, 1), glass(3)] },
  { name: 'ui.pay_p4', price: 19.99, coins: 75000, lines: [pot(50, 2), pot(100, 1), glass(5)], best: true },
];
const valueOf = (p: (typeof PACKS)[number]) =>
  p.coins + p.lines.reduce((v, l) => v + l.n * (l.m ? (POTION_PRICE[l.m] ?? 0) : HOURGLASS), 0);

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
              <img className="px" src="/img/piece.png" alt="" width={22} height={22} />
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
