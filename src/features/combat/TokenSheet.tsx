import type { CSSProperties } from 'react';
import { glowVars, jetonOf, texOf, tierCol, tierKey, vImg } from '@/data/jetons';
import { LEVEL_MAX, powerInfo, RING_MAX, ringStats } from '@/data/kit';
import { useJn } from '@/lib/names';
import { useSettings } from '@/lib/settings';
import { useT } from '@/i18n/useT';
import { Button } from '@/ui/Button';
import { Modal } from '@/ui/Modal';
import { MutationStamp } from '@/ui/MutationStamp';
import { StatIcon } from '@/ui/StatIcon';
import { PowerDemo } from './PowerDemo';
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
}: {
  name: string;
  serie?: string;
  variant?: string;
  lvl: number;
  onClose: () => void;
  action?: { label: string; onClick: () => void; primary?: boolean };
}) {
  const t = useT();
  const jn = useJn();
  const lang = useSettings((x) => x.lang);
  const j = jetonOf(name, serie),
    tier = tierKey(j.odds),
    k = powerInfo(name, lang),
    rs = ringStats(name, lvl, variant);
  const stats = [
    ['mass', t('ring.mass'), rs.mass, RING_MAX.mass, rs.mass.toFixed(2), '#60a5fa'],
    ['power', t('ring.powerS'), rs.power, RING_MAX.power, String(Math.round(rs.power)), '#fb923c'],
    ['size', t('ring.size'), rs.r, RING_MAX.r, String(rs.r), '#4ade80'],
  ] as const;
  return (
    <Modal open onClose={onClose} title={jn(name)} wide>
      <div className={s.sheet} style={glowVars(j, variant) as CSSProperties}>
        <section className={s.stats} aria-label={t('ui.stats_note')}>
          <span className={s.tier} style={{ color: tierCol(tier) }}>
            {t(`ui.${tier}`)}
          </span>
          <b className={s.lvl}>
            {t('arena.lvl')} {lvl}/{LEVEL_MAX}
          </b>
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
        <div className={s.stage}>
          <img className={vImg(variant)} src={texOf(j)} alt="" />
          <span className={s.pedestal} aria-hidden />
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
