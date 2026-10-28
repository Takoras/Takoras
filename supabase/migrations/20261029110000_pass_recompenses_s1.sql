-- Pass premium saison 1 : plus de bannières plaine / doodle ; bannière « Yeux » au palier 30, photo de profil « Œil » (exclusive) au palier 50
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
    when tier = 30 then '{"item":"b_yeux","qty":1}'::jsonb
    when tier = 50 then '{"item":"a_oeil","qty":1}'::jsonb
    when tier = 20 or tier = 35 then '{"item":"potion50","qty":1}'::jsonb
    when tier = 40 or tier = 45 then '{"item":"potion100","qty":1}'::jsonb
    when tier % 10 = 5 then '{"item":"instant","qty":3}'::jsonb
    when tier % 10 = 0 then '{"item":"potion25","qty":1}'::jsonb
    when tier % 4 = 1 then jsonb_build_object('coins', 600 + tier * 30)
    when tier % 4 = 2 then '{"item":"potion3","qty":2}'::jsonb
    when tier % 4 = 3 then '{"item":"potion10","qty":1}'::jsonb
    else '{"item":"hourglass","qty":2}'::jsonb
  end;
$function$;
