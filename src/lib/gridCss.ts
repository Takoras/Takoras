import { SERIES, texScale } from '@/data/jetons';

// Jetons dessinés sur une grille plus grande que 64 (Néphéris : 74, pour que son animation déborde) :
// on agrandit l'image partout pour que le CORPS du jeton ait la même taille que les autres.
// (Le jeton 3D de l'ouverture et la fiche s'agrandissent déjà en entier : exclus ici.)
export function installGridCss() {
  const css = Object.values(SERIES)
    .flat()
    .filter((j) => j.img && texScale(j) !== 1)
    .map((j) => `img[src$="${j.img?.split('/').pop() ?? ''}"]:not(.spin img):not(.jm-coin img){scale:${texScale(j)}}`)
    .join('');
  if (css) document.head.appendChild(Object.assign(document.createElement('style'), { textContent: css }));
}
