-- Phase 2 (sécurité) : durcissement des droits. Aucune donnée touchée, aucune fonction ni table supprimée.
-- Retour arrière : les droits d'origine sont dans supabase/schema/baseline.sql (section 8).

-- 1. battle_result(p_win, p_lose) n'avait aucun contrôle : n'importe quel joueur pouvait s'ajouter
--    des victoires (et donner des défaites aux autres) en boucle, puis réclamer les quêtes de combat.
--    Elle n'est plus appelée que par le serveur (ancienne Edge function, clé service).
revoke execute on function public.battle_result(uuid, uuid) from public, anon, authenticated;

-- 2. Le pseudo ne se change plus en direct (update profiles) : seulement via set_pseudo / change_pseudo,
--    qui appliquent le délai de 30 jours et le changement gratuit.
revoke update (pseudo) on table public.profiles from authenticated;

-- 3. Le site ne fait que LIRE les tables (toutes les écritures passent par des RPC SECURITY DEFINER).
--    On retire donc aux rôles du site tout ce qui n'est pas la lecture, y compris TRUNCATE
--    (qui n'est pas soumis à la RLS). La lecture reste filtrée par les policies RLS existantes.
revoke insert, update, delete, truncate, references, trigger on all tables in schema public from anon, authenticated;

-- 4. Pareil pour les futures tables créées dans public.
alter default privileges in schema public revoke insert, update, delete, truncate, references, trigger on tables from anon, authenticated;
