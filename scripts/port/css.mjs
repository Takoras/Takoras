// Extrait de legacy/style.css les règles d'un écran (par préfixe de classe), avec leurs @media et les @keyframes
// qu'elles utilisent. Usage : node scripts/port/css.mjs
import fs from 'node:fs';
import postcss from 'postcss';
import safe from 'postcss-safe-parser'; // l'ancien style.css a une accolade en trop (ligne 116) : les navigateurs l'ignorent, on fait pareil

const OUT = [
  ['src/engines/ring.css', /\.(rg|rs)(-|\b)/],
  ['src/engines/cinema.css', /\.cine(-|\b)|\.cinema\b/],
  ['src/engines/motion.css', /\.mo-fx\b/],
  ['src/engines/opening.css', /\.(opening|op-[a-z-]+|fx|dust|rc(-[a-z]+)?|jeton|v-pop|stat)\b/],
  // classes communes de l'ancien site encore utilisées par le HTML des moteurs (boutons, étiquettes de variante)
  ['src/engines/legacy-base.css', /^\.btn\b|^\.vtag\b|^\.v-(gold|celeste|ombre)\b|^img\.v-|^\.v-(gold|celeste|ombre) img/],
];
const root = safe(fs.readFileSync('legacy/style.css', 'utf8'));
const keyframes = new Map();
root.walkAtRules('keyframes', (k) => keyframes.set(k.params, k));
for (const [file, rx] of OUT) {
  const out = postcss.root();
  const used = new Set();
  root.each((node) => {
    const keep = (rule) => rule.type === 'rule' && rule.selectors.some((s) => rx.test(s));
    if (keep(node)) out.append(node.clone());
    else if (node.type === 'atrule' && node.name === 'media') {
      const m = node.clone({ nodes: [] });
      node.each((r) => keep(r) && m.append(r.clone()));
      if (m.nodes.length) out.append(m);
    }
  });
  out.walkDecls(/^animation(-name)?$/, (d) => d.value.split(/[\s,]+/).forEach((w) => keyframes.has(w) && used.add(w)));
  for (const k of used) out.append(keyframes.get(k).clone());
  // polices : le nouveau site les héberge sous leur nom « Variable » (voir src/styles/tokens.css)
  out.walkDecls(/^font(-family)?$/, (d) => { d.value = d.value.replace(/"Space Grotesk"/g, 'var(--font-display)').replace(/"Inter"(, *sans-serif)?/g, 'var(--font-body)'); });
  fs.writeFileSync(file, `/* Généré par scripts/port/css.mjs depuis legacy/style.css — ne pas modifier ici. */\n${out.toString()}\n`);
  console.log(file, out.nodes.length, 'blocs,', used.size, 'animations');
}
