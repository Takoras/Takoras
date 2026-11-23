-- Market : plus de limite par ordre ; seule garde, un achat ne vide jamais la réserve (90 % max)
do $$ declare d text; begin
  d := pg_get_functiondef('public.bourse_trade'::regproc);
  if d not like '%if q > a.shares * 0.25 then%' then raise exception 'bourse_trade: limite introuvable'; end if;
  d := replace(d, 'if q > a.shares * 0.25 then', 'if p_buy and q > a.shares * 0.9 then');
  execute d;
end $$;
