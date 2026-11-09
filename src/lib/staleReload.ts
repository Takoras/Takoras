// Après une mise à jour du site, un onglet resté ouvert demande encore les anciens morceaux de code, qui n'existent
// plus : la page plantait (« Unexpected Application Error »). On recharge alors la page une fois pour prendre la
// nouvelle version. Garde-fou : pas plus d'un rechargement toutes les 10 s (pas de boucle si le réseau est coupé).
const KEY = 'takoras-stale-reload';

export const isStaleChunk = (e: unknown) =>
  /dynamically imported module|Importing a module script failed|error loading dynamically imported|Failed to load module script/i.test(
    String((e as Error | undefined)?.message ?? e),
  );

export function reloadOnce(): boolean {
  try {
    const last = Number(sessionStorage.getItem(KEY) || 0);
    if (Date.now() - last < 10_000) return false;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    // stockage bloqué : on recharge quand même, une seule fois par chargement de page
  }
  location.reload();
  return true;
}
