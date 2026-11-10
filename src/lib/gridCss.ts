import { GRID } from '@/data/jetons';

// Dessins de jetons sur la grille 80×80 : partout, l'image est affichée 80/64 fois plus grande que sa case, pour que le
// CORPS du jeton garde la même taille (le vide autour déborde, il est transparent). La variable --ts vaut cette échelle :
// une règle qui agrandit un jeton au survol doit faire « scale: calc(1.1 * var(--ts, 1)) ».
// (Le jeton 3D de l'ouverture et la fiche s'agrandissent en entier : exclus ici.) Spécificité nulle (:where) : toute
// règle de page peut la compléter.
export function installGridCss() {
  const css = `img:where([src*="/img/jetons/serie-"]):not(:where(.spin img, .jm-coin img)){--ts:${GRID / 64};scale:var(--ts)}`;
  document.head.appendChild(Object.assign(document.createElement('style'), { textContent: css }));
}
