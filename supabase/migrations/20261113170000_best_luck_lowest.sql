-- Appliquée via MCP (best_luck_lowest)
-- « Meilleure chance » d'un jeton : la chance la plus BASSE avec laquelle on l'a tiré (l'avoir eu à ×2 est bien plus
-- fort qu'à ×900). Avant : max(luck).
CREATE OR REPLACE FUNCTION public.my_inventory_groups()
 RETURNS json
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with pr as (select array_remove(showcase, null) sc, array_remove(deck, null) dk from public.profiles where id = (select auth.uid())),
  x as (
    select p.serie, p.jeton, p.odds, coalesce(p.variant, '') variant, p.id, p.locked, p.created_at, p.luck,
           p.id = any(pr.sc) shown, p.id = any(pr.dk) in_deck
    from public.pulls p, pr where p.user_id = (select auth.uid()) and p.sold_at is null)
  select coalesce(json_agg(g), '[]') from (
    select serie, jeton, odds, variant,
           array_agg(id order by created_at desc) ids,
           coalesce(array_agg(id order by created_at desc) filter (where not locked and not shown and not in_deck), '{}') free,
           count(*) filter (where shown) shown, count(*) filter (where in_deck) deck,
           max(created_at) last, min(greatest(coalesce(luck, 1), 1)) best_luck
    from x group by serie, jeton, odds, variant) g;
$function$;
