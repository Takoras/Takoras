-- Classement « Victoires » : victoires en classé (score sans plafond), cette semaine ou depuis toujours
create or replace function public.leaderboard_wins(n integer default 50, since timestamptz default null)
returns table(pseudo text, value bigint)
language sql stable security definer set search_path to ''
as $$
  select p.pseudo, w.value from (
    select case when m.winner = 0 then m.p1 else m.p2 end as uid, count(*)::bigint as value
    from public.ranked_matches m
    where m.status = 'done' and m.winner in (0, 1) and (since is null or m.updated_at >= since)
    group by 1
  ) w join public.profiles p on p.id = w.uid
  where p.pseudo is not null and not p.banned
  order by w.value desc, p.created_at limit least(greatest(n, 1), 100);
$$;
grant execute on function public.leaderboard_wins(integer, timestamptz) to anon, authenticated;
