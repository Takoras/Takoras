// Port des dictionnaires FR/EN de l'ancien site (legacy/*.js) vers src/i18n/{fr,en}.ts.
// Analyse le JS avec le compilateur TypeScript (pas de regex) et évalue uniquement les littéraux d'objets.
// Usage : node scripts/port/i18n.mjs
import ts from 'typescript';
import fs from 'node:fs';

const SOURCES = [
  ['legacy/settings.js', 'I18N', 'ui'],
  ['legacy/arena.js', 'AT', 'arena'],
  ['legacy/ring-ui.js', 'RT', 'ring'],
  ['legacy/info.js', 'INFO', 'info'],
  ['legacy/tuto.js', 'TUTO', 'tuto'],
];
function literal(file, name) {
  const src = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true);
  let found = null;
  const visit = (n) => {
    if (ts.isVariableDeclaration(n) && n.name.getText() === name && n.initializer) found = n.initializer;
    if (!found) ts.forEachChild(n, visit);
  };
  visit(sf);
  if (!found) throw new Error(`${name} introuvable dans ${file}`);
  return Function(`"use strict"; return (${found.getText()});`)();
}
const out = { fr: {}, en: {} };
for (const [file, name, ns] of SOURCES) {
  const obj = literal(file, name);
  for (const lang of ['fr', 'en']) {
    if (!obj[lang]) throw new Error(`${name}.${lang} manquant`);
    out[lang][ns] = obj[lang];
  }
}
out.fr.names = {};
out.en.names = literal('legacy/settings.js', 'JETON_EN');
// Contrôle : mêmes clés en FR et en EN (récursif)
const keys = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' && !Array.isArray(v) ? keys(v, p + k + '.') : [p + k]));
const fr = new Set(keys(out.fr)), en = new Set(keys(out.en));
const onlyFr = [...fr].filter((k) => !en.has(k) && !k.startsWith('names.'));
const onlyEn = [...en].filter((k) => !fr.has(k) && !k.startsWith('names.'));
fs.mkdirSync('src/i18n', { recursive: true });
const head = '// Généré par scripts/port/i18n.mjs depuis l\'ancien site, puis maintenu à la main.\n';
fs.writeFileSync('src/i18n/fr.ts', head + 'export const fr = ' + JSON.stringify(out.fr, null, 2) + ' as const;\n');
fs.writeFileSync('src/i18n/en.ts', head + "import type { Dict } from './types';\n\nexport const en: Dict = " + JSON.stringify(out.en, null, 2) + ';\n');
console.log(JSON.stringify({ fr: fr.size, en: en.size, onlyFr, onlyEn }, null, 1));
