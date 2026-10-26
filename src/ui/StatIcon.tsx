import s from './StatIcon.module.css';

// Logos des stats du Ring : puissance (éclat) et taille (cible) en pixel art ; le poids garde la balance
export type StatKey = 'mass' | 'power' | 'size';
const IMG: Partial<Record<StatKey, string>> = { power: '/img/stats/puissance.png', size: '/img/stats/taille.png' };
export function StatIcon({ k }: { k: StatKey }) {
  const src = IMG[k];
  return src ? (
    <img className={s.ico} src={src} alt="" aria-hidden width={16} height={16} />
  ) : (
    // poids : petit sac de lest (en attendant son dessin pixel art)
    <svg
      className={s.ico}
      viewBox="0 0 16 16"
      width={16}
      height={16}
      fill="currentColor"
      aria-hidden
      shapeRendering="crispEdges"
    >
      <path d="M6 2h4v2h2l2 10H2L4 4h2z" />
    </svg>
  );
}
