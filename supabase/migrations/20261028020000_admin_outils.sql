-- Admin : la remise à zéro efface aussi le classé, le passe, le jeton de départ et les combats ;
-- « Tout donner » pour tester ; effacer tous les messages (le chat est retiré du site).

create or replace function public.admin_reset(target uuid)
returns integer language plpgsql security definer set search_path to '' as $$
declare k int;
begin
  if not public._is_admin() then raise exception 'forbidden'; end if;
  delete from public.pulls where target is null or user_id = target;
  delete from public.shop_buys where target is null or user_id = target;
  delete from public.shop_buys2 where target is null or user_id = target;
  delete from public.user_items where target is null or user_id = target;
  delete from public.pending_pulls where target is null or user_id = target;
  delete from public.token_levels where target is null or user_id = target;
  -- classé : Elo, matchs en cours, file d'attente ; passe de combat
  update public.ranked_matches set status = 'done', why = 'stale', updated_at = now()
    where status = 'live' and (target is null or p1 = target or p2 = target);
  delete from public.ranked_queue where target is null or user_id = target;
  delete from public.ranked where target is null or user_id = target;
  delete from public.battle_pass where target is null or user_id = target;
  update public.profiles set coins = 0, stock = 5, stock_max = 5, stock_last = now(), showcase = '{}', deck = '{}', avatar = 'default',
    potions = '[]', regen_s = 180, daily_last = null, daily_streak = 0, luck_mult = 1, luck_left = 0, fast_until = null,
    battle_wins = 0, battle_losses = 0, starter_pick = null, starter_quest = default
    where target is null or id = target;
  get diagnostics k = row_count;
  return k;
end $$;

-- Tout donner (pour tester) : chaque jeton en normal, Doré, Céleste et Ombre ; 10 de chaque objet ; 1 000 000 de pièces ;
-- toutes les bannières et photos de la boutique
create or replace function public.admin_give_all(target uuid)
returns void language plpgsql security definer set search_path to '' as $$
begin
  if not public._is_admin() then raise exception 'forbidden'; end if;
  insert into public.pulls (user_id, serie, jeton, odds, variant)
    select target, j.serie, j.name, j.odds, v from public.jetons j, unnest(array[null, 'gold', 'celeste', 'ombre']) v;
  insert into public.user_items (user_id, item, qty)
    select target, i.id, 10 from public.shop_items i where i.kind not in ('banner', 'avatar')
    on conflict (user_id, item) do update set qty = public.user_items.qty + 10;
  update public.profiles set coins = coins + 1000000,
    banners = (select array_agg(distinct x) from unnest(coalesce(banners, '{}') || array(select substr(id, 3) from public.shop_items where kind = 'banner')) x),
    avatars = (select array_agg(distinct x) from unnest(coalesce(avatars, '{}') || array(select substr(id, 3) from public.shop_items where kind = 'avatar')) x)
    where id = target;
end $$;

create or replace function public.admin_clear_messages()
returns integer language plpgsql security definer set search_path to '' as $$
declare k int;
begin
  if not public._is_admin() then raise exception 'forbidden'; end if;
  delete from public.messages;
  get diagnostics k = row_count;
  return k;
end $$;

revoke all on function public.admin_give_all(uuid), public.admin_clear_messages() from public, anon;
grant execute on function public.admin_give_all(uuid), public.admin_clear_messages() to authenticated;
