import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useSwing } from '@/ui/useSwing';
import { SerieName } from '@/ui/SerieName';
import { PULLS } from '@/engines/env';
import { useT } from '@/i18n/useT';
import { installOpeningHost } from '../eco/openPulls';
import { Actions } from './Actions';
import { PullPicker } from './PullPicker';
import { Live } from './Feeds';
import { BoardSection } from '../board/Board';
import { FallCoin, FallRain } from './FallStage';
import { Quests } from '../quests/Quests';
import { Starter } from '../starter/Starter';
import { useAuth } from '@/lib/auth';
import { useMe, useQuests } from '@/api/queries';
import { useStaggerIn } from '@/ui/useStaggerIn';
import { Landing } from '../landing/Landing';
import s from './Home.module.css';

// Accueil : le pull Takoras au centre, le choix de série à gauche, l'historique à droite, « En direct » en bas
export default function Home() {
  const t = useT();
  const [pi, setPi] = useState(0);
  const pull: { name: string; img: string; soon?: boolean } = PULLS[pi] ??
    PULLS[0] ?? { name: 'Takoras', img: '/img/jetons/takoras.png' };
  const user = useAuth((x) => x.user);
  const me = useMe();
  const admin = !!me.data?.admin; // Bodako : ouvrable par les admins seulement pour l'instant
  // les blocs attendent le compte et les quêtes, puis apparaissent l'un après l'autre (plus de saut au chargement)
  const quests = useQuests();
  const stageRef = useRef<HTMLDivElement>(null);
  // toute la page attend ensemble (« En direct » et le classement compris : ils sautaient quand le haut arrivait)
  const homeRef = useRef<HTMLDivElement>(null);
  useStaggerIn(
    homeRef,
    // comme les jetons de l'inventaire : chaque petite case arrive à son tour (quêtes, améliorations, séries…)
    `.${s.center} > *, .${s.sat}, .${s.sat} li, .${s.sat} button, .${s.up}, .${s.liveDiag}, .${s.boardBottom}`,
    !!user && !me.isPending && !quests.isPending,
  );
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
  // en local, « ?landing » affiche la page de présentation même connecté (pour la vérifier)
  if ((ready && !user) || (import.meta.env.DEV && new URLSearchParams(location.search).has('landing')))
    return <Landing />;
  return (
    <div ref={homeRef} className={s.homeRoot}>
      <FallRain serie={pull.name} />
      <div ref={stageRef} className={s.stage} onPointerMove={parallax} onPointerLeave={unParallax}>
        <div className={s.center} data-tour="pull">
          <FallCoin img={pull.img} label={pull.name} serie={pull.name} disabled={!!pull.soon && !admin} />
          <h1 className={s.title}>
            {/* juste le logo de la série, au centre (le mot « Tirage » reste lu par les lecteurs d'écran) */}
            <span className="visually-hidden">{t('ui.pull')} </span>
            {/* le logo saute et retombe en s'écrasant toutes les 5 s */}
            <FallingLogo name={pull.name} />
          </h1>
          <Actions serie={pull.name} />
        </div>
        {/* satellites : ils flottent autour du jeton, chacun à sa profondeur */}
        <Sat className={`${s.satPick}`}>
          <PullPicker value={pi} onChange={setPi} />
        </Sat>
        <Sat className={`${s.satQuests} ${s.stack}`}>
          <Starter />
          <Quests />
        </Sat>
      </div>
      {/* « En direct » : une bande en biais qui traverse tout l'écran */}
      <div className={s.liveDiag} data-rain-end>
        <Live />
      </div>
      {/* classement des tirages ouverts, sous « En direct » */}
      <div className={s.boardBottom}>
        <BoardSection kind="pulls" title={t('ui.k_pulls')} />
      </div>
    </div>
  );
}

// Satellite de l'accueil : il flotte, penche, et se balance comme un post-it épinglé quand on passe dessus
function Sat({ className, children }: { className: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useSwing(ref, 0.06); // balancement très léger : on doit pouvoir cliquer vite sans viser
  return (
    <div ref={ref} className={`${s.sat} ${className}`}>
      {children}
    </div>
  );
}

// Logo de la série : au changement, l'ancien tombe vers le bas et le nouveau arrive du haut en rebondissant
function FallingLogo({ name }: { name: string }) {
  const [shown, setShown] = useState(name);
  const [leaving, setLeaving] = useState<string | null>(null);
  if (name !== shown) {
    setLeaving(shown);
    setShown(name);
  }
  useEffect(() => {
    if (!leaving) return;
    const id = setTimeout(() => setLeaving(null), 650);
    return () => clearTimeout(id);
  }, [leaving]);
  return (
    <span className={s.logoBox}>
      {leaving ? (
        <span className={s.logoOut} aria-hidden>
          <SerieName name={leaving} h="1.5em" doodle />
        </span>
      ) : null}
      <span key={shown} className={s.logoLand}>
        <SerieName name={shown} h="1.5em" doodle />
      </span>
    </span>
  );
}
