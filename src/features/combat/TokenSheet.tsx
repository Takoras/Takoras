import type { CSSProperties } from 'react';
import { hexRGB, jetonOf, texOf, tierCol, tierKey, vImg } from '@/data/jetons';
import { ELS, elOf } from '@/data/kit';
import { useJn } from '@/lib/names';
import { useSettings } from '@/lib/settings';
import { useT } from '@/i18n/useT';
import { Modal } from '@/ui/Modal';
import { VTag } from '@/ui/VTag';
import { CombatInfo } from '../inventory/JetonModal';
import { costOf } from './team';
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
  const lang = useSettings((x) => x.lang);
  const j = jetonOf(name, serie),
    el = ELS[elOf(name)],
    tier = tierKey(j.odds);
  return (
    <Modal open onClose={onClose} title={jn(name)}>
      <div className={s.sheet} style={{ '--g': hexRGB(j.glow), '--el': el.col } as CSSProperties}>
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
            <div className={s.chips}>
              <span style={{ color: el.col }}>
                {el.ico} {el[lang]}
              </span>
              <span>{t('arena.cost', { n: costOf(j.odds) })}</span>
            </div>
          </div>
        </div>
        <CombatInfo name={name} lvl={lvl} variant={variant} stats />
      </div>
    </Modal>
  );
}
