// Les anciens liens (#inventaire, #profil/Pseudo, #bestiaire…) mènent à la nouvelle adresse (/inventory, /profile/Pseudo).
// Les fragments de connexion Supabase (#access_token=…) ne sont pas touchés.
const MAP: Record<string, string> = {
  accueil: '/',
  bestiaire: '/inventory',
  inventaire: '/inventory',
  boutique: '/shop',
  classement: '/combat',
  combat: '/combat',
  amis: '/friends',
  profil: '/profile',
};
export function redirectLegacyHash(loc: Pick<Location, 'hash'> = location): string | null {
  const m = /^#([a-z]+)(?:\/(.*))?$/.exec(loc.hash);
  const base = m?.[1] ? MAP[m[1]] : undefined;
  if (!m || base === undefined) return null;
  const rest = base === '/inventory' && m[2] === 'objets' ? 'items' : m[2];
  return rest ? `${base === '/' ? '' : base}/${rest}` : base;
}
