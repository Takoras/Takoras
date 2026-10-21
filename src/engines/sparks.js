// Étincelles en pixel art (repris tel quel de legacy/settings.js).
const SPARK_SHAPES = [
  ['...X...', '...X...', '..XoX..', 'XXXoXXX', '..XoX..', '...X...', '...X...'], // étoile à 4 branches
  ['..X..', '.XoX.', 'XoooX', '.XoX.', '..X..'],                                     // losange
  ['.X.', 'XoX', '.X.'],                                                             // petite croix
  ['X...X', '.X.X.', '..o..', '.X.X.', 'X...X'],                                     // éclat en X
];
const sparkCache = {};
function sparkURL(color, k) {
  const key = color + k;
  if (sparkCache[key]) return sparkCache[key];
  const rows = SPARK_SHAPES[k], c = document.createElement('canvas');
  c.width = rows[0].length; c.height = rows.length;
  const x = c.getContext('2d');
  rows.forEach((row, y) => [...row].forEach((ch, i) => { if (ch === '.') return; x.fillStyle = ch === 'o' ? '#fff' : color; x.fillRect(i, y, 1, 1); }));
  return (sparkCache[key] = c.toDataURL());
}
// Style d'une étincelle : forme au hasard, taille = nb de pixels × taille d'un pixel
function sparkStyle(color, px = 2 + Math.floor(Math.random() * 2)) {
  const k = Math.floor(Math.random() * SPARK_SHAPES.length), n = SPARK_SHAPES[k][0].length * px;
  return `width:${n}px;height:${n}px;background:url(${sparkURL(color, k)}) center / 100% 100% no-repeat;image-rendering:pixelated`;
}

export { sparkStyle, sparkURL };
