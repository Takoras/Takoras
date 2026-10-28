import { useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { StatIcon } from '@/ui/StatIcon';
import { hexRGB, jetonOf, MYSTERE, texOf, texScale, vImg, vOdds, glowVars, type Variant } from '@/data/jetons';
import { powerInfo, RING_MAX, ringStats } from '@/data/kit';
import { useJn } from '@/lib/names';
import { locale, reducedFx, useSettings } from '@/lib/settings';
import { useT } from '@/i18n/useT';
import { Modal } from '@/ui/Modal';
import s from './JetonSheet.module.css';

const VS = ['gold', 'celeste', 'ombre'] as const;

// Fiche d'un jeton, façon vitrine : le jeton en grand au centre (aura qui tourne, étincelles, il penche sous le doigt),
// son nom et ce que tu en as à gauche, son pouvoir à droite, et les 3 tampons de mutation en dessous
// (grisés si pas encore trouvés ; toucher un tampon trouvé montre le jeton dans cette mutation).
// `facts` : petites lignes sous le nom (« Tu en as 4 »…). `children` : les boutons en bas (vendre…).
// `pick` : au lieu de seulement montrer, toucher un tampon le CHOISIT (vitrine du profil).
export function JetonModal({
  name,
  serie,
  variant = '',
  locked,
  found,
  facts,
  pick,
  onClose,
  children,
}: {
  name: string | null;
  serie?: string;
  variant?: string;
  locked?: boolean;
  found?: Partial<Record<string, boolean | number>>;
  facts?: ReactNode;
  pick?: (v: string) => void;
  onClose: () => void;
  children?: ReactNode;
}) {
  const t = useT();
  const jn = useJn();
  const lang = useSettings((x) => x.lang);
  const coin = useRef<HTMLDivElement>(null);
  // mutation montrée : celle du jeton, ou celle du tampon touché (pour ce jeton seulement)
  const [over, setOver] = useState<{ n: string | null; v: string } | null>(null);
  const pv = over && over.n === name ? over.v : variant;
  const setPv = (v: string) => setOver({ n: name, v });
  const fmt = (n: number) => n.toLocaleString(locale(lang));
  const j = jetonOf(name ?? '', serie);
  const k = powerInfo(j.name, lang),
    rs = ringStats(j.name, 1, pv);
  const tilt = (e: PointerEvent) => {
    const c = coin.current;
    if (!c || reducedFx()) return;
    const r = c.getBoundingClientRect(),
      x = (e.clientX - r.left) / r.width - 0.5,
      y = (e.clientY - r.top) / r.height - 0.5;
    c.style.transform = `perspective(600px) rotateX(${(-y * 40).toFixed(1)}deg) rotateY(${(x * 40).toFixed(1)}deg) scale(1.04)`;
    c.style.setProperty('--mx', `${((x + 0.5) * 100).toFixed(1)}%`);
    c.style.setProperty('--my', `${((y + 0.5) * 100).toFixed(1)}%`);
    c.style.setProperty('--gl', '1');
  };
  const untilt = () => {
    coin.current?.style.removeProperty('transform');
    coin.current?.style.setProperty('--gl', '0');
  };
  const stats = [
    ['mass', t('ring.mass'), rs.mass, RING_MAX.mass, rs.mass.toFixed(2)],
    ['power', t('ring.powerS'), rs.power, RING_MAX.power, fmt(Math.round(rs.power))],
    ['size', t('ring.size'), rs.r, RING_MAX.r, String(rs.r)],
  ] as const;
  const vars = (locked
    ? { '--g': '113, 113, 122', '--ga': 0 }
    : {
        ...glowVars(j, pv),
        '--ga': 1,
        '--pw': hexRGB(k.col),
        ...(pv ? { '--g': VCOL[pv as Variant] } : {}),
      }) as unknown as CSSProperties;
  return (
    <Modal open={!!name} onClose={onClose} wide noX>
      {name ? (
        <div className={s.sheet} style={vars}>
          <div className={s.stage}>
            <div className={s.id}>
              <h2>{locked ? '???' : jn(j.name)}</h2>
              <p className={s.odds}>{locked ? '1/?' : `1/${fmt(vOdds(j.odds, pv))}`}</p>
              {facts && !locked ? <ul className={s.facts}>{facts}</ul> : null}
            </div>
            <div className={s.center}>
              <i className={s.rays} aria-hidden />
              <i className={s.aura} aria-hidden />
              {locked ? null : (
                <span className={s.sparks} aria-hidden>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <i key={i} />
                  ))}
                </span>
              )}
              <div
                ref={coin}
                className={s.coin}
                onPointerMove={tilt}
                onPointerLeave={untilt}
                style={texScale(j) !== 1 ? { scale: String(texScale(j)) } : undefined}
              >
                <img
                  className={locked ? 'px' : vImg(pv)}
                  src={locked ? MYSTERE : texOf(j)}
                  alt={locked ? '' : jn(j.name)}
                />
                {locked ? null : (
                  <i
                    className={s.glare}
                    style={{ maskImage: `url(${texOf(j)})`, WebkitMaskImage: `url(${texOf(j)})` }}
                  />
                )}
              </div>
              <i className={s.floor} aria-hidden />
              {locked ? null : (
                <div className={s.stamps} role="group" aria-label={t('ui.bst_variants')}>
                  {VS.map((v) => {
                    const has = pick ? found?.[v] !== false && found?.[v] !== 0 : !!found?.[v];
                    return (
                      <button
                        key={v}
                        type="button"
                        className={`${s.stamp} ${has ? '' : s.off}`}
                        aria-pressed={pv === v}
                        disabled={!has}
                        title={t(`ui.v_${v}`)}
                        aria-label={t(`ui.v_${v}`)}
                        onClick={() => {
                          const nv = pv === v ? '' : v;
                          setPv(nv);
                          pick?.(nv);
                        }}
                      >
                        <span style={{ backgroundImage: `url(/img/stamps/${v}.png)` }} />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            {locked ? (
              <p className={`muted ${s.unknown}`}>{t('ui.bst_unknown')}</p>
            ) : (
              <div className={s.power}>
                {k.pw !== 'none' ? (
                  <>
                    <small>{k.when}</small>
                    <b>{k.name}</b>
                    <p>{k.desc}</p>
                  </>
                ) : null}
                <dl className={s.rs}>
                  {stats.map(([ico, l, v, max, txt]) => (
                    <div key={l} title={l} style={{ '--sc': STAT_COL[ico] } as CSSProperties}>
                      <dt>
                        <StatIcon k={ico} />
                        <span>{l}</span>
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
              </div>
            )}
          </div>
          {children ? <div className={s.actions}>{children}</div> : null}
        </div>
      ) : null}
    </Modal>
  );
}

// Une couleur par stat (même code partout : fiche, éditeur d'équipe)
export const STAT_COL = { mass: '96, 165, 250', power: '251, 113, 133', size: '74, 222, 128' } as const;

// Couleur de l'aura selon la mutation montrée
const VCOL: Record<Variant, string> = { gold: '250, 204, 21', celeste: '186, 200, 255', ombre: '139, 92, 246' };
