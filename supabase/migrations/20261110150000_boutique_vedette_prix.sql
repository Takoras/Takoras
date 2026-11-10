-- Boutique : objet « à la une » tiré au hasard à chaque stock (toutes les 5 h), avec une réduction de 0 à 90 %,
-- appliquée par _price (donc à l'affichage ET à l'achat). Prix rééquilibrés sur une courbe régulière.
-- (appliquée en prod le 10 nov. 2026)

create or replace function public._featured(per bigint)
returns table (item text, pct int)
language sql stable security definer set search_path to ''
as $$
  with seed as (select coalesce((select v from public.shop_settings where k = 'seed'), '0') s)
  select s.id,
         (('x' || substr(md5('off:' || per || ':' || (select s from seed)), 1, 8))::bit(32)::bigint % 91)::int
  from public.shop_items s
  where s.active and s.kind not in ('banner', 'avatar') and public._stock(s.id, per) > 0
  order by md5('feat:' || s.id || ':' || per || ':' || (select s from seed))
  limit 1;
$$;

create or replace function public._price(p_item text, per bigint)
returns integer
language sql stable security definer set search_path to ''
as $$
  select greatest(1, round(
    coalesce((select o.price from public.shop_price_overrides o where o.item = p_item and o.period = per),
             (select s.price from public.shop_items s where s.id = p_item))
    * (100 - coalesce((select f.pct from public._featured(per) f where f.item = p_item), 0)) / 100.0
  ))::int;
$$;

create or replace function public.shop_today()
returns json
language sql stable security definer set search_path to ''
as $$
  select json_build_object(
    'reset_in', ((public._period() + 1) * 18000 - extract(epoch from now()))::int,
    'featured', (select f.item from public._featured(public._period()) f),
    'off', (select f.pct from public._featured(public._period()) f),
    'items', (select json_agg(json_build_object('id', s.id, 'kind', s.kind, 'price', public._price(s.id, public._period()), 'base_price', s.price, 'data', s.data,
               'stock', public._stock(s.id, public._period()),
               'bought', coalesce((select b.qty from public.shop_buys2 b where b.user_id = (select auth.uid()) and b.period = public._period() and b.item = s.id), 0),
               'owned', (s.kind = 'banner' and exists (select 1 from public.profiles pr where pr.id = (select auth.uid()) and substr(s.id, 3) = any(pr.banners))) or (s.kind = 'avatar' and exists (select 1 from public.profiles pr where pr.id = (select auth.uid()) and substr(s.id, 3) = any(pr.avatars))))
              order by case s.kind when 'potion' then 0 when 'instant' then 1 when 'hourglass' then 1 else 2 end, s.price)
             from public.shop_items s where s.active));
$$;

update public.shop_items set price = v.p from (values
  ('potion1', 150), ('potion2', 300), ('potion3', 600), ('potion10', 1500), ('potion25', 4500),
  ('potion50', 10000), ('potion100', 30000), ('potion250', 60000), ('potion500', 65000), ('hourglass', 800)
) as v(id, p) where shop_items.id = v.id;
