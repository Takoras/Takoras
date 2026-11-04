import { HOSTS, PUBLISHER } from '@/data/legal';
import { LegalDoc, type Doc } from './LegalDoc';

// Mentions légales (LCEN, art. 6 et 19). L'identité de l'éditeur vient de src/data/legal.ts.
const P = PUBLISHER;
const pending = !P.name || !P.siret;

const FR: Doc = {
  title: 'Mentions légales',
  updated: 'Dernière mise à jour : 4 novembre 2026',
  intro:
    'Conformément aux articles 6 et 19 de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l’économie numérique (LCEN), les informations suivantes sont portées à la connaissance des utilisateurs du site et du jeu Takoras (ci-après le « Service »).',
  blocks: [
    [
      '1. Éditeur',
      pending
        ? [
            'Le Service est édité par une entreprise individuelle (régime de la micro-entreprise) en cours d’immatriculation. Ses coordonnées complètes (nom, numéro SIRET, adresse, téléphone et adresse électronique) figureront sur cette page dès son immatriculation.',
            'En attendant, l’éditeur peut être contacté au moyen du bouton « Donner un avis » présent sur chaque page du Service.',
          ]
        : [
            `Éditeur : ${P.name}, entreprise individuelle (micro-entrepreneur).`,
            `SIRET : ${P.siret}.`,
            ...(P.address ? [`Adresse : ${P.address}.`] : []),
            ...(P.email ? [`Adresse électronique : ${P.email}.`] : []),
            ...(P.phone ? [`Téléphone : ${P.phone}.`] : []),
            `Directeur de la publication : ${P.name}.`,
          ],
    ],
    ['2. Hébergeurs', HOSTS.map((h) => `${h.role.fr} : ${h.name}, ${h.address} — ${h.contact}.`)],
    [
      '3. Propriété intellectuelle',
      [
        'L’ensemble des éléments du Service (jetons, illustrations, logos, textes, interface, code) est la propriété de l’éditeur ou est utilisé avec l’autorisation de ses auteurs. Les musiques, sons et polices de tiers sont utilisés conformément à leur licence, détaillée dans la rubrique « Crédits ». Toute reproduction ou réutilisation sans autorisation est interdite.',
      ],
    ],
    [
      '4. Données personnelles et conditions',
      [
        'Le traitement des données personnelles est décrit dans la politique de confidentialité. Les règles d’utilisation du Service figurent dans les conditions générales d’utilisation.',
      ],
    ],
  ],
};

const EN: Doc = {
  title: 'Legal notice',
  updated: 'Last updated: 4 November 2026',
  intro:
    'In accordance with articles 6 and 19 of French law no. 2004-575 of 21 June 2004 on confidence in the digital economy (LCEN), the following information is provided to users of the Takoras website and game (the “Service”).',
  blocks: [
    [
      '1. Publisher',
      pending
        ? [
            'The Service is published by a sole proprietorship (French micro-entreprise) currently being registered. Its full details (name, SIRET number, address, phone number and email address) will appear on this page once registered.',
            'In the meantime, the publisher can be contacted using the “Feedback” button available on every page of the Service.',
          ]
        : [
            `Publisher: ${P.name}, sole proprietorship (micro-entrepreneur).`,
            `SIRET: ${P.siret}.`,
            ...(P.address ? [`Address: ${P.address}.`] : []),
            ...(P.email ? [`Email: ${P.email}.`] : []),
            ...(P.phone ? [`Phone: ${P.phone}.`] : []),
            `Publication director: ${P.name}.`,
          ],
    ],
    ['2. Hosting providers', HOSTS.map((h) => `${h.role.en}: ${h.name}, ${h.address} — ${h.contact}.`)],
    [
      '3. Intellectual property',
      [
        'All elements of the Service (tokens, artwork, logos, texts, interface, code) belong to the publisher or are used with their authors’ permission. Third-party music, sounds and fonts are used under their licenses, listed in the “Credits” section. Any reproduction or reuse without permission is prohibited.',
      ],
    ],
    [
      '4. Personal data and terms',
      [
        'Personal data processing is described in the privacy policy. The rules for using the Service are set out in the terms of use.',
      ],
    ],
  ],
};

export default function Legal() {
  return <LegalDoc fr={FR} en={EN} />;
}
