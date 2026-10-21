# Ring : duel de jetons 1v1

Un duel sur un ring rond, façon billard × pétanque × sumo. Chaque joueur pousse un de ses jetons par tour, au lance-pierre ;
le but est d'éjecter les jetons adverses du ring.

Fichiers :
- `public/ring-config.js` (`RCFG`) : **toutes les valeurs d'équilibrage** (stats et pouvoir de chaque jeton, frottement, chocs, ralenti, niveaux, mutations, budget, Elo, rangs, IA).
- `public/ring-engine.js` (`RG`) : moteur physique maison, 100 % déterministe (pas fixe 1/120 s, pas de hasard ni de trigonométrie, valeurs arrondies à chaque pas). `RG.resolve(st, [tir0, tir1])` joue un tour ; c'est ce que le serveur rejouera pour le classé.
- `public/ring-ui.js` : l'écran (visée, révélation, animation, effets, sons), l'IA d'entraînement, l'écran de fin et le tuto interactif.
- `public/arena.js` : la page Combat (rang, JOUER, Entraînement, équipe), l'éditeur d'équipe (budget, pouvoir, 3 stats) et les fiches.

## Règles
- 3 jetons chacun ; les miens en bas, les siens en haut. Un jeton dont le centre sort du cercle est éliminé.
- Tour simultané : 10 s pour viser (tape un jeton, glisse vers l'arrière, n'importe où sur l'écran), activer le pouvoir, valider. On ne voit pas la visée adverse. Puis les deux tirs partent ensemble.
- Le premier qui n'a plus de jetons perd. Les deux en même temps : celui qui en avait le plus au début du tour gagne, sinon mort subite (1 jeton chacun près du centre).
- 12 tours max : plus de jetons restants, sinon les plus proches du centre.
- Stats : poids (dur à pousser, pousse fort), puissance (vitesse max du tir), taille (rayon). Niveau +4 % de poids et de puissance ; mutations ×1,05 / ×1,10 / ×1,20.
- 17 pouvoirs, un par jeton (Gonfler, Rebond, Ferraille, Glissade, Éruption, Courant, Frappe ×2, Fantôme, Sauvetage, Ombre, Aimant, Ancre, Second souffle, Racines, Bouclier, Néant, Dédoublement). Recharge en tours, ou une fois par match.

## Étapes
1. ✅ Match jouable en entraînement contre l'IA + tuto.
2. Niveaux (coûts 1,1,2,2,3,3,4,4,5) et mutations : déjà dans la config et les stats ; reste l'écran d'amélioration et les coûts côté serveur.
3. Classé : Elo, matchmaking (vrai joueur ou fantôme), serveur qui attend les deux tirs et lance `RG.resolve`, saisons, récompenses ; 1v1 local.
