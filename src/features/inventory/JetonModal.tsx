import { useEffect, useRef, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { StatIcon } from '@/ui/StatIcon';
import {
  hexRGB,
  jetonOf,
  MYSTERE,
  sellValue,
  texOf,
  texScale,
  tierCol,
  tierKey,
  vImg,
  vOdds,
  glowVars,
} from '@/data/jetons';
import { powerInfo, RING_MAX, ringStats } from '@/data/kit';
import { statsOf, STAT_MAX } from '@/engines/env';
import { useJn } from '@/lib/names';
import { locale, reducedFx, useSettings } from '@/lib/settings';
import { useT } from '@/i18n/useT';
import { Modal } from '@/ui/Modal';
import { VTag } from '@/ui/VTag';
import s from './Inventory.module.css';

// Fiche d'un jeton : en-tête (pièce qui penche sous le doigt, rareté, nom, chance), 3 chiffres clés
// (puissance, niveau, revente), les 3 stats, puis `children` (possession, variantes, combat, actions).
// `locked` = jamais trouvé : silhouette. `celebrate` : change de valeur à chaque montée de niveau (petite fête).
export function JetonModal({
  name,
  serie,
  variant = '',
  lvl = 1,
  locked,
  celebrate = 0,
  onClose,
  children,
}: {
  name: string | null;
  serie?: string;
  variant?: string;
  lvl?: number;
  locked?: boolean;
  celebrate?: number;
  onClose: () => void;
  children?: ReactNode;
}) {
  const t = useT();
  const jn = useJn();
  const lang = useSettings((x) => x.lang);
  const coin = useRef<HTMLDivElement>(null);
  const fmt = (n: number) => n.toLocaleString(locale(lang));
  const j = jetonOf(name ?? '', serie),
    st = statsOf(j.name, j.odds, variant, lvl),
    tier = tierKey(j.odds);
  // Montée de niveau : la pièce rebondit et « Niv. N » s'envole
  useEffect(() => {
    if (!celebrate || reducedFx()) return;
    {
      coin.current?.animate(
        [
          { transform: 'scale(1)' },
          { transform: 'scale(1.18) rotate(-6deg)', filter: 'brightness(1.6)' },
          { transform: 'scale(1)' },
        ],
        { duration: 620, easing: 'cubic-bezier(.2, 1.4, .4, 1)' },
      );
    }
  }, [celebrate]);
  const tilt = (e: PointerEvent) => {
    const c = coin.current;
    if (!c || reducedFx()) return;
    const r = c.getBoundingClientRect(),
      x = (e.clientX - r.left) / r.width - 0.5,
      y = (e.clientY - r.top) / r.height - 0.5;
    c.style.transform = `perspective(600px) rotateX(${(-y * 50).toFixed(1)}deg) rotateY(${(x * 50).toFixed(1)}deg) scale(1.05)`;
    c.style.setProperty('--mx', `${((x + 0.5) * 100).toFixed(1)}%`);
    c.style.setProperty('--my', `${((y + 0.5) * 100).toFixed(1)}%`);
    c.style.setProperty('--gl', '1');
  };
  const untilt = () => {
    coin.current?.style.removeProperty('transform');
    coin.current?.style.setProperty('--gl', '0');
  };
  return (
    <Modal open={!!name} onClose={onClose} wide noX>
      {name ? (
        <div
          className={s.jm}
          style={
            (locked
              ? { '--g': '113, 113, 122', '--tier': 'var(--muted)' }
              : { ...glowVars(j, variant), '--tier': tierCol(tier) }) as unknown as CSSProperties
          }
        >
          <header className={s.jmHero}>
            <div
              ref={coin}
              className={s.jmCoin}
              onPointerMove={tilt}
              onPointerLeave={untilt}
              style={texScale(j) !== 1 ? { scale: String(texScale(j)) } : undefined}
            >
              <img className={locked ? 'px' : vImg(variant)} src={locked ? MYSTERE : texOf(j)} alt="" />
              {locked ? null : (
                <i className={s.glare} style={{ maskImage: `url(${texOf(j)})`, WebkitMaskImage: `url(${texOf(j)})` }} />
              )}
            </div>
            {celebrate ? (
              <b key={celebrate} className={s.lvlPop} aria-hidden>
                {t('arena.lvl')} {lvl}
              </b>
            ) : null}
            <div className={s.jmId}>
              <h2>
                {locked ? '???' : jn(j.name)} <VTag v={variant} />
              </h2>
              {/* une seule chance combinée (jeton × mutation), ex. 1/1 200, jamais « 1/60 × 1/20 » */}
              <p className={s.odds}>{locked ? '1/?' : `1/${fmt(vOdds(j.odds, variant))}`}</p>
            </div>
          </header>
          {locked ? (
            <p className="muted">{t('ui.bst_unknown')}</p>
          ) : (
            <div className={s.jmBody}>
              <dl className={s.facts}>
                <div>
                  <dt>{t('ui.power')}</dt>
                  <dd className={s.pow}>{fmt(st.power)}</dd>
                </div>
                <div>
                  <dt>{t('ui.sell_value')}</dt>
                  <dd>
                    {fmt(sellValue(j.odds, variant))}{' '}
                    <img className={`px ${s.coin}`} src="/img/piece.png" alt="" width={16} height={16} />
                  </dd>
                </div>
              </dl>
              <dl className={s.stats}>
                {(['s_mass', 's_pow', 's_size'] as const).map((k) => (
                  <div key={k}>
                    <dt className="muted">{t(`ui.${k}`)}</dt>
                    <dd>
                      <span className={s.bar}>
                        <i style={{ width: `${Math.min(100, (st[k] / STAT_MAX[k]) * 100)}%` }} />
                      </span>
                      <b>{st[k]}</b>
                    </dd>
                  </div>
                ))}
              </dl>
              {children}
            </div>
          )}
        </div>
      ) : null}
    </Modal>
  );
}

// Combat : pouvoir et stats du Ring
export function CombatInfo({
  name,
  lvl,
  variant = '',
  stats,
  children,
}: {
  name: string;
  lvl: number;
  variant?: string;
  stats?: boolean;
  showLvl?: boolean;
  children?: ReactNode;
}) {
  const t = useT();
  const lang = useSettings((x) => x.lang);
  const k = powerInfo(name, lang),
    rs = ringStats(name, lvl, variant);
  const fmt = (n: number) => n.toLocaleString(locale(lang));
  const rows = [
    ['mass', t('ring.mass'), rs.mass, RING_MAX.mass, rs.mass.toFixed(2)],
    ['power', t('ring.powerS'), rs.power, RING_MAX.power, fmt(Math.round(rs.power))],
    ['size', t('ring.size'), rs.r, RING_MAX.r, String(rs.r)],
  ] as const;
  return (
    <section className={s.combat} style={{ '--pw': hexRGB(k.col) } as CSSProperties} aria-label={t('ui.nav_combat')}>
      <header>
        <span>{t('ring.power')}</span>
      </header>
      {k.pw !== 'none' ? (
        <div className={s.kit}>
          <small>
            {t('ring.power')}
            {k.when ? ` · ${k.when}` : ''}
          </small>
          <b>{k.name}</b>
          <p>{k.desc}</p>
        </div>
      ) : null}
      {stats ? (
        <dl className={s.rs}>
          {rows.map(([ico, l, v, max, txt]) => (
            <div key={l}>
              <dt>
                <StatIcon k={ico} /> {l}
              </dt>
              <dd>
                <span className={s.bar}>
                  <i style={{ width: `${Math.min(100, (v / max) * 100)}%` }} />
                </span>
                <b>{txt}</b>
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      {children}
    </section>
  );
}
