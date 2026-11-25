import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { COIN_PULL } from '@/engines/env';
import { useAuth } from '@/lib/auth';
import { useMe } from '@/api/queries';
import { locale, useSettings } from '@/lib/settings';
import { useT } from '@/i18n/useT';
import { openUI } from '@/app/ui-store';
import { Button } from '@/ui/Button';
import { mmss, useEco } from '../eco/eco';
import { openPulls } from '../eco/openPulls';
import { openInfo } from '../info/store';
import { Effects } from './Effects';
import { useSwing } from '@/ui/useSwing';
import s from './Home.module.css';
import { Bump } from '@/ui/motion';
import { Tween } from '@/ui/Tween';

// Stock de pulls (1 toutes les 10 s, 500 max) et boutons d'ouverture
export function Actions({ serie = 'Takoras' }: { serie?: string } = {}) {
  const t = useT();
  const user = useAuth((x) => x.user);
  const e = useEco();
  const me = useMe();
  const lang = useSettings((x) => x.lang);
  // série payée en pièces (Bodako) : pas de stock de tirages, on achète 1 ou 10 tirages
  const coin = serie !== 'Takoras';
  // séries payées en pièces : admins et testeurs pour l'instant
  const canCoin = !!(me.data?.admin || me.data?.tester);
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
              <img className="px" src="/img/coin.png" alt="" width={28} height={28} />
              {COIN_PULL.one.toLocaleString(locale(lang))}
            </span>
            <span className="muted">{t('ui.coin_pull_each')}</span>
          </div>
        ) : (
          <div className={s.stock} role="status">
            <Bump as="b" v={e.stock} className={s.stockN}>
              <Tween value={e.stock} ms={350} format={(v) => String(Math.round(v))} />
            </Bump>
            <Bump v={e.max} className={s.stockMax}>
              /{e.max}
            </Bump>
            <span className="muted">
              {t('ui.pulls_word')} · {e.full ? t('ui.stock_full') : t('ui.plus1_in', { t: mmss(e.nextIn) })}
            </span>
          </div>
        )}
      </DropSwap>
      {/* les boutons aussi : les anciens tombent, les nouveaux (avec le prix) arrivent du haut */}
      <DropSwap k={coin ? 'coin' : 'stock'}>
        {coin ? (
          // série payée en pièces : un seul bouton Ouvrir 1, le prix sur sa propre ligne (rien n'est coupé)
          <Float className={s.rowOne} tilt={-1.5} fl={5.5}>
            <button
              type="button"
              className={s.openOne}
              disabled={!canCoin || e.coins < COIN_PULL.one}
              onClick={() => void openPulls(1, serie)}
              data-nosound
            >
              <span className={s.openLbl}>{t('ui.open1')}</span>
              <span className={s.openPrice}>
                <img className="px" src="/img/coin.png" alt="" width={18} height={18} />
                {COIN_PULL.one.toLocaleString(locale(lang))}
              </span>
            </button>
          </Float>
        ) : (
          // Takoras : un seul bouton ; spammer le jeton fait défiler l'ouverture très vite
          <Float className={s.rowOne} tilt={-1.5} fl={5.5}>
            <button
              type="button"
              className={s.openOne}
              disabled={!e.stock}
              onClick={() => void openPulls(1, serie)}
              data-nosound
            >
              <span className={s.openLbl}>{t('ui.open1')}</span>
            </button>
          </Float>
        )}
      </DropSwap>
      {coin && !canCoin ? <p className={s.soonNote}>{t('ui.serie_open_soon')}</p> : null}
      {/* stock max et recharge ne servent qu'à la série Takoras (tirages gratuits) : juste sous les boutons,
          et ils tombent et disparaissent quand on choisit une série payée en pièces */}
      <Effects />
      {info}
    </div>
  );
}

// Bloc qui flotte doucement et se balance un peu au passage de la souris (comme les satellites de l'accueil)
function Float({
  className,
  tilt,
  fl,
  children,
}: {
  className?: string;
  tilt: number;
  fl: number;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useSwing(ref, 0.1);
  return (
    <div
      ref={ref}
      className={`${className ?? ''} ${s.float}`}
      style={{ '--tilt': `${tilt}deg`, '--fl': `${fl}s` } as React.CSSProperties}
    >
      {children}
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
