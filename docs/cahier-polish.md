# Cahier des charges : polish complet de Takoras

Objectif : un site de jeu vidéo pro et sérieux, sans bug visible, poli dans les moindres détails.
Règles permanentes : skill `takoras-da` (à relire avant chaque changement visible).

## Critères d'acceptation (pour chaque écran)

1. **Même chose = même rendu.** Un élément qui apparaît à plusieurs endroits (stamp de mutation, jeton, pastille ×N, rareté, prix, bouton, case, photo de profil, cosmétique) est strictement identique : même fond, même image, même taille relative, même ombre, même police.
2. **Ce qui ne change pas ne bouge pas.** Aucune boîte ne disparaît pour réapparaître si ses données restent les mêmes. Seuls les chiffres qui changent tournent.
3. **Transitions fluides.** Tout changement de contenu glisse ou fond. Aucun saut de mise en page, aucun remplacement sec, aucun sprite qui change de taille après coup.
4. **Zéro style « IA ».** Pas de halo, de lueur, de dégradé décoratif, de texte en dégradé, de reflet qui passe, de flou animé, de clignotement. Le pixel art et les cases sombres unies portent le style.
5. **Aucune trace de fonctionnalité retirée.** Le combat, le Ring, les duels, les decks, l'Elo des matchs et les noms Bourse, Koo et Azo ne doivent plus apparaître nulle part (textes, balises, mentions légales, aides).
6. **Textes justes.** Pas de « (s) » paresseux, pas de « 1 jetons », pas de consigne évidente, pas d'info répétée, pas de texte coupé.
7. **Rapide.** Pages ouvertes sans attente visible : données préchargées, images aux bonnes dimensions, rien qui arrive après coup et décale la page.
8. **Vérifié en image.** Capture ordinateur ET téléphone de chaque changement avant de pousser.

## Constats et état

| # | Écran | Constat | État |
|---|---|---|---|
| 1 | Ouverture | Étiquette de mutation différente entre la cinématique, la fiche et le reste du site (police, marges, ombre du tampon) | ✅ une seule définition |
| 2 | Ouverture | La boîte de droite (tirages, chance) disparaissait à la révélation, puis une autre boîte réapparaissait ailleurs avec d'autres libellés | ✅ une seule boîte, qui reste ; boutons dessous |
| 3 | Ouverture | Ancienne annonce de mutation en texte dégradé lumineux (code mort) | ✅ supprimée |
| 4 | Fenêtres | Le zoom d'ouverture redessinait les sprites en plus petit, qui sautaient ensuite à leur taille | ✅ ouverture sans zoom |
| 5 | Accueil (déconnecté) | « Gagne des duels », « un ring où tes jetons se poussent », section Combat | ✅ remplacés (section Market) |
| 6 | Titre de l'onglet et aperçus de lien | « … et duels », « duel classé dans le Ring » | ✅ corrigés |
| 7 | CGU, Confidentialité | « les fait combattre dans le Ring », « matchs classés », dates de mise à jour différentes en français et en anglais | ✅ corrigés |
| 8 | Accueil (déconnecté) | Crédits en double (police Outfit citée deux fois) | ✅ une seule mention |
| 9 | Quêtes | « Obtiens 1 jeton(s) », « Vends 1 jetons », « Achète 2 objet » | ✅ singulier et pluriel corrects |
| 10 | Quêtes | Récompense en objet : petite image seule ; les pièces : nombre + icône | ✅ même écriture (×N + image) |
| 11 | 404 | Page brute (lien souligné, rien du site) | ✅ jeton mystère + bouton |
| 12 | Boutique, offres | Aperçus de cosmétiques cassés, cases différentes du shop, quantité invisible | ✅ refaites |
| 13 | Ouverture (téléphone) | Le téléphone se joue en paysage : même mise en page que l'ordinateur, la boîte reste en place | ✅ vérifié en capture |
| 14 | Ouverture | Nom du jeton mythique en texte dégradé animé (`namefx`) | ✅ retiré |
| 15 | Cinématique | Titre du jeton en texte dégradé, lettres qui arrivent floues | ✅ texte blanc, sans flou |
| 16 | Tout le site | Retirés : reflets qui balaient (nom des jetons rares, logo, jeton mythique), halos pulsés, reflet holographique, lueurs de fond de page, du titre et des épingles, barres et chemin du passe en dégradé. Gardés : palettes des mutations, rayons pixel de l'ouverture, traînée du jeton qui tombe, cosmétiques | ✅ |
| 17 | Profil | Bannière vide : grand rectangle gris uni | ✅ fond pixel à la couleur du meilleur jeton |
| 18 | Tout le site | Traductions du combat encore présentes dans les fichiers de langue (non affichées) | à nettoyer |
| 19 | Performances | Code de toutes les pages préchargé pendant les temps morts ; données de la boutique, du passe et des succès aussi : ouverture en ~150 ms, déjà remplie | ✅ |
| 20 | Animations | Mesure automatique des sauts de mise en page sur 10 pages en cliquant chaque bouton (ordi + téléphone), puis suivi image par image. Sauts réels corrigés : affaires du Black Market (340 px d'un coup), liste des objets (250 px d'un coup). Les changements d'onglet suivent déjà en douceur | ✅ |
| 21 | Offres | Packs et cosmétiques mélangés ; packs dans le désordre | ✅ Packs = pièces, potions, sabliers (9, du moins cher au plus cher) |
| 22 | Photos de profil | Zoom de 108 % : le bord du dessin (Dragon) était coupé | ✅ taille réelle partout |
| 23 | Accessibilité | Textes trop pâles : chance des jetons sombres sur l'accueil, « Bientôt » du passe, « Acheter » sans assez de pièces | ✅ lisibles |
| 24 | Fenêtres | PP « Animée » écrite pour toutes les photos alors que seule l'Étoile est un GIF | à vérifier avec toi |
