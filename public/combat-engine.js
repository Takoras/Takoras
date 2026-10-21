// Éléments et stats des jetons (aucune règle de combat pour l'instant : le combat est remis à zéro). Voir docs/COMBAT.md.
// Les stats servent aux fiches, à l'équipe et aux niveaux ; elles serviront au futur combat.

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
  const VBONUS = { gold: 1.05, celeste: 1.1, ombre: 1.15 };

  // ---------- Stats (affichées dans les fiches) : un peu plus fort quand c'est rare ; niveaux et mutations comptent
  const strHash = s => [...String(s ?? '')].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  function stats(name, odds, lvl = 1, variant = '') {
    const r = Math.log10(Math.max(1, odds)) / 6, h = strHash(name);
    const v = i => ((h >>> (i * 5)) % 31) / 30 - .5;
    const m = (1 + .08 * (Math.max(1, lvl) - 1)) * (VBONUS[variant] || 1);
    return {
      hp: Math.round((1150 + 600 * r + 70 * v(0)) * m),
      atk: Math.round((50 + 28 * r + 4 * v(1)) * m),
      def: Math.round((16 + 14 * r + 3 * v(2)) * m),
      spd: Math.round(98 + 22 * r + 8 * v(3)),
    };
  }
  const power = s => Math.round(s.hp / 4 + s.atk * 4 + s.def * 6 + s.spd * 2);

  return { EL, elOf, elMult, stats, power };
})();
