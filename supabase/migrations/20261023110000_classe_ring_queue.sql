-- File du classé : on ne s'apparie qu'avec quelqu'un qui cherche ENCORE (vu il y a moins de 15 s),
-- et sa propre ligne est verrouillée pendant la recherche (deux recherches simultanées ne créent jamais deux matchs).
alter table public.ranked_queue add column if not exists seen_at timestamptz not null default now();

create or replace function public._ranked_pair(uid uuid, p_elo integer, p_team jsonb)
returns json language plpgsql security definer set search_path to '' as $$
declare me_since timestamptz; c public.ranked_queue;
begin
  select joined_at into me_since from public.ranked_queue where user_id = uid for update;
  me_since := coalesce(me_since, now());
  delete from public.ranked_queue where seen_at < now() - interval '2 minutes';
  select * into c from public.ranked_queue q
  where q.user_id <> uid and q.seen_at > now() - interval '15 seconds'
    and abs(q.elo - p_elo) <= greatest(
      least(300, 75 + 25 * floor(extract(epoch from now() - q.joined_at) / 10)),
      least(300, 75 + 25 * floor(extract(epoch from now() - me_since) / 10)))
  order by abs(q.elo - p_elo), q.joined_at
  limit 1 for update skip locked;
  if found then
    delete from public.ranked_queue where user_id in (uid, c.user_id);
    return json_build_object('foe', c.user_id, 'foe_elo', c.elo, 'foe_team', c.team);
  end if;
  insert into public.ranked_queue (user_id, elo, team, joined_at, seen_at) values (uid, p_elo, p_team, me_since, now())
  on conflict (user_id) do update set elo = excluded.elo, team = excluded.team, seen_at = now();
  return json_build_object('queued', true, 'window', least(300, 75 + 25 * floor(extract(epoch from now() - me_since) / 10)));
end $$;
revoke all on function public._ranked_pair(uuid, integer, jsonb) from public, anon, authenticated;
grant execute on function public._ranked_pair(uuid, integer, jsonb) to service_role;
