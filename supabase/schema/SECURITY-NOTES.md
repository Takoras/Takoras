# Notes de sécurité — extraction du 2026-10-21

Constats factuels relevés en lisant `baseline.sql`. **Rien n'a été corrigé** : c'est la phase 2
(migrations). Gravité indicative : 🔴 exploitable par un joueur, 🟠 à durcir, 🟢 vérifié OK.

## Comptes

99 fonctions dans `public` (87 SECURITY DEFINER, 12 SQL/plpgsql « invoker » utilitaires),
24 tables, 12 policies, 0 trigger dans `public` (1 trigger sur `auth.users`), 15 index hors
contraintes, 5 tables en realtime, 5 extensions, pas de `pg_cron`.
NB : le plan parlait de ~71 RPC ; 99 inclut 23 fonctions internes `_xxx` et `handle_new_user`.
Côté client, 75 fonctions sont exécutables par `authenticated` (dont 30 `admin_*`), 8 par `anon` (via PUBLIC).

## 🔴 Problèmes exploitables

### 1. `battle_result(p_win, p_lose)` sans aucun contrôle
Exécutable par tout `authenticated`. Pas de vérification de `auth.uid()`, ni d'un combat
existant dans `battles`, ni de `_is_admin()`. N'importe quel joueur peut appeler
`battle_result(<moi>, <n'importe qui>)` en boucle : +victoires pour lui, +défaites pour un
autre joueur, et `_bump(p_battles, p_wins)` alimente `daily_stats` → les quêtes « combats /
victoires » deviennent réclamables (`claim_quest`) → pièces / objets gratuits.

### 2. Bêta ouverte = tout le monde est testeur
`site_settings.beta = 'on'` et `handle_new_user()` met `profiles.beta = _beta_open()` à
l'inscription. Résultat au moment de l'extraction : **9 profils sur 9 ont `beta = true`**.
`_is_tester()` = `profiles.beta AND _beta_open()` est donc vrai pour tout le monde, ce qui
débloque :

- **`beta_give(...)`** : ajoute jusqu'à +∞ pièces par appel (plafond 10¹² au total), remet
  le stock de pulls à 50, donne n'importe quel objet de la boutique (×100), et insère jusqu'à
  50 jetons au choix **avec la variante au choix** (`p_variant` libre, seule la contrainte
  `pulls_variant_check` limite à gold/celeste/ombre). Appel répétable sans limite.
- **`take_pulls(n, force, luck, p_variant)`** : pour un joueur normal (ni `is_admin` ni
  testeur) les trois paramètres sont neutralisés (`force := null; luck := 1; p_variant := null`)
  → 🟢 correct. Mais comme tout le monde est testeur, n'importe qui peut forcer le jeton
  (`force`), multiplier la chance jusqu'à ×1 000 000 (`luck`) et choisir la variante.

Tant que la bêta est ouverte, l'économie (classements, `live_feed`, collection) n'est pas fiable.

### 3. `pseudo` modifiable directement, hors `change_pseudo`
Droit colonne `GRANT UPDATE (pseudo) ON profiles TO authenticated` + policy
« profil: modifier le sien ». Un joueur peut faire `update profiles set pseudo = …` via
PostgREST et contourner les règles de `change_pseudo` / `set_pseudo` (délai de 30 jours,
`pseudo_free`, `pseudo_changed_at`). Le format (CHECK) et l'unicité (index `lower(pseudo)`)
restent garantis.

## 🟠 À durcir

### 4. Droits de table trop larges pour `anon` / `authenticated`
Toutes les tables donnent `SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER`
à `anon` et `authenticated` (droits Supabase par défaut ; seules exceptions : `profiles`
sans UPDATE de table, `pulls` sans INSERT). Aujourd'hui c'est la RLS qui bloque tout
(aucune policy INSERT/DELETE, une seule policy UPDATE), donc pas d'exploitation via l'API.
Mais `TRUNCATE` n'est **pas** soumis à la RLS : le jour où un rôle client peut exécuter du SQL
arbitraire (ou si la RLS est désactivée par erreur sur une table), les données sont exposées.
Phase 2 : `REVOKE` au strict nécessaire (lecture seule sur les tables publiques, rien ailleurs).

### 5. Tables avec RLS activée mais sans aucune policy
`daily_stats`, `feedback`, `pending_pulls`, `promo_codes`, `promo_redeems`, `quests`,
`shop_buys`, `shop_buys2`, `shop_overrides`, `shop_price_overrides`, `shop_settings`,
`token_levels`, `user_items` : accès client impossible (tout passe par les RPC). C'est
voulu, mais à documenter (lint Supabase « RLS enabled no policy »).

### 6. Fonctions lisibles par `anon` (PUBLIC)
`avatars_of`, `beta_of`, `collection_of`, `leaderboard`, `live_feed`, `profile_public`,
`pseudo_available`, `shop_today` : exposent pseudos, avatars, statut bêta, collection et
historique de tirages de n'importe quel joueur sans être connecté. Probablement voulu
(pages publiques) ; à confirmer.

## 🟢 Points vérifiés (contrairement à ce qu'on craignait)

- **Toutes les tables ont la RLS activée** (24/24, aucune en FORCE). Aucune table sans RLS.
- **Policies `pulls` / `messages` / `friendships` : pas de `USING (true)`.** Elles sont
  restreintes au joueur (`user_id = auth.uid()`, `sender`/`receiver`, `a`/`b`), SELECT
  seulement. Les seules policies `USING (true)` sont en lecture sur des tables publiques :
  `announcements`, `jetons`, `patchnotes`, `price_changes`, `shop_items`, `site_settings`.
- **`search_path`** : les 87 fonctions SECURITY DEFINER ont `SET search_path TO ''`, et les
  12 autres aussi. Aucune fonction sans search_path.
- **Fonctions `_xxx`** (23) : `EXECUTE` uniquement pour `service_role`, pas pour
  `anon`/`authenticated`/PUBLIC.
- **`admin_*`** (30) : exécutables par `authenticated` (pas `anon`), et **toutes** appellent
  `public._is_admin()` qui lève `forbidden` sinon.
- **`_is_admin()`** : lit `profiles.is_admin` du `auth.uid()` courant, `false` si absent.
  `is_admin` n'est pas modifiable par le client (pas de droit UPDATE de table sur `profiles`,
  seul `pseudo` l'est). 1 admin en base.
- **`profile_public(p_pseudo)`** : `email`, `provider`, `banners`, `avatars`, `pseudo_free`,
  `pseudo_next` ne sont renvoyés **que si `mine`** (profil = `auth.uid()`), sinon `null`.
  Pas de fuite d'email/provider vers un autre joueur. Il renvoie en revanche `beta`,
  `num`, `streak`, `joined`, victoires/défaites, vitrine et stats de tirage à tout le monde.
- **Realtime** : `battles`, `friendships`, `messages` publiées mais filtrées par leurs
  policies SELECT (propres au joueur) ; `announcements`, `price_changes` publiques.
- Pas de `pg_cron`, pas de secret trouvé dans les corps de fonction (aucune URL, clé ou token).
