-- Temps de jeu : le site envoie un « ping » par minute tant que l'onglet est visible.
-- Le serveur ne compte une minute que si le ping précédent date de 50 s à 3 min (impossible de gonfler son temps en spammant).
alter table public.profiles add column if not exists play_seconds integer not null default 0;
alter table public.profiles add column if not exists play_ping timestamptz;

create or replace function public.play_ping()
returns void language plpgsql security definer set search_path to '' as $$
declare uid uuid := auth.uid(); last timestamptz; gap float;
begin
  if uid is null then return; end if;
  select play_ping into last from public.profiles where id = uid;
  gap := extract(epoch from now() - coalesce(last, '-infinity'::timestamptz));
  if gap < 50 then return; end if; -- trop tôt : ignoré
  update public.profiles
    set play_seconds = play_seconds + case when gap <= 180 then least(60, round(gap))::int else 0 end, play_ping = now()
    where id = uid;
end $$;
revoke all on function public.play_ping() from public, anon;
grant execute on function public.play_ping() to authenticated;

-- Classement du temps de jeu (depuis toujours)
create or replace function public.leaderboard_time(n integer default 50)
returns table (pseudo text, value bigint)
language sql stable security definer set search_path to '' as $$
  select p.pseudo, p.play_seconds::bigint from public.profiles p
  where p.pseudo is not null and not p.banned and p.play_seconds > 0
  order by p.play_seconds desc, p.created_at limit least(greatest(n, 1), 100);
$$;
revoke all on function public.leaderboard_time(integer) from public;
grant execute on function public.leaderboard_time(integer) to anon, authenticated;
