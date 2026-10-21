// Extrait le catalogue des jetons (SERIES, opening.js) de l'ancien site vers src/data/series.json.
// Usage : node scripts/port/data.mjs
import ts from 'typescript';
import fs from 'node:fs';

function literal(file, name) {
  const sf = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  let found;
  const visit = (n) => {
    if (ts.isVariableDeclaration(n) && n.name.getText() === name && n.initializer) found = n.initializer;
    if (!found) ts.forEachChild(n, visit);
  };
  visit(sf);
  if (!found) throw new Error(`${name} introuvable dans ${file}`);
  return Function(`"use strict"; return (${found.getText()});`)();
}
const series = literal('legacy/opening.js', 'SERIES');
// chemins d'images absolus (le site React a des URL /inventaire/…, un chemin relatif casserait)
for (const list of Object.values(series)) for (const j of list) if (j.img) j.img = '/' + j.img.replace(/^\//, '');
fs.writeFileSync('src/data/series.json', JSON.stringify(series, null, 2) + '\n');
console.log(Object.fromEntries(Object.entries(series).map(([k, v]) => [k, v.length])));
