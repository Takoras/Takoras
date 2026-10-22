# Checklist de parité : ancien site → React

Chaque ligne se coche quand elle marche dans le nouveau site **et** qu'elle est vérifiée (test automatique, ou test manuel en 375 px et 1280 px).

## Vérifications automatiques

```bash
python3 scripts/parity/extract.py src --diff docs/rewrite/legacy-inventory.json
```

La commande doit renvoyer `{"missing": {}}`.

- [ ] Toutes les **71 RPC** sont appelées par le nouveau front (`rpc`).
- [ ] Les **6 tables** lues en direct (`tables`) et les **4 tables temps réel** (`realtime`) sont reprises.
- [ ] Les **12 clés `localStorage`** sont reprises (`storage`), ou une migration est documentée. Clés à garder :
  - `takoras-settings`, `-muted`, `-hist` ;
  - `takoras-pn-seen`, `-tuto-done`, `-ring-tuto` ;
  - `takoras-ann-seen`, `-ann-closed` ;
  - `takoras-session`, `-eco`.
  - Note (phase 7) : `takoras-eco` (cache de l'économie de l'ancien site) est remplacé par le cache TanStack Query ; `takoras-lowfx` était seulement effacé par l'ancien site. Les routes `#accueil`, `#amis`… signalées par le script sont redirigées par `src/app/legacyHash.ts` (le script ne reconnaît pas cette forme).
- [ ] Les **~608 clés de traduction** existent en FR et en EN (la compilation échoue si une clé EN manque).
- [ ] Les anciens liens `#…` redirigent vers les nouvelles URL.

## Général

- [ ] Écran de chargement (préchargement des images, 0,6 à 2,5 s).
- [ ] Barre du haut :
  - logo + puce bêta ;
  - liens Accueil, Inventaire, Boutique, Classement, Combat, Amis, avec soulignement animé ;
  - cloche (+ badge), paramètres, son, flamme de série, solde, compte.
- [ ] Mobile < 760 px :
  - barre de 5 onglets ;
  - menu « Plus » : classement, profil, combat, testeur, tuto, avis, patch notes, annonces, paramètres, son, admin ;
  - badges ;
  - clavier qui ne cache pas les champs.
- [ ] Transitions de page : sortie vers le haut, entrée par le bas en cascade.
- [ ] Paramètres :
  - vitesse (normal / rapide / instant), langue (sans recharger la page), volume, effets (auto / complet / réduit) ;
  - « Revoir le tuto », « Tuto du Ring » ;
  - Échap ferme.
- [ ] Effets réduits automatiques sur le matériel faible.
- [ ] Doodle désactivé sur Safari/iOS.
- [ ] Sons synthétisés : clic, survol et tous les sons de jeu ; bouton muet mémorisé.
- [ ] Toast, confirmation maison (y compris « taper le mot »), erreurs serveur traduites.
- [ ] Bandeau d'annonce, annonce plein écran avec les annonces manquées, historique, temps réel. (Fait et testé avec Supabase simulé ; temps réel à vérifier en vrai.)
- [ ] Notification de changement de prix, cliquable vers la boutique. (Fait ; temps réel à vérifier en vrai.)
- [ ] Bannissement : bandeau `#ban-bar`.

## Compte

- [ ] Connexion Discord, la session tient au rechargement, déconnexion.
- [ ] Choix du pseudo obligatoire (la modale ne se ferme pas sans pseudo).
- [ ] Le bouton compte mène au profil.

## Accueil

- [ ] Panneau Pulls + réglages « Tout ouvrir d'un coup » :
  - seuil de rareté ;
  - variantes qui arrêtent l'ouverture.
- [ ] Jeton héros :
  - inclinaison vers la souris, reflet ;
  - balancement au repos ;
  - pause quand il n'est pas visible.
- [ ] Économie :
  - stock X/Y, compte à rebours de recharge ;
  - « Ouvrir 1 », « Tout ouvrir » (50 max) ;
  - amélioration du stock (+1) et de la recharge (−10 s, minimum 1 min) ;
  - effets actifs, lien « ℹ️ Probas ».
- [ ] Bonus du jour avec flamme de série, 3 quêtes (progression, récupérer, renouvellement), toast « quête terminée ».
- [ ] Historique : 6 dernières entrées avec chance 🍀.
- [ ] Ruban « En direct » (beaux tirages seulement, toutes les 15 s).

## Ouverture (gacha)

- [ ] Transition pixels.
- [ ] Jeton mystère en 3D.
- [ ] Compteur 1/1 → 1/X au tap / Espace / Entrée, avec paliers sautés au hasard.
- [ ] Halo, shake, flash, étincelles selon le palier.
- [ ] Pause finale (battements de cœur ≥ 1/100 000).
- [ ] Rotation et révélation :
  - fiche (nom, rareté, chance, stats) ;
  - bandeau de variante Doré / Céleste / Ombre.
- [ ] Fond canvas pixel qui s'enrichit avec la rareté (6 niveaux).
- [ ] Cinématique ≥ 1/1000 (thème par jeton, musique, passable après 2 s).
- [ ] Multi-pull : « Suivant », récap groupé ×N trié par rareté, croix pour fermer.
- [ ] Mode turbo :
  - environ 0,2 s par jeton ;
  - flou radial, traînées, combo, note qui monte ;
  - arrêt auto sur rare / variante.
- [ ] « Retour au menu » rembourse les pulls non ouverts (`refund_pulls`).
- [ ] Reprise de la session après un rechargement de page.
- [ ] Échap, sortie animée.

## Inventaire

- [x] Bestiaire :
  - onglets de séries ;
  - progression (jetons, variantes) ;
  - onglets de variantes ;
  - filtres de rareté, « Possédés », recherche ;
  - tri (rareté, quantité, récents, nom) ;
  - cartes possédé / vu / inconnu (silhouette) ;
  - badges ⚔️ 📌 🔒.
- [x] Mode sélection :
  - quantité par carte ;
  - Doublons / Communs / Tout / Rien ;
  - Vendre, avec confirmation si un jeton ≥ 1/1000.
- [x] Fiche jeton :
  - 3D + reflet ;
  - rareté, chance × variante ;
  - puissance, 3 stats ;
  - valeur de revente ;
  - vendre 1, vendre les doublons, verrouiller ;
  - pouvoir du Ring + monter de niveau.
- [x] Objets : quantité, −/+, « Utiliser ×N », « Tout utiliser ».

## Boutique

- [x] Boutique du jour :
  - stock 5 h + compte à rebours ;
  - catégories ;
  - stock / épuisé / déjà possédé ;
  - prix barré ±% ;
  - achat (secousse si pas assez de pièces, dissolution, pop).
- [x] Code promo (pluie de pièces).
- [x] Modale « Probas & infos » :
  - règles ;
  - simulation de chance ;
  - tableau des jetons et des variantes.

## Profil

- [x] Profil public :
  - bannière, avatar, pseudo, numéro, flamme ;
  - bio, 4 stats ;
  - vitrine 5 cases ;
  - mini-bestiaire ;
  - badge bêta, date, bilan de combats.
- [x] Mon profil : zone privée (provider, email, paramètres, déconnexion).
- [x] Choix de la vitrine (recherche + tri).
- [x] Modifier :
  - pseudo (1 gratuit, puis 1 tous les 30 jours) ;
  - bio (120 caractères max) ;
  - bannières, avatars (verrouillés → boutique).

## Classement

- [x] 4 types : pulls, gain, variantes, collection.
- [x] Semaine / toujours.
- [x] Podium + liste 4 à 50, rafraîchi toutes les 60 s.

## Amis et chat

- [x] Ajouter par pseudo.
- [x] Demandes reçues (accepter / refuser) et envoyées.
- [x] Liste ; retirer avec confirmation.
- [x] Bouton ami sur les profils.
- [ ] Chat dock (fait et testé avec Supabase simulé ; reste à vérifier à deux vraies sessions) :
  - choix de l'ami, conversation, séparateurs de jour ;
  - réduire / fermer ;
  - lu / non lu, notifications, pastilles ;
  - temps réel.

## Combat (Ring)

- [x] Page Combat :
  - rang + Elo, JOUER (classé bientôt) ;
  - Entraînement ;
  - équipe de 3 + fiches ;
  - aide repliable ;
  - « Essayer le tuto » sans compte.
- [x] Éditeur d'équipe :
  - séries, éléments ;
  - ajouter / retirer ;
  - mutation par place ;
  - budget 8 pts, légende des stats ;
  - fiche ⓘ ;
  - sauvegarde.
- [x] Ring (partie complète testée au doigt en 375 px et à la souris, 60 images/s pendant les tirs) :
  - visée lance-pierre (n'importe où une fois le jeton choisi) ;
  - trajectoire prévue, jauge de force ;
  - pouvoir, Valider, chrono 10 s ;
  - « L'adversaire a validé » ;
  - révélation ;
  - animation : ralentis, traînées, rotation, chutes ;
  - équipes dans les coins + fiche au toucher ;
  - fin du match avec confettis ;
  - abandon (confirmation maison, plus de `confirm()` natif).
- [x] Les 17 pouvoirs avec intro, aura, effet et son.
- [x] Tuto du Ring en 6 étapes.
- [x] Monter de niveau (doublons).

## Bêta, avis, tuto

- [x] Puce bêta, menu testeur (pulls, pièces, objets, jetons, chance / jeton / variante forcés).
- [x] Patch notes groupées (nouveau / changé / corrigé / retiré), FR/EN.
- [x] Popup « nouvelle mise à jour ».
- [x] « Donner un avis » : 4 types, 1 500 caractères, page + appareil.
- [x] Tuto de première visite (10 écrans, swipe), ignoré pour les anciens joueurs.

## Admin (chargé uniquement pour les admins)

- [ ] Joueurs :
  - liste, recherche, tri ;
  - fiche ;
  - dons de pièces, pulls, jetons, objets ;
  - renommer, bannir ;
  - vider vitrine/bio ;
  - messages ;
  - collection ;
  - remise à zéro.
- [ ] Global : stats, don à tous, bêta on/off, remise à zéro générale (taper « RESET »).
- [ ] Boutique : prix, stock, actif, nouveau stock.
- [ ] Annonces : plein écran / bandeau, suppression.
- [ ] Codes promo : créer, aléatoire, objets, utilisations max, expiration, copier, activer, supprimer.
- [ ] Patch notes FR + EN (syntaxe `+ ~ ! -`).
- [ ] Retours : filtres, statuts.
- [ ] Tests (tirages forcés).
- [ ] Raccourci clavier « debug ».

## Corrections à faire pendant la réécriture

Elles ne servent pas à la parité :
- [ ] Supprimer le code mort : `#battle`, `duelSub`, `cinematic`, `draw` local, minuteur limité.
- [ ] Échapper le HTML par défaut (React), sans `dangerouslySetInnerHTML` sur des données joueur.
- [x] Remplacer `confirm()` natif par la confirmation maison.
- [x] Changer de langue sans recharger la page.
- [ ] Zénith, Oblivion, Takoras : images manquantes (signaler, pas bloquant).
