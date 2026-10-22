import { useRef, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import {
  hexRGB,
  jetonOf,
  tierCol,
  vImg,
  sellValue,
  texOf,
  texScale,
  tierKey,
  vOdds,
  VARIANTS,
  type Variant,
} from '@/data/jetons';
import { ELS, elOf, LEVEL_MAX, powerInfo, RING_MAX, ringStats } from '@/data/kit';
import { statsOf, STAT_MAX } from '@/engines/env';
import { useJn } from '@/lib/names';
import { locale, reducedFx, useSettings } from '@/lib/settings';
import { useT } from '@/i18n/useT';
import { Modal } from '@/ui/Modal';
import { VTag } from '@/ui/VTag';
import s from './Inventory.module.css';

// Fiche d'un jeton : grande pièce qui penche sous le doigt, rareté, puissance, stats, valeur de revente.
// `locked` = jamais trouvé : silhouette. `children` = infos et actions en plus (inventaire, profil…).
export function JetonModal({
  name,
  serie,
  variant = '',
  lvl = 1,
  locked,
  onClose,
  children,
}: {
  name: string | null;
  serie?: string;
  variant?: string;
  lvl?: number;
  locked?: boolean;
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
    <Modal open={!!name} onClose={onClose} wide>
      {name ? (
        <div className={s.jm} style={{ '--g': hexRGB(j.glow) } as CSSProperties}>
          <div
            ref={coin}
            className={s.jmCoin}
            onPointerMove={tilt}
            onPointerLeave={untilt}
            style={texScale(j) !== 1 ? { scale: String(texScale(j)) } : undefined}
          >
            <img className={`${vImg(variant)} ${locked ? s.sil : ''}`} src={texOf(j)} alt="" />
            {locked ? null : (
              <i className={s.glare} style={{ maskImage: `url(${texOf(j)})`, WebkitMaskImage: `url(${texOf(j)})` }} />
            )}
          </div>
          <div className={s.jmInfo}>
            <span className={s.tier} style={{ color: tierCol(tier) }}>
              {t(`ui.${tier}`)}
            </span>
            <h2>
              {locked ? '???' : jn(j.name)} <VTag v={variant} />
              {st.lvl > 1 ? (
                <small className={s.lvl}>
                  {' '}
                  {t('arena.lvl')} {st.lvl}
                </small>
              ) : null}
            </h2>
            <p className={s.odds}>
              1/{fmt(j.odds)}
              {variant ? (
                <small className="muted">
                  {' '}
                  × {t(`ui.v_${variant as Variant}`)} 1/{fmt(VARIANTS[variant as Variant].odds)} = 1/
                  {fmt(vOdds(j.odds, variant))}
                </small>
              ) : null}
            </p>
            <p className="muted">
              {t('ui.power')} <b className={s.pow}>{fmt(st.power)}</b>
            </p>
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
            <p>
              {t('ui.sell_value')} : <b>{fmt(sellValue(j.odds, variant))}</b>{' '}
              <img className={`px ${s.coin}`} src="/img/piece.png" alt="" width={14} height={14} />
            </p>
            {children}
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

// Combat : élément, pouvoir, stats du Ring et niveau (avec le bouton pour monter de niveau)
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
  children?: ReactNode;
}) {
  const t = useT();
  const lang = useSettings((x) => x.lang);
  const el = elOf(name),
    E = ELS[el],
    k = powerInfo(name, lang),
    rs = ringStats(name, lvl, variant);
  const fmt = (n: number) => n.toLocaleString(locale(lang));
  const rows = [
    ['⚖️', t('ring.mass'), rs.mass, RING_MAX.mass, rs.mass.toFixed(2)],
    ['💥', t('ring.powerS'), rs.power, RING_MAX.power, fmt(Math.round(rs.power))],
    ['⭕', t('ring.size'), rs.r, RING_MAX.r, String(rs.r)],
  ] as const;
  return (
    <section
      className={s.combat}
      style={{ '--el': E.col, '--pw': hexRGB(k.col) } as CSSProperties}
      aria-label={t('ui.nav_combat')}
    >
      <header>
        <span>
          {E.ico} {E[lang]}
        </span>
        <b>
          {t('arena.lvl')} {lvl}/{LEVEL_MAX}
        </b>
      </header>
      {k.pw !== 'none' ? (
        <div className={s.kit}>
          <small>
            ✦ {t('ring.power')}
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
                {ico} {l}
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
