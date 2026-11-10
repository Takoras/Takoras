import { LegalDoc, type Doc } from './LegalDoc';

// Conditions générales d'utilisation (CGU) du jeu. Les ventes en euros, quand elles ouvriront, auront leurs
// propres conditions générales de vente (CGV), avec le droit de rétractation et la médiation de la consommation.
const FR: Doc = {
  title: 'Conditions générales d’utilisation',
  updated: 'Dernière mise à jour : 10 novembre 2026',
  intro:
    'Les présentes conditions générales d’utilisation (ci-après les « CGU ») encadrent l’accès et l’utilisation du site et du jeu Takoras (ci-après le « Service »), édité par l’éditeur désigné dans les mentions légales (ci-après « l’Éditeur »). Créer un compte ou utiliser le Service implique l’acceptation pleine et entière des présentes CGU et de la politique de confidentialité.',
  blocks: [
    [
      '1. Objet du Service',
      [
        'Takoras est un jeu de collection de jetons accessible gratuitement dans un navigateur : le joueur ouvre des tirages pour obtenir des jetons de différentes raretés, complète sa collection, les fait combattre dans le Ring et apparaît dans des classements.',
      ],
    ],
    [
      '2. Compte et âge',
      [
        '2.1. L’utilisation du Service nécessite un compte, créé au moyen d’un service de connexion tiers (par exemple Discord). L’utilisateur est responsable de l’usage de son compte et de la confidentialité de ses moyens de connexion. Un seul compte par personne est autorisé.',
        '2.2. Le Service est destiné aux personnes âgées d’au moins treize (13) ans. Conformément à l’article 45 de la loi Informatique et Libertés, un mineur de moins de quinze (15) ans ne peut créer un compte qu’avec l’accord du ou des titulaires de l’autorité parentale. En acceptant les CGU, l’utilisateur déclare avoir au moins quinze ans ou disposer de cet accord.',
        '2.3. Le pseudonyme choisi ne doit pas être injurieux, discriminatoire, sexuel, usurper l’identité d’un tiers ni contenir de données personnelles. L’Éditeur peut le modifier ou le refuser.',
      ],
    ],
    [
      '3. Règles de conduite',
      [
        'Il est interdit notamment : d’utiliser des logiciels de triche, robots, scripts ou tout moyen automatisé ; d’exploiter un bug ou une faille au lieu de le signaler ; de tenter d’accéder aux données ou aux comptes d’autrui ou de perturber le fonctionnement du Service ; de harceler, insulter ou menacer d’autres joueurs, notamment dans les messages ; de vendre, acheter, échanger ou céder un compte ou des éléments de jeu contre de l’argent réel ou tout autre bien.',
      ],
    ],
    [
      '4. Contenus virtuels',
      [
        '4.1. Les jetons, pièces, tirages, potions, objets, cosmétiques et autres éléments de jeu (ci-après les « contenus virtuels ») n’ont aucune valeur monétaire. Ils ne peuvent être ni échangés contre de l’argent réel, ni remboursés, ni transférés à un autre compte, sauf fonctionnalité prévue par le jeu.',
        '4.2. L’utilisateur bénéficie d’un simple droit d’usage personnel des contenus virtuels, dans le cadre du Service. L’Éditeur peut faire évoluer le jeu (équilibrage, statistiques, prix en pièces, contenus disponibles), y compris lorsque cela modifie des contenus virtuels déjà obtenus.',
      ],
    ],
    [
      '5. Tirages et probabilités',
      [
        'Le résultat d’un tirage est déterminé par le hasard, côté serveur. Les chances d’obtenir chaque jeton et chaque mutation sont affichées en permanence dans la rubrique « Probas & infos », ainsi que l’effet exact des potions de chance. Aucun tirage ne permet de gagner de l’argent ou un bien réel.',
      ],
    ],
    [
      '6. Phase de bêta',
      [
        'Le Service est actuellement en version bêta. Pendant cette phase, des outils de test peuvent être ouverts à tous les joueurs (obtention de jetons, d’objets ou de pièces de test), des bugs peuvent survenir et la progression, les collections et les classements peuvent être réinitialisés, en tout ou partie, notamment à la sortie de la version finale.',
      ],
    ],
    [
      '7. Modération et sanctions',
      [
        '7.1. Contenus interdits : le pseudo, la bio et tout texte visible par les autres joueurs ne doivent contenir ni insulte, ni contenu sexuel, violent, haineux ou discriminatoire, ni données personnelles, ni usurpation d’identité. Un filtre automatique refuse à l’enregistrement les textes contenant des mots interdits.',
        '7.2. Signalement : tout joueur peut signaler un autre joueur (pseudo, bio, profil, triche) avec le bouton « Signaler » de son profil. Chaque signalement est examiné par l’Éditeur, qui peut demander des précisions.',
        '7.3. Mesures : selon la gravité, l’Éditeur peut modifier ou supprimer le texte en cause (par exemple renommer le compte ou vider la bio), retirer les contenus virtuels obtenus de manière irrégulière, annuler une progression ou un classement, suspendre temporairement ou bannir définitivement le compte.',
        '7.4. Contestation : l’utilisateur concerné peut contester une mesure en contactant l’Éditeur (bouton « Donner un avis » ou coordonnées des mentions légales). L’Éditeur réexamine la décision et y répond.',
        'En cas de manquement aux présentes CGU, l’Éditeur peut, selon la gravité et après avoir, lorsque c’est possible, permis à l’utilisateur de s’expliquer : retirer les contenus virtuels obtenus de manière irrégulière, annuler une progression ou un classement, suspendre temporairement ou bannir définitivement le compte.',
      ],
    ],
    [
      '8. Disponibilité et responsabilité',
      [
        'L’Éditeur s’efforce d’assurer l’accès au Service, sans pouvoir le garantir de façon continue : il peut être interrompu pour maintenance, mise à jour ou en cas de panne. L’Éditeur ne saurait être tenu responsable des dommages indirects ni de la perte de contenus virtuels résultant d’un bug, d’une interruption ou d’une réinitialisation, dans les limites permises par la loi.',
      ],
    ],
    [
      '9. Propriété intellectuelle',
      [
        'Le Service et ses éléments (jetons, illustrations, logos, textes, sons, code) sont protégés. Toute reproduction, extraction ou réutilisation sans autorisation est interdite, sauf usage personnel et non commercial (par exemple partager une capture d’écran de sa collection).',
      ],
    ],
    [
      '10. Données personnelles et suppression du compte',
      [
        'Les données personnelles sont traitées conformément à la politique de confidentialité. L’utilisateur peut à tout moment télécharger ses données ou supprimer définitivement son compte et toutes les données associées depuis les réglages (bouton « Supprimer mon compte »).',
      ],
    ],
    [
      '11. Achats',
      [
        'Aucun paiement en argent réel n’est ouvert à la date des présentes CGU. Lorsque des achats seront proposés, ils seront régis par des conditions générales de vente distinctes, présentées avant tout paiement.',
      ],
    ],
    [
      '12. Modification des CGU',
      [
        'L’Éditeur peut modifier les présentes CGU. En cas de modification importante, l’utilisateur en est informé dans le Service et peut être invité à les accepter à nouveau. S’il les refuse, il peut supprimer son compte.',
      ],
    ],
    [
      '13. Droit applicable et litiges',
      [
        'Les présentes CGU sont soumises au droit français. En cas de litige, l’utilisateur est invité à contacter d’abord l’Éditeur afin de rechercher une solution amiable. À défaut, les tribunaux français compétents pourront être saisis, sous réserve des règles protectrices dont bénéficie le consommateur.',
      ],
    ],
  ],
};

const EN: Doc = {
  title: 'Terms of use',
  updated: 'Last updated: 10 November 2026',
  intro:
    'These terms of use (the “Terms”) govern access to and use of the Takoras website and game (the “Service”), published by the publisher named in the legal notice (the “Publisher”). Creating an account or using the Service means fully accepting these Terms and the privacy policy.',
  blocks: [
    [
      '1. The Service',
      [
        'Takoras is a free browser game about collecting tokens: players open pulls to get tokens of various rarities, complete their collection, make them fight in the Ring and appear in leaderboards.',
      ],
    ],
    [
      '2. Account and age',
      [
        '2.1. Using the Service requires an account created through a third-party sign-in service (for example Discord). Users are responsible for the use of their account and the confidentiality of their sign-in. One account per person.',
        '2.2. The Service is intended for people aged at least thirteen (13). Under French law, a minor under fifteen (15) may only create an account with the consent of the holder(s) of parental authority. By accepting the Terms, users declare that they are at least fifteen or have that consent.',
        '2.3. Nicknames must not be insulting, discriminatory, sexual, impersonate someone or contain personal data. The Publisher may change or refuse them.',
      ],
    ],
    [
      '3. Rules of conduct',
      [
        'In particular, it is forbidden to: use cheats, bots, scripts or any automated means; exploit a bug or flaw instead of reporting it; try to access other people’s data or accounts or disrupt the Service; harass, insult or threaten other players, including in messages; sell, buy, trade or transfer an account or game items for real money or any other goods.',
      ],
    ],
    [
      '4. Virtual content',
      [
        '4.1. Tokens, coins, pulls, potions, items, cosmetics and other game elements (“virtual content”) have no monetary value. They cannot be exchanged for real money, refunded or transferred to another account, except where a game feature allows it.',
        '4.2. Users only have a personal right to use virtual content within the Service. The Publisher may change the game (balance, stats, coin prices, available content), including when this affects virtual content already obtained.',
      ],
    ],
    [
      '5. Pulls and odds',
      [
        'Pull results are determined randomly, on the server. The odds of getting each token and each mutation are always shown in the “Odds & info” section, along with the exact effect of luck potions. No pull lets you win money or any real-world goods.',
      ],
    ],
    [
      '6. Beta phase',
      [
        'The Service is currently in beta. During this phase, testing tools may be open to all players (test tokens, items or coins), bugs may occur, and progress, collections and leaderboards may be reset, in whole or in part, in particular when the final version is released.',
      ],
    ],
    [
      '7. Moderation and sanctions',
      [
        '7.1. Forbidden content: usernames, bios and any text visible to other players must not contain insults, sexual, violent, hateful or discriminatory content, personal data or impersonation. An automatic filter rejects texts containing forbidden words when they are saved.',
        '7.2. Reporting: any player can report another player (username, bio, profile, cheating) using the “Report” button on their profile. Each report is reviewed by the Publisher, who may ask for details.',
        '7.3. Measures: depending on severity, the Publisher may edit or remove the text in question (for example rename the account or clear the bio), remove improperly obtained virtual content, cancel progress or a ranking, temporarily suspend or permanently ban the account.',
        '7.4. Appeals: the user concerned can contest a measure by contacting the Publisher (“Feedback” button or the details in the legal notice). The Publisher reviews the decision and replies.',
        'If these Terms are breached, the Publisher may, depending on severity and, where possible, after letting the user explain: remove improperly obtained virtual content, cancel progress or a ranking, temporarily suspend or permanently ban the account.',
      ],
    ],
    [
      '8. Availability and liability',
      [
        'The Publisher does its best to keep the Service available but cannot guarantee continuous access: it may be interrupted for maintenance, updates or outages. To the extent permitted by law, the Publisher is not liable for indirect damage or for the loss of virtual content caused by a bug, an interruption or a reset.',
      ],
    ],
    [
      '9. Intellectual property',
      [
        'The Service and its elements (tokens, artwork, logos, texts, sounds, code) are protected. Any reproduction, extraction or reuse without permission is forbidden, except for personal, non-commercial use (for example sharing a screenshot of your collection).',
      ],
    ],
    [
      '10. Personal data and account deletion',
      [
        'Personal data is processed as described in the privacy policy. Users can download their data or permanently delete their account and all related data at any time from the settings (“Delete my account” button).',
      ],
    ],
    [
      '11. Purchases',
      [
        'No real-money payment is open as of these Terms. When purchases are offered, they will be governed by separate terms of sale, shown before any payment.',
      ],
    ],
    [
      '12. Changes to the Terms',
      [
        'The Publisher may change these Terms. In case of a significant change, users are informed in the Service and may be asked to accept them again. If they refuse, they can delete their account.',
      ],
    ],
    [
      '13. Governing law and disputes',
      [
        'These Terms are governed by French law. In case of a dispute, users are invited to contact the Publisher first to seek an amicable solution. Failing that, the competent French courts may be seized, subject to the protective rules that consumers benefit from.',
      ],
    ],
  ],
};

export default function Terms() {
  return <LegalDoc fr={FR} en={EN} />;
}
