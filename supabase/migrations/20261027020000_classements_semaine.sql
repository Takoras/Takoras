-- Classements : « cette semaine » et « depuis toujours » pour toutes les catégories.
-- Elo : depuis toujours = meilleur Elo jamais atteint (best_elo) ; cette semaine = Elo le plus haut atteint après un match de la semaine.
-- Temps de jeu : on compte maintenant aussi le temps par jour (daily_stats.play_seconds) pour la semaine.

alter table public.daily_stats add column if not exists play_seconds integer not null default 0;

create or replace function public.play_ping()
returns void language plpgsql security definer set search_path to '' as $$
declare uid uuid := auth.uid(); last timestamptz; gap float; add int;
begin
  if uid is null then return; end if;
  select play_ping into last from public.profiles where id = uid;
  gap := extract(epoch from now() - coalesce(last, '-infinity'::timestamptz));
  if gap < 50 then return; end if;
  add := case when gap <= 180 then least(60, round(gap))::int else 0 end;
  update public.profiles set play_seconds = play_seconds + add, play_ping = now() where id = uid;
  if add > 0 then
    insert into public.daily_stats (user_id, day, play_seconds) values (uid, public._today(), add)
      on conflict (user_id, day) do update set play_seconds = public.daily_stats.play_seconds + excluded.play_seconds;
  end if;
end $$;

drop function if exists public.leaderboard_time(integer);
create or replace function public.leaderboard_time(n integer default 50, since timestamptz default null)
returns table(pseudo text, value bigint) language sql stable security definer set search_path to '' as $$
  select pseudo, value from (
    select p.pseudo, p.created_at,
      case when since is null then p.play_seconds::bigint
        else (select coalesce(sum(d.play_seconds), 0) from public.daily_stats d where d.user_id = p.id and d.day >= since::date)::bigint end as value
    from public.profiles p where p.pseudo is not null and not p.banned
  ) x where value > 0
  order by value desc, created_at limit least(greatest(n, 1), 100);
$$;

create or replace function public.leaderboard_elo(n integer default 50, since timestamptz default null)
returns table(pseudo text, value integer) language sql stable security definer set search_path to '' as $$
  select pseudo, value from (
    select p.pseudo, r.wins,
      case when since is null then greatest(r.best_elo, r.elo)
        else (select max(case when m.p1 = p.id then (m.elo->'after'->>0)::int else (m.elo->'after'->>1)::int end)
              from public.ranked_matches m
              where m.status = 'done' and m.elo is not null and m.updated_at >= since and (m.p1 = p.id or m.p2 = p.id)) end as value
    from public.ranked r join public.profiles p on p.id = r.user_id
    where r.games > 0 and p.pseudo is not null and not p.banned
  ) x where value is not null
  order by value desc, wins desc limit least(greatest(n, 1), 100);
$$;

revoke all on function public.leaderboard_time(integer, timestamptz), public.leaderboard_elo(integer, timestamptz) from public;
grant execute on function public.leaderboard_time(integer, timestamptz), public.leaderboard_elo(integer, timestamptz) to anon, authenticated;
