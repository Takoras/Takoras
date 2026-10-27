import { useSettings } from '@/lib/settings';
import s from './Privacy.module.css';

// Politique de confidentialité complète (RGPD), en une seule page de texte (FR / EN)
type Doc = { title: string; updated: string; intro: string; blocks: [string, string[]][] };

const FR: Doc = {
  title: 'Politique de confidentialité',
  updated: 'Dernière mise à jour : 27 octobre 2026',
  intro:
    'La présente politique de confidentialité (ci-après la « Politique ») a pour objet d’informer toute personne utilisant le site et le jeu Takoras (ci-après le « Service ») de la manière dont ses données à caractère personnel sont collectées, utilisées, conservées et protégées, conformément au Règlement (UE) 2016/679 du 27 avril 2016 relatif à la protection des personnes physiques à l’égard du traitement des données à caractère personnel (ci-après le « RGPD ») et à la loi n° 78-17 du 6 janvier 1978 modifiée relative à l’informatique, aux fichiers et aux libertés (ci-après la « loi Informatique et Libertés »). En utilisant le Service, l’utilisateur reconnaît avoir pris connaissance de la présente Politique.',
  blocks: [
    [
      '1. Responsable du traitement',
      [
        'Le responsable du traitement des données à caractère personnel collectées dans le cadre du Service est l’éditeur de Takoras (ci-après « l’Éditeur »). Toute demande relative à la présente Politique ou à l’exercice des droits décrits ci-après peut être adressée à l’Éditeur au moyen du bouton « Donner un avis » présent sur chaque page du Service, en précisant l’objet de la demande.',
      ],
    ],
    [
      '2. Données collectées',
      [
        '2.1. Données d’identification et de connexion : identifiant technique du compte, adresse électronique ou identifiant du compte Discord utilisé pour la connexion, selon le mode de connexion choisi par l’utilisateur, ainsi que la date de création du compte.',
        '2.2. Données de profil : pseudonyme, photo de profil et bannière choisies parmi celles proposées par le Service, biographie facultative rédigée par l’utilisateur, vitrine de jetons.',
        '2.3. Données de jeu : jetons obtenus et leurs variantes, pièces, objets, potions, quêtes, progression du passe de combat, équipe, résultats et classement Elo des matchs classés, statistiques de jeu (nombre de tirages ouverts, temps de jeu), liste d’amis et demandes d’amitié.',
        '2.4. Données techniques : données strictement nécessaires au fonctionnement et à la sécurité du Service, notamment journaux techniques des serveurs, horodatages des actions de jeu et informations limitées sur le navigateur, conservées pour une durée limitée.',
        '2.5. Avis et signalements : contenu des messages envoyés volontairement par l’utilisateur au moyen du bouton « Donner un avis ».',
        '2.6. Le Service ne collecte aucune donnée dite « sensible » au sens de l’article 9 du RGPD, ni aucune donnée bancaire. Aucun paiement n’est ouvert à la date de la présente Politique.',
      ],
    ],
    [
      '3. Finalités et bases légales',
      [
        '3.1. Fourniture du Service (création et gestion du compte, sauvegarde de la progression, matchs en ligne, classements, profil public, fonctionnalités d’amis) : exécution du contrat conclu entre l’utilisateur et l’Éditeur lors de l’inscription (article 6.1.b du RGPD).',
        '3.2. Sécurité du Service, prévention de la triche, des abus et de la fraude, modération : intérêt légitime de l’Éditeur à garantir un jeu équitable et sûr (article 6.1.f du RGPD).',
        '3.3. Amélioration du Service à partir des avis envoyés volontairement et de statistiques globales de fréquentation : intérêt légitime de l’Éditeur (article 6.1.f du RGPD).',
        '3.4. Respect d’obligations légales, le cas échéant, notamment en cas de réquisition d’une autorité compétente : obligation légale (article 6.1.c du RGPD).',
      ],
    ],
    [
      '4. Données rendues publiques',
      [
        'Certaines données sont visibles par les autres utilisateurs et, le cas échéant, par toute personne consultant le Service : pseudonyme, photo de profil, bannière, biographie, vitrine, statistiques de collection, nombre de tirages, rang et Elo du mode classé, et position dans les classements. L’adresse électronique et l’identifiant de connexion ne sont jamais rendus publics.',
      ],
    ],
    [
      '5. Destinataires et sous-traitants',
      [
        '5.1. Les données sont destinées exclusivement à l’Éditeur. Elles ne sont ni vendues, ni louées, ni cédées à des tiers à des fins commerciales ou publicitaires.',
        '5.2. L’Éditeur fait appel à des prestataires techniques agissant en qualité de sous-traitants au sens de l’article 28 du RGPD : Supabase (hébergement de la base de données et authentification), Cloudflare (hébergement et diffusion du site) et, si l’utilisateur choisit ce mode de connexion, Discord (authentification). Ces prestataires ne traitent les données que sur instruction et pour le compte de l’Éditeur.',
        '5.3. Certains de ces prestataires sont susceptibles de traiter des données en dehors de l’Union européenne. Dans ce cas, les transferts sont encadrés par des garanties appropriées au sens des articles 44 et suivants du RGPD, notamment les clauses contractuelles types adoptées par la Commission européenne ou une décision d’adéquation.',
      ],
    ],
    [
      '6. Durée de conservation',
      [
        '6.1. Les données du compte, de profil et de jeu sont conservées pendant toute la durée d’existence du compte, puis supprimées dans un délai raisonnable suivant la demande de suppression du compte.',
        '6.2. Les journaux techniques sont conservés pour une durée limitée, n’excédant pas douze (12) mois, sauf obligation légale contraire.',
        '6.3. Les avis envoyés au moyen du bouton « Donner un avis » sont conservés le temps nécessaire à leur traitement, puis supprimés ou anonymisés.',
      ],
    ],
    [
      '7. Cookies et stockage local',
      [
        '7.1. Le Service n’utilise aucun cookie publicitaire, aucun traceur de mesure d’audience tiers et aucun outil de profilage.',
        '7.2. Le Service utilise le stockage local du navigateur (« localStorage ») et des éléments techniques strictement nécessaires, tels que le maintien de la session de connexion, les réglages de l’utilisateur (langue, volume, effets) et l’affichage des notes de mise à jour déjà lues. Conformément à l’article 82 de la loi Informatique et Libertés, ces éléments, strictement nécessaires à la fourniture du Service expressément demandé par l’utilisateur, ne requièrent pas de consentement préalable.',
      ],
    ],
    [
      '8. Sécurité',
      [
        'L’Éditeur met en œuvre des mesures techniques et organisationnelles appropriées afin de protéger les données contre la perte, l’accès non autorisé, la divulgation, l’altération ou la destruction, notamment le chiffrement des échanges (HTTPS), le contrôle des accès à la base de données par des règles de sécurité au niveau des lignes et le calcul des parties classées exclusivement côté serveur. Aucun système n’étant toutefois parfaitement sûr, l’Éditeur ne saurait garantir une sécurité absolue.',
      ],
    ],
    [
      '9. Droits des utilisateurs',
      [
        '9.1. Conformément aux articles 15 à 22 du RGPD, l’utilisateur dispose d’un droit d’accès, de rectification, d’effacement, de limitation du traitement, de portabilité de ses données et d’opposition au traitement fondé sur l’intérêt légitime. Il dispose également du droit de définir des directives relatives au sort de ses données après son décès.',
        '9.2. L’utilisateur peut à tout moment modifier son pseudonyme, sa biographie, sa photo de profil et sa bannière depuis son profil. Il peut demander la suppression de son compte et de l’ensemble des données associées au moyen du bouton « Donner un avis ».',
        '9.3. L’Éditeur s’engage à répondre à toute demande dans un délai d’un (1) mois à compter de sa réception, ce délai pouvant être prolongé de deux (2) mois compte tenu de la complexité ou du nombre de demandes, conformément à l’article 12 du RGPD. Une preuve d’identité pourra être demandée en cas de doute raisonnable.',
        '9.4. Si l’utilisateur estime, après avoir contacté l’Éditeur, que ses droits ne sont pas respectés, il peut introduire une réclamation auprès de la Commission nationale de l’informatique et des libertés (CNIL), 3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07, www.cnil.fr.',
      ],
    ],
    [
      '10. Mineurs',
      [
        'Conformément à l’article 45 de la loi Informatique et Libertés, un mineur âgé de moins de quinze (15) ans ne peut utiliser le Service qu’avec le consentement conjoint de lui-même et du ou des titulaires de l’autorité parentale. Le titulaire de l’autorité parentale peut demander la suppression du compte d’un mineur au moyen du bouton « Donner un avis ».',
      ],
    ],
    [
      '11. Modification de la Politique',
      [
        'L’Éditeur se réserve le droit de modifier la présente Politique à tout moment, notamment pour l’adapter à l’évolution du Service ou de la réglementation applicable. La date de dernière mise à jour figure en tête du document. En cas de modification substantielle, les utilisateurs en seront informés par une note de mise à jour sur le Service.',
      ],
    ],
  ],
};

const EN: Doc = {
  title: 'Privacy policy',
  updated: 'Last updated: 27 October 2026',
  intro:
    'This privacy policy (the “Policy”) explains to anyone using the Takoras website and game (the “Service”) how their personal data is collected, used, stored and protected, in accordance with Regulation (EU) 2016/679 of 27 April 2016 (the “GDPR”) and the French Data Protection Act no. 78-17 of 6 January 1978 as amended. By using the Service, the user acknowledges having read this Policy.',
  blocks: [
    [
      '1. Data controller',
      [
        'The controller of the personal data collected through the Service is the publisher of Takoras (the “Publisher”). Any request regarding this Policy or the exercise of the rights described below may be sent to the Publisher using the “Feedback” button available on every page of the Service, stating the purpose of the request.',
      ],
    ],
    [
      '2. Data collected',
      [
        '2.1. Identification and login data: technical account identifier, e-mail address or Discord account identifier used to log in, depending on the login method chosen, and the account creation date.',
        '2.2. Profile data: username, profile picture and banner chosen among those offered by the Service, optional bio written by the user, token showcase.',
        '2.3. Game data: tokens obtained and their variants, coins, items, potions, quests, battle pass progress, team, results and Elo of ranked matches, game statistics (pulls opened, play time), friends list and friend requests.',
        '2.4. Technical data: data strictly necessary for the operation and security of the Service, including server logs, timestamps of game actions and limited browser information, kept for a limited time.',
        '2.5. Feedback and reports: content of messages voluntarily sent by the user with the “Feedback” button.',
        '2.6. The Service does not collect any “special category” data within the meaning of Article 9 GDPR, nor any banking data. No payments are open as of the date of this Policy.',
      ],
    ],
    [
      '3. Purposes and legal bases',
      [
        '3.1. Providing the Service (account creation and management, saving progress, online matches, leaderboards, public profile, friends features): performance of the contract entered into at sign-up (Article 6(1)(b) GDPR).',
        '3.2. Security of the Service, prevention of cheating, abuse and fraud, moderation: the Publisher’s legitimate interest in a fair and safe game (Article 6(1)(f) GDPR).',
        '3.3. Improving the Service using voluntarily sent feedback and aggregate usage statistics: the Publisher’s legitimate interest (Article 6(1)(f) GDPR).',
        '3.4. Compliance with legal obligations where applicable, in particular upon request of a competent authority (Article 6(1)(c) GDPR).',
      ],
    ],
    [
      '4. Public data',
      [
        'Some data is visible to other users and, where applicable, to anyone visiting the Service: username, profile picture, banner, bio, showcase, collection statistics, number of pulls, ranked rank and Elo, and leaderboard positions. The e-mail address and login identifier are never made public.',
      ],
    ],
    [
      '5. Recipients and processors',
      [
        '5.1. Data is intended solely for the Publisher. It is never sold, rented or transferred to third parties for commercial or advertising purposes.',
        '5.2. The Publisher uses technical providers acting as processors within the meaning of Article 28 GDPR: Supabase (database hosting and authentication), Cloudflare (website hosting and delivery) and, if the user chooses this login method, Discord (authentication). These providers only process data on the Publisher’s instructions and on its behalf.',
        '5.3. Some of these providers may process data outside the European Union. In that case, transfers are covered by appropriate safeguards under Articles 44 et seq. GDPR, in particular the European Commission’s standard contractual clauses or an adequacy decision.',
      ],
    ],
    [
      '6. Retention',
      [
        '6.1. Account, profile and game data is kept for as long as the account exists, then deleted within a reasonable time after an account deletion request.',
        '6.2. Technical logs are kept for a limited time not exceeding twelve (12) months, unless otherwise required by law.',
        '6.3. Feedback sent with the “Feedback” button is kept as long as needed to handle it, then deleted or anonymised.',
      ],
    ],
    [
      '7. Cookies and local storage',
      [
        '7.1. The Service uses no advertising cookies, no third-party analytics trackers and no profiling tools.',
        '7.2. The Service uses the browser’s local storage and strictly necessary technical elements, such as keeping the login session, the user’s settings (language, volume, effects) and remembering which update notes were read. As they are strictly necessary to provide the Service expressly requested by the user, they do not require prior consent.',
      ],
    ],
    [
      '8. Security',
      [
        'The Publisher implements appropriate technical and organisational measures to protect data against loss, unauthorised access, disclosure, alteration or destruction, including encrypted connections (HTTPS), row-level security rules on the database and server-side resolution of ranked matches. As no system is perfectly secure, the Publisher cannot guarantee absolute security.',
      ],
    ],
    [
      '9. Users’ rights',
      [
        '9.1. Under Articles 15 to 22 GDPR, the user has the right of access, rectification, erasure, restriction of processing, data portability and objection to processing based on legitimate interest, as well as the right to give instructions regarding their data after death.',
        '9.2. The user may change their username, bio, profile picture and banner at any time from their profile, and may request deletion of their account and all associated data using the “Feedback” button.',
        '9.3. The Publisher will answer any request within one (1) month of receipt, which may be extended by two (2) months given the complexity or number of requests, in accordance with Article 12 GDPR. Proof of identity may be requested in case of reasonable doubt.',
        '9.4. If, after contacting the Publisher, the user considers that their rights are not respected, they may lodge a complaint with the French data protection authority (CNIL), 3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07, www.cnil.fr, or with the supervisory authority of their country of residence.',
      ],
    ],
    [
      '10. Minors',
      [
        'Under French law, a minor under fifteen (15) may only use the Service with the joint consent of the minor and the holder(s) of parental authority. A holder of parental authority may request deletion of a minor’s account using the “Feedback” button.',
      ],
    ],
    [
      '11. Changes to this Policy',
      [
        'The Publisher may change this Policy at any time, in particular to reflect changes to the Service or to applicable law. The date of the last update appears at the top. In case of a substantial change, users will be informed by an update note on the Service.',
      ],
    ],
  ],
};

export default function Privacy() {
  const lang = useSettings((x) => x.lang);
  const d = lang === 'en' ? EN : FR;
  return (
    <article className={s.page}>
      <h1>{d.title}</h1>
      <p className={s.updated}>{d.updated}</p>
      <p>{d.intro}</p>
      {d.blocks.map(([h, ps]) => (
        <section key={h}>
          <h2>{h}</h2>
          {ps.map((p) => (
            <p key={p.slice(0, 24)}>{p}</p>
          ))}
        </section>
      ))}
    </article>
  );
}
