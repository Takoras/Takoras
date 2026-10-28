-- Passe premium saison 1 : photo de profil « Œil » (palier 20) et bannière « Les yeux » (palier 35), exclusives (pas en boutique)
insert into public.shop_items (id, kind, price, daily_limit, data, active) values
  ('a_oeil', 'avatar', 20000, 1, '{}', false),
  ('b_yeux', 'banner', 15000, 1, '{}', false)
on conflict (id) do nothing;

CREATE OR REPLACE FUNCTION public._bp_reward(tier integer, prem boolean)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case
    when not prem then (case
      when tier = 5 then '{"item":"potion1","qty":2}' when tier = 10 then '{"item":"instant","qty":1}'
      when tier = 15 then '{"item":"potion2","qty":2}' when tier = 20 then '{"item":"hourglass","qty":1}'
      when tier = 25 then '{"item":"potion3","qty":1}' when tier = 30 then '{"item":"instant","qty":1}'
      when tier = 35 then '{"item":"potion10","qty":1}' when tier = 40 then '{"item":"hourglass","qty":1}'
      when tier = 45 then '{"item":"potion25","qty":1}' when tier = 50 then '{"item":"potion50","qty":1}'
      else jsonb_build_object('coins', 100 + (tier / 5) * 20)::text end)::jsonb
    when tier = 10 then '{"item":"b_plaine","qty":1}'::jsonb
    when tier = 20 then '{"item":"a_oeil","qty":1}'::jsonb
    when tier = 25 then '{"item":"b_doodle","qty":1}'::jsonb
    when tier = 30 then '{"item":"potion50","qty":1}'::jsonb
    when tier = 35 then '{"item":"b_yeux","qty":1}'::jsonb
    when tier = 40 then '{"item":"potion100","qty":1}'::jsonb
    when tier = 50 then '{"item":"a_etoile","qty":1}'::jsonb
    when tier % 10 = 5 then '{"item":"instant","qty":3}'::jsonb
    when tier % 10 = 0 then '{"item":"potion25","qty":1}'::jsonb
    when tier % 4 = 1 then jsonb_build_object('coins', 600 + tier * 30)
    when tier % 4 = 2 then '{"item":"potion3","qty":2}'::jsonb
    when tier % 4 = 3 then '{"item":"potion10","qty":1}'::jsonb
    else '{"item":"hourglass","qty":2}'::jsonb
  end;
$function$;
