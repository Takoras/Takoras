-- Compteurs de tirages (pour garder les stats « obtenu N fois », total de tirages, meilleur tirage, classement)
-- sans garder une ligne par tirage vendu. Remplis à chaque tirage par un déclencheur.
create table if not exists public.pull_stats (
  user_id uuid not null references public.profiles(id) on delete cascade,
  serie text not null,
  jeton text not null,
  variant text not null default '',
  odds integer not null,
  total bigint not null default 0,
  first_at timestamptz not null default now(),
  primary key (user_id, serie, jeton, variant)
);
create table if not exists public.pull_days (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  n integer not null default 0,
  primary key (user_id, day)
);
create index if not exists pull_days_day on public.pull_days (day);
alter table public.pull_stats enable row level security;
alter table public.pull_days enable row level security;

-- un tirage de plus : +1 ; un tirage retiré (remboursé, retiré par un admin) : -1 ; un tirage VENDU qu'on efface : rien ne bouge
create or replace function public._pull_count() returns trigger
language plpgsql security definer set search_path to '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.pull_stats as s (user_id, serie, jeton, variant, odds, total, first_at)
      values (new.user_id, new.serie, new.jeton, coalesce(new.variant, ''), new.odds, 1, new.created_at)
      on conflict (user_id, serie, jeton, variant) do update set total = s.total + 1;
    insert into public.pull_days as d (user_id, day, n) values (new.user_id, new.created_at::date, 1)
      on conflict (user_id, day) do update set n = d.n + 1;
    return new;
  end if;
  if old.sold_at is null then
    update public.pull_stats set total = greatest(0, total - 1)
      where user_id = old.user_id and serie = old.serie and jeton = old.jeton and variant = coalesce(old.variant, '');
    update public.pull_days set n = greatest(0, n - 1) where user_id = old.user_id and day = old.created_at::date;
  end if;
  return old;
end $$;
drop trigger if exists pull_count on public.pulls;
create trigger pull_count after insert or delete on public.pulls for each row execute function public._pull_count();

-- remplissage avec tout l'historique (vendus compris)
insert into public.pull_stats (user_id, serie, jeton, variant, odds, total, first_at)
  select user_id, serie, jeton, coalesce(variant, ''), max(odds), count(*), min(created_at)
  from public.pulls group by user_id, serie, jeton, coalesce(variant, '')
on conflict (user_id, serie, jeton, variant) do update set total = excluded.total, odds = excluded.odds, first_at = excluded.first_at;
insert into public.pull_days (user_id, day, n)
  select user_id, created_at::date, count(*) from public.pulls group by user_id, created_at::date
on conflict (user_id, day) do update set n = excluded.n;

-- ---------- les lectures passent par les compteurs
CREATE OR REPLACE FUNCTION public.my_collection()
 RETURNS TABLE(jeton text, variant text, total bigint, owned bigint, serie text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
  select s.jeton, s.variant, s.total,
    (select count(*) from public.pulls p where p.user_id = s.user_id and p.serie = s.serie and p.jeton = s.jeton
       and coalesce(p.variant, '') = s.variant and p.sold_at is null),
    s.serie
  from public.pull_stats s where s.user_id = (select auth.uid()) and s.total > 0;
$function$;

CREATE OR REPLACE FUNCTION public.collection_of(p_pseudo text)
 RETURNS TABLE(jeton text, variant text, total bigint, serie text, owned bigint)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
  select s.jeton, s.variant, s.total, s.serie,
    (select count(*) from public.pulls p where p.user_id = s.user_id and p.serie = s.serie and p.jeton = s.jeton
       and coalesce(p.variant, '') = s.variant and p.sold_at is null)
  from public.pull_stats s join public.profiles pr on pr.id = s.user_id
  where lower(pr.pseudo) = lower(p_pseudo) and s.total > 0;
$function$;

CREATE OR REPLACE FUNCTION public.leaderboard(kind text, since timestamp with time zone DEFAULT NULL::timestamp with time zone, n integer DEFAULT 20)
 RETURNS TABLE(pseudo text, value bigint, jeton text, odds integer)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
  with c as (
    select d.user_id, sum(d.n)::bigint as cnt from public.pull_days d
    where since is null or d.day >= since::date group by d.user_id
  ), s as (
    select st.user_id, count(distinct st.serie || '/' || st.jeton) as collec,
           sum(st.total) filter (where st.variant <> '') as vars,
           (array_agg(st.jeton order by st.odds desc, st.first_at))[1] as best_jeton, max(st.odds) as best_odds
    from public.pull_stats st where st.total > 0 group by st.user_id
  )
  select pr.pseudo,
         case kind when 'gain' then s.best_odds::bigint when 'collec' then s.collec when 'variants' then coalesce(s.vars, 0) else c.cnt end as value,
         s.best_jeton, s.best_odds
  from c join s on s.user_id = c.user_id join public.profiles pr on pr.id = c.user_id
  where pr.pseudo is not null and c.cnt > 0 and (kind <> 'variants' or coalesce(s.vars, 0) > 0)
  order by value desc, pr.created_at
  limit least(greatest(n, 1), 100);
$function$;

CREATE OR REPLACE FUNCTION public.profile_public(p_pseudo text)
 RETURNS json
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
declare r public.profiles; mine boolean;
begin
  select * into r from public.profiles where lower(pseudo) = lower(p_pseudo);
  if not found then return null; end if;
  mine := r.id = (select auth.uid());
  return json_build_object(
    'pseudo', r.pseudo, 'num', r.num, 'streak', case when r.daily_last >= public._today() - 1 then r.daily_streak else 0 end, 'beta', r.beta, 'wins', r.battle_wins, 'losses', r.battle_losses, 'avatar', r.avatar, 'banner', r.banner, 'bio', r.bio, 'joined', r.created_at,
    'banners', case when mine then to_json(r.banners) else null end, 'avatars', case when mine then to_json(r.avatars) else null end,
    'email', case when mine then (select email from auth.users where id = r.id) else null end,
    'provider', case when mine then (select raw_app_meta_data->>'provider' from auth.users where id = r.id) else null end,
    'pseudo_free', case when mine then r.pseudo_free end,
    'pseudo_next', case when mine and not r.pseudo_free and r.pseudo_changed_at > now() - interval '30 days' then r.pseudo_changed_at + interval '30 days' end,
    'showcase', (select json_agg(case when p.id is null then null else json_build_object('id', p.id, 'jeton', p.jeton, 'odds', p.odds, 'variant', p.variant) end order by i)
                 from generate_series(1, 5) i left join public.pulls p on p.id = r.showcase[i] and p.sold_at is null),
    'pulls', (select coalesce(sum(s.total), 0) from public.pull_stats s where s.user_id = r.id),
    'best', (select max(s.odds) from public.pull_stats s where s.user_id = r.id and s.total > 0),
    'best_variant', null,
    'best_pull', (select json_build_object('jeton', s.jeton, 'odds', s.odds, 'variant', nullif(s.variant, ''), 'eff', s.odds::bigint * public._vodds(nullif(s.variant, '')))
                  from public.pull_stats s where s.user_id = r.id and s.total > 0
                  order by s.odds::bigint * public._vodds(nullif(s.variant, '')) desc, s.first_at limit 1),
    'collection', (select count(distinct s.jeton) from public.pull_stats s where s.user_id = r.id and s.total > 0),
    'owned', (select count(*) from public.pulls p where p.user_id = r.id and p.sold_at is null)
  );
end $function$;

CREATE OR REPLACE FUNCTION public.starter_choices()
 RETURNS json
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
  select json_build_object('pending', coalesce((select starter_pick from public.profiles where id = (select auth.uid())), false),
    'choices', json_build_array('Pikko', 'Givre', 'Soléo'),
    'quest', (select json_build_object(
      'pull', exists (select 1 from public.pull_stats s where s.user_id = pr.id and s.total > 0),
      'shop', exists (select 1 from public.shop_buys2 b where b.user_id = pr.id) or exists (select 1 from public.shop_buys b where b.user_id = pr.id),
      'ring', coalesce((select r.tuto_done from public.ranked r where r.user_id = pr.id), false),
      'done', pr.starter_quest)
      from public.profiles pr where pr.id = (select auth.uid())));
$function$;

CREATE OR REPLACE FUNCTION public.admin_players(q text DEFAULT ''::text)
 RETURNS TABLE(id uuid, pseudo text, coins bigint, stock integer, stock_max integer, pulls bigint, best_odds integer, created_at timestamp with time zone, banned boolean)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
begin
  if not public._is_admin() then raise exception 'forbidden'; end if;
  return query
    select p.id, p.pseudo, p.coins, p.stock, p.stock_max,
           (select coalesce(sum(s.total), 0)::bigint from public.pull_stats s where s.user_id = p.id),
           (select max(s.odds) from public.pull_stats s where s.user_id = p.id and s.total > 0),
           p.created_at, p.banned
    from public.profiles p
    where coalesce(q, '') = '' or p.pseudo ilike q || '%'
    order by p.created_at desc limit 100;
end $function$;

CREATE OR REPLACE FUNCTION public.admin_stats()
 RETURNS json
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
  select case when public._is_admin() then json_build_object(
    'players', (select count(*) from public.profiles),
    'pulls_today', (select coalesce(sum(n), 0) from public.pull_days where day = current_date),
    'pulls_total', (select coalesce(sum(n), 0) from public.pull_days),
    'coins_total', (select coalesce(sum(coins), 0) from public.profiles),
    'best_today', (select max(odds) from public.pulls where created_at >= current_date)) end;
$function$;
