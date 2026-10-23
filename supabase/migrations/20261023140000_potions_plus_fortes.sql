-- Potions plus fortes (retour joueurs) : les grosses potions durent plusieurs pulls, deux nouvelles (×250, ×500),
-- les potions rares apparaissent un peu plus souvent en boutique, et la chance totale est plafonnée à ×1000.
update public.shop_items set data = jsonb_set(data, '{rolls}', to_jsonb(v.rolls)) from (values
  ('potion1', 10), ('potion2', 6), ('potion3', 3), ('potion10', 4), ('potion25', 5), ('potion50', 6), ('potion100', 10)
) v(id, rolls) where shop_items.id = v.id;

insert into public.shop_items (id, kind, price, daily_limit, data, active) values
  ('potion250', 'potion', 600000, 1, '{"mult": 250, "rolls": 10}', true),
  ('potion500', 'potion', 1500000, 1, '{"mult": 500, "rolls": 5}', true)
on conflict (id) do update set data = excluded.data, price = excluded.price, active = true;

create or replace function public._luck(pots jsonb)
returns numeric language sql immutable set search_path to '' as $$
  select least(1000, 1 + coalesce(sum((x->>'m')::numeric - 1), 0)) from jsonb_array_elements(pots) x where (x->>'n')::int > 0;
$$;

create or replace function public._stock(p_item text, per bigint)
returns integer language plpgsql stable set search_path to '' as $$
declare r numeric; ov int; seed text := coalesce((select v from public.shop_settings where k = 'seed'), '0');
begin
  select stock into ov from public.shop_overrides where item = p_item and period = per;
  if ov is not null then return ov; end if;
  r := ('x' || substr(md5(p_item || ':' || per || ':' || seed), 1, 8))::bit(32)::bigint / 4294967296.0;
  return case p_item
    when 'potion1' then 5 + floor(r * 4)
    when 'potion2' then 2 + floor(r * 3)
    when 'potion3' then floor(r * 3)
    when 'potion10' then case when r < .45 then 1 else 0 end
    when 'potion25' then case when r < .22 then 1 else 0 end
    when 'potion50' then case when r < .10 then 1 else 0 end
    when 'potion100' then case when r < .04 then 1 else 0 end
    when 'potion250' then case when r < .015 then 1 else 0 end
    when 'potion500' then case when r < .006 then 1 else 0 end
    when 'instant' then 1 + floor(r * 3)
    when 'hourglass' then floor(r * 3)
    else 1 end;
end $$;
