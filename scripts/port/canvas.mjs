// Porte les moteurs d'affichage canvas de l'ancien site en modules, sans réécrire leur logique :
// en-tête d'imports (src/engines/env.ts) + exports à la fin. Le Ring et ses effets (ring-ui + ring-fx)
// se référencent l'un l'autre : ils forment un seul module.
// Usage : node scripts/port/canvas.mjs
import fs from 'node:fs';

const read = (f) => fs.readFileSync(`legacy/${f}`, 'utf8').trimEnd();
const head = (from, imports) => `// Généré par scripts/port/canvas.mjs depuis ${from} — ne pas modifier ici, modifier legacy/ puis relancer.\n${imports}\n\n`;

const MODULES = [
  {
    out: 'ring.js',
    from: 'legacy/ring-ui.js + legacy/ring-fx.js',
    imports: "import { RCFG } from './ring-config.js';\nimport { RG } from './ring-engine.js';\nimport { SETTINGS, esc, fmt, hexRGB, jetonOf, jn, jnH, reducedFx, sfx, texOf, vCls, vTag, t, at } from './env';\nimport './legacy-base.css';\nimport './ring.css';",
    body: read('ring-ui.js') + '\n\n' + read('ring-fx.js'),
    exports: 'export { startRing, closeRing, startRingTuto, ringTutoSeen, powerText, ringStatsHTML, PW_COL, RT, rt, RNG, RFX, RSND };',
  },
  {
    out: 'cinema.js',
    from: 'legacy/cinema.js',
    imports: "import { SERIES, sfx, speed, texOf, t } from './env';\nimport './cinema.css';",
    body: read('cinema.js'),
    exports: 'export { CINE };',
  },
  {
    out: 'motion.js',
    from: 'legacy/motion.js',
    imports: "import { reducedFx } from './env';\nimport './motion.css';",
    body: read('motion.js'),
    exports: 'export { MO, moDissolve, moEmit, moSnap, moPlay };',
  },
];
// polices du canvas : nom des polices hébergées par le nouveau site
const fonts = (b) => b.replace(/"Space Grotesk"/g, '"Space Grotesk Variable"').replace(/"Inter"/g, '"Inter Variable"');
for (const m of MODULES) fs.writeFileSync(`src/engines/${m.out}`, head(m.from, m.imports) + fonts(m.body) + '\n\n' + m.exports + '\n');
console.log('ok', MODULES.map((m) => m.out).join(', '));
