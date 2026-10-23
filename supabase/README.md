# Takoras · plan du site et de Supabase

Le site est **statique** (`public/`) : Cloudflare le redéploie à chaque push sur `main`.
Toute la logique du jeu (tirages, argent, boutique, quêtes…) est dans **Supabase** (projet `joyskjoofihwhycyreyn`),
dans des fonctions SQL `SECURITY DEFINER` avec `search_path = ''`. Le site n'a que la clé publique.

Chaque table et chaque fonction a une description dans Supabase (onglet Database, colonne « Description »).

## Règles

- **Fonctions `_xxx`** : internes. Elles ne sont appelées que par les autres fonctions, jamais par le site.
  Les rôles `anon` et `authenticated` n'ont pas le droit de les exécuter.
- **Fonctions `admin_xxx`** : elles vérifient `_is_admin()` au début. Il faut être connecté pour les appeler.
- **Visibles sans compte** : `leaderboard`, `live_feed`, `profile_public`, `collection_of`, `avatars_of`, `beta_of`,
  `pseudo_available`, `shop_today`. Toutes les autres demandent d'être connecté.
- **Patch notes** : une ligne dans `patchnotes` à chaque mise à jour, en FR (`title`, `lines`) **et** en EN (`title_en`, `lines_en`).
- **Textes du site** : en FR + EN (dictionnaire `I18N` dans `public/settings.js`, ou le `fr`/`en` propre au fichier).
- **Cache** : à chaque déploiement, on change `?v=` dans `public/index.html`.

## Tables

| Table | Rôle | Colonnes |
|---|---|---|
| `profiles` | Joueurs : pseudo, pièces, stock de pulls, potions actives, profil, admin / bêta / ban | id, pseudo, coins, stock, stock_max, stock_last, potions, avatar(s), banner(s), bio, showcase, deck, beta, banned, num… |
| `pulls` | Chaque jeton tiré (avec sa variante) | id, user_id, serie, jeton, odds, variant, sold_at, locked, created_at |
| `jetons` | Jetons tirables (série, nom, rareté) | serie, name, odds |
| `shop_items` | Objets de la boutique | id, kind, price, daily_limit, data, active |
| `shop_buys2` | Achats par période de 5 h (stock partagé) | user_id, period, item, qty |
| `shop_overrides` / `shop_price_overrides` | Stock / prix forcés par l'admin pour la période en cours | item, period, stock / price |
| `shop_settings` | Réglages boutique | k, v |
| `price_changes` | Historique des changements de prix (notif en direct) | item, old_price, new_price |
| `user_items` | Objets possédés | user_id, item, qty |
| `announcements` | Annonces admin | body, fullscreen, banner |
| `friendships` | Amitiés / demandes | a, b, status, requested_by |
| `messages` | Chat privé | sender, receiver, body, read_at |
| `battles` | **Ancien** combat en ligne (fonction Edge `battle`, retirée) : à supprimer après la bascule | p1, p2, state, events, deadline, winner |
| `ranked` | Classé du Ring : Elo, bilan, meilleur Elo, tuto fait | user_id, elo, games, wins, losses, draws, best_elo, tuto_done |
| `ranked_queue` | Classé : joueurs qui cherchent un adversaire (seulement la fonction Edge `ranked`) | user_id, elo, team, joined_at, seen_at |
| `ranked_matches` | Classé : matchs en ligne, état calculé par le serveur, lisibles par les 2 joueurs | p1, p2, names, map, state, turn, ready1/2, misses1/2, last, deadline, status, winner, why, elo |
| `ranked_shots` | Classé : tirs secrets du tour en cours (jamais lisibles par les joueurs) | match_id, turn, side, shot |
| `promo_codes` / `promo_redeems` | Codes promo / qui les a utilisés | code, coins, pulls, items, max_uses… |
| `patchnotes` | Patch notes FR + EN | title, lines, title_en, lines_en |
| `feedback` | Retours des joueurs | kind, body, page, device, status |
| `quests` / `daily_stats` | Quêtes du jour / compteurs du jour par joueur | stat, target, reward… |
| `site_settings` | Réglages du site (ex : `beta = on`) | k, v |
| `shop_buys` | **Ancienne table, plus utilisée.** Peut être supprimée depuis le dashboard | — |

Dans `profiles`, les colonnes `luck_mult`, `luck_left` et `fast_until` datent de l'ancien système de potions,
remplacé par `potions`. On les garde pour l'instant.

## Plusieurs collections

Chaque jeton a une `serie` (Takoras aujourd'hui). `my_inventory`, `my_collection` et `collection_of` renvoient la série :
le Bestiaire affiche un onglet par série dès qu'il y en a plus d'une (les séries viennent de `SERIES` dans `opening.js` et de la table `jetons`).

## Temps réel

La publication `supabase_realtime` contient `announcements`, `messages`, `friendships`, `battles`, `price_changes` et `ranked_matches`.

## Fonctions Edge

- `functions/ranked/` : **classé du Ring**. Appariement par Elo (`join`, `cancel`), tirs secrets (`shoot`), calcul des tours
  quand les deux ont tiré ou à la fin du chrono (`tick`), abandon (`forfeit`), Elo à la fin (`_ranked_end`).
  Elle vérifie elle-même la connexion du joueur et utilise la clé service (jamais côté site).
  `ring-engine.js` et `ring-config.js` sont des **copies exactes** de `src/engines` (un test le vérifie) :
  si le moteur ou ses valeurs changent, recopier les deux fichiers ici et **redéployer la fonction**.
- `functions/battle/` : ancien combat entre amis, retiré (répond 410). À supprimer par le propriétaire après la bascule.

## Fichiers du site (`public/`)

| Fichier | Rôle |
|---|---|
| `settings.js` | Réglages joueur, traductions FR/EN, effets « Auto / Complets / Allégés » (détection des appareils lents) |
| `account.js` | Connexion, pseudo, état du compte |
| `sound.js` | Sons lo-fi (WebAudio) |
| `app.js` | Accueil : pulls, historique, En direct, classement |
| `opening.js` | Ouverture des pulls (compteur, révélation, variantes, mode turbo « Tout ouvrir ») |
| `cinema.js` | Cinématiques à partir de 1/1 000 |
| `economy.js` | Pièces, stock, recharge, potions |
| `ui.js` | Navigation entre pages + transitions, fiches jetons, modales, toasts |
| `motion.js` | Animations (FLIP, dissolution en pixels) |
| `inventory.js` | Inventaire (objets) + Bestiaire (tous les jetons par collection, vente, verrouillage) |
| `shop.js` | Boutique + codes promo |
| `info.js` | Probas & infos |
| `profile.js` | Profils |
| `social.js` | Amis + chat |
| `combat-engine.js` / `arena.js` | Éléments, stats, équipe (combat remis à zéro) |
| `quests.js` | Quêtes du jour |
| `beta.js` | Bêta : menu testeur, patch notes |
| `feedback.js` | Bouton « Donner un avis » |
| `admin.js` | Panel admin |
| `mobile.js` | Barre d'onglets et menu « Plus » sur téléphone |
