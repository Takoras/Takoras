-- Améliorations Takoras de retour (demande de l'utilisateur, 26/11), moins chères :
-- stock max : départ 10, +10 par niveau jusqu'à 500 ; recharge : départ 1 tirage / 2 min, −10 s par niveau jusqu'à 10 s.
-- Tous les joueurs repartent du départ (ils étaient passés à 10 s / 500 la veille) ; les tirages déjà en stock sont gardés.
create or replace function public._upgrade_cost(target integer) returns bigint
language sql immutable set search_path to '' as $$
  -- 20 → 50 pièces … 500 → ~17 000 (≈ 340 000 en tout)
  select greatest(50, round(50 * power(greatest(1, (target - 10) / 10.0), 1.5) / 10) * 10)::bigint;
$$;
create or replace function public._regen_cost(target integer) returns bigint
language sql immutable set search_path to '' as $$
  -- 110 s → 100 pièces … 10 s → ~7 500 (≈ 42 000 en tout)
  select greatest(100, round(100 * power(greatest(1, (120 - target) / 10.0), 1.8) / 10) * 10)::bigint;
$$;

alter table public.profiles alter column regen_s set default 120, alter column stock_max set default 10;
update public.profiles set regen_s = 120, stock_max = 10 where regen_s <> 120 or stock_max <> 10;

do $$ declare d text; begin
  d := pg_get_functiondef('public.upgrade_stock'::regproc);
  d := replace(d, 'if true then raise exception', 'if r.stock_max >= 500 then raise exception');
  d := replace(d, 'cost := public._upgrade_cost(r.stock_max + 1);', 'cost := public._upgrade_cost(least(500, r.stock_max + 10));');
  d := replace(d, 'stock_max = stock_max + 1 where', 'stock_max = least(500, stock_max + 10) where');
  if d not like '%least(500, stock_max + 10)%' or d not like '%r.stock_max >= 500%' then raise exception 'upgrade_stock'; end if;
  execute d;
  d := pg_get_functiondef('public.upgrade_regen'::regproc);
  d := replace(d, 'if true then raise exception', 'if r.regen_s <= 10 then raise exception');
  if d not like '%r.regen_s <= 10 then raise%' then raise exception 'upgrade_regen'; end if;
  execute d;
  d := pg_get_functiondef('public.admin_reset'::regproc);
  d := replace(replace(d, 'stock_max = 500,', 'stock_max = 10,'), 'regen_s = 10,', 'regen_s = 120,');
  if d not like '%stock_max = 10,%' or d not like '%regen_s = 120,%' then raise exception 'admin_reset'; end if;
  execute d;
end $$;
