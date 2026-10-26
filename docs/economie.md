# Économie de Takoras : comment les prix sont calculés

## Repères
- **1 pull ≈ 33 pièces** : la recharge éclair (500 pièces) donne 15 pulls.
- **Revente moyenne d'un pull** : ~10 pièces (revente = cote × 0,5, × 3 / 10 / 25 pour Doré / Céleste / Ombre).
  La plupart des pulls rapportent 1-2 pièces ; la moyenne vient des jetons rares.
- **Revenus d'un joueur actif** : ~3 000 à 6 000 pièces par jour (cadeau du jour 500 → 2 000 avec la série, quêtes, reventes).

## Potions
Tirage : du plus rare au plus commun, chance `chance / cote` à chaque jeton.
Valeur d'une potion = nombre de pulls normaux qu'il faudrait pour avoir autant de chances d'un jeton 1/1000 ou plus, × 33.

| Potion | Pulls | Équivalent pulls | Prix |
|---|---|---|---|
| ×1,3 | 10 | 3 | 100 |
| ×2 | 6 | 6 | 200 |
| ×5 | 3 | 12 | 400 |
| ×10 | 4 | 36 | 1 200 |
| ×25 | 5 | 118 | 4 000 |
| ×50 | 6 | 286 | 9 500 |
| ×100 | 10 | 937 | 31 000 |
| ×250 | 10 | 2 168 | 72 000 |
| ×500 | 5 | 1 884 (+ jetons ultra rares) | 90 000 |

Avant : les potions coûtaient 11 à 105 fois leur valeur (×500 à 1,5 M = un an de revenus).

## Autres objets
- Sablier (60 min de recharge = 20 pulls) : 700.
- Recharge éclair (15 pulls, 2 par période) : 500.
- Cosmétiques : commun 1 000 · rare 2 500 · animé 25 000.

## Kit de départ (une fois, au choix du pseudo)
1 500 pièces · 10 pulls · 2 potions ×1,3 · 1 potion ×2 · 1 recharge éclair.

## Stats du Ring
`bonus = min(15 %, 12 % × (1 − e^(−n/4)) + mutation)` ; n = niveaux gagnés, mutation Doré 3 % · Céleste 5 % · Ombre 8 %.
Simulation (800 matchs, visée imprécise comme un joueur) : niveau 10 contre niveau 1 ≈ 62 % de victoires, niveau 10 Ombre ≈ 67 %.
