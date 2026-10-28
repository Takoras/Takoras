import type { CSSProperties, ReactNode } from 'react';
import { glowVars, jetonOf, texOf, vImg, vOdds, type Variant } from '@/data/jetons';
import { powerInfo, RING_MAX, ringStats } from '@/data/kit';
import { useJn } from '@/lib/names';
import { locale, useSettings } from '@/lib/settings';
import { useT } from '@/i18n/useT';
import { Button } from '@/ui/Button';
import { Modal } from '@/ui/Modal';
import { MutationStamp } from '@/ui/MutationStamp';
import { StatIcon } from '@/ui/StatIcon';
import { PowerDemo } from './PowerDemo';
import { STAT_COL } from '../inventory/JetonModal';
import js from '../inventory/JetonSheet.module.css';
import s from './TokenSheet.module.css';

// Grande fiche d'un jeton : stats à gauche, le jeton sur son socle au centre, son pouvoir expliqué à droite
// avec une démo en boucle (la « vidéo d'exemple », jouée par le vrai moteur du Ring).
export function TokenSheet({
  name,
  serie,
  variant = '',
  lvl,
  onClose,
  action,
  extra,
}: {
  name: string;
  serie?: string;
  variant?: string;
  lvl: number;
  onClose: () => void;
  action?: { label: string; onClick: () => void; primary?: boolean };
  extra?: ReactNode;
}) {
  const t = useT();
  const jn = useJn();
  const lang = useSettings((x) => x.lang);
  const j = jetonOf(name, serie),
    k = powerInfo(name, lang),
    rs = ringStats(name, lvl, variant);
  const stats = [
    ['mass', t('ring.mass'), rs.mass, RING_MAX.mass, rs.mass.toFixed(2), `rgb(${STAT_COL.mass})`],
    ['power', t('ring.powerS'), rs.power, RING_MAX.power, String(Math.round(rs.power)), `rgb(${STAT_COL.power})`],
    ['size', t('ring.size'), rs.r, RING_MAX.r, String(rs.r), `rgb(${STAT_COL.size})`],
  ] as const;
  return (
    <Modal open onClose={onClose} title={jn(name)} wide>
      <div className={s.sheet} style={{ ...glowVars(j, variant), '--ga': 1 } as CSSProperties}>
        <section className={s.stats} aria-label={t('ui.stats_note')}>
          <span className={s.tier}>
            1/{vOdds(j.odds, variant as Variant).toLocaleString(locale(lang))}
          </span>
          {stats.map(([key, label, v, max, txt, col]) => (
            <div key={key} className={s.stat}>
              <span>
                <StatIcon k={key} /> {label} <b>{txt}</b>
              </span>
              <i style={{ '--c': col } as CSSProperties}>
                <b style={{ width: `${Math.min(100, (v / max) * 100)}%` }} />
              </i>
            </div>
          ))}
        </section>
        {/* le jeton vivant, comme dans l'inventaire : rayons qui tournent, halo qui respire, étincelles, il flotte */}
        <div className={s.stage}>
          <i className={js.rays} aria-hidden />
          <i className={js.aura} aria-hidden />
          <span className={js.sparks} aria-hidden>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <i key={i} />
            ))}
          </span>
          <img className={`${vImg(variant)} ${s.float}`} src={texOf(j)} alt="" />
          <i className={js.floor} aria-hidden />
          {variant ? (
            <span className={s.mut}>
              <MutationStamp v={variant} size="md" />
            </span>
          ) : null}
        </div>
        <section className={s.power} aria-label={t('ring.power')}>
          <h3 style={{ color: k.col }}>{k.name}</h3>
          {k.when ? <small>{k.when}</small> : null}
          <p>{k.desc}</p>
          <PowerDemo name={name} />
        </section>
      </div>
      {extra}
      {action ? (
        <div className={s.foot}>
          <Button variant={action.primary ? 'primary' : 'ghost'} onClick={action.onClick}>
            {action.label}
          </Button>
        </div>
      ) : null}
    </Modal>
  );
}
