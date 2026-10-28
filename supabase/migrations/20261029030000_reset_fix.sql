-- Remise à zéro : starter_pick / starter_quest reviennent à leur valeur par défaut (ils ne peuvent pas être vides),
-- et reset_at prévient le navigateur du joueur qu'il doit tout oublier et recharger (tuto revu).
alter table public.profiles add column if not exists reset_at timestamptz;

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

CREATE OR REPLACE FUNCTION public.eco_state()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r public.profiles; step int;
begin
  if auth.uid() is null then raise exception 'not_logged_in'; end if;
  perform public._regen(auth.uid());
  select * into r from public.profiles where id = auth.uid();
  step := case when r.fast_until > now() then r.regen_s / 2 else r.regen_s end;
  return json_build_object('coins', r.coins, 'stock', r.stock, 'max', r.stock_max, 'admin', r.is_admin, 'pseudo', r.pseudo, 'banned', r.banned, 'beta', r.beta, 'tester', r.tester and public._beta_open(),
    'next_in', greatest(0, step - extract(epoch from (now() - r.stock_last)))::int, 'step', step, 'regen', r.regen_s, 'streak', case when r.daily_last >= public._today() - 1 then r.daily_streak else 0 end, 'streak_today', r.daily_last = public._today(),
    'potions', r.potions, 'luck', public._luck(r.potions),
    'fast_left', greatest(0, extract(epoch from (coalesce(r.fast_until, now()) - now())))::int,
    'reset_at', r.reset_at);
end $function$;
