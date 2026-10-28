-- Remise à zéro : les compteurs de tirages repartent aussi de zéro
CREATE OR REPLACE FUNCTION public.admin_reset(target uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare k int;
begin
  if not public._is_admin() then raise exception 'forbidden'; end if;
  delete from public.pulls where target is null or user_id = target;
  delete from public.pull_stats where target is null or user_id = target;
  delete from public.pull_days where target is null or user_id = target;
  delete from public.shop_buys where target is null or user_id = target;
  delete from public.shop_buys2 where target is null or user_id = target;
  delete from public.user_items where target is null or user_id = target;
  delete from public.pending_pulls where target is null or user_id = target;
  delete from public.token_levels where target is null or user_id = target;
  update public.ranked_matches set status = 'done', why = 'stale', updated_at = now()
    where status = 'live' and (target is null or p1 = target or p2 = target);
  delete from public.ranked_queue where target is null or user_id = target;
  delete from public.ranked where target is null or user_id = target;
  delete from public.battle_pass where target is null or user_id = target;
  update public.profiles set coins = 0, stock = 5, stock_max = 5, stock_last = now(), showcase = '{}', deck = '{}', avatar = 'default',
    potions = '[]', regen_s = 180, daily_last = null, daily_streak = 0, luck_mult = 1, luck_left = 0, fast_until = null,
    battle_wins = 0, battle_losses = 0, starter_pick = default, starter_quest = default, reset_at = now()
    where target is null or id = target;
  get diagnostics k = row_count;
  return k;
end $function$;
