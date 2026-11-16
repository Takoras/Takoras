# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Joueurs surtout français de 13 à 25 ans (âge minimum prévu : 15 ans à l'inscription). Ils jouent surtout sur téléphone tenu à l'horizontale, souvent depuis l'appli installée (raccourci plein écran), en sessions courtes : ouvrir des boîtes, faire un duel Ring, réclamer les paliers du pass. Une partie joue aussi sur PC.

## Product Purpose
Takoras est un jeu de collection (gacha) de jetons en pixel art, avec des duels « Ring » classés. Le joueur ouvre des boîtes, collectionne des jetons de rareté commune à mythique (et leurs mutations Dorée, Céleste, Ombre), compose une équipe et affronte d'autres joueurs. Réussite : des joueurs qui reviennent chaque jour (série de connexion, pass de saison) et un revenu modeste et honnête (objectif d'abord ~50 €/mois).

## Positioning
Tout le pixel art est dessiné à la main par le créateur seul ; chaque jeton rare a sa propre cinématique d'ouverture et sa propre musique. La collection sert vraiment : les jetons s'utilisent en duel Ring classé. Pas de pay-to-win imposé.

## Operating Context
- Séries de jetons (plusieurs séries prévues, avec filtre par série et une série « à venir »).
- Boutique en pièces, pass de saison (gratuit + premium), série de connexion (flamme), profil avec bestiaire, amis, classement.
- Ouverture de boîtes avec suspense puis cinématique par jeton ; on peut toujours passer.
- Interface en français et en anglais (`src/i18n/fr.ts`, `en.ts`).

## Capabilities and Constraints
- Stack existante : Vite, React 19, TypeScript, Supabase (base de prod partagée par le staging), Cloudflare Workers.
- Téléphone : rendu en paysage à ~640 px de haut (phone.js), invitation à installer l'appli. PC : zoom selon la largeur d'écran, et un zoom propre à chaque page.
- Achats réels (Stripe) pas encore actifs : en attente de la micro-entreprise. Achat minimum prévu 0,99 €.
- Pages légales (mentions légales, CGV, confidentialité) à venir ; l'adresse publiée sera une domiciliation, jamais l'adresse personnelle du créateur.

## Brand Commitments
- Nom : Takoras. Logo : `public/img/logo-takoras.png` (avec effet doodle).
- Pixel art net, effet « doodle » vivant sur les sprites.
- Sons générés pour chaque interaction ; musiques composées par jeton.
- Ton : direct, familier, court.

## Evidence on Hand
- Sprites, icônes, textures et bannières dessinés par le créateur dans `public/img/`.
- Pas de témoignages, chiffres de joueurs ni presse : ne pas en inventer.

## Product Principles
1. Le jeton est la star : l'interface s'efface devant le pixel art.
2. Sessions courtes sur téléphone : chaque action en quelques gestes, toujours possible de passer une animation.
3. Récompenser sans piéger : pas de pay-to-win, prix honnêtes, pas de mécanique trompeuse pour un public jeune.
4. Penser multi-séries dès le départ.

## Accessibility & Inclusion
Public jeune (dès 15 ans) : textes simples, cibles tactiles de 44 px minimum, animations réduites si `prefers-reduced-motion`.
