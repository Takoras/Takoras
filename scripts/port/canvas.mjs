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
  {
    // Écran d'ouverture des pulls : son HTML (repris de legacy/index.html) est ajouté au premier import,
    // puis transitions.js et opening.js tels quels. Ce qui touchait au reste du site passe par les crochets `host`.
    out: 'opening.js',
    from: 'legacy/transitions.js + legacy/opening.js (+ HTML de legacy/index.html)',
    imports: [
      "import { $, ACC, LOCALE, PULLS, SETTINGS, STAT_MAX, VARIANTS, errText, fmt, fmtLuck, jn, jnH, reducedFx, saveSettings, sb, sfx, sparkStyle, speed, statsOf, t, toast, vCls, vOdds, vTag, host } from './env';",
      "import { CINE } from './cinema.js';",
      "import './legacy-base.css';",
      "import './opening.css';",
      '',
      '// Crochets vers React (économie, historique, admin)',
      'const openPulls = (n) => host.openPulls(n);',
      'const applyState = (st) => host.applyState(st);',
      'const ecoDecorate = () => host.ecoDecorate();',
      'const accRecordPull = (j, serie) => host.accRecordPull(j, serie);',
      'const loadLocalHist = () => host.loadLocalHist();',
      'const renderHist = () => host.renderHist();',
      'const toggleAdmin = () => host.toggleAdmin();',
      'let current = 0; // un seul type de pull',
      '// Le jeton héros de l’accueil sert de point de départ à la transition ; ailleurs, un point invisible au centre',
      'const heroCoin = () => document.getElementById(\'coin\') ?? (document.getElementById(\'coin-fallback\') ?? document.body.appendChild(Object.assign(document.createElement(\'div\'), { id: \'coin-fallback\', style: \'position:fixed;left:50%;top:42%;width:1px;height:1px;visibility:hidden\' })));',
      'const select = (i) => { current = i; };',
      '',
      '// HTML de l’écran (textes traduits au passage)',
      'if (!document.getElementById(\'opening\')) {',
      '  document.body.insertAdjacentHTML(\'beforeend\', ' + JSON.stringify(markup()) + ');',
      '  document.querySelectorAll(\'#opening [data-i18n]\').forEach((el) => { el.textContent = t(el.dataset.i18n); });',
      '}',
    ].join('\n'),
    // les écouteurs posés sur des éléments absents (panel admin « Tests », réglages d'accueil) ne doivent pas planter
    body: (read('transitions.js') + '\n\n' + read('opening.js')).replace(/\$\('([a-z0-9-]+)'\)\.addEventListener\(/g, "$('$1')?.addEventListener(").replaceAll("$('coin')", 'heroCoin()'),
    exports: 'export { buy, leave, canClose, startOpening, closeOpening, renderAutoCfg, renderDebug, debug, sess };',
  },
];
// HTML de l'écran d'ouverture dans l'ancien index.html (de #opening jusqu'à #fx inclus)
function markup() {
  const html = fs.readFileSync('legacy/index.html', 'utf8');
  const a = html.indexOf('<div class="opening" id="opening"'), b = html.indexOf('<div class="ann-full"');
  return html.slice(a, b).trim().replace(/(src|href)="img\//g, '$1="/img/');
}
// polices du canvas : nom des polices hébergées par le nouveau site
const fonts = (b) => b.replace(/(['"`])img\//g, '$1/img/').replace(/"Space Grotesk"/g, '"Space Grotesk Variable"').replace(/"Inter"/g, '"Inter Variable"');
for (const m of MODULES) fs.writeFileSync(`src/engines/${m.out}`, head(m.from, m.imports) + fonts(m.body) + '\n\n' + m.exports + '\n');
console.log('ok', MODULES.map((m) => m.out).join(', '));
