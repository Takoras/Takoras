-- Passe de combat façon Brawl : une récompense gratuite ET une premium à chaque palier.
-- Gratuit : de petites pièces, une potion ou un éclair tous les 5 paliers.
-- Premium : bien plus gros à chaque palier (pièces, potions fortes, éclairs, sabliers) + bannières et avatar animé.
-- Toujours aucun jeton exclusif ni stat : que du confort et des cosmétiques. Les paliers déjà récupérés le restent.
create or replace function public._bp_reward(tier integer, prem boolean)
returns jsonb language sql immutable set search_path to '' as $$
  select case
    when not prem then (case
      when tier = 5 then '{"item":"potion1","qty":2}' when tier = 10 then '{"item":"instant","qty":1}'
      when tier = 15 then '{"item":"potion2","qty":2}' when tier = 20 then '{"item":"hourglass","qty":1}'
      when tier = 25 then '{"item":"potion3","qty":1}' when tier = 30 then '{"item":"instant","qty":1}'
      when tier = 35 then '{"item":"potion10","qty":1}' when tier = 40 then '{"item":"hourglass","qty":1}'
      when tier = 45 then '{"item":"potion25","qty":1}' when tier = 50 then '{"item":"potion50","qty":1}'
      else jsonb_build_object('coins', 100 + (tier / 5) * 20)::text end)::jsonb
    when tier = 10 then '{"item":"b_plaine","qty":1}'::jsonb
    when tier = 25 then '{"item":"b_doodle","qty":1}'::jsonb
    when tier = 30 then '{"item":"potion50","qty":1}'::jsonb
    when tier = 40 then '{"item":"potion100","qty":1}'::jsonb
    when tier = 50 then '{"item":"a_etoile","qty":1}'::jsonb
    when tier % 10 = 5 then '{"item":"instant","qty":3}'::jsonb
    when tier % 10 = 0 then '{"item":"potion25","qty":1}'::jsonb
    when tier % 4 = 1 then jsonb_build_object('coins', 600 + tier * 30)
    when tier % 4 = 2 then '{"item":"potion3","qty":2}'::jsonb
    when tier % 4 = 3 then '{"item":"potion10","qty":1}'::jsonb
    else '{"item":"hourglass","qty":2}'::jsonb
  end;
$$;
