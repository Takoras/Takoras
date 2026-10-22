// Les anciens liens (#inventaire, #profil/Pseudo, #bestiaire…) mènent à la nouvelle adresse (/inventaire, /profil/Pseudo).
// Les fragments de connexion Supabase (#access_token=…) ne sont pas touchés.
const MAP: Record<string, string> = {
  accueil: '/',
  bestiaire: '/inventaire',
  inventaire: '/inventaire',
  boutique: '/boutique',
  classement: '/classement',
  combat: '/combat',
  amis: '/amis',
  profil: '/profil',
};
export function redirectLegacyHash(loc: Pick<Location, 'hash'> = location): string | null {
  const m = /^#([a-z]+)(?:\/(.*))?$/.exec(loc.hash);
  const base = m?.[1] ? MAP[m[1]] : undefined;
  if (!m || base === undefined) return null;
  return m[2] ? `${base === '/' ? '' : base}/${m[2]}` : base;
}
