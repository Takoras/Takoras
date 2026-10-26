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
  // Rangs selon l'Elo : 3 divisions de 50 Elo par rang (Bois 1, Bois 2, Bois 3, Pierre 1…), puis Maître et Takoras.
  // On commence à 1000 = Bois 1. Badges : sprites /img/ranks/rank1..18 (Maître et Takoras : badge dessiné).
  DIV: 50,
  RANKS: [
    { k: 'wood', min: 0, col: '#c08552', divs: 3 }, { k: 'stone', min: 1150, col: '#a8a29e', divs: 3 },
    { k: 'silver', min: 1300, col: '#d6d3f0', divs: 3 }, { k: 'topaz', min: 1450, col: '#f5b041', divs: 3 },
    { k: 'emerald', min: 1600, col: '#34d399', divs: 3 }, { k: 'ruby', min: 1750, col: '#f43f5e', divs: 3 },
    { k: 'master', min: 1900, col: '#c084fc', divs: 1 }, { k: 'takoras', min: 2100, col: '#fbbf24', divs: 1 },
  ],

  // ---------- IA
  AI: {
    still:  { shoots: false },                                    // tuto : ne tire pas
    normal: { shoots: true, aimErr: .07, forceErr: .1, tries: 3 }, // vise juste, avec un peu d'imprécision (et sert à prédire ton tir)
    smart:  { shoots: true, smart: true, aimErr: .035, forceErr: .05 }, // entraînement : prédit ton tir, esquive au bord du vide
  },

  // ---------- Jetons : rôle + stats de base (niveau 1, sans mutation) + UN pouvoir
  // Le rôle se voit dans les stats : Tank = gros et lourd mais lent · Soutien = léger et rapide · Combattant = entre les deux, frappe fort.
  // mass : poids (dur à pousser, pousse fort) · power : vitesse max du tir · r : taille (rayon)
  // cd : tours de recharge après utilisation (0 = une seule fois par match). p : réglages du pouvoir.
  TOKENS: {
    Mobu:     { role: 'tank', mass: 1.55, power: 1600, r: 124, pw: 'grow',     cd: 3, p: { r: 1.4, mass: 1.7 } },
    Pikko:    { role: 'support', mass: .75, power: 2100, r: 92, pw: 'haste',    cd: 3, p: { cd: 1 } },
    Rouillé:  { role: 'tank', mass: 1.65, power: 1580, r: 122, pw: 'scrap',    cd: 3, p: { mass: 2.2 } },
    Givre:    { role: 'fighter', mass: 1.00, power: 1880, r: 106, pw: 'slide',    cd: 2, p: { friction: .3 } },
    Soléo:    { role: 'tank', mass: 1.60, power: 1620, r: 120, pw: 'eruption', cd: 3, p: { radius: 340, push: 1300 } },
    Azura:    { role: 'support', mass: .80, power: 2080, r: 96, pw: 'guard',    cd: 2, p: {} },
    Carmin:   { role: 'fighter', mass: 1.10, power: 1920, r: 108, pw: 'double',   cd: 3, p: { mult: 2 } },
    Vyolis:   { role: 'fighter', mass: .95, power: 1940, r: 104, pw: 'ghost',    cd: 2, p: {} },
    Lumis:    { role: 'support', mass: .82, power: 2100, r: 96, pw: 'rescue',   cd: 3, p: { pull: 300 } },
    Nyx:      { role: 'fighter', mass: .95, power: 1960, r: 102, pw: 'shrink',   cd: 2, p: { r: .7, power: 1.35 } },
    Astra:    { role: 'support', mass: .85, power: 2120, r: 98, pw: 'magnet',   cd: 3, p: { radius: 420, pull: 1000 } },
    Kraïos:   { role: 'tank', mass: 1.80, power: 1600, r: 130, pw: 'anchor',   cd: 2, p: {} },
    Koi:      { role: 'fighter', mass: 1.00, power: 1970, r: 104, pw: 'second',   cd: 3, p: { at: .35, boost: .85 } },
    Néphéris: { role: 'support', mass: .90, power: 2150, r: 100, pw: 'roots',    cd: 0, p: {} },
    Zénith:   { role: 'tank', mass: 1.75, power: 1650, r: 126, pw: 'shield',   cd: 2, p: {} },
    Oblivion: { role: 'fighter', mass: 1.15, power: 1980, r: 110, pw: 'void',     cd: 0, p: { push: 1800 } },
    Takoras:  { role: 'fighter', mass: 1.15, power: 2000, r: 110, pw: 'split',    cd: 0, p: { at: .25, spread: .22 } },
  },
  DEFAULT_TOKEN: { role: 'fighter', mass: 1, power: 1800, r: 107, pw: 'none', cd: 0, p: {} }, // jeton d'une future collection sans pouvoir
  STAT_MAX: { mass: 3, power: 3400, r: 140 }, // barres des fiches à 100 %
};

export { RCFG };
