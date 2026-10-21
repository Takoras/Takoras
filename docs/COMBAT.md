# Combat 1v1 en temps réel

Fichiers :
- `public/fight-config.js` (`FCFG`) : **toutes les valeurs d'équilibrage** (stats et kit de chaque jeton, statuts, réactions, familles, niveaux, mutations, budget, Elo, rangs, IA).
- `public/fight-engine.js` (`FE`) : les règles, déterministes (pas de 0,1 s, graine). `FE.replay(teams, seed, actions)` rejoue un match à partir des actions horodatées : c'est ce que le serveur utilisera pour valider le classé.
- `public/fight-ui.js` : l'écran de combat (boutons, cible, effets, sons), l'IA d'entraînement, l'écran de fin et le tuto interactif.
- `public/arena.js` : la page Combat (rang, JOUER, Entraînement, équipe, synergies), l'éditeur d'équipe et les fiches.
- `public/combat-engine.js` (`CB`) : les éléments (= familles) et les stats affichées.

## Règles
- 3 jetons par équipe. Ils attaquent tout seuls la cible de leur équipe (environ 1 fois par seconde, selon le jeton).
- Le joueur : taper le bouton d'un jeton pour lancer son abilité (touches 1 2 3 sur PC), taper un ennemi pour que toute l'équipe le vise.
- Chaque jeton a SOIT un passif (automatique), SOIT une abilité (avec recharge). 8 passifs, 9 abilités.
- Statuts : Brûlure, Poison, Gel, Choc, Rage, Bouclier. Deux statuts sur la même cible = réaction (Paralysie, Vapeur, Surcharge, Corrosion, Contagion, Engelure).
- Familles = éléments : 2 jetons de la même famille = petit bonus, 3 = gros bonus.
- 90 s max ; au chrono, l'équipe avec le plus de PV (en %) gagne.

## Équilibrage (simulations, 400 matchs, niveau 1)
- Un joueur qui ne touche à rien perd ~85 % du temps contre l'IA, qui finit en moyenne avec ~30 % de PV (pas d'humiliation).
- Durée moyenne ~40 s. Taux de victoire par jeton entre ~39 % et ~59 %.

## Étapes
1. ✅ Combat jouable en entraînement contre l'IA + tuto.
2. Niveaux (coûts 1,1,2,2,3,3,4,4,5 doublons, +5 %/niveau) et mutations ×1,05 / ×1,10 / ×1,20 : déjà dans la config et dans les stats ; reste l'écran d'amélioration et les coûts côté serveur.
3. Classé : Elo, matchmaking (vrai joueur ou fantôme), validation serveur par `FE.replay`, saisons.
