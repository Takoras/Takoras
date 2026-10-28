// Échelle du site (posée par public/phone.js sur <html> en --z, appliquée à #root) :
// les positions mesurées à l'écran (getBoundingClientRect) sont en pixels d'écran ; pour placer un élément
// DANS le site (qui est à l'échelle), on les divise par cette échelle.
export const zoomOf = () =>
  parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--z')) || 1;
