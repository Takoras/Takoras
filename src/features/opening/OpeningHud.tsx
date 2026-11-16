import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMe } from '@/api/queries';
import { COIN_PULL } from '@/engines/env';
import { locale, useSettings } from '@/lib/settings';
import { Tween } from '@/ui/Tween';
import { useSwingAll } from '@/ui/useSwing';
import { mmss, predictEco } from '../eco/eco';
import { openingSerie } from '../eco/openPulls';
import s from './OpeningHud.module.css';

// Pendant une ouverture, autour du jeton mystère : des fiches qui flottent dans l'espace (une à gauche, deux à droite),
// chacune penchée et qui dérive doucement : tirages qui restent, chance des potions, prochain tirage ×10 ; pour une série
// payée en pièces, le solde et combien de tirages il paie encore. Elles arrivent des côtés, se balancent au survol,
// les nombres défilent quand ils changent, et elles s'écartent quand le jeton est révélé (sa fiche prend la place).
const TXT = {
  fr: { pulls: 'Tirages', next: '+1 dans {t}', full: 'Stock plein', luck: 'Chance', pity: 'Chance ×10', pityIn: 'dans {n} tirages', pityNow: 'au prochain tirage', coins: 'Pièces', buy: 'Tirages payables', none: 'Aucune potion' },
  en: { pulls: 'Pulls', next: '+1 in {t}', full: 'Stock full', luck: 'Luck', pity: 'Luck ×10', pityIn: 'in {n} pulls', pityNow: 'on the next pull', coins: 'Coins', buy: 'Affordable pulls', none: 'No potion' },
};

export function OpeningHud() {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [on, setOn] = useState(false);
  const [shown, setShown] = useState(false);
  const [serie, setSerie] = useState('Takoras');
  // l'écran d'ouverture est créé au premier tirage : on l'attend, puis on suit son ouverture et sa fermeture
  useEffect(() => {
    let mo: MutationObserver | null = null;
    const watch = (el: HTMLElement) => {
      setHost(el);
      const sync = () => {
        const v = el.classList.contains('on');
        if (v) setSerie(openingSerie());
        setOn(v);
        setShown(v && !el.classList.contains('revealed') && !el.classList.contains('recap'));
      };
      sync();
      mo?.disconnect();
      mo = new MutationObserver(sync);
      mo.observe(el, { attributes: true, attributeFilter: ['class'] });
    };
    const found = document.getElementById('opening');
    if (found) watch(found);
    const wait = new MutationObserver(() => {
      const el = document.getElementById('opening');
      if (el) {
        wait.disconnect();
        watch(el);
      }
    });
    if (!found) wait.observe(document.body, { childList: true });
    return () => {
      wait.disconnect();
      mo?.disconnect();
    };
  }, []);
  if (!host) return null;
  return createPortal(<Hud on={on} shown={shown} serie={serie} />, host);
}

function Hud({ on, shown, serie }: { on: boolean; shown: boolean; serie: string }) {
  const lang = useSettings((x) => x.lang);
  const T = TXT[lang === 'en' ? 'en' : 'fr'];
  const me = useMe();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!on) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [on]);
  const ref = useRef<HTMLDivElement>(null);
  useSwingAll(ref, `.${s.box}`, 0.8, `${on}|${serie}`);
  if (!me.data) return null;
  const e = predictEco(me.data, me.dataUpdatedAt, now);
  const fmt = (n: number) => Math.round(n).toLocaleString(locale(lang));
  const pityIn = Math.max(1, Number(me.data.pity_in ?? 100));
  const paid = serie !== 'Takoras';
  return (
    <div ref={ref} className={`${s.hud} ${shown ? s.on : ''}`} aria-hidden={!shown}>
      {paid ? (
        <>
          <div className={`${s.box} ${s.left}`} style={{ '--i': 0 } as React.CSSProperties}>
            <img data-depth className="px" src="/img/piece.png" alt="" />
            <span data-depth>
              <small>{T.coins}</small>
              <b><Tween value={e.coins} ms={900} pow={4} format={fmt} /></b>
            </span>
          </div>
          <div className={`${s.box} ${s.right1}`} style={{ '--i': 1 } as React.CSSProperties}>
            <img data-depth className="px" src="/img/jetons/mystere.png" alt="" />
            <span data-depth>
              <small>{T.buy}</small>
              <b><Tween value={Math.floor(e.coins / COIN_PULL.one)} format={fmt} /></b>
            </span>
          </div>
        </>
      ) : (
        <>
          <div className={`${s.box} ${s.left}`} style={{ '--i': 0 } as React.CSSProperties}>
            <img data-depth className="px" src="/img/jetons/takoras.png" alt="" />
            <span data-depth>
              <small>{T.pulls}</small>
              <b><Tween value={e.stock} format={fmt} /></b>
              <em>{e.full ? T.full : T.next.replace('{t}', mmss(e.nextIn))}</em>
            </span>
          </div>
          <div className={`${s.box} ${s.right1}`} style={{ '--i': 1 } as React.CSSProperties}>
            <img data-depth className="px" src="/img/potions/chance-10.png" alt="" />
            <span data-depth>
              <small>{T.luck}</small>
              <b className={e.luck > 1 ? s.lucky : ''}>×{String(Math.round(e.luck * 100) / 100).replace('.', lang === 'en' ? '.' : ',')}</b>
              {e.luck <= 1 ? <em>{T.none}</em> : null}
            </span>
          </div>
          <div className={`${s.box} ${s.right2} ${pityIn <= 1 ? s.ready : ''}`} style={{ '--i': 2 } as React.CSSProperties}>
            <img data-depth className="px" src="/img/potions/chance-100.png" alt="" />
            <span data-depth>
              <small>{T.pity}</small>
              <b>{pityIn <= 1 ? T.pityNow : T.pityIn.replace('{n}', fmt(pityIn))}</b>
              <i className={s.bar}>
                <i style={{ width: `${100 - pityIn}%` }} />
              </i>
            </span>
          </div>
        </>
      )}
    </div>
  );
}
