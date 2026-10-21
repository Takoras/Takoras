// Liste les variables globales utilisées par un fichier de l'ancien site (pour le porter en module).
// Usage : node scripts/port/globals.mjs legacy/ring-ui.js …
import ts from 'typescript';
import fs from 'node:fs';
const builtins = new Set(Object.getOwnPropertyNames(globalThis).concat(['window', 'document', 'navigator', 'location', 'localStorage', 'performance', 'requestAnimationFrame', 'cancelAnimationFrame', 'Image', 'addEventListener', 'removeEventListener', 'innerWidth', 'innerHeight', 'devicePixelRatio', 'matchMedia', 'getComputedStyle', 'confirm', 'history', 'AudioContext', 'console', 'structuredClone', 'visualViewport', 'arguments']));
for (const f of process.argv.slice(2)) {
  const sf = ts.createSourceFile(f, fs.readFileSync(f, 'utf8'), ts.ScriptTarget.Latest, true);
  const declared = new Set(), used = new Set();
  const visit = (n) => {
    if ((ts.isVariableDeclaration(n) || ts.isFunctionDeclaration(n) || ts.isParameter(n)) && n.name && ts.isIdentifier(n.name)) declared.add(n.name.text);
    if (ts.isBindingElement(n) && ts.isIdentifier(n.name)) declared.add(n.name.text);
    if (ts.isIdentifier(n)) {
      const p = n.parent;
      const prop = (ts.isPropertyAccessExpression(p) && p.name === n) || (ts.isPropertyAssignment(p) && p.name === n) || (ts.isMethodDeclaration(p) && p.name === n) || (ts.isBindingElement(p) && p.propertyName === n);
      if (!prop) used.add(n.text);
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  console.log(f.split('/').pop() + ':', [...used].filter((x) => !declared.has(x) && !builtins.has(x)).sort().join(' '));
}
