import type { CSSProperties } from 'react';
import { glowVars, jetonOf, texOf, tierCol, tierKey, vImg } from '@/data/jetons';
import { useJn } from '@/lib/names';
import { useT } from '@/i18n/useT';
import { Modal } from '@/ui/Modal';
import { VTag } from '@/ui/VTag';
import { CombatInfo } from '../inventory/JetonModal';
import s from './Combat.module.css';

// Fiche complète d'un jeton pour le combat : rareté, élément, niveau, coût, pouvoir et stats du Ring
export function TokenSheet({
  name,
  serie,
  variant = '',
  lvl,
  onClose,
}: {
  name: string;
  serie?: string;
  variant?: string;
  lvl: number;
  onClose: () => void;
}) {
  const t = useT();
  const jn = useJn();
  const j = jetonOf(name, serie),
    tier = tierKey(j.odds);
  return (
    <Modal open onClose={onClose} title={jn(name)}>
      <div className={s.sheet} style={glowVars(j, variant) as CSSProperties}>
        <div className={s.sheetTop}>
          <div className={s.sheetImg}>
            <img className={vImg(variant)} src={texOf(j)} alt="" />
          </div>
          <div>
            <span className={s.tier} style={{ color: tierCol(tier) }}>
              {t(`ui.${tier}`)}
            </span>
            <p className={s.sheetName}>
              {jn(name)} <VTag v={variant} />
            </p>
          </div>
        </div>
        <CombatInfo name={name} lvl={lvl} variant={variant} stats />
      </div>
    </Modal>
  );
}
