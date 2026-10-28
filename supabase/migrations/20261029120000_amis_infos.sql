-- Page amis plus riche : photo de profil, en ligne (joué dans les 2 dernières minutes), Elo, nombre de jetons trouvés
drop function if exists public.my_friends();
create function public.my_friends()
 returns table(id uuid, pseudo text, status text, incoming boolean, unread bigint, last_at timestamp with time zone,
               avatar text, online boolean, elo integer, collection bigint)
 language sql stable security definer set search_path to ''
as $function$
  select o.id, o.pseudo, f.status, f.status = 'pending' and f.requested_by <> (select auth.uid()),
    (select count(*) from public.messages m where m.sender = o.id and m.receiver = (select auth.uid()) and m.read_at is null),
    (select max(m.created_at) from public.messages m where (m.sender = o.id and m.receiver = (select auth.uid())) or (m.receiver = o.id and m.sender = (select auth.uid()))),
    o.avatar,
    coalesce(o.play_ping > now() - interval '2 minutes', false),
    (select r.elo from public.ranked r where r.user_id = o.id),
    (select count(distinct s.jeton) from public.pull_stats s where s.user_id = o.id and s.total > 0)
  from public.friendships f
  join public.profiles o on o.id = case when f.a = (select auth.uid()) then f.b else f.a end
  where (select auth.uid()) in (f.a, f.b)
  order by 5 desc, 8 desc, 6 desc nulls last, o.pseudo;
$function$;
revoke all on function public.my_friends() from public, anon;
grant execute on function public.my_friends() to authenticated;
