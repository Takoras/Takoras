-- Failles corrigées :
-- 1) level_up : les doublons sont verrouillés et revérifiés au moment de les consommer. Avant, « monter de niveau » et
--    « vendre ces doublons » envoyés au même instant pouvaient passer tous les deux (niveau + pièces).
-- 2) Stock au-dessus de 50 (recharge éclair) : rembourser, utiliser un code ou le menu testeur ne fait plus jamais
--    BAISSER le stock (avant, il était ramené à 50).

create or replace function public.level_up(p_jeton text, p_serie text default 'Takoras')
returns json language plpgsql security definer set search_path to '' as $$
declare uid uuid := auth.uid(); r public.profiles; cur int; total int; ids bigint[]; k int;
begin
  if uid is null then raise exception 'not_logged_in'; end if; perform public._check_ban();
  select * into r from public.profiles where id = uid for update;
  select coalesce((select lvl from public.token_levels where user_id = uid and serie = p_serie and jeton = p_jeton), 1) into cur;
  if cur >= 10 then raise exception 'max_reached'; end if;
  select count(*) into total from public.pulls where user_id = uid and serie = p_serie and jeton = p_jeton and sold_at is null;
  -- les doublons choisis sont verrouillés : une vente en même temps attend, puis ne les trouve plus
  select array_agg(id) into ids from (
    select p.id from public.pulls p
    where p.user_id = uid and p.serie = p_serie and p.jeton = p_jeton and p.sold_at is null and not p.locked
      and not (p.id = any(coalesce(array_remove(r.showcase, null), '{}'))) and not (p.id = any(coalesce(array_remove(r.deck, null), '{}')))
    order by case coalesce(p.variant, '') when '' then 0 when 'gold' then 1 when 'celeste' then 2 else 3 end, p.created_at
    limit cur
    for update) x;
  if coalesce(array_length(ids, 1), 0) < cur or total - cur < 1 then raise exception 'not_enough_dupes'; end if;
  update public.pulls set sold_at = now(), fused = true where id = any(ids) and sold_at is null;
  get diagnostics k = row_count;
  if k < cur then raise exception 'not_enough_dupes'; end if; -- un doublon a disparu entre-temps : rien n'est fait
  insert into public.token_levels (user_id, serie, jeton, lvl) values (uid, p_serie, p_jeton, cur + 1)
    on conflict (user_id, serie, jeton) do update set lvl = excluded.lvl;
  return json_build_object('lvl', cur + 1, 'used', cur);
end $$;

create or replace function public.refund_pulls(ids bigint[])
returns json language plpgsql security definer set search_path to '' as $$
declare uid uuid := auth.uid(); k int; r public.profiles;
begin
  if uid is null then raise exception 'not_logged_in'; end if; perform public._check_ban();
  select * into r from public.profiles where id = uid for update;
  -- seulement des jetons à toi, tirés il y a moins de 2 h, ni vendus, ni verrouillés, ni en vitrine / deck
  with gone as (
    delete from public.pulls p
    where p.user_id = uid and p.id = any(ids) and p.sold_at is null and not p.locked and p.created_at > now() - interval '2 hours'
      and not (p.id = any(coalesce(array_remove(r.showcase, null), '{}'))) and not (p.id = any(coalesce(array_remove(r.deck, null), '{}')))
    returning p.*)
  insert into public.pending_pulls (user_id, serie, jeton, odds, variant, luck)
    select user_id, serie, jeton, odds, variant, luck from gone order by id;
  get diagnostics k = row_count;
  -- plafond 50, mais on ne fait jamais baisser un stock déjà au-dessus (recharge éclair)
  update public.profiles set stock = greatest(stock, least(50, stock + k)) where id = uid;
  return json_build_object('refunded', k, 'state', public.eco_state());
end $$;

create or replace function public.redeem_code(p_code text)
returns json language plpgsql security definer set search_path to '' as $$
declare uid uuid := auth.uid(); c public.promo_codes; x jsonb; it public.shop_items; q int;
begin
  if uid is null then raise exception 'not_logged_in'; end if;
  perform public._check_ban();
  select * into c from public.promo_codes where code = upper(trim(p_code)) for update;
  if not found or not c.active then raise exception 'code_invalid'; end if;
  if c.expires_at is not null and c.expires_at < now() then raise exception 'code_expired'; end if;
  if c.max_uses is not null and c.uses >= c.max_uses then raise exception 'code_used_up'; end if;
  if exists (select 1 from public.promo_redeems where code = c.code and user_id = uid) then raise exception 'code_already'; end if;
  insert into public.promo_redeems (code, user_id) values (c.code, uid);
  update public.promo_codes set uses = uses + 1 where code = c.code;
  update public.profiles set coins = coins + c.coins, stock = greatest(stock, least(50, stock + c.pulls)) where id = uid;
  for x in select * from jsonb_array_elements(c.items) loop
    select * into it from public.shop_items where id = x->>'item';
    if not found then continue; end if;
    q := greatest(1, coalesce((x->>'qty')::int, 1));
    if it.kind in ('banner', 'avatar') then perform public._apply_item(uid, it); else perform public._add_item(uid, it.id, q); end if;
  end loop;
  return json_build_object('coins', c.coins, 'pulls', c.pulls, 'items', c.items, 'state', public.eco_state());
end $$;

create or replace function public.beta_give(p_coins bigint default 0, p_pulls integer default 0, p_item text default null, p_qty integer default 1, p_jeton text default null, p_variant text default null)
returns json language plpgsql security definer set search_path to '' as $$
declare uid uuid := auth.uid(); it public.shop_items; o int;
begin
  if uid is null then raise exception 'not_logged_in'; end if;
  if not public._is_tester() then raise exception 'forbidden'; end if;
  update public.profiles set coins = least(1000000000000, greatest(0, coins + coalesce(p_coins, 0))),
    stock = case when coalesce(p_pulls, 0) >= 0 then greatest(stock, least(50, stock + coalesce(p_pulls, 0))) else greatest(0, stock + p_pulls) end
    where id = uid;
  if p_item is not null then
    select * into it from public.shop_items where id = p_item;
    if not found then raise exception 'unknown_item'; end if;
    if it.kind in ('banner', 'avatar') then
      begin perform public._apply_item(uid, it); exception when others then null; end; -- déjà possédé : rien
    else perform public._add_item(uid, it.id, greatest(1, least(100, coalesce(p_qty, 1)))); end if;
  end if;
  if p_jeton is not null then
    select odds into o from public.jetons where serie = 'Takoras' and name = p_jeton;
    if o is null then raise exception 'unknown_jeton'; end if;
    insert into public.pulls (user_id, serie, jeton, odds, variant)
      select uid, 'Takoras', p_jeton, o, nullif(p_variant, '') from generate_series(1, greatest(1, least(50, coalesce(p_qty, 1))));
  end if;
  return public.eco_state();
end $$;
