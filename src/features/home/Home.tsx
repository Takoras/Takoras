import { useEffect } from 'react';
import { PULLS } from '@/engines/env';
import { useT } from '@/i18n/useT';
import { installOpeningHost } from '../eco/openPulls';
import { Actions } from './Actions';
import { AutoConfig } from './AutoConfig';
import { History, Live } from './Feeds';
import { HeroCoin } from './HeroCoin';
import s from './Home.module.css';

// Accueil : le pull Takoras au centre, l'ouverture auto à gauche, l'historique à droite, « En direct » en bas
export default function Home() {
  const t = useT();
  const pull = PULLS[0] ?? { name: 'Takoras', img: '/img/jetons/takoras.png' };
  useEffect(installOpeningHost, []);
  return (
    <>
      <div className={s.stage}>
        <div className={s.center}>
          <HeroCoin img={pull.img} label={pull.name} />
          <p className="eyebrow">{t('ui.permanent')}</p>
          <h1 className={s.title}>{t('ui.pull')} {pull.name}</h1>
          <Actions />
        </div>
        <div className={s.side}>
          <History />
        </div>
        <div className={s.side}>
          <AutoConfig />
        </div>
      </div>
      <Live />
    </>
  );
}
