# Labo sons de Takoras — tour 1 (3 prototypes)

Sons 100 % synthétisés par `gen.mjs` (bruit filtré, transitoires, modes très amortis). Aucun échantillon externe,
pas de bip tonal, pas de laser, pas de cloche, pas de batterie, pas de réverb. Lancer : `node sound-lab/gen.mjs`.

## 1. Carte des événements visuels du site, par fonction

| Fonction | Ce qu'on voit à l'écran | Exemples dans Takoras | Son |
|---|---|---|---|
| **Micro-cut** | changement instantané, très court | clic sur un bouton, onglet, puce de filtre, chaque cran du compteur 1/N pendant l'ouverture | **A · tik** |
| **Object lock** | un objet qui se pose / s'enclenche | le jeton qui atterrit après sa rotation, un jeton qui entre dans l'équipe, « Mettre en vitrine », récupérer une quête, choisir un tampon de mutation | **B · klak** |
| **Texture movement** | une matière qui défile ou tourne | le jeton qui tourne, le compteur qui défile en ouverture auto, les barres qui se remplissent (passe, route des rangs) | **C · crr** |
| Transition | un écran remplace un autre | volet de pixels vers l'ouverture, fenêtre qui s'ouvre, changement de page | *pas encore (tour 2)* |
| Resolve | la récompense, la fin heureuse | révélation d'un jeton rare, rang gagné, amélioration achetée, victoire | *pas encore (tour 2)* |

On commence volontairement par 3 sons seulement. Les 2 dernières fonctions viendront après ton retour.

## 2. Les 3 prototypes (`out/`)

| Fichier | Durée | Description |
|---|---|---|
| `A_micro-cut_tik.wav` | 40 ms, mono | double contact sec : clic large bande + bruit aigu filtré, un 2e contact plus faible 9 ms après |
| `B_object-lock_klak.wav` | 140 ms, mono | loquet aigu, puis 20 ms après la pièce qui se pose (bruit grave + « matière » très courte) |
| `C_texture_crr.wav` | 480 ms, stéréo | cliquet d'engrenage qui accélère puis freine, grains alternés légèrement gauche/droite + souffle léger |

Format : WAV 48 kHz, 24 bits. Chaque fichier seul est calé à −1,5 dBTP.

## 3. Bobine d'écoute (`out/reel.wav`, 8,2 s)

Chaque son joué 3 fois, à niveau égal (même sonie pondérée K sur 100 ms). Repères : `out/cue-sheet.csv`.

| Temps | Son |
|---|---|
| 0:00.500 · 0:01.100 · 0:01.700 | A · tik |
| 0:02.900 · 0:03.500 · 0:04.100 | B · klak |
| 0:05.300 · 0:05.900 · 0:06.500 | C · crr |

## 4. Vérifications faites (mesurées par le script, voir `out/report.json`)

| Contrôle | A | B | C | Bobine |
|---|---|---|---|---|
| Crête réelle (sur-échantillonnée ×4) | −1,5 dBTP | −1,5 dBTP | −1,5 dBTP | −1,0 dBTP |
| Fin propre (niveau de la dernière ms) | −99 dBFS | −142 dBFS | −104 dBFS | — |
| Courant continu | ≈ 0 | ≈ 0 | ≈ 0 | — |
| Compatibilité mono | mono | mono | corrélation 0,92, perte en mono 0,2 dB | — |
| Égalisation des niveaux | | | | les 3 à −24,7 LUFS (fenêtre 100 ms) |

Spectrogrammes vérifiés : aucune ligne horizontale (donc rien de tonal), pas de queue de réverb.
Ces chiffres ne disent pas si le son est **bien** : seule une écoute le dit.
