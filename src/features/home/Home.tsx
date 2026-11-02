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
import { FallCoin, FallRain } from './FallStage';
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
  // la souris donne de la profondeur : les satellites glissent un peu à l'opposé (variables CSS, pas de rendu React)
  const parallax = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--px', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
    e.currentTarget.style.setProperty('--py', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
  };
  const unParallax = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.style.setProperty('--px', '0');
    e.currentTarget.style.setProperty('--py', '0');
  };
  // visiteur (pas connecté) : la page de présentation
  if (ready && !user) return <Landing />;
  return (
    <>
      <FallRain serie={pull.name} />
      <div className={s.stage} onPointerMove={parallax} onPointerLeave={unParallax}>
        <div className={s.center} data-tour="pull">
          <FallCoin img={pull.img} label={pull.name} />
          <h1 className={s.title}>
            {/* juste le logo de la série, au centre (le mot « Tirage » reste lu par les lecteurs d'écran) */}
            <span className="visually-hidden">{t('ui.pull')} </span>
            <SerieName name={pull.name} h="1.5em" doodle />
          </h1>
          <Actions />
        </div>
        {/* satellites : ils flottent autour du jeton, chacun à sa profondeur */}
        <div className={`${s.sat} ${s.satPick}`}>
          <PullPicker value={pi} onChange={setPi} />
        </div>
        <div className={`${s.sat} ${s.satAuto}`}>
          <AutoConfig />
        </div>
        <div className={`${s.sat} ${s.satUps} ${s.upsSide}`}>
          <Upgrades />
        </div>
        <div className={`${s.sat} ${s.satQuests} ${s.stack}`}>
          <Starter />
          <Quests />
        </div>
      </div>
      {/* « En direct » : une bande en biais qui traverse tout l'écran */}
      <div className={s.liveDiag}>
        <Live />
      </div>
      {/* classement des tirages ouverts, sous « En direct » */}
      <div className={s.boardBottom}>
        <BoardSection kind="pulls" title={t('ui.k_pulls')} />
      </div>
    </>
  );
}
