-- Joueurs en ligne sans connexion en direct : ceux dont le « ping » de temps de jeu date de moins de 2 minutes
create or replace function public.online_count() returns integer
language sql stable security definer set search_path to '' as $$
  select count(*)::int from public.profiles where play_ping > now() - interval '2 minutes';
$$;
grant execute on function public.online_count() to anon, authenticated;
