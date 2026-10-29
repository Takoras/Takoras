import { useEffect, useState } from 'react';
import { SerieName } from '@/ui/SerieName';
import { PULLS } from '@/engines/env';
import { useT } from '@/i18n/useT';
import { installOpeningHost } from '../eco/openPulls';
import { Actions, Upgrades } from './Actions';
import { AutoConfig } from './AutoConfig';
import { PullPicker } from './PullPicker';
import { Live } from './Feeds';
import { BoardSection } from '../board/Board';
import { HeroCoin } from './HeroCoin';
import { Quests } from '../quests/Quests';
import { Starter } from '../starter/Starter';
import { useAuth } from '@/lib/auth';
import { Landing } from '../landing/Landing';
import s from './Home.module.css';

// Accueil : le pull Takoras au centre, l'ouverture auto à gauche, l'historique à droite, « En direct » en bas
export default function Home() {
  const t = useT();
  const [pi, setPi] = useState(0);
  const pull = PULLS[pi] ?? PULLS[0] ?? { name: 'Takoras', img: '/img/jetons/takoras.png' };
  const user = useAuth((x) => x.user);
  const ready = useAuth((x) => x.ready);
  useEffect(installOpeningHost, []);
  // visiteur (pas connecté) : la page de présentation
  if (ready && !user) return <Landing />;
  return (
    <>
      <div className={s.stage}>
        <div className={s.center} data-tour="pull">
          <HeroCoin img={pull.img} label={pull.name} />
          <h1 className={s.title}>
            {/* juste le logo de la série, au centre (le mot « Tirage » reste lu par les lecteurs d'écran) */}
            <span className="visually-hidden">{t('ui.pull')} </span>
            <SerieName name={pull.name} h="1.5em" doodle />
          </h1>
          <Actions />
        </div>
        <div className={`${s.side} ${s.stack}`}>
          <Starter />
          <Quests />
        </div>
        <div className={`${s.side} ${s.stack}`}>
          <PullPicker value={pi} onChange={setPi} />
          <AutoConfig />
          <div className={s.upsSide}>
            <Upgrades />
          </div>
        </div>
      </div>
      <Live />
      {/* classement des tirages ouverts, sous « En direct » */}
      <div className={s.boardBottom}>
        <BoardSection kind="pulls" title={t('ui.k_pulls')} />
      </div>
    </>
  );
}
