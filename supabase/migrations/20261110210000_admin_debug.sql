-- Menu debug des admins (Ctrl+Q) : actions de test sur SON PROPRE compte uniquement (jamais sur les autres joueurs).
create or replace function public.admin_debug(p_action text, p_n int default 0, p_item text default null)
returns json
language plpgsql
security definer
set search_path to ''
as $$
declare uid uuid := auth.uid();
begin
  if uid is null or not public._is_admin() then raise exception 'forbidden'; end if;
  perform public._bp_row(uid);
  case p_action
    -- passe
    when 'bp_max' then update public.battle_pass set premium = true, xp = 50 * 1000 where user_id = uid;
    when 'bp_reset' then update public.battle_pass set premium = false, xp = 0, claimed = '{}', pclaimed = '{}' where user_id = uid;
    when 'bp_xp' then update public.battle_pass set xp = least(50 * 1000, greatest(0, xp + p_n)) where user_id = uid;
    when 'bp_premium' then update public.battle_pass set premium = not premium where user_id = uid;
    when 'bp_unclaim' then update public.battle_pass set claimed = '{}', pclaimed = '{}' where user_id = uid;
    -- pièces, tirages, objets, effets
    when 'coins' then update public.profiles set coins = greatest(0, coins + p_n) where id = uid;
    when 'coins_set' then update public.profiles set coins = greatest(0, p_n) where id = uid;
    when 'pulls' then update public.profiles set stock = least(1000, greatest(0, stock + p_n)) where id = uid;
    when 'pulls_full' then update public.profiles set stock = stock_max where id = uid;
    when 'item' then perform public._add_item(uid, p_item, greatest(1, p_n));
    when 'fast' then update public.profiles set fast_until = greatest(now(), coalesce(fast_until, now())) + make_interval(mins => greatest(1, p_n)) where id = uid;
    when 'fx_clear' then update public.profiles set potions = '[]'::jsonb, luck_mult = 1, luck_left = 0, fast_until = null where id = uid;
    when 'daily_reset' then update public.profiles set daily_last = null where id = uid;
    -- boutique : les cases du jour redeviennent cachées (pour revoir la révélation)
    when 'shop_hide' then delete from public.shop_reveals where user_id = uid and period = public._period();
    else raise exception 'unknown_action';
  end case;
  return json_build_object('state', public.eco_state());
end $$;
revoke all on function public.admin_debug(text, int, text) from public, anon;
grant execute on function public.admin_debug(text, int, text) to authenticated;
