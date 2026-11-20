-- Market : un ordre peut prendre jusqu'à 25 % de la réserve (avant 10 %) : Max peut tout miser d'un coup
do $$ declare d text; begin
  d := pg_get_functiondef('public.bourse_trade'::regproc);
  if d not like '%if q > a.shares * 0.1 then%' then raise exception 'bourse_trade: limite introuvable'; end if;
  d := replace(d, 'if q > a.shares * 0.1 then', 'if q > a.shares * 0.25 then');
  execute d;
end $$;
