// Remplace @supabase/storage-js dans le site : Takoras n'utilise pas le stockage de fichiers Supabase,
// et cette partie pesait ~25 Ko compressés au premier chargement. supabase-js crée quand même le client
// au démarrage : il existe, mais ne fait rien. L'appeler signale clairement l'oubli.
const off = () => {
  throw new Error('Stockage Supabase non inclus dans le site (voir src/lib/stubs/supabase-storage.ts)');
};
export class StorageClient {
  from = off;
  listBuckets = off;
}
export class StorageApiError extends Error {}
