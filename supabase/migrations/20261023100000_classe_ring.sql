-- Classé du Ring : Elo, file d'attente par niveau, matchs en ligne (tirs cachés, calculés par le serveur).
-- Uniquement des ajouts : rien de l'ancien site n'est modifié.

-- ---------- Elo de chaque joueur
create table if not exists public.ranked (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  elo integer not null default 1000,
  games integer not null default 0,
  wins integer not null default 0,
  losses integer not null default 0,
  draws integer not null default 0,
  best_elo integer not null default 1000,
  tuto_done boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.ranked enable row level security;
revoke all on table public.ranked from public, anon, authenticated;

-- ---------- File d'attente (jamais lisible par les joueurs)
create table if not exists public.ranked_queue (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  elo integer not null,
  team jsonb not null,
  joined_at timestamptz not null default now()
);
alter table public.ranked_queue enable row level security;
revoke all on table public.ranked_queue from public, anon, authenticated;

-- ---------- Matchs : visibles seulement par les deux joueurs (et en direct pour eux)
create table if not exists public.ranked_matches (
  id uuid primary key default gen_random_uuid(),
  p1 uuid not null references public.profiles(id) on delete cascade,
  p2 uuid not null references public.profiles(id) on delete cascade,
  names jsonb not null,
  map text not null,
  state jsonb not null,
  turn integer not null default 1,
  ready1 boolean not null default false,
  ready2 boolean not null default false,
  misses1 integer not null default 0,
  misses2 integer not null default 0,
  last jsonb,
  deadline timestamptz not null,
  status text not null default 'live' check (status in ('live', 'done')),
  winner smallint,
  why text,
  elo jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ranked_matches_p1 on public.ranked_matches (p1, status);
create index if not exists ranked_matches_p2 on public.ranked_matches (p2, status);
alter table public.ranked_matches enable row level security;
revoke all on table public.ranked_matches from public, anon, authenticated;
grant select on table public.ranked_matches to authenticated;
drop policy if exists ranked_matches_players on public.ranked_matches;
create policy ranked_matches_players on public.ranked_matches for select to authenticated
  using ((select auth.uid()) in (p1, p2));
alter publication supabase_realtime add table public.ranked_matches;

-- ---------- Tirs du tour en cours : personne ne les lit, sauf le serveur (révélés dans ranked_matches.last)
create table if not exists public.ranked_shots (
  match_id uuid not null references public.ranked_matches(id) on delete cascade,
  turn integer not null,
  side smallint not null check (side in (0, 1)),
  shot jsonb,
  created_at timestamptz not null default now(),
  primary key (match_id, turn, side)
);
alter table public.ranked_shots enable row level security;
revoke all on table public.ranked_shots from public, anon, authenticated;

-- ---------- Mon classé : Elo, bilan, tuto fait, match en cours, en file ou non
create or replace function public.ranked_me()
returns json language sql stable security definer set search_path to '' as $$
  select json_build_object(
    'elo', coalesce(r.elo, 1000), 'games', coalesce(r.games, 0), 'wins', coalesce(r.wins, 0),
    'losses', coalesce(r.losses, 0), 'draws', coalesce(r.draws, 0), 'best_elo', coalesce(r.best_elo, 1000),
    'tuto_done', coalesce(r.tuto_done, false),
    'top', (select count(*) + 1 from public.ranked o where o.games > 0 and o.elo > coalesce(r.elo, 1000)),
    'live', (select m.id from public.ranked_matches m where m.status = 'live' and (select auth.uid()) in (m.p1, m.p2) order by m.created_at desc limit 1),
    'queued', exists (select 1 from public.ranked_queue q where q.user_id = (select auth.uid()))
  )
  from (select 1) x left join public.ranked r on r.user_id = (select auth.uid());
$$;
revoke all on function public.ranked_me() from public, anon;
grant execute on function public.ranked_me() to authenticated;

-- Tuto du Ring terminé (obligatoire avant de jouer)
create or replace function public.ranked_tuto_done()
returns void language plpgsql security definer set search_path to '' as $$
begin
  if (select auth.uid()) is null then raise exception 'not_logged_in'; end if;
  insert into public.ranked (user_id, tuto_done) values ((select auth.uid()), true)
  on conflict (user_id) do update set tuto_done = true, updated_at = now();
end $$;
revoke all on function public.ranked_tuto_done() from public, anon;
grant execute on function public.ranked_tuto_done() to authenticated;

-- Classement Elo (joueurs ayant joué au moins un match)
create or replace function public.ranked_top(n integer default 50)
returns table (pseudo text, elo integer, games integer, wins integer)
language sql stable security definer set search_path to '' as $$
  select p.pseudo, r.elo, r.games, r.wins from public.ranked r join public.profiles p on p.id = r.user_id
  where r.games > 0 and p.pseudo is not null and not p.banned
  order by r.elo desc, r.wins desc limit least(greatest(n, 1), 100);
$$;
revoke all on function public.ranked_top(integer) from public;
grant execute on function public.ranked_top(integer) to anon, authenticated;

-- ---------- Réservé au serveur (fonction Edge « ranked », clé de service)
-- Équipe de 3 d'un joueur (son deck), avec niveau et variante
create or replace function public._ranked_team(uid uuid)
returns jsonb language sql stable security definer set search_path to '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('name', p.jeton, 'lvl', coalesce(tl.lvl, 1), 'variant', coalesce(p.variant, '')) order by d.o), '[]'::jsonb)
  from public.profiles pr cross join lateral unnest(pr.deck) with ordinality d(x, o)
  join public.pulls p on p.id = d.x and p.sold_at is null and p.user_id = pr.id
  left join public.token_levels tl on tl.user_id = p.user_id and tl.serie = p.serie and tl.jeton = p.jeton
  where pr.id = uid;
$$;

-- Appariement : un adversaire d'Elo proche (écart toléré qui grandit avec l'attente : 75, +25 toutes les 10 s, max 300).
-- Atomique : la ligne de l'adversaire est verrouillée puis retirée de la file. Sinon, on entre (ou reste) dans la file.
create or replace function public._ranked_pair(uid uuid, p_elo integer, p_team jsonb)
returns json language plpgsql security definer set search_path to '' as $$
declare me_since timestamptz; c public.ranked_queue;
begin
  select joined_at into me_since from public.ranked_queue where user_id = uid;
  me_since := coalesce(me_since, now());
  select * into c from public.ranked_queue q
  where q.user_id <> uid
    and abs(q.elo - p_elo) <= greatest(
      least(300, 75 + 25 * floor(extract(epoch from now() - q.joined_at) / 10)),
      least(300, 75 + 25 * floor(extract(epoch from now() - me_since) / 10)))
  order by abs(q.elo - p_elo), q.joined_at
  limit 1 for update skip locked;
  if found then
    delete from public.ranked_queue where user_id in (uid, c.user_id);
    return json_build_object('foe', c.user_id, 'foe_elo', c.elo, 'foe_team', c.team);
  end if;
  insert into public.ranked_queue (user_id, elo, team, joined_at) values (uid, p_elo, p_team, me_since)
  on conflict (user_id) do update set elo = excluded.elo, team = excluded.team;
  return json_build_object('queued', true, 'window', least(300, 75 + 25 * floor(extract(epoch from now() - me_since) / 10)));
end $$;

-- Fin de match : Elo des deux joueurs (K = 40 les 10 premiers matchs, puis 24), bilan, match terminé. Tout ou rien.
create or replace function public._ranked_end(p_match uuid, p_winner smallint, p_why text)
returns json language plpgsql security definer set search_path to '' as $$
declare m public.ranked_matches; r1 public.ranked; r2 public.ranked; e1 float; s1 float; k1 int; k2 int; n1 int; n2 int;
begin
  select * into m from public.ranked_matches where id = p_match for update;
  if not found or m.status <> 'live' then return null; end if;
  insert into public.ranked (user_id) values (m.p1), (m.p2) on conflict do nothing;
  select * into r1 from public.ranked where user_id = m.p1 for update;
  select * into r2 from public.ranked where user_id = m.p2 for update;
  e1 := 1 / (1 + power(10, (r2.elo - r1.elo) / 400.0));
  s1 := case p_winner when 0 then 1 when 1 then 0 else .5 end;
  k1 := case when r1.games < 10 then 40 else 24 end;
  k2 := case when r2.games < 10 then 40 else 24 end;
  n1 := greatest(0, r1.elo + round(k1 * (s1 - e1)));
  n2 := greatest(0, r2.elo + round(k2 * ((1 - s1) - (1 - e1))));
  update public.ranked set elo = n1, best_elo = greatest(best_elo, n1), games = games + 1,
    wins = wins + (p_winner = 0)::int, losses = losses + (p_winner = 1)::int, draws = draws + (p_winner is null)::int, updated_at = now()
    where user_id = m.p1;
  update public.ranked set elo = n2, best_elo = greatest(best_elo, n2), games = games + 1,
    wins = wins + (p_winner = 1)::int, losses = losses + (p_winner = 0)::int, draws = draws + (p_winner is null)::int, updated_at = now()
    where user_id = m.p2;
  update public.profiles set battle_wins = battle_wins + 1 where id = case p_winner when 0 then m.p1 when 1 then m.p2 end;
  update public.profiles set battle_losses = battle_losses + 1 where id = case p_winner when 0 then m.p2 when 1 then m.p1 end;
  update public.ranked_matches set status = 'done', winner = p_winner, why = p_why, updated_at = now(),
    elo = json_build_object('before', json_build_array(r1.elo, r2.elo), 'after', json_build_array(n1, n2))::jsonb
    where id = p_match;
  return json_build_object('before', json_build_array(r1.elo, r2.elo), 'after', json_build_array(n1, n2));
end $$;

revoke all on function public._ranked_team(uuid) from public, anon, authenticated;
revoke all on function public._ranked_pair(uuid, integer, jsonb) from public, anon, authenticated;
revoke all on function public._ranked_end(uuid, smallint, text) from public, anon, authenticated;
grant execute on function public._ranked_team(uuid) to service_role;
grant execute on function public._ranked_pair(uuid, integer, jsonb) to service_role;
grant execute on function public._ranked_end(uuid, smallint, text) to service_role;
grant all on table public.ranked, public.ranked_queue, public.ranked_matches, public.ranked_shots to service_role;

-- (correctif) l'équipe porte aussi la rareté (odds) : le serveur vérifie le budget de 8 points
create or replace function public._ranked_team(uid uuid)
returns jsonb language sql stable security definer set search_path to '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('name', p.jeton, 'odds', p.odds, 'lvl', coalesce(tl.lvl, 1), 'variant', coalesce(p.variant, '')) order by d.o), '[]'::jsonb)
  from public.profiles pr cross join lateral unnest(pr.deck) with ordinality d(x, o)
  join public.pulls p on p.id = d.x and p.sold_at is null and p.user_id = pr.id
  left join public.token_levels tl on tl.user_id = p.user_id and tl.serie = p.serie and tl.jeton = p.jeton
  where pr.id = uid;
$$;
revoke all on function public._ranked_team(uuid) from public, anon, authenticated;
grant execute on function public._ranked_team(uuid) to service_role;
