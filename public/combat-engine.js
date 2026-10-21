// Éléments (= familles) et stats affichées des jetons. Voir docs/COMBAT.md.
// Les stats viennent de fight-config.js (FCFG), le combat lui-même est dans fight-engine.js (FE).

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
  // ---------- Stats affichées (fiches, équipe) : les mêmes que le combat (fight-config.js), avec niveau et mutation
  function stats(name, odds, lvl = 1, variant = '') {
    const k = FCFG.TOKENS[name] || FCFG.DEFAULT_TOKEN, m = (1 + FCFG.LEVEL_BONUS * (Math.max(1, lvl) - 1)) * (FCFG.MUTATION[variant] || 1);
    return { hp: Math.round(k.hp * m), atk: Math.round(k.atk * m), spd: Math.round(100 / k.spd) }; // vitesse : 100 = 1 attaque par seconde
  }
  const power = s => Math.round(s.hp / 5 + s.atk * 6 * s.spd / 100);

  return { EL, elOf, elMult, stats, power };
})();
