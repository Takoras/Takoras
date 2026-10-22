// Valeurs du Ring (reprises de legacy/ring-config.js). Ce fichier est la référence depuis la phase 8 :
// tour de 30 s et 5 maps. Sans map, le moteur reste identique à l'ancien site (test de rejeu).
// « Ring » : toutes les valeurs d'équilibrage au même endroit. Change un chiffre ici, tout le jeu suit.
// Unités : le ring a un rayon de 1000. Les vitesses sont en unités par seconde.
const RCFG = {
  // ---------- Match
  RING_R: 1000,
  TURNS: 12,             // limite de tours (puis : plus de jetons restants, puis plus proches du centre)
  AIM_S: 30,             // secondes pour viser (le tour part dès que les deux ont validé)
  START_Y: 560,          // départ : tes jetons en bas (y = +560), ceux d'en face en haut
  START_X: [-360, 0, 360],
  SUDDEN_Y: 220,         // mort subite : 1 jeton chacun près du centre

  // ---------- Maps : rayon du ring, glisse générale, murs et zones au sol. Toutes symétriques haut/bas (équitables).
  // Mur : segment épais { x1, y1, x2, y2, w (épaisseur), k } · k = rebond (0,75 pierre qui amortit · 1,4 mur rebondisseur, renvoie plus vite)
  // Zone : rectangle centré { x, y, w, h, fric } · fric > 1 boue (ralentit) · fric < 1 glace (fait filer)
  MAPS: [
    { id: 'arene', R: 1450, fric: 1,
      walls: [{ x1: -280, y1: 0, x2: 280, y2: 0, w: 46, k: .75 }, { x1: -980, y1: -260, x2: -980, y2: 260, w: 40, k: 1.4 }, { x1: 980, y1: -260, x2: 980, y2: 260, w: 40, k: 1.4 }],
      zones: [] },
    { id: 'jardin', R: 1500, fric: 1,
      walls: [{ x1: -420, y1: -430, x2: 120, y2: -430, w: 44, k: .75 }, { x1: -420, y1: 430, x2: 120, y2: 430, w: 44, k: .75 }, { x1: 1050, y1: -200, x2: 1050, y2: 200, w: 40, k: 1.4 }],
      zones: [{ x: -650, y: 0, w: 420, h: 340, fric: 3 }, { x: 450, y: 0, w: 420, h: 340, fric: 3 }] },
    { id: 'volcan', R: 1500, fric: 1,
      walls: [{ x1: -330, y1: -230, x2: 330, y2: 230, w: 40, k: 1.4 }, { x1: -330, y1: 230, x2: 330, y2: -230, w: 40, k: 1.4 }, { x1: -1100, y1: -150, x2: -1100, y2: 150, w: 44, k: .75 }, { x1: 1100, y1: -150, x2: 1100, y2: 150, w: 44, k: .75 }],
      zones: [{ x: -700, y: 0, w: 300, h: 300, fric: 2.5 }, { x: 700, y: 0, w: 300, h: 300, fric: 2.5 }] },
    { id: 'glace', R: 1550, fric: .6,
      walls: [{ x1: -560, y1: -300, x2: -560, y2: 300, w: 44, k: .75 }, { x1: 560, y1: -300, x2: 560, y2: 300, w: 44, k: .75 }],
      zones: [{ x: 0, y: 0, w: 700, h: 520, fric: .35 }] },
    { id: 'ruines', R: 1600, fric: 1,
      walls: [{ x1: -760, y1: -380, x2: -260, y2: -380, w: 46, k: .75 }, { x1: 260, y1: -380, x2: 760, y2: -380, w: 46, k: .75 }, { x1: -760, y1: 380, x2: -260, y2: 380, w: 46, k: .75 }, { x1: 260, y1: 380, x2: 760, y2: 380, w: 46, k: .75 }, { x1: -1150, y1: -180, x2: -1150, y2: 180, w: 40, k: 1.4 }, { x1: 1150, y1: -180, x2: 1150, y2: 180, w: 40, k: 1.4 }],
      zones: [{ x: 0, y: 0, w: 520, h: 280, fric: 2.5 }] },
  ],

  // ---------- Physique (pas fixe, valeurs arrondies à chaque pas = 100 % déterministe)
  DT: 1 / 120,
  FRICTION: 900,         // ralentissement du sol (unités/s²)
  DRAG: .35,             // petite résistance en plus, proportionnelle à la vitesse
  RESTITUTION: .92,      // 1 = chocs parfaitement élastiques
  STOP_SPEED: 6,         // en dessous : le jeton est arrêté
  MAX_SIM_S: 10,         // sécurité : un tour ne dure jamais plus que ça
  QUANT: 1000,           // arrondi des positions et vitesses (1/1000)
  MIN_FORCE: .08,        // en dessous, le tir ne part pas

  // ---------- Effets
  BIG_HIT: 1500,          // choc plus violent que ça = shake + ralenti
  SLOWMO: .3,            // vitesse du ralenti
  SLOWMO_S: .45,         // durée du ralenti

  // ---------- Progression
  LEVEL_MAX: 10,
  LEVEL_BONUS: .04,                                  // +4 % de poids et de puissance par niveau
  LEVEL_COST: [1, 1, 2, 2, 3, 3, 4, 4, 5],           // doublons pour passer au niveau 2, 3, … 10 (25 au total)
  MUTATION: { '': 1, gold: 1.05, celeste: 1.10, ombre: 1.20 }, // Doré, Céleste, Ombre (la plus rare du site = le plus gros bonus)

  // ---------- Classé
  BUDGET: { r_common: 1, r_rare: 2, r_epic: 3, r_legend: 4, r_myth: 5 },
  BUDGET_MAX: 8,
  ELO: { start: 1000, kNew: 40, k: 20, newGames: 10 },
  RANKS: [ // rang selon l'Elo (Légende = top 100)
    { k: 'bronze', min: 0, ico: '🥉' }, { k: 'silver', min: 1000, ico: '🥈' }, { k: 'gold', min: 1200, ico: '🥇' },
    { k: 'plat', min: 1400, ico: '💠' }, { k: 'diam', min: 1600, ico: '💎' }, { k: 'master', min: 1800, ico: '👑' },
  ],

  // ---------- IA
  AI: {
    still:  { shoots: false },                                    // tuto : ne tire pas
    normal: { shoots: true, aimErr: .07, forceErr: .1, tries: 3 }, // entraînement : vise juste, avec un peu d'imprécision
  },

  // ---------- Jetons : stats de base (niveau 1, sans mutation) + UN pouvoir
  // mass : poids (dur à pousser, pousse fort) · power : vitesse max du tir · r : taille (rayon)
  // cd : tours de recharge après utilisation (0 = une seule fois par match). p : réglages du pouvoir.
  TOKENS: {
    Mobu:     { mass: 1.30, power: 1750, r: 120, pw: 'grow',     cd: 3, p: { r: 1.4, mass: 1.7 } },
    Pikko:    { mass: .75,  power: 2050, r: 91, pw: 'bounce',   cd: 2, p: {} },
    Rouillé:  { mass: 1.55, power: 1650, r: 114, pw: 'scrap',    cd: 3, p: { mass: 2.2 } },
    Givre:    { mass: 1.00, power: 1850, r: 107, pw: 'slide',    cd: 2, p: { friction: .3 } },
    Soléo:    { mass: 1.05, power: 1850, r: 109, pw: 'eruption', cd: 3, p: { radius: 340, push: 1300 } },
    Azura:    { mass: .95,  power: 1850, r: 104, pw: 'curve',    cd: 2, p: { turn: 2.2 } },
    Carmin:   { mass: 1.10, power: 1900, r: 107, pw: 'double',   cd: 3, p: { mult: 2 } },
    Vyolis:   { mass: .90,  power: 1900, r: 101, pw: 'ghost',    cd: 2, p: {} },
    Lumis:    { mass: .90,  power: 1800, r: 104, pw: 'rescue',   cd: 3, p: { pull: 300 } },
    Nyx:      { mass: .85,  power: 1950, r: 99, pw: 'shrink',   cd: 2, p: { r: .7, power: 1.35 } },
    Astra:    { mass: .95,  power: 1850, r: 104, pw: 'magnet',   cd: 3, p: { radius: 420, pull: 1000 } },
    Kraïos:   { mass: 1.50, power: 1650, r: 127, pw: 'anchor',   cd: 2, p: {} },
    Koi:      { mass: .90,  power: 1950, r: 99, pw: 'second',   cd: 3, p: { at: .35, boost: .85 } },
    Néphéris: { mass: 1.20, power: 1750, r: 117, pw: 'roots',    cd: 0, p: {} },
    Zénith:   { mass: 1.10, power: 1800, r: 109, pw: 'shield',   cd: 2, p: {} },
    Oblivion: { mass: 1.15, power: 1850, r: 109, pw: 'void',     cd: 0, p: { push: 1800 } },
    Takoras:  { mass: 1.10, power: 1850, r: 109, pw: 'split',    cd: 0, p: { at: .25, spread: .22 } },
  },
  DEFAULT_TOKEN: { mass: 1, power: 1800, r: 107, pw: 'none', cd: 0, p: {} }, // jeton d'une future collection sans pouvoir
  STAT_MAX: { mass: 2.6, power: 3400, r: 140 }, // barres des fiches à 100 %
};

export { RCFG };
