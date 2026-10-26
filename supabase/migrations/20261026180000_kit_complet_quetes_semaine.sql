-- Kit de départ complet (cahier § 11.4) + quêtes de la semaine (passe de combat § 13.2).

alter table public.profiles add column if not exists starter_pick boolean not null default false; -- jeton de départ à choisir
alter table public.profiles add column if not exists starter_quest boolean not null default false; -- quête tuto récupérée

-- Kit au choix du pseudo : 1 500 pièces, 10 pulls, 3 potions ×1,3, 1 potion ×5, un premier pull garanti rare (1/100+),
-- un jeton de départ à choisir parmi 3, et la quête tuto (+500 pièces).
create or replace function public._starter_kit()
returns trigger language plpgsql security definer set search_path to '' as $$
declare j record;
begin
  if old.pseudo is null and new.pseudo is not null then
    new.coins := new.coins + 1500;
    new.stock := least(1000, new.stock + 10);
    new.starter_pick := true;
    perform public._add_item(new.id, 'potion1', 3);
    perform public._add_item(new.id, 'potion3', 1);
    -- premier pull garanti rare ou mieux : il sortira au prochain pull (comme un pull remboursé)
    select name, odds into j from public.jetons where serie = 'Takoras' and odds between 100 and 999 order by random() limit 1;
    if found then insert into public.pending_pulls (user_id, serie, jeton, odds, luck) values (new.id, 'Takoras', j.name, j.odds, 1); end if;
  end if;
  return new;
end $$;

-- Jeton de départ : un seul, parmi 3 proposés
create or replace function public.starter_choices()
returns json language sql stable security definer set search_path to '' as $$
  select json_build_object('pending', coalesce((select starter_pick from public.profiles where id = (select auth.uid())), false),
    'choices', json_build_array('Pikko', 'Givre', 'Soléo'),
    'quest', (select json_build_object(
      'pull', exists (select 1 from public.pulls p where p.user_id = pr.id),
      'shop', exists (select 1 from public.shop_buys2 b where b.user_id = pr.id) or exists (select 1 from public.shop_buys b where b.user_id = pr.id),
      'ring', coalesce((select r.tuto_done from public.ranked r where r.user_id = pr.id), false),
      'done', pr.starter_quest)
      from public.profiles pr where pr.id = (select auth.uid())));
$$;
create or replace function public.starter_pick(p_jeton text)
returns json language plpgsql security definer set search_path to '' as $$
declare uid uuid := auth.uid(); o int;
begin
  if uid is null then raise exception 'not_logged_in'; end if;
  if p_jeton not in ('Pikko', 'Givre', 'Soléo') then raise exception 'unknown_jeton'; end if;
  update public.profiles set starter_pick = false where id = uid and starter_pick returning 1 into o;
  if o is null then raise exception 'starter_done'; end if;
  select odds into o from public.jetons where serie = 'Takoras' and name = p_jeton;
  insert into public.pulls (user_id, serie, jeton, odds) values (uid, 'Takoras', p_jeton, o);
  return public.eco_state();
end $$;
-- Quête tuto : ouvrir un pull, acheter en boutique, faire le tuto du Ring → +500 pièces, une fois
create or replace function public.starter_quest_claim()
returns json language plpgsql security definer set search_path to '' as $$
declare uid uuid := auth.uid(); q json := public.starter_choices() -> 'quest'; ok int;
begin
  if uid is null then raise exception 'not_logged_in'; end if;
  if not ((q->>'pull')::boolean and (q->>'shop')::boolean and (q->>'ring')::boolean) then raise exception 'quest_not_done'; end if;
  update public.profiles set starter_quest = true, coins = coins + 500 where id = uid and not starter_quest returning 1 into ok;
  if ok is null then raise exception 'starter_done'; end if;
  return public.eco_state();
end $$;
revoke all on function public.starter_choices(), public.starter_pick(text), public.starter_quest_claim() from public, anon;
grant execute on function public.starter_choices(), public.starter_pick(text), public.starter_quest_claim() to authenticated;

-- ---------- Quêtes de la semaine (lundi → dimanche) : 3 objectifs, ~667 XP de passe + des pièces chacun
create table if not exists public.weekly_claims (
  user_id uuid not null references public.profiles(id) on delete cascade,
  week date not null,
  id text not null,
  primary key (user_id, week, id)
);
alter table public.weekly_claims enable row level security;
revoke all on table public.weekly_claims from public, anon, authenticated;

create or replace function public._week() returns date language sql stable set search_path to '' as $$
  select (public._today() - ((extract(isodow from public._today())::int + 6) % 7))::date;
$$;
create or replace function public.my_weekly()
returns json language sql stable security definer set search_path to '' as $$
  with w as (select public._week() d), me as (select (select auth.uid()) id),
  v as (
    select 'pulls' id, 300 target, coalesce((select sum(s.pulls) from public.daily_stats s, w, me where s.user_id = me.id and s.day >= w.d), 0)::int val, 1500 coins
    union all
    select 'wins', 5, (select count(*) from public.ranked_matches m, w, me where m.status = 'done' and m.updated_at >= w.d
      and ((m.winner = 0 and m.p1 = me.id) or (m.winner = 1 and m.p2 = me.id)))::int, 2000
    union all
    select 'quests', 10, coalesce((select sum(cardinality(s.claimed)) from public.daily_stats s, w, me where s.user_id = me.id and s.day >= w.d), 0)::int, 1000
  )
  select json_build_object('week', (select d from w), 'quests', json_agg(json_build_object('id', v.id, 'target', v.target, 'value', least(v.val, v.target), 'coins', v.coins,
    'claimed', exists (select 1 from public.weekly_claims c, w, me where c.user_id = me.id and c.week = w.d and c.id = v.id))))
  from v;
$$;
create or replace function public.claim_weekly(p_id text)
returns json language plpgsql security definer set search_path to '' as $$
declare uid uuid := auth.uid(); q json;
begin
  if uid is null then raise exception 'not_logged_in'; end if;
  perform public._check_ban();
  select x into q from json_array_elements(public.my_weekly() -> 'quests') x where x->>'id' = p_id;
  if q is null or (q->>'value')::int < (q->>'target')::int then raise exception 'quest_not_done'; end if;
  insert into public.weekly_claims (user_id, week, id) values (uid, public._week(), p_id) on conflict do nothing;
  if not found then raise exception 'bp_claimed'; end if;
  update public.profiles set coins = coins + (q->>'coins')::int where id = uid;
  perform public._bp_add(uid, 667);
  return public.eco_state();
end $$;
revoke all on function public._week() from public, anon, authenticated;
revoke all on function public.my_weekly(), public.claim_weekly(text) from public, anon;
grant execute on function public.my_weekly(), public.claim_weekly(text) to authenticated;
