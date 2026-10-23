-- Recharge éclair : +15 pulls d'un coup (peut dépasser le stock max), 500 pièces, 2 par période de boutique
update public.shop_items set price = 500, daily_limit = 2, data = '{"pulls": 15}' where id = 'instant';

create or replace function public._apply_item(uid uuid, it public.shop_items)
returns void language plpgsql security definer set search_path to '' as $$
declare r public.profiles; m numeric := (it.data->>'mult')::numeric; n int := (it.data->>'rolls')::int;
begin
  select * into r from public.profiles where id = uid for update;
  if it.kind = 'potion' then
    if exists (select 1 from jsonb_array_elements(r.potions) x where (x->>'m')::numeric = m) then
      update public.profiles set potions = (select jsonb_agg(case when (x->>'m')::numeric = m then jsonb_build_object('m', x->'m', 'n', (x->>'n')::int + n) else x end)
                                            from jsonb_array_elements(r.potions) x) where id = uid;
    else
      update public.profiles set potions = potions || jsonb_build_array(jsonb_build_object('m', m, 'n', n)) where id = uid;
    end if;
  elsif it.kind = 'instant' then
    -- +15 pulls (réglable dans shop_items.data.pulls), même au-dessus du stock max ; la recharge en cours est comptée avant
    perform public._regen(uid);
    update public.profiles set stock = stock + greatest(1, coalesce((it.data->>'pulls')::int, 1)) where id = uid;
  elsif it.kind = 'hourglass' then
    perform public._regen(uid);
    update public.profiles set fast_until = greatest(now(), coalesce(fast_until, now())) + make_interval(mins => (it.data->>'minutes')::int) where id = uid;
  elsif it.kind = 'banner' then
    if substr(it.id, 3) = any(r.banners) then raise exception 'owned'; end if;
    update public.profiles set banners = array_append(banners, substr(it.id, 3)) where id = uid;
  elsif it.kind = 'avatar' then
    if substr(it.id, 3) = any(r.avatars) then raise exception 'owned'; end if;
    update public.profiles set avatars = array_append(avatars, substr(it.id, 3)) where id = uid;
  end if;
end $$;
