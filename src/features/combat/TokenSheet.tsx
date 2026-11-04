import type { CSSProperties, ReactNode } from 'react';
import { glowVars, jetonOf, texOf, vImg, vOdds, type Variant } from '@/data/jetons';
import { useJn } from '@/lib/names';
import { Button } from '@/ui/Button';
import { Modal } from '@/ui/Modal';
import { MutationStamp } from '@/ui/MutationStamp';
import { PowerDemo } from './PowerDemo';
import { TokenId, TokenStats } from '@/ui/TokenCards';
import js from '../inventory/JetonSheet.module.css';
import s from './TokenSheet.module.css';

// Grande fiche d'un jeton (mêmes fiches que la révélation du tirage) : identité à gauche, le jeton sur son socle
// au centre, stats + pouvoir à droite avec une démo en boucle (la « vidéo d'exemple », jouée par le vrai moteur du Ring).
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
  const jn = useJn();
  const j = jetonOf(name, serie);
  return (
    <Modal open onClose={onClose} wide>
      <div className={s.sheet} style={{ ...glowVars(j, variant), '--ga': 1 } as CSSProperties}>
        {/* même fiche que la révélation du tirage : logo de la série, nom, chance */}
        <TokenId
          className={s.idc}
          serie={serie ?? 'Takoras'}
          name={jn(name)}
          odds={vOdds(j.odds, variant as Variant)}
        />
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
        {/* même fiche que la révélation du tirage : stats en barres, capacité, puis la démo du pouvoir */}
        <TokenStats className={s.stc} name={name} odds={j.odds} variant={variant} lvl={lvl}>
          <PowerDemo name={name} />
        </TokenStats>
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
