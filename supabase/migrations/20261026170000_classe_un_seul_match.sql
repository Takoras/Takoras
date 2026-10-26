-- Bug (retour de Spaykeur) : un joueur pouvait se retrouver dans DEUX matchs classés en même temps
-- (son 2e appel « join » le remettait dans la file pendant que son premier match était en train d'être créé).
-- Maintenant : appariement un par un (verrou), un joueur en match n'est jamais apparié, et les deux joueurs
-- appariés restent « réservés » (paired_at, 30 s max) jusqu'à ce que le match existe ; le trigger les retire alors de la file.
alter table public.ranked_queue add column if not exists paired_at timestamptz;

create or replace function public._ranked_pair(uid uuid, p_elo integer, p_team jsonb)
returns json language plpgsql security definer set search_path to '' as $$
declare me public.ranked_queue; me_since timestamptz; c public.ranked_queue;
begin
  perform pg_advisory_xact_lock(hashtext('ranked_pair'));
  if exists (select 1 from public.ranked_matches m where m.status = 'live' and uid in (m.p1, m.p2)) then
    delete from public.ranked_queue where user_id = uid;
    return json_build_object('busy', true);
  end if;
  select * into me from public.ranked_queue where user_id = uid;
  if me.paired_at is not null and me.paired_at > now() - interval '30 seconds' then
    return json_build_object('busy', true);
  end if;
  me_since := coalesce(me.joined_at, now());
  select * into c from public.ranked_queue q
  where q.user_id <> uid
    and (q.paired_at is null or q.paired_at <= now() - interval '30 seconds')
    and not exists (select 1 from public.ranked_matches m where m.status = 'live' and q.user_id in (m.p1, m.p2))
    and abs(q.elo - p_elo) <= greatest(
      least(300, 75 + 25 * floor(extract(epoch from now() - q.joined_at) / 10)),
      least(300, 75 + 25 * floor(extract(epoch from now() - me_since) / 10)))
  order by abs(q.elo - p_elo), q.joined_at
  limit 1 for update skip locked;
  if found then
    insert into public.ranked_queue (user_id, elo, team, joined_at, paired_at) values (uid, p_elo, p_team, me_since, now())
      on conflict (user_id) do update set paired_at = now();
    update public.ranked_queue set paired_at = now() where user_id = c.user_id;
    return json_build_object('foe', c.user_id, 'foe_elo', c.elo, 'foe_team', c.team);
  end if;
  insert into public.ranked_queue (user_id, elo, team, joined_at) values (uid, p_elo, p_team, me_since)
  on conflict (user_id) do update set elo = excluded.elo, team = excluded.team, paired_at = null;
  return json_build_object('queued', true, 'window', least(300, 75 + 25 * floor(extract(epoch from now() - me_since) / 10)));
end $$;
revoke all on function public._ranked_pair(uuid, integer, jsonb) from public, anon, authenticated;
grant execute on function public._ranked_pair(uuid, integer, jsonb) to service_role;

create or replace function public._ranked_unqueue()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  delete from public.ranked_queue where user_id in (new.p1, new.p2);
  return null;
end $$;
revoke all on function public._ranked_unqueue() from public, anon, authenticated;
drop trigger if exists ranked_unqueue on public.ranked_matches;
create trigger ranked_unqueue after insert on public.ranked_matches for each row execute function public._ranked_unqueue();
