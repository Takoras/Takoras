// Copie les moteurs déterministes de l'ancien site dans src/engines/ SANS LES MODIFIER :
// on ajoute seulement une ligne d'import en tête et une ligne d'export à la fin.
// Usage : node scripts/port/engines.mjs (à relancer si legacy/ change ; le test de rejeu vérifie l'identité)
import fs from 'node:fs';

// ring-config.js et ring-engine.js ne sont plus copiés (phase 8 : maps, obstacles, 30 s par tour).
// Sans map, le moteur reste identique à l'ancien : le test de rejeu (replay.test.ts) le vérifie.
const FILES = [
  ['combat-engine.js', "import { RG } from './ring-engine.js';", 'export { CB };'],
];
for (const [f, imp, exp] of FILES) {
  const src = fs.readFileSync(`legacy/${f}`, 'utf8');
  const head = `// Généré par scripts/port/engines.mjs depuis legacy/${f} — ne pas modifier ici, modifier legacy/ puis relancer.\n${imp ? imp + '\n' : ''}`;
  fs.writeFileSync(`src/engines/${f}`, head + src.trimEnd() + '\n\n' + exp + '\n');
}
console.log('ok', FILES.length);
