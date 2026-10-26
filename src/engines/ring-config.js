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

  // ---------- Maps. « arene » : vide, pour le tuto (pool: false = jamais tirée au sort).
  // Les 5 arènes de match : 1,4× plus grandes, chacune son style et ses obstacles.
  // Mur { x1, y1, x2, y2, w (épaisseur), k (< 1 amortit, > 1 renvoie plus vite), hp (coups avant de casser) }.
  // Placement symétrique par le centre (les deux camps ont exactement le même terrain), loin des départs (y = ±1120).
  ICE_FRIC: .15,          // frottement sur la patinoire de Givre
  WALL_HP: 5, WALL_HIT: 120,  // un mur casse au 5e vrai choc (vitesse d'impact > 120)
  MAPS: [
    { id: 'arene', R: 1450, fric: 1, zones: [], walls: [], pool: false },
    // Ruines du Jardin : 4 murets de pierre sur les côtés
    { id: 'jardin', R: 2000, fric: 1, zones: [], walls: [
      { x1: -900, y1: -420, x2: -600, y2: -420, w: 60, k: .6 }, { x1: 600, y1: 420, x2: 900, y2: 420, w: 60, k: .6 },
      { x1: -900, y1: 420, x2: -600, y2: 420, w: 60, k: .6 }, { x1: 600, y1: -420, x2: 900, y2: -420, w: 60, k: .6 },
    ] },
    // Sanctuaire Psychique : 2 parois psychiques en biais qui renvoient plus vite
    { id: 'psy', R: 2000, fric: 1, zones: [], walls: [
      { x1: -1150, y1: -320, x2: -900, y2: 320, w: 50, k: 1.25 }, { x1: 1150, y1: 320, x2: 900, y2: -320, w: 50, k: 1.25 },
    ] },
    // Forge Solaire : 4 enclumes en croix autour du centre
    { id: 'forge', R: 2000, fric: 1, zones: [], walls: [
      { x1: -380, y1: -130, x2: -380, y2: 130, w: 70, k: .7 }, { x1: 380, y1: 130, x2: 380, y2: -130, w: 70, k: .7 },
      { x1: -130, y1: -380, x2: 130, y2: -380, w: 70, k: .7 }, { x1: 130, y1: 380, x2: -130, y2: 380, w: 70, k: .7 },
    ] },
    // Observatoire Astral : 6 piliers en hexagone
    { id: 'astral', R: 2000, fric: 1, zones: [], walls: [
      { x1: 720, y1: 0, x2: 720, y2: 0, w: 110, k: .85 }, { x1: -720, y1: 0, x2: -720, y2: 0, w: 110, k: .85 },
      { x1: 360, y1: 620, x2: 360, y2: 620, w: 110, k: .85 }, { x1: -360, y1: -620, x2: -360, y2: -620, w: 110, k: .85 },
      { x1: -360, y1: 620, x2: -360, y2: 620, w: 110, k: .85 }, { x1: 360, y1: -620, x2: 360, y2: -620, w: 110, k: .85 },
    ] },
    // Abysse d'Ombre : 2 longues failles en diagonale
    { id: 'abysse', R: 2000, fric: 1, zones: [], walls: [
      { x1: -1300, y1: -160, x2: -450, y2: 260, w: 55, k: .7 }, { x1: 1300, y1: 160, x2: 450, y2: -260, w: 55, k: .7 },
    ] },
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
  // Bonus de niveau à rendements décroissants : bonus(n) = 12 % × (1 − e^(−n/4)), n = niveaux gagnés (niv. 10 → +11 %).
  // Simulé (800 matchs, visée « humaine ») : niv. 10 contre niv. 1 ≈ 62 % de victoires, niv. 10 Ombre ≈ 67 %.
  // (Avec +40 % / plafond +45 % comme prévu au départ, un jeton à fond gagnait ~80 % : beaucoup trop.)
  LEVEL_BONUS: .12, LEVEL_CURVE: 4,
  POWER_CAP: .15,                                    // niveau + mutation : jamais plus de +15 % au total
  LEVEL_COST: [1, 1, 2, 2, 3, 3, 4, 4, 5],           // doublons pour passer au niveau 2, 3, … 10 (25 au total)
  MUTATION: { '': 1, gold: 1.03, celeste: 1.05, ombre: 1.08 }, // Doré +3 %, Céleste +5 %, Ombre +8 % (s'ajoutent au bonus de niveau)

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

  // ---------- Jetons : stats de base (niveau 1, sans mutation) + UN pouvoir, en lien avec le dessin du jeton.
  // Plus de catégories (combattant, tank…) : chaque jeton a son style de jeu par son poids, sa vitesse, sa taille et son pouvoir.
  // mass : poids (dur à pousser, pousse fort) · power : vitesse max du tir · r : taille (rayon)
  // cd : tours de recharge après utilisation (0 = une seule fois par match) · uses : nombre d'utilisations par match (pas de recharge).
  // p : réglages du pouvoir. Aucun pouvoir ne se déclenche « à l'arrêt » : tout part au lancer ou au premier choc.
  TOKENS: {
    Mobu:     { mass: 1.55, power: 1600, r: 124, pw: 'jelly',    cd: 3, p: { r: 1.35, mass: 1.5, bounce: 1.5 } }, // blob : gélatine qui renvoie tout
    Pikko:    { mass: .75, power: 2100, r: 92, pw: 'pinball',    cd: 0, uses: 3, p: { boost: 1.15, max: 3 } },      // balle : flipper sur les bords
    Rouillé:  { mass: 1.65, power: 1580, r: 122, pw: 'rampart',  cd: 3, p: { mult: 1.6 } },               // ferraille : rempart qui renvoie
    Givre:    { mass: 1.00, power: 1880, r: 106, pw: 'icetrail', cd: 0, uses: 3, p: { every: 6 } },                // glace : patinoire derrière lui
    Soléo:    { mass: 1.60, power: 1620, r: 120, pw: 'sun',      cd: 3, p: { radius: 900, g: 2600 } },     // soleil : gravité, tout ce qui bouge est attiré
    Azura:    { mass: .80, power: 2080, r: 96, pw: 'surf',       cd: 3, p: { radius: 700, push: 1500, cone: .82 } }, // eau : ressac dans la direction visée
    Carmin:   { mass: 1.10, power: 1920, r: 108, pw: 'ora',      cd: 4, p: { mult: 1.6, friction: .55 } }, // poing : rafale (×1,6)
    Vyolis:   { mass: .95, power: 1940, r: 104, pw: 'blink',     cd: 0, uses: 3, p: { range: 900 } },              // orbites : téléportation
    Lumis:    { mass: .82, power: 2100, r: 96, pw: 'mirror',     cd: 4, p: { mult: 1.5, radius: 450 } },  // lumière : miroir autour d'elle
    Nyx:      { mass: .95, power: 1960, r: 102, pw: 'shade',     cd: 2, p: { r: .75, power: 1.3 } },      // nuit : ombre qui traverse
    Astra:    { mass: .85, power: 2120, r: 98, pw: 'starfall',   cd: 0, uses: 3, p: { range: 1100, radius: 320, push: 1300 } }, // étoiles filantes : pluie ciblée
    Kraïos:   { mass: 1.80, power: 1600, r: 130, pw: 'grab',     cd: 0, p: {} },                          // kraken : tentacules (1 fois par match)
    Koi:      { mass: 1.00, power: 1970, r: 104, pw: 'current',  cd: 0, uses: 3, p: { back: .75 } },     // poisson : frappe puis repart vers son départ
    Néphéris: { mass: .90, power: 2150, r: 100, pw: 'telekinesis', cd: 0, p: { mult: .75 } },             // psychique : télékinésie (1 fois par match)
    Zénith:   { mass: 1.75, power: 1650, r: 126, pw: 'cyclone',  cd: 3, p: { radius: 480, spin: 1500, push: 500 } }, // œil : œil du cyclone
    Oblivion: { mass: 1.15, power: 1980, r: 110, pw: 'rift',     cd: 0, p: {} },                          // planète fissurée : faille qui s'ouvre au tour suivant
    Takoras:  { mass: 1.15, power: 2000, r: 110, pw: 'avatar',   cd: 0, p: { r: 1.5, mass: 2, radius: 320, push: 1150 } }, // avatar géant, ondes de choc
  },
  DEFAULT_TOKEN: { role: 'fighter', mass: 1, power: 1800, r: 107, pw: 'none', cd: 0, p: {} }, // jeton d'une future collection sans pouvoir
  STAT_MAX: { mass: 3, power: 3400, r: 140 }, // barres des fiches à 100 %
};

export { RCFG };
