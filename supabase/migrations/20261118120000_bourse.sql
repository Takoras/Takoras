-- Bourse de saison : un marché fictif par mois sur une série tirée au sort. Tout est calculé ici.
-- Les Koo ne s'achètent pas, ne se retirent pas et ne se convertissent en rien.
create table public.bourse_seasons (
  id bigserial primary key, world bigint not null default 0, month date not null, serie text not null,
  ends_at timestamptz not null, settled_day date not null, share_at timestamptz, closed boolean not null default false,
  unique (world, month)
);
create table public.bourse_assets (
  id bigserial primary key, season_id bigint not null references public.bourse_seasons on delete cascade,
  jeton text not null, odds integer not null, shares numeric not null check (shares > 0), k numeric not null,
  p0 numeric not null, share numeric not null default 0, unique (season_id, jeton)
);
create table public.bourse_players (
  season_id bigint not null references public.bourse_seasons on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  koo numeric not null default 1000 check (koo >= 0), paid numeric not null default 0, divs numeric not null default 0,
  last_pay date, trades integer not null default 0, final_rank integer, final_score numeric, elo_delta integer,
  primary key (season_id, user_id)
);
create table public.bourse_positions (
  asset_id bigint not null references public.bourse_assets on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  season_id bigint not null references public.bourse_seasons on delete cascade,
  shares numeric not null default 0 check (shares >= 0), primary key (asset_id, user_id)
);
create index bourse_positions_user on public.bourse_positions (user_id, season_id);
create table public.bourse_trades (
  id bigserial primary key, season_id bigint not null references public.bourse_seasons on delete cascade,
  asset_id bigint not null references public.bourse_assets on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  buy boolean not null, shares numeric not null, koo numeric not null, price numeric not null,
  at timestamptz not null default now()
);
create index bourse_trades_asset on public.bourse_trades (asset_id, id desc);
create index bourse_trades_season on public.bourse_trades (season_id, id desc);
create index bourse_trades_user on public.bourse_trades (user_id);
create table public.bourse_elo (
  user_id uuid primary key references public.profiles on delete cascade, elo integer not null default 800, seasons integer not null default 0
);
do $$ declare t text; begin
  foreach t in array array['bourse_seasons','bourse_assets','bourse_players','bourse_positions','bourse_trades','bourse_elo'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- Part de chaque jeton dans l'activité du jour, comparée à ce que sa rareté laissait attendre (50 évènements max par joueur)
create function public._bourse_shares(p_season bigint, p_day date) returns table (asset_id bigint, share numeric)
language sql stable security definer set search_path to '' as $$
  with s as (select * from public.bourse_seasons where id = p_season),
  r as (select (p_day::timestamp at time zone 'Europe/Paris') a, ((p_day + 1)::timestamp at time zone 'Europe/Paris') b),
  ev as (
    select pu.user_id, pu.jeton, pu.created_at t from public.pulls pu, s, r where pu.serie = s.serie and pu.created_at >= r.a and pu.created_at < r.b
    union all
    select pu.user_id, pu.jeton, pu.sold_at from public.pulls pu, s, r where pu.serie = s.serie and pu.sold_at >= r.a and pu.sold_at < r.b
  ),
  cap as (
    select ev.jeton, row_number() over (partition by ev.user_id order by ev.t) n
    from ev join public.profiles pr on pr.id = ev.user_id, s
    where pr.sandbox is not distinct from nullif(s.world, 0) and not coalesce(pr.banned, false)
  ),
  cnt as (select jeton, count(*)::numeric c from cap where n <= 50 group by jeton),
  w as (select a.id, a.jeton, (1.0 / a.odds) / sum(1.0 / a.odds) over () p from public.bourse_assets a where a.season_id = p_season),
  sc as (select w.id, coalesce(cnt.c, 0) / w.p v from w left join cnt on cnt.jeton = w.jeton)
  select id, case when sum(v) over () > 0 then v / sum(v) over () else 0 end from sc
$$;

-- Dividendes des journées terminées : cagnotte de 20 Koo par joueur, partagée selon l'activité puis les actions détenues
create function public._bourse_settle(p_season bigint, p_until date) returns void
language plpgsql security definer set search_path to '' as $$
declare s public.bourse_seasons; n integer;
begin
  select * into s from public.bourse_seasons where id = p_season for update;
  while s.settled_day < p_until loop
    select count(*) into n from public.bourse_players where season_id = p_season;
    if n > 0 then
      update public.bourse_players pl set koo = pl.koo + d.x, divs = pl.divs + d.x from (
        select po.user_id, sum(20.0 * n * sh.share * po.shares / h.total) x
        from public._bourse_shares(p_season, s.settled_day) sh
        join public.bourse_positions po on po.asset_id = sh.asset_id and po.shares > 0
        join (select asset_id, sum(shares) total from public.bourse_positions group by asset_id) h on h.asset_id = po.asset_id
        group by po.user_id
      ) d where pl.season_id = p_season and pl.user_id = d.user_id;
    end if;
    s.settled_day := s.settled_day + 1;
  end loop;
  update public.bourse_seasons set settled_day = s.settled_day where id = p_season;
end $$;

-- Classement : ce que le joueur toucherait en vendant tout, moins sa paie
create function public._bourse_rows(p_season bigint)
returns table (user_id uuid, pseudo text, koo numeric, paid numeric, val numeric, score numeric, rk bigint, trades integer)
language sql stable security definer set search_path to '' as $$
  with v as (
    select pl.user_id, pr.pseudo, pl.koo, pl.paid, pl.trades,
      pl.koo + coalesce((select sum((a.k / a.shares - a.k / (a.shares + po.shares)) * 0.99)
        from public.bourse_positions po join public.bourse_assets a on a.id = po.asset_id
        where po.user_id = pl.user_id and po.season_id = p_season and po.shares > 0), 0) val
    from public.bourse_players pl join public.profiles pr on pr.id = pl.user_id
    where pl.season_id = p_season and pr.pseudo is not null and not coalesce(pr.banned, false)
  )
  select user_id, pseudo, koo, paid, val, (val - paid - 1000) / 10, rank() over (order by val - paid desc, pseudo), trades from v
$$;

create function public._bourse_close(p_season bigint, p_until date) returns void
language plpgsql security definer set search_path to '' as $$
declare n integer;
begin
  perform public._bourse_settle(p_season, p_until);
  select count(*) into n from public._bourse_rows(p_season) where trades > 0;
  with r as (
    select user_id, score, row_number() over (order by rk) i from public._bourse_rows(p_season) where trades > 0
  ), d as (
    select user_id, score, i, case when n > 1 then round(100 * (1 - 2.0 * (i - 1) / (n - 1)))::int else 0 end delta from r
  ), u as (
    update public.bourse_players pl set final_rank = d.i, final_score = d.score, elo_delta = d.delta
    from d where pl.season_id = p_season and pl.user_id = d.user_id returning pl.user_id, d.delta
  )
  insert into public.bourse_elo (user_id, elo, seasons) select user_id, greatest(0, 800 + delta), 1 from u
  on conflict (user_id) do update set elo = greatest(0, public.bourse_elo.elo + excluded.elo - 800), seasons = public.bourse_elo.seasons + 1;
  delete from public.bourse_trades where season_id = p_season;
  delete from public.bourse_positions where season_id = p_season;
  update public.bourse_seasons set closed = true where id = p_season;
end $$;

-- Saison du mois : créée au premier passage, sur une série tirée au sort
create function public._bourse_season() returns public.bourse_seasons
language plpgsql security definer set search_path to '' as $$
declare w bigint := coalesce(public._world(), 0); m date := date_trunc('month', now() at time zone 'Europe/Paris')::date;
  s public.bourse_seasons; o public.bourse_seasons; sr text;
begin
  select * into s from public.bourse_seasons where world = w and month = m;
  if not found then
    perform pg_advisory_xact_lock(hashtextextended('bourse:' || w, 0));
    select * into s from public.bourse_seasons where world = w and month = m;
    if not found then
      for o in select * from public.bourse_seasons where world = w and not closed and month < m loop
        perform public._bourse_close(o.id, (o.month + interval '1 month')::date);
      end loop;
      select serie into sr from public.jetons group by serie having count(*) >= 3 order by random() limit 1;
      insert into public.bourse_seasons (world, month, serie, ends_at, settled_day)
      values (w, m, sr, ((m + interval '1 month')::timestamp at time zone 'Europe/Paris'), public._today()) returning * into s;
      -- même prix de départ partout ; plus le jeton est rare, plus sa réserve est petite et son prix nerveux
      insert into public.bourse_assets (season_id, jeton, odds, shares, k, p0)
      select s.id, j.name, j.odds, t, t * t * 10, 10 from public.jetons j,
        lateral (select (case when j.odds <= 10 then 2000 when j.odds <= 100 then 1200 when j.odds <= 1000 then 700 else 400 end)::numeric t) x
      where j.serie = sr;
    end if;
  end if;
  if s.settled_day < public._today() then
    perform public._bourse_settle(s.id, public._today());
    select * into s from public.bourse_seasons where id = s.id;
  end if;
  return s;
end $$;

create function public.bourse_state() returns jsonb
language plpgsql security definer set search_path to '' as $$
declare uid uuid := public._uid(); s public.bourse_seasons; pl public.bourse_players; r record; ds public.daily_stats;
  e integer; res jsonb;
begin
  if uid is null then raise exception 'not_logged_in'; end if;
  s := public._bourse_season();
  update public.bourse_seasons set share_at = now() where id = s.id and (share_at is null or share_at < now() - interval '30 seconds');
  if found then
    update public.bourse_assets a set share = x.share from public._bourse_shares(s.id, public._today()) x where a.id = x.asset_id;
  end if;
  select * into pl from public.bourse_players where season_id = s.id and user_id = uid;
  select * into r from public._bourse_rows(s.id) x where x.user_id = uid;
  select * into ds from public.daily_stats where user_id = uid and day = public._today();
  select elo into e from public.bourse_elo where user_id = uid;
  with known as (select distinct jeton from public.pulls where user_id = uid and serie = s.serie)
  select jsonb_build_object(
    'season', jsonb_build_object('id', s.id, 'serie', s.serie, 'ends_at', s.ends_at),
    'me', jsonb_build_object('koo', round(coalesce(pl.koo, 1000), 2), 'paid', coalesce(pl.paid, 0), 'divs', round(coalesce(pl.divs, 0), 2),
      'value', round(coalesce(r.val, 1000), 2), 'score', round(coalesce(r.score, 0), 2), 'rank', r.rk, 'elo', coalesce(e, 800),
      'players', (select count(*) from public.bourse_players where season_id = s.id)),
    'quests', jsonb_build_object('pulls', coalesce(ds.pulls, 0), 'sold', coalesce(ds.sold, 0), 'quest', coalesce(cardinality(ds.claimed), 0), 'paid', pl.last_pay is not distinct from public._today()),
    'assets', (select jsonb_agg(jsonb_build_object(
        'id', a.id, 'name', case when kn.jeton is not null then a.jeton end, 'odds', case when kn.jeton is not null then a.odds end,
        'price', round(a.k / a.shares / a.shares, 4), 'p0', a.p0, 'shares', round(a.shares, 3), 'k', a.k, 'share', round(a.share, 4),
        'own', coalesce((select round(po.shares, 3) from public.bourse_positions po where po.asset_id = a.id and po.user_id = uid), 0),
        'h', (select coalesce(jsonb_agg(round(t.price, 4) order by t.id), '[]'::jsonb) from (select id, price from public.bourse_trades where asset_id = a.id order by id desc limit 40) t)
      ) order by a.odds, a.jeton) from public.bourse_assets a left join known kn on kn.jeton = a.jeton where a.season_id = s.id),
    'feed', (select coalesce(jsonb_agg(f order by f.at desc), '[]'::jsonb) from (
      select t.at, pr.pseudo, t.buy, round(t.shares, 2) shares, case when kn.jeton is not null then a.jeton end jeton
      from public.bourse_trades t join public.bourse_assets a on a.id = t.asset_id join public.profiles pr on pr.id = t.user_id left join known kn on kn.jeton = a.jeton
      where t.season_id = s.id order by t.id desc limit 10
    ) f)
  ) into res;
  return res;
end $$;

create function public.bourse_board() returns jsonb
language plpgsql security definer set search_path to '' as $$
declare uid uuid := public._uid(); s public.bourse_seasons; n integer;
begin
  if uid is null then raise exception 'not_logged_in'; end if;
  s := public._bourse_season();
  select count(*) into n from public._bourse_rows(s.id);
  return (select coalesce(jsonb_agg(jsonb_build_object('pseudo', x.pseudo, 'rank', x.rk, 'score', round(x.score, 2), 'value', round(x.val, 2),
      'elo', coalesce(e.elo, 800), 'delta', case when n > 1 then round(100 * (1 - 2.0 * (x.rk - 1) / (n - 1))) else 0 end, 'me', x.user_id = uid) order by x.rk), '[]'::jsonb)
    from public._bourse_rows(s.id) x left join public.bourse_elo e on e.user_id = x.user_id where x.rk <= 50 or x.user_id = uid);
end $$;

create function public.bourse_trade(p_asset bigint, p_buy boolean, p_shares numeric) returns jsonb
language plpgsql security definer set search_path to '' as $$
declare uid uuid := public._uid(); s public.bourse_seasons; a public.bourse_assets; pl public.bourse_players;
  q numeric := round(p_shares, 3); t1 numeric; x numeric; own numeric;
begin
  if uid is null then raise exception 'not_logged_in'; end if;
  perform public._check_ban(); perform public._rate('bourse_trade', 40);
  if not exists (select 1 from public.profiles where id = uid and pseudo is not null) then raise exception 'not_logged_in'; end if;
  s := public._bourse_season();
  if now() >= s.ends_at then raise exception 'bourse_closed'; end if;
  if q is null or q <= 0 then raise exception 'bourse_bad_order'; end if;
  select * into a from public.bourse_assets where id = p_asset and season_id = s.id for update;
  if not found then raise exception 'bourse_bad_order'; end if;
  if q > a.shares * 0.1 then raise exception 'bourse_too_big'; end if;
  insert into public.bourse_players (season_id, user_id) values (s.id, uid) on conflict do nothing;
  select * into pl from public.bourse_players where season_id = s.id and user_id = uid for update;
  if p_buy then
    t1 := a.shares - q; x := round((a.k / t1 - a.k / a.shares) * 1.01, 4);
    if x > pl.koo then raise exception 'bourse_no_koo'; end if;
    update public.bourse_players set koo = koo - x, trades = trades + 1 where season_id = s.id and user_id = uid;
    insert into public.bourse_positions (asset_id, user_id, season_id, shares) values (a.id, uid, s.id, q)
    on conflict (asset_id, user_id) do update set shares = public.bourse_positions.shares + q;
  else
    select shares into own from public.bourse_positions where asset_id = a.id and user_id = uid for update;
    if coalesce(own, 0) < q then raise exception 'bourse_no_shares'; end if;
    t1 := a.shares + q; x := round((a.k / a.shares - a.k / t1) * 0.99, 4);
    update public.bourse_players set koo = koo + x, trades = trades + 1 where season_id = s.id and user_id = uid;
    update public.bourse_positions set shares = shares - q where asset_id = a.id and user_id = uid;
  end if;
  update public.bourse_assets set shares = t1 where id = a.id;
  insert into public.bourse_trades (season_id, asset_id, user_id, buy, shares, koo, price) values (s.id, a.id, uid, p_buy, q, x, a.k / t1 / t1);
  return public.bourse_state();
end $$;

-- Paie du jour : 3 tirages, 1 vente, 1 quête récupérée = 25 Koo, retirés du score
create function public.bourse_claim_pay() returns jsonb
language plpgsql security definer set search_path to '' as $$
declare uid uuid := public._uid(); s public.bourse_seasons; ds public.daily_stats; done date;
begin
  if uid is null then raise exception 'not_logged_in'; end if;
  perform public._check_ban(); perform public._rate('bourse_pay', 10);
  s := public._bourse_season();
  if now() >= s.ends_at then raise exception 'bourse_closed'; end if;
  select * into ds from public.daily_stats where user_id = uid and day = public._today();
  if coalesce(ds.pulls, 0) < 3 or coalesce(ds.sold, 0) < 1 or coalesce(cardinality(ds.claimed), 0) < 1 then raise exception 'quest_not_done'; end if;
  insert into public.bourse_players (season_id, user_id) values (s.id, uid) on conflict do nothing;
  select last_pay into done from public.bourse_players where season_id = s.id and user_id = uid for update;
  if done = public._today() then raise exception 'quest_claimed'; end if;
  update public.bourse_players set koo = koo + 25, paid = paid + 25, last_pay = public._today() where season_id = s.id and user_id = uid;
  return public.bourse_state();
end $$;

do $$ declare f text; begin
  foreach f in array array['_bourse_shares(bigint,date)','_bourse_settle(bigint,date)','_bourse_rows(bigint)','_bourse_close(bigint,date)','_bourse_season()',
    'bourse_state()','bourse_board()','bourse_trade(bigint,boolean,numeric)','bourse_claim_pay()'] loop
    execute 'revoke all on function public.' || f || ' from public, anon, authenticated';
  end loop;
end $$;
grant execute on function public.bourse_state(), public.bourse_board(), public.bourse_trade(bigint, boolean, numeric), public.bourse_claim_pay() to authenticated;
