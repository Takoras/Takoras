-- Stock max : jusqu'à 100 (au lieu de 50)
CREATE OR REPLACE FUNCTION public.upgrade_stock()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r public.profiles; cost bigint;
begin
  if auth.uid() is null then raise exception 'not_logged_in'; end if; perform public._check_ban(); perform public._rate('upgrade_stock', 20);
  select * into r from public.profiles where id = auth.uid() for update;
  if r.stock_max >= 100 then raise exception 'max_reached'; end if;
  cost := public._upgrade_cost(r.stock_max + 1);
  if r.coins < cost then raise exception 'not_enough_coins'; end if;
  update public.profiles set coins = coins - cost, stock_max = stock_max + 1 where id = auth.uid();
  return public.eco_state();
end $function$;
