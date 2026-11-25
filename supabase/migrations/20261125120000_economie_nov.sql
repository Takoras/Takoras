-- Nouvelle économie (validée par l'utilisateur le 25/11) :
-- Takoras : 1 tirage toutes les 10 s pour tout le monde, 500 en stock max (plus d'améliorations recharge / stock)
-- Bodako (séries payées) : 30 pièces le tirage (270 les 10) au lieu de 300 (2 700)
-- Revente : 1/10 de la rareté au lieu de la moitié ; boutique : prix ÷ 5 (les prix en Market Coins ne bougent pas)
-- Les pièces déjà gagnées par les joueurs ne sont pas touchées.

alter table public.profiles drop constraint profiles_regen_s_check, drop constraint profiles_stock_max_check;
alter table public.profiles add constraint profiles_regen_s_check check (regen_s between 10 and 180),
  add constraint profiles_stock_max_check check (stock_max between 5 and 500);
alter table public.profiles alter column regen_s set default 10, alter column stock_max set default 500;
update public.profiles set regen_s = 10, stock_max = 500 where regen_s <> 10 or stock_max <> 500;

update public.shop_items set price = greatest(10, round(price / 5.0 / 10) * 10) where price > 0;

create or replace function public._sell_value(o integer) returns bigint
language sql immutable set search_path to '' as $$ select greatest(1, round(o * 0.1))::bigint $$;

do $$ declare d text; o oid; begin
  -- les améliorations n'existent plus : tout le monde est déjà au maximum
  d := pg_get_functiondef('public.upgrade_regen'::regproc);
  d := replace(d, 'if r.regen_s <= 60 then raise exception', 'if true then raise exception');
  if d not like '%if true then raise exception ''max_reached''%' then raise exception 'upgrade_regen'; end if;
  execute d;
  d := pg_get_functiondef('public.upgrade_stock'::regproc);
  d := replace(d, 'if r.stock_max >= 100 then raise exception', 'if true then raise exception');
  if d not like '%if true then raise exception ''max_reached''%' then raise exception 'upgrade_stock'; end if;
  execute d;

  d := pg_get_functiondef('public.take_pulls_serie'::regproc);
  d := replace(d, 'cost := case when n = 10 then 2700 else 300 * n end;', 'cost := case when n = 10 then 270 else 30 * n end;');
  if d not like '%then 270 else 30 * n%' then raise exception 'take_pulls_serie'; end if;
  execute d;

  d := pg_get_functiondef('public.admin_reset'::regproc);
  d := replace(replace(d, 'stock = 5, stock_max = 5,', 'stock = 5, stock_max = 500,'), 'regen_s = 180,', 'regen_s = 10,');
  if d not like '%stock_max = 500,%' or d not like '%regen_s = 10,%' then raise exception 'admin_reset'; end if;
  execute d;

  -- prix en Market Coins inchangés malgré les prix en pièces ÷ 5
  for o in select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = '_koo_price' loop
    d := pg_get_functiondef(o);
    if d like '%sqrt(p)%' then d := replace(d, 'sqrt(p)', 'sqrt(p * 5)'); execute d; end if;
  end loop;
end $$;
