-- Tirages plus compacts : de la place dans chaque page (les verrouillages / ventes se font sur place,
-- sans faire gonfler les index), et plus d'index par date seule (le classement passe par pull_days).
-- (Index reconstruits à la main le 28/10 : REINDEX TABLE public.pulls, pending_pulls.)
alter table public.pulls set (fillfactor = 85);
drop index if exists public.pulls_created;
