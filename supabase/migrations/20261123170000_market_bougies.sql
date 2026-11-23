-- Market : graphique en bougies. Chaque bougie = ouverture, plus haut, plus bas, fermeture sur une période.
-- 1h : 12 bougies de 5 min ; 24h : 24 bougies d'1 h ; 7d : 28 bougies de 6 h. La dernière se ferme au prix actuel.
create index if not exists bourse_trades_asset_at on public.bourse_trades (asset_id, at);

create or replace function public.bourse_candles(p_asset bigint, p_range text)
 returns jsonb language plpgsql stable security definer set search_path to ''
as $function$
declare uid uuid := public._uid(); a public.bourse_assets; stp interval; n integer; t0 timestamptz;
  prev numeric; o numeric; h numeric; l numeric; c numeric; b0 timestamptz; res jsonb := '[]'::jsonb; cur numeric;
begin
  if uid is null then raise exception 'not_logged_in'; end if;
  select x.* into a from public.bourse_assets x join public.bourse_seasons s on s.id = x.season_id
    where x.id = p_asset and not s.closed and s.world = coalesce(public._world(), 0);
  if not found then return '[]'::jsonb; end if;
  case p_range when '1h' then stp := interval '5 minutes'; n := 12;
    when '7d' then stp := interval '6 hours'; n := 28;
    else stp := interval '1 hour'; n := 24; end case;
  t0 := date_bin(stp, now(), timestamptz '2000-01-01') - stp * (n - 1);
  cur := a.k / a.shares / a.shares;
  -- prix juste avant la fenêtre (ou prix de départ)
  select e.price into prev from (
    select price, at from public.bourse_trades where asset_id = a.id and at < t0
    union all select price, at from public.bourse_ticks where asset_id = a.id and at < t0
  ) e order by e.at desc limit 1;
  prev := coalesce(prev, a.p0);
  for i in 0 .. n - 1 loop
    b0 := t0 + stp * i;
    with e as (
      select price, at from public.bourse_trades where asset_id = a.id and at >= b0 and at < b0 + stp
      union all select price, at from public.bourse_ticks where asset_id = a.id and at >= b0 and at < b0 + stp
    )
    select max(price), min(price), (select price from e order by at desc limit 1) into h, l, c from e;
    o := prev;
    c := coalesce(c, prev);
    if i = n - 1 then c := cur; end if;
    h := greatest(o, c, coalesce(h, o));
    l := least(o, c, coalesce(l, o));
    res := res || jsonb_build_object('t', b0, 'o', round(o, 4), 'h', round(h, 4), 'l', round(l, 4), 'c', round(c, 4));
    prev := c;
  end loop;
  return res;
end $function$;
revoke execute on function public.bourse_candles(bigint, text) from public, anon;
grant execute on function public.bourse_candles(bigint, text) to authenticated;
