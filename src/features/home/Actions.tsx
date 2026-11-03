import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { MYSTERE } from '@/data/jetons';
import { COIN_PULL } from '@/engines/env';
import { useQueryClient } from '@tanstack/react-query';
import { ecoApi, errorText } from '@/api';
import { useAuth } from '@/lib/auth';
import { useMe } from '@/api/queries';
import { locale, useSettings } from '@/lib/settings';
import { useT } from '@/i18n/useT';
import { sfx } from '@/engines/sound.js';
import { openUI } from '@/app/ui-store';
import { Button } from '@/ui/Button';
import { toast } from '@/ui/toast';
import { MAX_OPEN, mmss, nextMax, regenCost, TOP_MAX, upgradeCost, useEco } from '../eco/eco';
import { openPulls } from '../eco/openPulls';
import { openInfo } from '../info/store';
import { Effects } from './Effects';
import s from './Home.module.css';

const Coin = () => <img className="px" src="/img/piece.png" alt="" width={16} height={16} />;

// Stock de pulls, boutons d'ouverture et améliorations (stock max, recharge)
export function Actions({ serie = 'Takoras' }: { serie?: string } = {}) {
  const t = useT();
  const user = useAuth((x) => x.user);
  const e = useEco();
  const me = useMe();
  const lang = useSettings((x) => x.lang);
  // série payée en pièces (Bodako) : pas de stock de tirages, on achète 1 ou 10 tirages
  const coin = serie !== 'Takoras';
  const admin = !!me.data?.admin;
  const info = (
    <button type="button" className={s.info} onClick={openInfo}>
      {t('ui.odds_info')}
    </button>
  );
  if (!user)
    return (
      <div className={s.actions}>
        <Button variant="primary" size="lg" onClick={() => openUI('account')}>
          {t('ui.acc_login_to_open')}
        </Button>
        {info}
      </div>
    );
  if (!e)
    return (
      <div className={s.stock} aria-busy>
        …
      </div>
    );
  return (
    <div className={s.actions}>
      {/* le compteur de tirages tombe quand on passe sur une série payée en pièces, et revient au retour */}
      <DropSwap k={coin ? 'coin' : 'stock'}>
        {coin ? (
          <div className={s.stock} role="status">
            <span className={s.coinPrice}>
              <img className="px" src="/img/piece.png" alt="" width={28} height={28} />
              {COIN_PULL.one.toLocaleString(locale(lang))}
            </span>
            <span className="muted">{t('ui.coin_pull_each')}</span>
          </div>
        ) : (
          <div className={s.stock} role="status">
            <b className={s.stockN}>{e.stock}</b>
            <span className={s.stockMax}>/{e.max}</span>
            <span className="muted">
              {t('ui.pulls_word')} · {e.full ? t('ui.stock_full') : t('ui.plus1_in', { t: mmss(e.nextIn) })}
            </span>
          </div>
        )}
      </DropSwap>
      {/* les boutons aussi : les anciens tombent, les nouveaux (avec le prix) arrivent du haut */}
      <DropSwap k={coin ? 'coin' : 'stock'}>
        <div className={s.row}>
          {/* Ouvrir 1 : un jeton « ? » qui flotte, fait un tour au survol ; le bouton s'écrase au clic */}
          <button
            type="button"
            className={s.openOne}
            disabled={coin ? !admin || e.coins < COIN_PULL.one : !e.stock}
            onClick={() => void openPulls(1, serie)}
            data-nosound
          >
            <span className={s.openTok} aria-hidden>
              <img className="px" src={MYSTERE} alt="" width={40} height={40} />
            </span>
            <span>{coin ? `${t('ui.open1')} · ${COIN_PULL.one.toLocaleString(locale(lang))}` : t('ui.open1')}</span>
          </button>
          {/* Tout ouvrir : une pile de jetons qui s'étale en éventail au survol */}
          <button
            type="button"
            className={s.openAll}
            disabled={coin ? !admin || e.coins < COIN_PULL.ten : e.stock < 2}
            onClick={() => void openPulls(coin ? 10 : 'all', serie)}
            data-nosound
          >
            <span className={s.fan} aria-hidden>
              {[0, 1, 2].map((i) => (
                <img
                  key={i}
                  className="px"
                  src={MYSTERE}
                  alt=""
                  width={30}
                  height={30}
                  style={{ '--i': i } as CSSProperties}
                />
              ))}
            </span>
            <span>
              {coin
                ? `${t('ui.open_n', { n: 10 })} · ${COIN_PULL.ten.toLocaleString(locale(lang))}`
                : t('ui.open_all', { n: Math.min(e.stock, MAX_OPEN) })}
            </span>
          </button>
        </div>
      </DropSwap>
      {coin && !admin ? <p className={s.soonNote}>{t('ui.serie_open_soon')}</p> : null}
      {/* stock max et recharge ne servent qu'à la série Takoras (tirages gratuits) : juste sous les boutons,
          et ils tombent et disparaissent quand on choisit une série payée en pièces */}
      <DropSwap k={coin ? 'coin' : 'stock'}>{coin ? <span /> : <Upgrades />}</DropSwap>
      <Effects />
      {info}
    </div>
  );
}

// Améliorations (stock max, recharge) : sous les boutons sur petit écran, dans la colonne de gauche sur grand écran
export function Upgrades() {
  const t = useT();
  const lang = useSettings((x) => x.lang);
  const user = useAuth((x) => x.user);
  const e = useEco();
  const qc = useQueryClient();
  const upBusy = useRef(false);
  if (!user || !e) return null;
  const n = (v: number) => v.toLocaleString(locale(lang));
  const upCost = upgradeCost(nextMax(e.max)),
    rgCost = regenCost(e.regen - 10);
  // une amélioration à la fois (spammer le bouton envoyait plusieurs achats et un message d'erreur bizarre),
  // et pas de message en cas de réussite : la tuile change, c'est suffisant
  const upgrade = async (kind: 'stock' | 'regen') => {
    if (upBusy.current) return;
    upBusy.current = true;
    try {
      const st = kind === 'stock' ? await ecoApi.upgradeStock() : await ecoApi.upgradeRegen();
      sfx.upgrade();
      qc.setQueryData(['me', user.id], st);
    } catch (err) {
      sfx.deny();
      const code = String((err as { message?: string })?.message ?? '');
      if (!/rate|max_reached/.test(code)) toast(errorText(err, lang), true);
    } finally {
      upBusy.current = false;
    }
  };
  return (
    <div className={s.ups} aria-label={t('ui.upgrades')} role="group">
      <Up
        icon="/img/objets/recharge.png"
        title={t('ui.up_stock')}
        now={String(e.max)}
        next={e.max < TOP_MAX ? String(nextMax(e.max)) : null}
        pct={(e.max - 5) / (TOP_MAX - 5)}
        top={t('ui.stock_top', { n: TOP_MAX })}
        cost={upCost}
        coins={e.coins}
        fmt={n}
        onUp={() => void upgrade('stock')}
      />
      <Up
        icon="/img/objets/sablier.png"
        title={t('ui.up_regen')}
        now={mmss(e.regen * 1000)}
        next={e.regen > 60 ? mmss((e.regen - 10) * 1000) : null}
        pct={(180 - e.regen) / 120}
        top={t('ui.regen_top')}
        cost={rgCost}
        coins={e.coins}
        fmt={n}
        onUp={() => void upgrade('regen')}
      />
    </div>
  );
}

// Une amélioration : icône, valeur actuelle → suivante, barre jusqu'au max, bouton avec le prix (il brille quand on peut payer)
function Up(p: {
  icon: string;
  title: string;
  now: string;
  next: string | null;
  pct: number;
  top: string;
  cost: number;
  coins: number;
  fmt: (n: number) => string;
  onUp: () => void;
}) {
  const can = !!p.next && p.coins >= p.cost;
  return (
    <div className={`${s.up} ${can ? s.upCan : ''}`}>
      <img className="px" src={p.icon} alt="" width={40} height={40} />
      <div className={s.upBody}>
        <b>{p.title}</b>
        <span className={s.upVal}>
          {p.now}
          {p.next ? (
            <>
              {' '}
              → <em>{p.next}</em>
            </>
          ) : null}
        </span>
        <span className={s.upBar}>
          <i style={{ width: `${Math.max(3, Math.min(100, p.pct * 100))}%` }} />
        </span>
      </div>
      {p.next ? (
        <Button size="sm" variant={can ? 'primary' : undefined} disabled={!can} onClick={p.onUp}>
          {p.fmt(p.cost)} <Coin />
        </Button>
      ) : (
        <small className="muted">{p.top}</small>
      )}
    </div>
  );
}

// Remplace un bloc par un autre en le faisant tomber : l'ancien part vers le bas, le nouveau arrive du haut
function DropSwap({ k, children }: { k: string; children: ReactNode }) {
  // « anim » reste vrai pour le bloc arrivé par un échange : sa classe ne change plus jamais pendant son animation
  const [cur, setCur] = useState({ k, node: children, anim: false });
  const [old, setOld] = useState<{ k: string; node: ReactNode } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  if (k !== cur.k) {
    setOld(cur);
    setCur({ k, node: children, anim: true });
  } else if (children !== cur.node) setCur({ ...cur, node: children });
  useEffect(() => {
    if (!old) return;
    const id = setTimeout(() => setOld(null), 600);
    return () => clearTimeout(id);
  }, [old]);
  // la hauteur suit le nouveau bloc en glissant : ce qui est en dessous descend ou remonte doucement (pas de saut)
  useLayoutEffect(() => {
    const b = box.current,
      i = inner.current;
    if (!b || !i) return;
    const sync = () => {
      b.style.height = `${i.offsetHeight}px`;
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(i);
    return () => ro.disconnect();
  }, [cur.k]);
  return (
    <div ref={box} className={s.swap}>
      {old ? (
        <div key={old.k} className={s.swapOut} aria-hidden>
          {old.node}
        </div>
      ) : null}
      <div ref={inner} key={cur.k} className={cur.anim ? s.swapIn : undefined}>
        {cur.node}
      </div>
    </div>
  );
}
