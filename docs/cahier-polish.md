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
| 13 | Ouverture (téléphone) | Les deux boîtes du bas disparaissent à la révélation et une autre boîte arrive sous la fiche | à faire |
| 14 | Ouverture | Nom du jeton mythique en texte dégradé animé (`namefx`) | ✅ retiré |
| 15 | Cinématique | Titre du jeton en texte dégradé, lettres qui arrivent floues | ✅ texte blanc, sans flou |
| 16 | Tout le site | 73 dégradés et ~90 lueurs dans le CSS : trier ce qui est un vrai rendu pixel (garder) et ce qui est décoratif (retirer) | à faire |
| 17 | Profil | Bannière vide : grand rectangle gris uni | à faire |
| 18 | Tout le site | Traductions du combat encore présentes dans les fichiers de langue (non affichées) | à nettoyer |
| 19 | Performances | Mesurer le chargement de chaque page, précharger les données des onglets, tailles d'images | à faire |
| 20 | Animations | Revue des entrées décalées, rebonds et balancements page par page (fluidité, aucune saccade) | à faire |
