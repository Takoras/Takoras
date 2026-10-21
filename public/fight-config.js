// Toutes les valeurs d'équilibrage du combat, au même endroit : change un chiffre ici, tout le jeu suit.
// (Le moteur fight-engine.js et l'écran fight-ui.js lisent uniquement ce fichier.)
const FCFG = {
  // ---------- Match
  TICK_MS: 100,          // le combat avance par pas de 0,1 s (déterministe)
  MATCH_S: 90,           // durée max ; au chrono, l'équipe avec le plus de PV restants (en %) gagne
  START_CD: .5,          // les abilités démarrent à moitié chargées (fraction du cooldown restant)
  RAND: [.92, 1.08],     // petite variation des dégâts d'attaque
  BIG_HIT: .14,          // coup ≥ 14 % des PV max de la cible = petit shake d'écran

  // ---------- Progression (appliquée en combat et dans les fiches)
  LEVEL_MAX: 10,
  LEVEL_BONUS: .05,                                  // +5 % PV et attaque par niveau (+45 % au niveau 10)
  LEVEL_COST: [1, 1, 2, 2, 3, 3, 4, 4, 5],           // doublons pour passer au niveau 2, 3, … 10 (25 au total)
  MUTATION: { '': 1, gold: 1.05, celeste: 1.10, ombre: 1.20 }, // Doré, Céleste, Ombre (la plus rare du site = le plus gros bonus)

  // ---------- Éléments = familles
  ELEMENT_MULT: { strong: 1.2, weak: .85 },          // 🔥 > 🌿 > 💧 > 🔥 ; ✨ ⇄ 🌑 forts l'un contre l'autre
  FAMILY: {                                          // 2 jetons de la même famille = petit bonus, 3 = gros bonus
    fire:   { stat: 'atk',   v: [.08, .20] },        // Feu : + attaque
    water:  { stat: 'hp',    v: [.10, .25] },        // Eau : + PV
    plant:  { stat: 'regen', v: [.006, .015] },      // Plante : régénère x % des PV max par seconde
    light:  { stat: 'cdr',   v: [.10, .25] },        // Lumière : abilités qui rechargent plus vite
    shadow: { stat: 'crit',  v: [.10, .22] },        // Ténèbres : chance de coup critique (×1,6)
  },
  CRIT_MULT: 1.6,

  // ---------- Statuts (durées en secondes)
  STATUS: {
    burn:   { dur: 4, pct: .03 },    // Brûlure : 3 % des PV max par seconde
    poison: { dur: 6, pct: .025, healCut: .5 }, // Poison : 2,5 %/s et soins divisés par 2
    freeze: { dur: 4, slow: 1.6 },   // Gel : attaque 1,6× plus lentement
    shock:  { dur: 4, vuln: .15 },   // Choc : subit +15 % de dégâts
    rage:   { dur: 6, atk: .30, speed: 1.3 }, // Rage : +30 % d'attaque, attaque 1,3× plus vite
    shield: { max: .6 },             // Bouclier : absorbe les dégâts (max 60 % des PV max)
  },
  // Réactions : deux statuts sur la même cible → effet immédiat, les deux statuts sont consommés
  REACTIONS: {
    paralysis: { a: 'freeze', b: 'shock',  stun: 2.5 },          // Gel + Choc : étourdi 2,5 s (n'attaque plus, abilité bloquée)
    steam:     { a: 'burn',   b: 'freeze', pct: .16 },           // Brûlure + Gel : 16 % des PV max d'un coup
    overload:  { a: 'burn',   b: 'shock',  pct: .09 },           // Brûlure + Choc : explosion, 9 % des PV max à TOUS les ennemis
    corrosion: { a: 'poison', b: 'shock',  vuln: .35, dur: 5 },  // Poison + Choc : subit +35 % de dégâts pendant 5 s
    contagion: { a: 'poison', b: 'burn',   pct: .06 },           // Poison + Brûlure : 6 % des PV max, le poison passe à tous les ennemis
    frostbite: { a: 'poison', b: 'freeze', pct: .05, stun: 1 },  // Poison + Gel : 5 % des PV max et figé 1 s
  },

  // ---------- Ranked (étape suivante)
  BUDGET: { r_common: 1, r_rare: 2, r_epic: 3, r_legend: 4, r_myth: 5 },
  BUDGET_MAX: 8,
  ELO: { start: 1000, kNew: 40, k: 20, newGames: 10 },
  RANKS: [ // rang selon l'Elo (Légende = top 100, en plus de 1800+)
    { k: 'bronze', min: 0, ico: '🥉' }, { k: 'silver', min: 1000, ico: '🥈' }, { k: 'gold', min: 1200, ico: '🥇' },
    { k: 'plat', min: 1400, ico: '💠' }, { k: 'diam', min: 1600, ico: '💎' }, { k: 'master', min: 1800, ico: '👑' },
  ],

  // ---------- IA
  AI: {
    easy:   { react: [3, 6], smart: 0 },    // tuto : lance rarement, sans réfléchir
    normal: { react: [.6, 2.2], smart: .7 },// entraînement : vise juste 7 fois sur 10
  },

  // ---------- Jetons : stats de base (niveau 1, sans mutation) + UN passif OU UNE abilité
  // hp, atk (dégâts par attaque), spd (secondes entre deux attaques). La rareté rend un jeton plus original, pas plus fort.
  // kind 'abil' : cd en secondes. Les nombres de chaque effet sont dans `p`.
  TOKENS: {
    Mobu:     { hp: 2320, atk: 52, spd: 1.15, kind: 'passive', id: 'bubble',  p: { every: 8, shield: .10 } },
    Pikko:    { hp: 1840, atk: 58, spd: .95,  kind: 'abil',    id: 'sting',   cd: 8,  p: { dmg: 1.5 } },
    Rouillé:  { hp: 2000, atk: 54, spd: 1.0,  kind: 'passive', id: 'sparks',  p: { every: 5 } },
    Givre:    { hp: 1920, atk: 54, spd: 1.05, kind: 'abil',    id: 'blizzard', cd: 11, p: { dmg: 1.1 } },
    Soléo:    { hp: 1840, atk: 56, spd: 1.0,  kind: 'abil',    id: 'eruption', cd: 9, p: { dmg: 2.6 } },
    Azura:    { hp: 2080, atk: 50, spd: 1.1,  kind: 'passive', id: 'tide',    p: { every: 4, heal: .05 } },
    Carmin:   { hp: 2080, atk: 66, spd: 1.0,  kind: 'passive', id: 'bloodrage', p: { below: 0.6 } },
    Vyolis:   { hp: 1840, atk: 56, spd: 1.0,  kind: 'abil',    id: 'venom',   cd: 12, p: {} },
    Lumis:    { hp: 1920, atk: 48, spd: 1.05, kind: 'abil',    id: 'bloom',   cd: 13, p: { heal: 0.24 } },
    Nyx:      { hp: 1680, atk: 66, spd: .9,   kind: 'passive', id: 'execute', p: { below: .35, mult: 1.6 } },
    Astra:    { hp: 2000, atk: 55, spd: 1.0,  kind: 'abil',    id: 'starfall', cd: 11, p: { dmg: 1.8 } },
    Kraïos:   { hp: 2160, atk: 58, spd: 1.1,  kind: 'passive', id: 'abyss',   p: { every: 3, splash: .8 } },
    Koi:      { hp: 1840, atk: 58, spd: 1.0,  kind: 'abil',    id: 'leap',    cd: 14, p: { dur: 6 } },
    Néphéris: { hp: 2240, atk: 50, spd: 1.1,  kind: 'passive', id: 'thorns',  p: { chance: .3 } },
    Zénith:   { hp: 1840, atk: 54, spd: 1.0,  kind: 'abil',    id: 'surge',   cd: 10, p: { dmg: 2.6, refund: 5 } },
    Oblivion: { hp: 1760, atk: 60, spd: 1.0,  kind: 'abil',    id: 'void',    cd: 13, p: { below: .25, dmg: 3.5 } },
    Takoras:  { hp: 2000, atk: 58, spd: 1.0,  kind: 'passive', id: 'phoenix', p: { revive: .4 } },
  },
  DEFAULT_TOKEN: { hp: 1920, atk: 55, spd: 1.0, kind: 'passive', id: 'none', p: {} }, // jeton d'une future collection sans kit
};
