-- Classé : les joueurs juste devant et juste derrière moi (2 + moi + 2), avec leur place au classement Elo
create or replace function public.ranked_around()
returns table (pos bigint, pseudo text, elo integer, me boolean)
language sql stable security definer set search_path to '' as $$
  with board as (
    select r.user_id, p.pseudo, r.elo, r.wins from public.ranked r join public.profiles p on p.id = r.user_id
    where p.pseudo is not null and not p.banned and (r.games > 0 or r.user_id = (select auth.uid()))
    union all
    -- pas encore de ligne classée : on se place quand même à 1000
    select (select auth.uid()), p.pseudo, 1000, 0 from public.profiles p
    where p.id = (select auth.uid()) and not exists (select 1 from public.ranked r where r.user_id = p.id)
  ),
  ranked_board as (select *, row_number() over (order by elo desc, wins desc, pseudo) pos from board),
  mine as (select pos from ranked_board where user_id = (select auth.uid()))
  select b.pos, b.pseudo, b.elo, b.user_id = (select auth.uid()) from ranked_board b, mine
  where b.pos between mine.pos - 2 and mine.pos + 2 order by b.pos;
$$;
revoke all on function public.ranked_around() from public, anon;
grant execute on function public.ranked_around() to authenticated;
