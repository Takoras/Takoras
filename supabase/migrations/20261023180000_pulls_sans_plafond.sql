-- Pulls au-delà de 50 : le stock max (jusqu'à 50) ne limite plus que la recharge avec le temps.
-- Codes promo, remboursements, menu testeur (et la recharge éclair) ajoutent leurs pulls sans plafond (sécurité : 100 000).

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
  -- pas de plafond : la limite (stock max) ne vaut que pour la recharge avec le temps
  update public.profiles set stock = least(100000, stock + k) where id = uid;
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
  update public.profiles set coins = coins + c.coins, stock = least(100000, stock + c.pulls) where id = uid;
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
    stock = least(100000, greatest(0, stock + coalesce(p_pulls, 0)))
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

-- Dons de l'admin : même règle (plus de plafond à 50)
do $$
declare def text;
begin
  select pg_get_functiondef('public.admin_give(uuid, bigint, integer)'::regprocedure) into def;
  if position('stock = least(50, greatest(0, stock + p_pulls))' in def) > 0 then
    execute replace(def, 'stock = least(50, greatest(0, stock + p_pulls))', 'stock = least(100000, greatest(0, stock + p_pulls))');
  end if;
end $$;
