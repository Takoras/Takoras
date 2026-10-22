import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Clé PUBLIQUE (publishable) uniquement : les droits sont gérés par la base (RLS + RPC). Jamais de clé secrète ici.
const URL = import.meta.env.VITE_SUPABASE_URL ?? 'https://joyskjoofihwhycyreyn.supabase.co';
const KEY = import.meta.env.VITE_SUPABASE_KEY ?? 'sb_publishable_mhoYRADm77D4idg3eekXRA_HCjIsK7k';
export const SB_URL = URL, SB_KEY = KEY;
if (KEY.startsWith('sb_secret') || KEY.includes('service_role')) throw new Error('Clé secrète interdite côté client');

// PKCE : après la connexion Discord, le jeton ne passe plus dans l'URL. La session est rangée sous la même clé
// que l'ancien site (sb-<projet>-auth-token, valeur par défaut) : le joueur reste connecté en changeant de version.
export const sb = createClient<Database>(URL, KEY, {
  auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
