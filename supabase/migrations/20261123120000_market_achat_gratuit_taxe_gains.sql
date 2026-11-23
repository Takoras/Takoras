-- Market plus clair :
-- 1) acheter est gratuit (plus de 1 % de frais) : juste après un achat, tu es à 0
-- 2) revendre en gain : 10 % du BÉNÉFICE va dans la caisse des dividendes ; revendre à perte ne coûte rien
-- 3) limite simple : 500 pièces d'achat max par minute (fenêtre glissante de 60 s)

create or replace function public.bourse_trade(p_asset bigint, p_buy boolean, p_shares numeric)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare uid uuid := public._uid(); s public.bourse_seasons; a public.bourse_assets; pl public.bourse_players;
  q numeric := round(p_shares, 3); t1 numeric; x numeric; g numeric; own numeric; basis numeric; used numeric;
begin
  if uid is null then raise exception 'not_logged_in'; end if;
  perform public._check_ban(); perform public._rate('bourse_trade', 40);
  if not exists (select 1 from public.profiles where id = uid and pseudo is not null) then raise exception 'not_logged_in'; end if;
  s := public._bourse_season();
  if now() >= s.ends_at then raise exception 'bourse_closed'; end if;
  if public._bourse_have(uid) < 10 then raise exception 'bourse_locked'; end if;
  if q is null or q <= 0 then raise exception 'bourse_bad_order'; end if;
  select * into a from public.bourse_assets where id = p_asset and season_id = s.id for update;
  if not found then raise exception 'bourse_bad_order'; end if;
  if p_buy and not exists (select 1 from public.pulls where user_id = uid and serie = s.serie and jeton = a.jeton) then raise exception 'bourse_unknown'; end if;
  if p_buy and q > a.shares * 0.9 then raise exception 'bourse_too_big'; end if;
  insert into public.bourse_players (season_id, user_id) values (s.id, uid) on conflict do nothing;
  select * into pl from public.bourse_players where season_id = s.id and user_id = uid for update;
  if p_buy then
    t1 := a.shares - q; g := a.k / t1 - a.k / a.shares; x := round(g, 4);
    if x > pl.koo then raise exception 'bourse_no_koo'; end if;
    select coalesce(sum(t.koo), 0) into used from public.bourse_trades t
      where t.user_id = uid and t.buy and t.at > now() - interval '60 seconds';
    if used + x > 500.0001 then raise exception 'bourse_rate_koo'; end if;
    update public.bourse_players set koo = koo - x, trades = trades + 1 where season_id = s.id and user_id = uid;
    update public.bourse_seasons set pot = pot + (x - g) where id = s.id; -- arrondi seulement
    insert into public.bourse_positions (asset_id, user_id, season_id, shares, cost) values (a.id, uid, s.id, q, x)
    on conflict (asset_id, user_id) do update set shares = public.bourse_positions.shares + q, cost = public.bourse_positions.cost + x;
  else
    select shares, cost into own, basis from public.bourse_positions where asset_id = a.id and user_id = uid for update;
    if coalesce(own, 0) < q then raise exception 'bourse_no_shares'; end if;
    t1 := a.shares + q; g := a.k / a.shares - a.k / t1;
    basis := basis * q / own;
    x := round(g - greatest(0, g - basis) * 0.1, 4);
    update public.bourse_players set koo = koo + x, trades = trades + 1 where season_id = s.id and user_id = uid;
    update public.bourse_seasons set pot = pot + (g - x) where id = s.id;
    update public.bourse_positions set cost = cost * (1 - q / own), shares = shares - q where asset_id = a.id and user_id = uid;
  end if;
  update public.bourse_assets set shares = t1 where id = a.id;
  insert into public.bourse_trades (season_id, asset_id, user_id, buy, shares, koo, price) values (s.id, a.id, uid, p_buy, q, x, a.k / t1 / t1);
  return public.bourse_state();
end $function$;

-- valeur = ce que tu toucherais en revendant tout maintenant (taxe de 10 % sur le bénéfice seulement)
create or replace function public._bourse_rows(p_season bigint)
 returns table(user_id uuid, pseudo text, koo numeric, paid numeric, val numeric, score numeric, rk bigint, trades integer)
 language sql stable security definer set search_path to ''
as $function$
  with v as (
    select pl.user_id, pr.pseudo, pl.koo, pl.paid, pl.trades,
      pl.koo + coalesce((select sum(z.g - greatest(0, z.g - po.cost) * 0.1)
        from public.bourse_positions po join public.bourse_assets a on a.id = po.asset_id
        cross join lateral (select a.k / a.shares - a.k / (a.shares + po.shares) g) z
        where po.user_id = pl.user_id and po.season_id = p_season and po.shares > 0), 0) val,
      pl.koo + coalesce((select sum(po.cost) from public.bourse_positions po
        where po.user_id = pl.user_id and po.season_id = p_season and po.shares > 0), 0) - 1000 - pl.paid gain
    from public.bourse_players pl join public.profiles pr on pr.id = pl.user_id
    where pl.season_id = p_season and pr.pseudo is not null and not coalesce(pr.banned, false)
  )
  select user_id, pseudo, koo, paid, val, gain, rank() over (order by gain desc, pseudo), trades from v
$function$;

-- état : ce qu'il reste à acheter cette minute, et dans combien de secondes la limite se libère
do $$ declare d text; begin
  d := pg_get_functiondef('public.bourse_state'::regproc);
  if d like '%buy_left%' then return; end if;
  d := replace(d, '''players'', (select count(*)',
    '''buy_left'', (select round(greatest(0, 500 - coalesce(sum(t.koo), 0)), 2) from public.bourse_trades t where t.user_id = uid and t.buy and t.at > now() - interval ''60 seconds''),' || chr(10) ||
    '      ''buy_wait'', (select coalesce(ceil(extract(epoch from (min(t.at) + interval ''60 seconds'' - now()))), 0) from public.bourse_trades t where t.user_id = uid and t.buy and t.at > now() - interval ''60 seconds''),' || chr(10) ||
    '      ''players'', (select count(*)');
  if d not like '%buy_left%' then raise exception 'bourse_state: remplacement raté'; end if;
  execute d;
end $$;
