import { RG } from '@/engines/ring-engine.js';
import s from './PowerDemo.module.css';

// « Vidéo d'exemple » du pouvoir : une vraie partie filmée dans le combat (tous les effets), qui tourne en boucle.
// Les vidéos sont dans /video/pw/<pouvoir>.webm (refaites avec : RECORD=1 npx playwright test zz-recordlab --project=lab).
export function PowerDemo({ name }: { name: string }) {
  const pw = RG.kit(name).pw;
  if (!pw || pw === 'none') return null;
  const still = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  return (
    <video
      key={pw}
      className={s.demo}
      src={`/video/pw/${pw}.webm`}
      autoPlay={!still}
      controls={still}
      loop
      muted
      playsInline
      preload="metadata"
      aria-hidden={!still}
      width={240}
      height={240}
    />
  );
}
