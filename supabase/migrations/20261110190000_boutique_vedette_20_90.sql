-- Réduction de l'objet à la une : entre 20 et 90 % (au lieu de 0 à 90 %). Appliquée en prod le 10 nov. 2026.
create or replace function public._featured(per bigint)
returns table (item text, pct int)
language sql stable security definer set search_path to ''
as $$
  with seed as (select coalesce((select v from public.shop_settings where k = 'seed'), '0') s)
  select s.id,
         (20 + ('x' || substr(md5('off:' || per || ':' || (select s from seed)), 1, 8))::bit(32)::bigint % 71)::int
  from public.shop_items s
  where s.active and s.kind not in ('banner', 'avatar') and public._stock(s.id, per) > 0
  order by md5('feat:' || s.id || ':' || per || ':' || (select s from seed))
  limit 1;
$$;
