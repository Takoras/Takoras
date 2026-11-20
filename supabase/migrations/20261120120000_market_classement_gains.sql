-- Market : classement par pièces GAGNÉES (ventes et dividendes encaissés), plus par valeur détenue.
-- Acheter puis attendre ne fait plus monter : il faut revendre en gain.
-- Rangs bien plus durs (échelle logarithmique) et meilleur rang gardé pour le profil.

alter table public.bourse_elo add column if not exists best integer not null default 0;

-- gain encaissé -> Elo : 20 pièces = Bronze II, ~450 = Or I, ~1 400 = Diamant I, ~4 600 = Légende I, 10 000 = Légende III
create or replace function public._bourse_elo(g numeric) returns integer
language sql immutable set search_path = '' as $$
  select greatest(0, round(case when coalesce(g, 0) < 20 then 800 + 3.5 * coalesce(g, 0)
    else 870 + 1120 * ln(g / 20) / ln(500) end))::integer
$$;

-- score = gain encaissé : pièces + prix payé des actions encore en main - départ (1000) - paie du jour
create or replace function public._bourse_rows(p_season bigint)
 returns table(user_id uuid, pseudo text, koo numeric, paid numeric, val numeric, score numeric, rk bigint, trades integer)
 language sql stable security definer set search_path to ''
as $function$
  with v as (
    select pl.user_id, pr.pseudo, pl.koo, pl.paid, pl.trades,
      pl.koo + coalesce((select sum((a.k / a.shares - a.k / (a.shares + po.shares)) * 0.99)
        from public.bourse_positions po join public.bourse_assets a on a.id = po.asset_id
        where po.user_id = pl.user_id and po.season_id = p_season and po.shares > 0), 0) val,
      pl.koo + coalesce((select sum(po.cost) from public.bourse_positions po
        where po.user_id = pl.user_id and po.season_id = p_season and po.shares > 0), 0) - 1000 - pl.paid gain
    from public.bourse_players pl join public.profiles pr on pr.id = pl.user_id
    where pl.season_id = p_season and pr.pseudo is not null and not coalesce(pr.banned, false)
  )
  select user_id, pseudo, koo, paid, val, gain, rank() over (order by gain desc, pseudo), trades from v
$function$;

-- meilleur rang : gardé pour toujours
create or replace function public._bourse_best(p_season bigint) returns void
language sql security definer set search_path to '' as $$
  insert into public.bourse_elo (user_id, best)
  select x.user_id, public._bourse_elo(x.score) from public._bourse_rows(p_season) x
  on conflict (user_id) do update set best = greatest(public.bourse_elo.best, excluded.best)
$$;
revoke execute on function public._bourse_best(bigint) from public, anon, authenticated;
revoke execute on function public._bourse_elo(numeric) from public, anon, authenticated;

do $$
declare d text;
begin
  -- état et classement : nouvel Elo, meilleur rang mis à jour à chaque visite
  d := pg_get_functiondef('public.bourse_state'::regproc);
  d := replace(d, 'greatest(0, round(800 + coalesce(r.score, 0) * 10))', 'public._bourse_elo(coalesce(r.score, 0))');
  d := replace(d, '  select elo into e from public.bourse_elo where user_id = uid;',
    '  begin perform public._bourse_best(s.id); exception when others then null; end;' || chr(10) ||
    '  select best into e from public.bourse_elo where user_id = uid;');
  d := replace(d, '''players'', (select count(*)', '''best'', greatest(coalesce(e, 0), public._bourse_elo(coalesce(r.score, 0))),' || chr(10) || '      ''players'', (select count(*)');
  if d not like '%_bourse_best%' or d not like '%''best''%' then raise exception 'bourse_state: remplacement raté'; end if;
  execute d;

  d := pg_get_functiondef('public.bourse_board'::regproc);
  d := replace(d, 'greatest(0, round(800 + x.score * 10))', 'public._bourse_elo(x.score)');
  if d not like '%_bourse_elo%' then raise exception 'bourse_board: remplacement raté'; end if;
  execute d;

  -- profil : rang actuel et meilleur rang
  d := pg_get_functiondef('public.profile_public'::regproc);
  d := replace(d, '''owned'', (select count(*) from public.pulls p where p.user_id = r.id and p.sold_at is null)',
    '''owned'', (select count(*) from public.pulls p where p.user_id = r.id and p.sold_at is null),' || chr(10) ||
    '    ''mk'', (select case when x.user_id is null and e.user_id is null then null else json_build_object(' ||
    '''elo'', case when x.user_id is not null then public._bourse_elo(x.score) end, ''best'', greatest(coalesce(e.best, 0), coalesce(public._bourse_elo(x.score), 0))) end' || chr(10) ||
    '      from (select 1) one left join public.bourse_elo e on e.user_id = r.id' || chr(10) ||
    '      left join lateral (select y.user_id, y.score from public._bourse_rows((select bs.id from public.bourse_seasons bs where bs.world = coalesce(public._world(), 0) and not bs.closed order by bs.month desc limit 1)) y where y.user_id = r.id) x on true)');
  if d not like '%''mk''%' then raise exception 'profile_public: remplacement raté'; end if;
  execute d;
end $$;
