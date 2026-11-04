// Identité de l'éditeur pour les mentions légales (LCEN, art. 6 et 19).
// À REMPLIR dès que l'auto-entreprise est immatriculée : tant qu'un champ vaut null, la page affiche
// « en cours d'immatriculation » et renvoie vers le bouton « Donner un avis » pour tout contact.
export const PUBLISHER = {
  /** nom et prénom (entreprise individuelle) ou nom commercial */
  name: null as string | null,
  /** numéro SIRET */
  siret: null as string | null,
  /** adresse postale de l'entreprise */
  address: null as string | null,
  /** e-mail de contact (obligatoire pour une auto-entreprise) */
  email: null as string | null,
  /** téléphone (obligatoire pour une auto-entreprise) */
  phone: null as string | null,
};

// Hébergeurs (coordonnées officielles, vérifiées le 4 novembre 2026)
export const HOSTS = [
  {
    role: { fr: 'Hébergement et diffusion du site', en: 'Website hosting and delivery' },
    name: 'Cloudflare, Inc.',
    address: '101 Townsend Street, San Francisco, CA 94107, États-Unis / USA',
    contact: '+1 (888) 993-5273 · cloudflare.com',
  },
  {
    role: { fr: 'Base de données et connexion des comptes', en: 'Database and account sign-in' },
    name: 'Supabase Pte. Ltd.',
    address: '65 Chulia Street #38-02/03, OCBC Centre, Singapore 049513',
    contact: 'supabase.com',
  },
];
