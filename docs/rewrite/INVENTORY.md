# Inventaire du site actuel (avant réécriture React)

Photo du front vanilla au 22/10/2026 (`public/`). La liste exhaustive des RPC, tables, canaux temps réel,
clés `localStorage`, routes et clés de traduction est générée automatiquement :

```bash
python3 scripts/parity/extract.py public > docs/rewrite/legacy-inventory.json
```

| Élément | Nombre |
|---|---|
| Lignes de JS | ~6 200, en 23 `<script>` globaux (`public/index.html:303-330`) |
| `style.css` | 214 Ko, 2 490 lignes, 64 `@keyframes` |
| RPC Supabase appelées | 71 (dont ~30 `admin_*`) |
| Tables lues en direct (`sb.from`, lecture seule) | 6 : profiles, pulls, announcements, site_settings, shop_items, patchnotes |
| Canaux temps réel | 3 : `annonces`, `prix`, `social-<uid>` (tables announcements, price_changes, messages, friendships) |
| Clés `localStorage` | 12 (`takoras-*`) + jeton de session Supabase |
| Routes (`#…`) | 7 + accueil |
| Clés de traduction FR (= EN) | ~608 (settings 410, arena 116, ring-ui 68, info 14) + tuto 10 écrans |

## Fichiers et rôle

| Fichier | Rôle | État global |
|---|---|---|
| `settings.js` | Réglages (vitesse, langue, volume, effets), dictionnaire I18N, variantes, détection WebKit, modale Paramètres | `SETTINGS`, `I18N`, `VARIANTS`, `WEBKIT_ONLY` |
| `ring-config.js` | Valeurs d'équilibrage du Ring | `RCFG` (**à garder tel quel**) |
| `ring-engine.js` | Moteur physique déterministe du Ring + IA | `RG` (**à garder tel quel**) |
| `combat-engine.js` | Éléments des jetons, stats affichées | `CB` (**à garder tel quel**) |
| `account.js` | Client Supabase (clé publishable), connexion Discord, pseudo obligatoire, `esc()` | `sb`, `ACC` |
| `sound.js` | Sons 100 % synthétisés (Web Audio) | `sfx` |
| `app.js` | Accueil : jeton héros 3D, historique, flux en direct, classement | `PULLS`, `$` |
| `cinema.js` | Cinématiques ≥ 1/1000 (canvas + musique générée, 10 thèmes, 26 scènes) | `CINE` |
| `transitions.js` | Transition « pixels » vers l'écran d'ouverture, raccourci « debug » admin | — |
| `opening.js` | Gacha : catalogue des 17 jetons, compteur au tap, pièce 3D, révélation, variantes, multi-pull, récap, turbo/auto, remboursement, reprise de session | `SERIES`, `sess`, `run` |
| `economy.js` | Pièces, stock, recharge, améliorations, synchro de l'état serveur (`applyState`) | `eco` |
| `ui.js` | Routeur, fiche jeton, avatars/badges bêta, toast, `ask()`, erreurs serveur | `PAGES` |
| `motion.js` | Animations de listes (FLIP) et dissolution en pixels | `MO` |
| `inventory.js` | Bestiaire (séries, variantes, filtres, tri, recherche, vente, verrou, niveau) et Objets | `INV`, `COLL` |
| `shop.js` | Boutique du jour, achat, codes promo | `SHOP` |
| `info.js` | Modale « Probas & infos » | `INFO` |
| `profile.js` | Profil public, vitrine 5 cases, édition (pseudo, bio, bannière, avatar) | `PROF` |
| `social.js` | Annonces + prix en temps réel, amis, chat dock | `ANN`, `FR` |
| `ring-ui.js` | Écran du Ring (visée lance-pierre, aperçu, révélation, animation, équipes, fiches, fin, tuto 6 étapes) | `RNG`, `RT` |
| `ring-fx.js` | Mise en scène et sons des 17 pouvoirs | `RFX`, `RSND` |
| `arena.js` | Page Combat (rang, JOUER, entraînement, équipe, éditeur, fiches, montée de niveau) | `ARENA`, `AT`, `ELS` |
| `quests.js` | Bonus du jour + 3 quêtes | `QST` |
| `beta.js` | Menu testeur, patch notes + popup | `BETA` |
| `feedback.js` | Bouton et modale « Donner un avis » | — |
| `admin.js` | Panel admin 8 onglets ; lance `route()` au chargement | — |
| `mobile.js` | Barre d'onglets < 760 px, menu « Plus », hauteur du clavier | — |
| `tuto.js` | Tuto de première visite (10 écrans) | `TUTO` |

## Routes

| Ancienne URL | Page | Future URL |
|---|---|---|
| `#` / `#accueil` | Accueil (pulls, jeton héros, quêtes, historique, en direct) | `/` |
| `#inventaire`, `#bestiaire` | Bestiaire | `/inventaire` |
| `#inventaire/objets` | Objets | `/inventaire/objets` |
| `#boutique` | Boutique | `/boutique` |
| `#profil`, `#profil/<pseudo>` | Profil | `/profil`, `/profil/<pseudo>` |
| `#amis` | Amis | `/amis` |
| `#combat` | Combat (Ring) | `/combat` |
| `#classement` | Classement | `/classement` |

Les anciens liens `#…` devront rediriger vers les nouvelles URL.

## Modales et overlays

- Fiche jeton (`#jm-card`), réutilisée par 8 vues.
- Paramètres, Compte (connexion, pseudo).
- Confirmation `ask()`, toast, annonce plein écran.
- Écran d'ouverture + cinématique.
- Ring : écran, fiche, tuto, fin. Éditeur d'équipe.
- Panel admin, menu testeur, avis, patch notes, tuto, chat dock.

## Effets lourds à porter sans les réécrire

- `opening.js` : fond canvas pixel, pièce 3D en couches, turbo (flou radial + traînées), arrêt auto sur rare.
- `cinema.js` : canvas basse résolution + musique générée.
- `transitions.js` : grille de pixels.
- `ring-ui.js` + `ring-fx.js` : canvas du Ring, ralentis, particules, auras, sons.
- `motion.js` : FLIP + dissolution.
- Effet « doodle » (filtres SVG `#dd0-2`), désactivé sur Safari/iOS et en effets réduits.
- Mode effets réduits (`html.reduce-fx`).

## Assets (`public/img/`)

- Logo et pièce.
- 17 jetons, dont 2 GIF animés (Kraïos 46 Ko, Néphéris 160 Ko en grille 74). Zénith, Oblivion et Takoras utilisent `template.png`.
- 3 potions + teintes CSS, 2 objets, 6 photos de profil (dont `etoile.gif`), 2 bannières 2400×600.
- Aucun fichier audio, aucune police locale (Google Fonts : Inter, Space Grotesk).

## Code mort et pièges repérés

- Code mort : `#battle` (HTML), `duelSub()` (appelée, jamais définie), `cinematic()`, `draw()` local, minuteur limité/week-end, `COLORS`, `isTakoras()`.
- Edge function `supabase/functions/battle` : plus appelée, utilise la clé service, CORS `*`.
- `select()` est réassigné par economy.js ; `$` vient d'app.js ; `esc` vient d'account.js ; `route()` est lancé par admin.js.
- Le Ring utilise `confirm()` natif pour abandonner.
- `toast()` et `t()` insèrent du HTML sans échapper : chaque appelant doit échapper.
- Changer de langue recharge la page.

## Formules à garder identiques au serveur

- `sellValue` (`ui.js:8`)
- `regenCost`, `upgradeCost` (`economy.js:11-12`)
- `realOdds` (`info.js:51`)
- `VARIANTS` (`settings.js:182`)
- `CB.power`, `RG.stats`
- Catalogue `SERIES` (`opening.js:10`)
