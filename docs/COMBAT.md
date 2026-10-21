# Combat

**Remis à zéro le 21/10/2026.** L'ancien mode « 3 endroits », toutes les capacités et tous les passifs ont été retirés.
Un nouveau combat est en préparation (l'ancien code est dans l'historique git, commit 019bdf9).

Ce qui reste :
- l'équipe de 3 jetons (page Combat, RPC `set_deck` / `my_deck`) ;
- les 5 éléments (🔥 > 🌿 > 💧 > 🔥, ✨ ⇄ 🌑, ×1,3 / ×0,8) dans `combat-engine.js` (`CB.elOf`, `CB.elMult`) ;
- les stats (`CB.stats`) avec les niveaux (fusion de doublons, +8 %/niveau) et les mutations (or +5 %, céleste +10 %, ombre +15 %).
