import { useEffect, useState } from 'react';
import { PULLS } from '@/engines/env';
import { useT } from '@/i18n/useT';
import { installOpeningHost } from '../eco/openPulls';
import { Actions } from './Actions';
import { AutoConfig } from './AutoConfig';
import { PullPicker } from './PullPicker';
import { Live } from './Feeds';
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
            {t('ui.pull')} {pull.name}
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
        </div>
      </div>
      <Live />
    </>
  );
}
