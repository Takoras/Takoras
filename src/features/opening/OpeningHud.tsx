import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMe } from '@/api/queries';
import { COIN_PULL } from '@/engines/env';
import { locale, useSettings } from '@/lib/settings';
import { PixelBg } from '@/ui/PixelBg';
import { reducedFx } from '@/lib/settings';
import { Tween } from '@/ui/Tween';
import { VTag } from '@/ui/VTag';
import { LORE } from '@/data/lore';
import { useSwingAll } from '@/ui/useSwing';
import { mmss, predictEco } from '../eco/eco';
import { openingSerie } from '../eco/openPulls';
import s from './OpeningHud.module.css';

// Pendant une ouverture, autour du jeton mystère : deux grandes boîtes comme la fiche du jeton révélé — à gauche le
// prochain tirage ×10, à droite les tirages qui restent et la chance des potions ; pour une série payée en pièces,
// le solde et combien de tirages il paie encore. Elles penchent, dérivent doucement et suivent un peu la souris. Elles arrivent des côtés, se balancent au survol,
// les nombres défilent quand ils changent, et elles s'écartent quand le jeton est révélé (sa fiche prend la place).
const TXT = {
  fr: {
    pulls: 'Tirages',
    next: '+1 dans {t}',
    full: 'Stock plein',
    luck: 'Chance',
    pity: 'Chance ×{m}',
    pityIn: 'dans {n} tirages',
    pityNow: 'au prochain tirage',
    coins: 'Pièces',
    buy: 'Tirages payables',
    none: 'Aucune potion',
  },
  en: {
    pulls: 'Pulls',
    next: '+1 in {t}',
    full: 'Stock full',
    luck: 'Luck',
    pity: 'Luck ×{m}',
    pityIn: 'in {n} pulls',
    pityNow: 'on the next pull',
    coins: 'Coins',
    buy: 'Affordable pulls',
    none: 'No potion',
  },
};

// jeton révélé, repris de la fiche que le moteur d'ouverture vient de remplir (texte seulement, jamais de HTML)
type Tok = { key: string; name: string; variant: string | null; odds: string; luck: string; logo: string };
function readTok(el: HTMLElement): Tok {
  const name = el.querySelector('#op-name'),
    rar = el.querySelector('#op-rarity');
  const vt = name?.querySelector('.vtag');
  const variant = vt ? ([...vt.classList].find((c) => c.startsWith('v-'))?.slice(2) ?? null) : null;
  const luck = rar?.querySelector('.op-luck')?.textContent?.trim() ?? '';
  const nameTxt = [...(name?.childNodes ?? [])]
    .filter((n) => n.nodeType === Node.TEXT_NODE)
    .map((n) => n.textContent)
    .join('')
    .trim();
  const odds = (rar?.textContent ?? '').replace(luck, '').trim();
  return {
    key: el.dataset.jeton ?? '',
    name: nameTxt,
    variant,
    odds,
    luck,
    logo: el.querySelector('.op-serie')?.getAttribute('src') ?? '',
  };
}

export function OpeningHud() {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [on, setOn] = useState(false);
  const [shown, setShown] = useState(false);
  const [rev, setRev] = useState(false);
  const [serie, setSerie] = useState('Takoras');
  const [tok, setTok] = useState<Tok | null>(null);
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
        // jeton révélé : la boîte de droite (tirages, chance) RESTE en place, seule celle du ×10 laisse la place à la fiche
        const r = v && el.classList.contains('revealed') && !el.classList.contains('recap');
        setRev(r);
        // jeton révélé : la boîte de gauche reprend son logo, son nom et sa chance (remplis juste avant par le moteur)
        if (r) setTok(readTok(el));
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
  return createPortal(
    <>
      {/* fond de la page pendant le jeton mystère : le fond pixel Takoras le plus simple (une bande douce), sobre */}
      {on ? (
        <div className={`${s.pageBg} ${shown ? s.pageBgOn : ''}`} aria-hidden>
          <PixelBg
            className={s.pageBgPx}
            odds={1}
            glow={serie === 'Bodako' ? '#1f6b3a' : '#2c4a9e'}
            still={reducedFx() || !shown}
          />
        </div>
      ) : null}
      <Hud on={on} shown={shown} rev={rev} serie={serie} host={host} tok={tok} />
    </>,
    host,
  );
}

function Hud({
  on,
  shown,
  rev,
  serie,
  host,
  tok,
}: {
  on: boolean;
  shown: boolean;
  rev: boolean;
  serie: string;
  host: HTMLElement;
  tok: Tok | null;
}) {
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
  const right = useRef<HTMLDivElement>(null);
  // les boutons de la fiche révélée se posent juste sous la boîte de droite (même largeur, même bord droit)
  useEffect(() => {
    const el = right.current;
    if (!el) return;
    const place = () => {
      const main = host.querySelector<HTMLElement>('.op-main');
      if (!main) return;
      // la boîte : centrée sur la hauteur de l'écran d'ouverture ; .op-main : le bloc où vivent les boutons
      const hr = host.getBoundingClientRect();
      const mr = main.getBoundingClientRect();
      const boxRight = hr.width - (el.offsetLeft + el.offsetWidth);
      host.style.setProperty('--act-top', `${hr.height / 2 + el.offsetHeight / 2 + 24 - (mr.top - hr.top)}px`);
      host.style.setProperty('--act-right', `${boxRight - (hr.right - mr.right)}px`);
      host.style.setProperty('--act-w', `${el.offsetWidth}px`);
    };
    const raf = requestAnimationFrame(place);
    const ro = new ResizeObserver(place);
    ro.observe(el);
    ro.observe(host);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [host, me.data, rev]);
  useSwingAll(ref, `.${s.box}`, 0.8, `${on}|${serie}`);
  if (!me.data) return null;
  const e = predictEco(me.data, me.dataUpdatedAt, now);
  const fmt = (n: number) => Math.round(n).toLocaleString(locale(lang));
  const paid = serie !== 'Takoras';
  // chaque série a sa propre pity (Takoras et Bodako ne sont pas liées)
  const pityIn = Math.max(
    1,
    Number(paid ? ((me.data.pity_s as Record<string, number> | undefined)?.[serie] ?? 100) : (me.data.pity_in ?? 100)),
  );
  // deux paliers : ×10 au 50e tirage, ×25 au 100e ; la boîte montre le prochain
  const half = pityIn > 50,
    pityN = half ? pityIn - 50 : pityIn,
    pityM = half ? 10 : 25;
  // description du jeton révélé (français ou anglais) ; sans description, la boîte garde ses chiffres
  const lore = tok ? (LORE[tok.key]?.[lang === 'en' ? 1 : 0] ?? '') : '';
  const desc = rev && !!lore;
  const luckTxt = '×' + String(Math.round(e.luck * 100) / 100).replace('.', lang === 'en' ? '.' : ',');
  return (
    <div ref={ref} className={`${s.hud} ${shown ? s.on : ''} ${rev ? s.rev : ''}`} aria-hidden={!shown && !rev}>
      {/* à gauche : UNE seule boîte qui ne bouge jamais. Pendant l'ouverture : le prochain palier de chance ;
          à la révélation, son contenu se change sur place en logo, nom et chance du jeton (fondu, même taille) */}
      <div
        className={`${s.box} ${s.left} ${!rev && pityN <= 1 ? s.ready : ''}`}
        style={{ '--i': 0 } as React.CSSProperties}
      >
        <div className={s.layers}>
          <div className={`${s.layer} ${rev ? s.layerOff : ''}`} aria-hidden={rev}>
            <img
              data-depth
              className={`px ${s.big}`}
              src={pityM === 25 ? '/img/potions/luck-25.png' : '/img/potions/luck-10.png'}
              alt=""
            />
            <span data-depth className={s.col}>
              <small>{T.pity.replace('{m}', String(pityM))}</small>
              <b className={s.num}>{pityN <= 1 ? T.pityNow : T.pityIn.replace('{n}', fmt(pityN))}</b>
              <i className={s.bar}>
                <i style={{ width: `${((50 - pityN) / 50) * 100}%` }} />
              </i>
            </span>
          </div>
          <div className={`${s.layer} ${s.tok} ${rev ? '' : s.layerOff}`} aria-hidden={!rev}>
            {tok?.logo ? <img className={`px ${s.tokLogo}`} src={tok.logo} alt="" /> : null}
            <b className={s.tokName}>
              {tok?.name} <VTag v={tok?.variant} />
            </b>
            <span className={s.tokRar}>
              {tok?.odds}
              {tok?.luck ? <small className={s.tokLuck}> {tok.luck}</small> : null}
            </span>
          </div>
        </div>
      </div>
      {/* à droite, dans une seule boîte : ce qui permet d'ouvrir encore (tirages ou pièces), puis la chance */}
      <div
        ref={right}
        className={`${s.box} ${s.right} ${rev ? s.bump : ''}`}
        style={{ '--i': 1 } as React.CSSProperties}
      >
        <div className={s.layers}>
          <div className={`${s.layer} ${desc ? s.layerOff : ''}`} aria-hidden={!!desc}>
            {paid ? (
              <span data-depth className={s.row}>
                <img className="px" src="/img/coin.png" alt="" />
                <span className={s.col}>
                  <small>{T.coins}</small>
                  <b className={s.num}>
                    <Tween value={e.coins} ms={900} pow={4} format={fmt} />
                  </b>
                  <em>
                    {T.buy} : {fmt(Math.floor(e.coins / COIN_PULL.one))}
                  </em>
                </span>
              </span>
            ) : (
              <span data-depth className={s.row}>
                <img className="px" src="/img/tokens/takoras.png" alt="" />
                <span className={s.col}>
                  <small>{T.pulls}</small>
                  <b className={s.num}>
                    <Tween value={e.stock} format={fmt} />
                  </b>
                  <em>{e.full ? T.full : T.next.replace('{t}', mmss(e.nextIn))}</em>
                </span>
              </span>
            )}
            <hr className={s.sep} />
            <span data-depth className={s.row}>
              <img className="px" src="/img/potions/luck-10.png" alt="" />
              <span className={s.col}>
                <small>{T.luck}</small>
                <b className={`${s.num} ${e.luck > 1 ? s.lucky : ''}`}>{luckTxt}</b>
                {e.luck <= 1 ? <em>{T.none}</em> : null}
              </span>
            </span>
          </div>
          {/* jeton révélé : sa description, sur place (la boîte ne se répète plus) */}
          <div className={`${s.layer} ${s.desc} ${desc ? '' : s.layerOff}`} aria-hidden={!desc}>
            <p>{lore}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
