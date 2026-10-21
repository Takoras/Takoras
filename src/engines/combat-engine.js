// Généré par scripts/port/engines.mjs depuis legacy/combat-engine.js — ne pas modifier ici, modifier legacy/ puis relancer.
import { RG } from './ring-engine.js';
// Éléments des jetons (couleur, filtres) et stats affichées. Voir docs/COMBAT.md.
// Les stats viennent de ring-config.js (RCFG) via ring-engine.js (RG).

const CB = (() => {
  // ---------- Éléments
  const EL = {
    'Mobu': 'water', 'Pikko': 'plant', 'Rouillé': 'fire', 'Givre': 'water', 'Soléo': 'fire', 'Azura': 'water', 'Carmin': 'fire',
    'Vyolis': 'shadow', 'Lumis': 'plant', 'Nyx': 'shadow', 'Astra': 'light', 'Kraïos': 'water', 'Koi': 'fire', 'Néphéris': 'plant',
    'Zénith': 'light', 'Oblivion': 'shadow', 'Takoras': 'light',
  };
  const BEATS = { fire: 'plant', plant: 'water', water: 'fire' };
  const elOf = name => EL[name] || 'water';
  function elMult(a, b) { // ×1,3 si avantage, ×0,8 si désavantage
    if ((a === 'light' && b === 'shadow') || (a === 'shadow' && b === 'light')) return 1.3;
    if (BEATS[a] === b) return 1.3;
    if (BEATS[b] === a) return .8;
    return 1;
  }
  // ---------- Stats affichées (fiches, équipe) : les mêmes que le Ring (ring-config.js), avec niveau et mutation
  const stats = (name, odds, lvl = 1, variant = '') => RG.stats(name, lvl, variant);
  const power = s => Math.round(s.mass * 300 + s.power / 4 + s.r * 2); // note globale « ⚡ » des cartes

  return { EL, elOf, elMult, stats, power };
})();

export { CB };
