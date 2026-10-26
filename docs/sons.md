# Sons et musiques : quoi fournir

Le site joue encore ses sons synthétisés. Dès qu'un fichier est déclaré dans `src/data/sounds.json`
(et posé dans `public/sfx/`), il remplace le son synthétisé correspondant. Format conseillé : `.ogg` (Opus) ou `.mp3` 96-128 kb/s.

**Règle :** aucun fichier sans licence vérifiée. Préférer CC0 / CC BY ; pas de licence NC (le jeu sera monétisé), pas de ND si on coupe la piste.
Chaque fichier ajouté = une ligne dans la table `credits` (affichée dans « Crédits » en bas de l'accueil).

## Sons d'interface (pack « Zen » de uisfx.com, licence à vérifier avant)
| Clé (sounds.json → ui) | Fichier | Quand |
|---|---|---|
| hover | `/sfx/ui-hover.ogg` | survol d'un bouton |
| click | `/sfx/ui-click.ogg` | clic sur un bouton |
| select | `/sfx/ui-select.ogg` | choisir un jeton, un onglet |
| deny | `/sfx/ui-deny.ogg` | action refusée |
| message | `/sfx/ui-message.ogg` | message d'un ami |
| upgrade | `/sfx/ui-upgrade.ogg` | achat, niveau gagné, récompense |
| next | `/sfx/ui-next.ogg` | jeton suivant pendant une ouverture |

## Révélation d'un jeton (sounds.json → reveal)
`common` (1/2 à 1/99), `rare` (1/100+), `epic` (1/1 000+), `legend` (1/10 000+), `mythic` (1/100 000+) : `/sfx/reveal-<palier>.ogg`.

## Musiques des jetons très rares (sounds.json → music)
Une piste par jeton : Vyolis, Lumis, Nyx, Astra, Kraïos, Koi, Néphéris, Zénith, Oblivion, Takoras → `/sfx/music-<jeton>.ogg`
(Pixabay Music, Incompetech CC BY 4.0 avec attribution, OpenGameArt CC0/CC BY).
