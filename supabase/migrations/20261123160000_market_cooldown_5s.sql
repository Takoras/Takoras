-- Market : 5 secondes entre deux ordres (au lieu de 40 par minute avec un message flou)
do $$ declare d text; begin
  d := pg_get_functiondef('public.bourse_trade'::regproc);
  if d not like '%perform public._rate(''bourse_trade'', 40);%' then raise exception 'bourse_trade: limite introuvable'; end if;
  d := replace(d, 'perform public._rate(''bourse_trade'', 40);',
    'if exists (select 1 from public.bourse_trades t where t.user_id = uid and t.at > now() - interval ''5 seconds'') then raise exception ''bourse_cooldown''; end if;');
  execute d;
end $$;
