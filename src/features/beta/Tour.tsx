import { zoomOf } from '@/lib/zoom';
import { useEffect, useLayoutEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { sfx } from '@/engines/sound.js';
import { useSettings } from '@/lib/settings';
import { Button } from '@/ui/Button';
import s from './Tour.module.css';

// Visite guidée de la première visite : elle t'emmène vite fait sur chaque page et montre la partie importante
// (mise en lumière + petite bulle), puis te laisse découvrir le reste tout seul.
type Step = { to: string; sel: string; fr: [string, string]; en: [string, string] };
const STEPS: Step[] = [
  {
    to: '/',
    sel: '[data-tour="pull"]',
    fr: ['Ton tirage', 'Ouvre des tirages pour trouver des jetons. Ils se rechargent tout seuls avec le temps.'],
    en: ['Your pull', 'Open pulls to find tokens. They refill by themselves over time.'],
  },
  {
    to: '/',
    sel: '[data-tour="pick"]',
    fr: ['Les tirages', 'Choisis quelle série ouvrir. D’autres arrivent bientôt.'],
    en: ['Pulls', 'Pick which series to open. More are coming soon.'],
  },
  {
    to: '/inventaire',
    sel: '[data-tour="inv"]',
    fr: ['Ta collection', 'Tous tes jetons, par série. Touche-en un pour voir sa fiche.'],
    en: ['Your collection', 'All your tokens, by series. Tap one to see its card.'],
  },
  {
    to: '/combat',
    sel: '[data-tour="fight"]',
    fr: ['Le combat', 'Choisis 3 jetons et affronte les autres joueurs en classé.'],
    en: ['Fights', 'Pick 3 tokens and fight other players in ranked.'],
  },
  {
    to: '/passe',
    sel: '[data-tour="pass"]',
    fr: ['Le passe', 'Gagne de l’XP en jouant et récupère une récompense à chaque palier.'],
    en: ['The pass', 'Earn XP by playing and claim a reward at every tier.'],
  },
  {
    to: '/',
    sel: '[data-tour="pull"]',
    fr: ['À toi de jouer !', 'Le reste, tu le découvres en jouant. Bonne chance pour ton premier gros jeton !'],
    en: ['Your turn!', 'Find out the rest by playing. Good luck with your first big token!'],
  },
];

export function Tour({ onDone }: { onDone: () => void }) {
  const nav = useNavigate();
  const lang = useSettings((x) => x.lang);
  const [i, setI] = useState(0);
  const [rawBox, setBox] = useState<DOMRect | null>(null);
  const st = (STEPS[i] ?? STEPS[0]) as Step;
  useEffect(() => {
    void nav(st.to);
  }, [i, nav, st.to]);
  // on retrouve la zone à montrer (la page peut mettre un peu de temps à s'afficher)
  useLayoutEffect(() => {
    let n = 0,
      raf = 0;
    const find = () => {
      const el = document.querySelector<HTMLElement>(st.sel);
      if (el) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        setTimeout(() => setBox(el.getBoundingClientRect()), 350);
      } else if (n++ < 60) raf = requestAnimationFrame(find);
      else setBox(null);
    };
    find();
    const re = () => {
      const el = document.querySelector<HTMLElement>(st.sel);
      if (el) setBox(el.getBoundingClientRect());
    };
    addEventListener('resize', re);
    addEventListener('scroll', re, true);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener('resize', re);
      removeEventListener('scroll', re, true);
    };
  }, [st.sel, i]);
  const [title, text] = lang === 'en' ? st.en : st.fr;
  // le site est à l'échelle (--z) : mesures d'écran → pixels du site
  const z = zoomOf(),
    W = innerWidth / z,
    H = innerHeight / z;
  const box = rawBox
    ? { left: rawBox.left / z, top: rawBox.top / z, width: rawBox.width / z, height: rawBox.height / z, bottom: rawBox.bottom / z }
    : null;
  const last = i === STEPS.length - 1;
  const pad = 10;
  // la bulle se met sous la zone, ou au-dessus si elle est trop bas
  const below = !box || box.bottom + 220 < H;
  // toujours dans l'écran : sous la zone, sinon au-dessus, sinon en bas de l'écran (zone très haute)
  const want = box ? (below ? box.bottom + pad + 14 : box.top - pad - 14 - 210) : 0;
  const bubble = box
    ? {
        left: Math.max(16, Math.min(W - 336, box.left + box.width / 2 - 160)),
        top: Math.max(16, Math.min(H - 230, want)),
      }
    : { left: W / 2 - 160, top: H / 2 - 80 };
  return (
    <div className={s.tour} role="dialog" aria-modal="true" aria-label={title}>
      {box ? (
        <div
          className={s.hole}
          style={{ left: box.left - pad, top: box.top - pad, width: box.width + pad * 2, height: box.height + pad * 2 }}
        />
      ) : (
        <div className={s.dim} />
      )}
      <div className={s.bubble} style={bubble}>
        <small>
          {i + 1} / {STEPS.length}
        </small>
        <b>{title}</b>
        <p>{text}</p>
        <div className={s.acts}>
          {last ? null : (
            <Button size="sm" onClick={onDone}>
              {lang === 'en' ? 'Skip' : 'Passer'}
            </Button>
          )}
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              sfx.click();
              if (last) onDone();
              else {
                setBox(null);
                setI(i + 1);
              }
            }}
          >
            {last ? (lang === 'en' ? 'Let’s go!' : 'C’est parti !') : lang === 'en' ? 'Next' : 'Suivant'}
          </Button>
        </div>
      </div>
    </div>
  );
}
