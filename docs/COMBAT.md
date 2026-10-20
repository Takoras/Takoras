# Combat Takoras — le plan (décidé le 20/10/2026)

## Les décisions
- **Semi-automatique, rapide** (30 s à 1 min) : les jetons attaquent tout seuls ; le joueur déclenche la **capacité** de
  chaque jeton quand sa jauge d'énergie est pleine (en touchant sa carte). Pensé pour le téléphone.
- **Équipe de 3 jetons.**
- **5 éléments** : 🔥 Feu > 🌿 Plante > 💧 Eau > 🔥 Feu, et ✨ Lumière ⇄ 🌑 Ombre (forts l'un contre l'autre).
  Avantage = dégâts ×1,5 · désavantage = ×0,75.
- **Chaque jeton a une capacité (active) et un passif** (voir le tableau).
- **Niveaux par fusion de doublons** : niveau 1 → 10. Passer au niveau N+1 consomme N doublons du même jeton.
  Chaque niveau = +8 % de stats. Les variantes donnent un bonus de stats (Doré +5 %, Céleste +10 %, Ombre +15 %).
- **Classé** : toujours un vrai joueur en face, du même rang. Si la recherche dure, l'écart de rang accepté s'élargit petit à petit.
- **Rangs** : Bronze, Argent, Or, Platine, Diamant, Maître (3 divisions chacun), puis **Légende** = top 10 du serveur.
- **Saison classée : 1 mois.** Récompenses de fin de saison selon le rang, puis rangs en partie remis à zéro.
- **Battle pass** par saison : beaucoup d'XP avec les combats, un peu avec les pulls (pour inciter à ouvrir).
  Ligne **gratuite** + ligne **Premium** (achat en vrai argent, configuré plus tard par le propriétaire du site).
- **Récompenses** : pièces, pulls Takoras, objets, récompenses de saison.

## Les étapes
1. **Moteur semi-auto + éléments + capacités / passifs + niveaux (fusion) + robot d'entraînement.**
2. Classé en direct : file d'attente par rang, rangs et points, saisons d'1 mois, classement.
3. Battle pass (gratuit + Premium), XP des combats et des pulls, récompenses.

## Éléments, capacités et passifs

| Jeton | Élément | Capacité (active) | Passif |
|---|---|---|---|
| Mobu 1/2 | 💧 Eau | **Bulle** : bouclier (20 % des PV max) sur l'allié le plus blessé | **Collant** : ses attaques ralentissent la cible |
| Pikko 1/4 | 🌿 Plante | **Épines** : 3 piqûres sur des ennemis au hasard | **Pollen** : soigne l'équipe un peu, régulièrement |
| Rouillé 1/10 | 🔥 Feu | **Rouille** : −30 % de défense à la cible | **Ferraille** : en tombant K.O., blesse tous les ennemis |
| Givre 1/25 | 💧 Eau | **Gel** : gèle la cible 2 s | **Froid** : +25 % de dégâts sur les cibles ralenties ou gelées |
| Soléo 1/60 | 🔥 Feu | **Soleil** : soigne toute l'équipe | **Aube** : commence avec la moitié de son énergie |
| Azura 1/150 | 💧 Eau | **Raz-de-marée** : dégâts à tous les ennemis | **Courant** : chaque capacité alliée lui donne de l'énergie |
| Carmin 1/400 | 🔥 Feu | **Saignée** : grosse attaque qui le soigne de la moitié des dégâts | **Rage** : plus il est blessé, plus il tape fort |
| Vyolis 1/1 000 | 🌑 Ombre | **Barrière** : bouclier sur toute l'équipe | **Écho** : 20 % de chance de frapper deux fois |
| Lumis 1/2 500 | 🌿 Plante | **Éblouir** : la cible rate ses 2 prochaines attaques | **Éclat** : ses coups critiques font +50 % |
| Nyx 1/5 000 | 🌑 Ombre | **Ombre** : esquive tout pendant 3 s, sa prochaine attaque ×2 | **Nuit** : +20 % de vitesse |
| Astra 1/10 000 | ✨ Lumière | **Étoile filante** : frappe l'ennemi le plus faible, critique garanti | **Constellation** : chaque critique de l'équipe lui donne de l'énergie |
| Kraïos 1/25 000 | 💧 Eau | **Tempête** : frappe et ralentit tous les ennemis | **Fureur** : +5 % d'attaque à chaque attaque (10 fois max) |
| Koi 1/50 000 | 🔥 Feu | **Courant** : remplit l'énergie des alliés de 50 % | **Chance** : 10 % d'esquive |
| Néphéris 1/100 000 | 🌿 Plante | **Malédiction** : la cible perd des PV pendant 6 s | **Racines** : renvoie 20 % des dégâts reçus |
| Zénith 1/250 000 | ✨ Lumière | **Aube** : ressuscite un allié K.O. (une fois par combat) | **Halo** : l'équipe subit −10 % de dégâts |
| Oblivion 1/500 000 | 🌑 Ombre | **Néant** : dégâts énormes qui ignorent boucliers et défense | **Vide** : les ennemis touchés sont moins soignés |
| Takoras 1/1 000 000 | ✨ Lumière | **Jugement** : dégâts à tous les ennemis + bouclier à toute l'équipe | **Couronne** : +15 % à toutes les stats de l'équipe |

## Règles techniques
- Le moteur (`public/combat-engine.js`) est **déterministe** : même équipes + même graine + mêmes moments où les
  capacités sont lancées = même combat. Le serveur pourra donc rejouer et vérifier un combat classé (étape 2).
- Un combat avance par « tics » de 100 ms. Chaque jeton remplit sa jauge d'attaque selon sa vitesse ; l'énergie de la
  capacité monte avec le temps, les coups donnés et reçus.
