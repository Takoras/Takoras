-- Market : plafond par jeton, 5 % de ses actions de départ (100 communs, 60, 35, 20 pour les plus rares),
-- envoyé au site (« cap ») pour l'afficher à côté de ×N ; la limite de 500 pièces par minute est retirée.
create or replace function public._bourse_cap(p_odds integer) returns numeric
language sql immutable set search_path = '' as $$
  select (case when p_odds <= 10 then 2000 when p_odds <= 100 then 1200 when p_odds <= 1000 then 700 else 400 end) * 0.05
$$;

do $$ declare d text; begin
  d := pg_get_functiondef('public.bourse_trade'::regproc);
  if d not like '%bourse_rate_koo%' then raise exception 'bourse_trade: limite par minute introuvable'; end if;
  d := replace(d, '    select coalesce(sum(t.koo), 0) into used from public.bourse_trades t
      where t.user_id = uid and t.buy and t.at > now() - interval ''60 seconds'';
    if used + x > 500.0001 then raise exception ''bourse_rate_koo''; end if;',
    '    select coalesce(sum(p2.shares), 0) into used from public.bourse_positions p2 where p2.asset_id = a.id and p2.user_id = uid;
    if used + q > public._bourse_cap(a.odds) + 0.0001 then raise exception ''bourse_cap''; end if;');
  if d like '%bourse_rate_koo%' then raise exception 'bourse_trade: remplacement raté'; end if;
  execute d;

  d := pg_get_functiondef('public.bourse_state'::regproc);
  d := replace(d, '''own'', o.own, ''cost'', o.cost,', '''own'', o.own, ''cost'', o.cost, ''cap'', public._bourse_cap(a.odds),');
  if d not like '%_bourse_cap%' then raise exception 'bourse_state: remplacement raté'; end if;
  execute d;
end $$;
