import s from './StatIcon.module.css';

// Logos des stats du Ring : puissance (éclat) et taille (cible) en pixel art ; le poids garde la balance
export type StatKey = 'mass' | 'power' | 'size';
const IMG: Partial<Record<StatKey, string>> = { power: '/img/stats/puissance.png', size: '/img/stats/taille.png' };
export function StatIcon({ k }: { k: StatKey }) {
  const src = IMG[k];
  return src ? (
    <img className={s.ico} src={src} alt="" aria-hidden width={16} height={16} />
  ) : (
    <span aria-hidden>⚖️</span>
  );
}
