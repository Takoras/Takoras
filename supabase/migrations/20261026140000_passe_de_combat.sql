-- Passe de combat : saisons de 42 jours, 50 paliers de 1 000 XP.
-- Gratuit : 1 récompense tous les 3 paliers (16). Premium : une récompense aux 34 autres paliers (50 au total).
-- Premium = pièces, potions, confort, cosmétiques : jamais de stats ni de jeton exclusif. Pas encore achetable (aucun paiement).
-- XP : match classé gagné 120, perdu 60 (0 si abandon / absent), nul 90 ; pull 15 (max 600 / jour) ; quête du jour ~134.

create table if not exists public.battle_pass (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  season integer not null,
  xp integer not null default 0,
  pull_day date,
  pull_xp integer not null default 0,
  claimed integer[] not null default '{}',
  pclaimed integer[] not null default '{}',
  premium boolean not null default false
);
alter table public.battle_pass enable row level security;
revoke all on table public.battle_pass from public, anon, authenticated;

create or replace function public._bp_season()
returns integer language sql stable set search_path to '' as $$
  select greatest(1, ((public._today() - date '2026-10-26') / 42) + 1)::int;
$$;

-- Ligne du joueur pour la saison en cours (remise à zéro au changement de saison)
create or replace function public._bp_row(uid uuid)
returns public.battle_pass language plpgsql security definer set search_path to '' as $$
declare r public.battle_pass; s int := public._bp_season();
begin
  insert into public.battle_pass (user_id, season) values (uid, s) on conflict (user_id) do nothing;
  select * into r from public.battle_pass where user_id = uid for update;
  if r.season <> s then
    update public.battle_pass set season = s, xp = 0, pull_xp = 0, pull_day = null, claimed = '{}', pclaimed = '{}', premium = false
      where user_id = uid returning * into r;
  end if;
  return r;
end $$;

create or replace function public._bp_add(uid uuid, p_xp integer, from_pulls boolean default false)
returns void language plpgsql security definer set search_path to '' as $$
declare r public.battle_pass; x int := greatest(0, p_xp);
begin
  if uid is null or x = 0 then return; end if;
  r := public._bp_row(uid);
  if from_pulls then
    if r.pull_day is distinct from public._today() then r.pull_xp := 0; end if;
    x := least(x, 600 - r.pull_xp); -- pulls : 600 XP par jour au plus
    if x <= 0 then return; end if;
    update public.battle_pass set pull_day = public._today(), pull_xp = r.pull_xp + x where user_id = uid;
  end if;
  update public.battle_pass set xp = least(50000, xp + x) where user_id = uid;
end $$;

-- Récompense d'un palier : { coins } ou { item, qty }. null = pas de récompense sur cette piste.
create or replace function public._bp_reward(tier integer, prem boolean)
returns jsonb language sql immutable set search_path to '' as $$
  select case
    when not prem then (case tier
      when 3 then '{"coins":500}' when 6 then '{"item":"potion1","qty":2}' when 9 then '{"item":"instant","qty":1}'
      when 12 then '{"coins":800}' when 15 then '{"item":"potion2","qty":2}' when 18 then '{"item":"hourglass","qty":1}'
      when 21 then '{"coins":1200}' when 24 then '{"item":"potion3","qty":1}' when 27 then '{"item":"instant","qty":2}'
      when 30 then '{"coins":1500}' when 33 then '{"item":"potion10","qty":1}' when 36 then '{"item":"hourglass","qty":2}'
      when 39 then '{"coins":2000}' when 42 then '{"item":"potion25","qty":1}' when 45 then '{"item":"instant","qty":3}'
      when 48 then '{"item":"potion50","qty":1}' end)::jsonb
    when tier % 3 = 0 then null
    when tier = 25 then '{"item":"b_doodle","qty":1}'::jsonb
    when tier = 50 then '{"item":"a_etoile","qty":1}'::jsonb
    when tier % 4 = 1 then jsonb_build_object('coins', 400 + tier * 20)
    when tier % 4 = 2 then '{"item":"potion1","qty":3}'::jsonb
    when tier % 4 = 3 then '{"item":"potion2","qty":1}'::jsonb
    else '{"item":"instant","qty":1}'::jsonb
  end;
$$;

-- Mon passe : saison, XP, paliers récupérés, et les 50 paliers des deux pistes
create or replace function public.bp_state()
returns json language plpgsql security definer set search_path to '' as $$
declare uid uuid := auth.uid(); r public.battle_pass;
begin
  if uid is null then return null; end if;
  r := public._bp_row(uid);
  return json_build_object('season', r.season, 'xp', r.xp, 'premium', r.premium, 'claimed', r.claimed, 'pclaimed', r.pclaimed,
    'pull_xp', case when r.pull_day = public._today() then r.pull_xp else 0 end,
    'ends_in', extract(epoch from ((date '2026-10-26' + r.season * 42)::timestamp at time zone 'Europe/Paris' - now()))::int,
    'tiers', (select json_agg(json_build_object('t', g, 'free', public._bp_reward(g, false), 'prem', public._bp_reward(g, true)) order by g)
              from generate_series(1, 50) g));
end $$;

-- Récupérer un palier atteint (piste gratuite, ou premium si le passe premium est actif)
create or replace function public.bp_claim(p_tier integer, p_prem boolean default false)
returns json language plpgsql security definer set search_path to '' as $$
declare uid uuid := auth.uid(); r public.battle_pass; rw jsonb; it public.shop_items;
begin
  if uid is null then raise exception 'not_logged_in'; end if;
  perform public._check_ban();
  r := public._bp_row(uid);
  if p_tier < 1 or p_tier > 50 or r.xp < p_tier * 1000 then raise exception 'bp_locked'; end if;
  if p_prem and not r.premium then raise exception 'bp_premium'; end if;
  if (case when p_prem then p_tier = any(r.pclaimed) else p_tier = any(r.claimed) end) then raise exception 'bp_claimed'; end if;
  rw := public._bp_reward(p_tier, p_prem);
  if rw is null then raise exception 'bp_locked'; end if;
  if p_prem then update public.battle_pass set pclaimed = pclaimed || p_tier where user_id = uid;
  else update public.battle_pass set claimed = claimed || p_tier where user_id = uid; end if;
  if rw ? 'coins' then
    update public.profiles set coins = coins + (rw->>'coins')::int where id = uid;
  else
    select * into it from public.shop_items where id = rw->>'item';
    if it.kind in ('banner', 'avatar') then
      begin perform public._apply_item(uid, it); exception when others then null; end; -- déjà possédé
    else perform public._add_item(uid, it.id, (rw->>'qty')::int); end if;
  end if;
  return json_build_object('reward', rw, 'state', public.eco_state());
end $$;

revoke all on function public._bp_season(), public._bp_row(uuid), public._bp_add(uuid, integer, boolean) from public, anon, authenticated;
revoke all on function public.bp_state(), public.bp_claim(integer, boolean) from public, anon;
grant execute on function public.bp_state(), public.bp_claim(integer, boolean) to authenticated;

-- XP des pulls et des quêtes (le compteur du jour monte)
create or replace function public._bp_daily_xp()
returns trigger language plpgsql security definer set search_path to '' as $$
declare dp int := new.pulls - coalesce(case when tg_op = 'UPDATE' then old.pulls end, 0);
  dq int := coalesce(cardinality(new.claimed), 0) - coalesce(case when tg_op = 'UPDATE' then cardinality(old.claimed) end, 0);
begin
  if dp > 0 then perform public._bp_add(new.user_id, 15 * dp, true); end if;
  if dq > 0 then perform public._bp_add(new.user_id, 134 * dq); end if;
  return null;
end $$;
revoke all on function public._bp_daily_xp() from public, anon, authenticated;
drop trigger if exists bp_daily_xp on public.daily_stats;
create trigger bp_daily_xp after insert or update on public.daily_stats for each row execute function public._bp_daily_xp();

-- XP des matchs classés (à la fin du match)
create or replace function public._bp_match_xp()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  if old.status = 'live' and new.status = 'done' and new.why is distinct from 'stale' then
    if new.winner is null then
      perform public._bp_add(new.p1, 90); perform public._bp_add(new.p2, 90);
    else
      perform public._bp_add(case new.winner when 0 then new.p1 else new.p2 end, 120);
      if new.why not in ('afk', 'forfeit') then perform public._bp_add(case new.winner when 0 then new.p2 else new.p1 end, 60); end if;
    end if;
  end if;
  return null;
end $$;
revoke all on function public._bp_match_xp() from public, anon, authenticated;
drop trigger if exists bp_match_xp on public.ranked_matches;
create trigger bp_match_xp after update of status on public.ranked_matches for each row execute function public._bp_match_xp();
