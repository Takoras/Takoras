// Valeurs du Ring (reprises de legacy/ring-config.js). Ce fichier est la référence depuis la phase 8 :
// tour de 60 s, une arène vide qui rétrécit, rôles des jetons.
// « Ring » : toutes les valeurs d'équilibrage au même endroit. Change un chiffre ici, tout le jeu suit.
// Unités : le ring a un rayon de 1000. Les vitesses sont en unités par seconde.
const RCFG = {
  // ---------- Match
  RING_R: 1000,
  TURNS: 12,             // limite de tours (puis : plus de jetons restants, puis plus proches du centre)
  AIM_S: 60,             // secondes pour viser (le tour part dès que les deux ont validé)
  START_Y: 560,          // départ : tes jetons en bas (y = +560), ceux d'en face en haut
  START_X: [-360, 0, 360],
  SUDDEN_Y: 220,         // mort subite : 1 jeton chacun près du centre
  // Sur une map : plus de limite de 12 tours, le ring RÉTRÉCIT doucement à la fin de chaque tour (−2 % du rayon de départ,
  // jusqu'à 40 %). Un jeton dont le centre se retrouve hors du bord tombe. Sécurité : 60 tours au plus.
  SHRINK: { step: .02, min: .4, maxTurns: 60 },

  // ---------- Map : pour l'instant UNE seule arène, vide (pas d'obstacle). Le moteur sait toujours gérer des murs
  // { x1, y1, x2, y2, w, k } et des zones au sol { x, y, w, h, fric } si on en remet un jour.
  MAPS: [
    { id: 'arene', R: 1450, fric: 1, zones: [], walls: [] },
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
  ELO: { start: 1000, kNew: 40, k: 24, newGames: 10 }, // K = 40 les 10 premiers matchs, puis 24 (calculé par le serveur)
  // Rangs selon l'Elo : 3 divisions de 50 Elo par rang (Fer 1, Fer 2, Fer 3, Bronze 1…), puis Maître et Légende.
  // On commence à 1000 = Fer 1. Les couleurs servent aux badges.
  DIV: 50,
  RANKS: [
    { k: 'iron', min: 0, col: '#9ca3af', divs: 3 }, { k: 'bronze', min: 1150, col: '#d97706', divs: 3 },
    { k: 'silver', min: 1300, col: '#cbd5e1', divs: 3 }, { k: 'gold', min: 1450, col: '#facc15', divs: 3 },
    { k: 'plat', min: 1600, col: '#2dd4bf', divs: 3 }, { k: 'diam', min: 1750, col: '#60a5fa', divs: 3 },
    { k: 'master', min: 1900, col: '#c084fc', divs: 1 }, { k: 'legend', min: 2100, col: '#fb7185', divs: 1 },
  ],

  // ---------- IA
  AI: {
    still:  { shoots: false },                                    // tuto : ne tire pas
    normal: { shoots: true, aimErr: .07, forceErr: .1, tries: 3 }, // vise juste, avec un peu d'imprécision (et sert à prédire ton tir)
    smart:  { shoots: true, smart: true, aimErr: .035, forceErr: .05 }, // entraînement : prédit ton tir, esquive au bord du vide
  },

  // ---------- Rôles (remplacent les éléments) : chaque jeton est Combattant, Tank ou Soutien.
  // Combattant : +10 % de puissance · Tank : +15 % de poids · Soutien : ses 2 alliés ont +5 % de poids et de puissance.
  // Trio complet (un de chaque rôle dans l'équipe) : +5 % de poids et de puissance pour les 3.
  ROLES: { fighter: { power: 1.10 }, tank: { mass: 1.15 }, support: { ally: 1.05 } },
  TRIO: 1.05,

  // ---------- Jetons : stats de base (niveau 1, sans mutation) + UN pouvoir
  // mass : poids (dur à pousser, pousse fort) · power : vitesse max du tir · r : taille (rayon)
  // cd : tours de recharge après utilisation (0 = une seule fois par match). p : réglages du pouvoir.
  TOKENS: {
    Mobu:     { role: 'tank', mass: 1.30, power: 1750, r: 120, pw: 'grow',     cd: 3, p: { r: 1.4, mass: 1.7 } },
    Pikko:    { role: 'support', mass: .75,  power: 2050, r: 91, pw: 'haste',    cd: 3, p: { cd: 1 } },
    Rouillé:  { role: 'tank', mass: 1.55, power: 1650, r: 114, pw: 'scrap',    cd: 3, p: { mass: 2.2 } },
    Givre:    { role: 'fighter', mass: 1.00, power: 1850, r: 107, pw: 'slide',    cd: 2, p: { friction: .3 } },
    Soléo:    { role: 'tank', mass: 1.05, power: 1850, r: 109, pw: 'eruption', cd: 3, p: { radius: 340, push: 1300 } },
    Azura:    { role: 'support', mass: .95,  power: 1850, r: 104, pw: 'guard',    cd: 2, p: {} },
    Carmin:   { role: 'fighter', mass: 1.10, power: 1900, r: 107, pw: 'double',   cd: 3, p: { mult: 2 } },
    Vyolis:   { role: 'fighter', mass: .90,  power: 1900, r: 101, pw: 'ghost',    cd: 2, p: {} },
    Lumis:    { role: 'support', mass: .90,  power: 1800, r: 104, pw: 'rescue',   cd: 3, p: { pull: 300 } },
    Nyx:      { role: 'fighter', mass: .85,  power: 1950, r: 99, pw: 'shrink',   cd: 2, p: { r: .7, power: 1.35 } },
    Astra:    { role: 'support', mass: .95,  power: 1850, r: 104, pw: 'magnet',   cd: 3, p: { radius: 420, pull: 1000 } },
    Kraïos:   { role: 'tank', mass: 1.50, power: 1650, r: 127, pw: 'anchor',   cd: 2, p: {} },
    Koi:      { role: 'fighter', mass: .90,  power: 1950, r: 99, pw: 'second',   cd: 3, p: { at: .35, boost: .85 } },
    Néphéris: { role: 'support', mass: 1.20, power: 1750, r: 117, pw: 'roots',    cd: 0, p: {} },
    Zénith:   { role: 'tank', mass: 1.10, power: 1800, r: 109, pw: 'shield',   cd: 2, p: {} },
    Oblivion: { role: 'fighter', mass: 1.15, power: 1850, r: 109, pw: 'void',     cd: 0, p: { push: 1800 } },
    Takoras:  { role: 'fighter', mass: 1.10, power: 1850, r: 109, pw: 'split',    cd: 0, p: { at: .25, spread: .22 } },
  },
  DEFAULT_TOKEN: { role: 'fighter', mass: 1, power: 1800, r: 107, pw: 'none', cd: 0, p: {} }, // jeton d'une future collection sans pouvoir
  STAT_MAX: { mass: 2.6, power: 3400, r: 140 }, // barres des fiches à 100 %
};

export { RCFG };
