-- Légal : accord aux CGU (+ âge), suppression de son compte, téléchargement de ses données (RGPD art. 17 et 20).

-- 1) Accord aux CGU et à la politique de confidentialité, avec confirmation de l'âge (15 ans ou accord parental)
alter table public.profiles add column if not exists terms_at timestamptz;

create or replace function public.accept_terms()
returns json language plpgsql security definer set search_path to '' as $function$
begin
  if auth.uid() is null then raise exception 'not_logged_in'; end if;
  update public.profiles set terms_at = now() where id = auth.uid();
  return public.eco_state();
end $function$;
revoke all on function public.accept_terms() from public, anon;
grant execute on function public.accept_terms() to authenticated;

-- le site sait si le joueur a accepté (sinon il lui montre la fenêtre d'accord)
CREATE OR REPLACE FUNCTION public.eco_state()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r public.profiles; step int;
begin
  if auth.uid() is null then raise exception 'not_logged_in'; end if;
  perform public._regen(auth.uid());
  select * into r from public.profiles where id = auth.uid();
  step := case when r.fast_until > now() then r.regen_s / 2 else r.regen_s end;
  return json_build_object('coins', r.coins, 'stock', r.stock, 'max', r.stock_max, 'admin', r.is_admin, 'pseudo', r.pseudo, 'banned', r.banned, 'beta', r.beta, 'tester', public._is_tester(),
    'next_in', greatest(0, step - extract(epoch from (now() - r.stock_last)))::int, 'step', step, 'regen', r.regen_s, 'streak', case when r.daily_last >= public._today() - 1 then r.daily_streak else 0 end, 'streak_today', r.daily_last = public._today(),
    'potions', r.potions, 'luck', public._luck(r.potions),
    'fast_left', greatest(0, extract(epoch from (coalesce(r.fast_until, now()) - now())))::int,
    'reset_at', r.reset_at, 'terms', r.terms_at is not null);
end $function$;

-- 2) Supprimer son compte : efface le compte de connexion, ce qui efface en cascade le profil et TOUTES les
--    données de jeu (jetons, objets, amis, messages, combats, passe, stats…). Les avis envoyés sont anonymisés,
--    les traces anti-spam effacées. Irréversible.
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path to '' as $function$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_logged_in'; end if;
  update public.feedback set pseudo = null, user_id = null where user_id = uid;
  delete from public.rate_hits where user_id = uid;
  delete from auth.users where id = uid;
end $function$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- 3) Télécharger ses données : tout ce qui concerne le joueur, en un seul fichier JSON
create or replace function public.export_my_data()
returns json language plpgsql security definer set search_path to '' as $function$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_logged_in'; end if;
  perform public._rate('export_my_data', 5);
  return json_build_object(
    'exported_at', now(),
    'account', (select json_build_object('id', u.id, 'email', u.email, 'created_at', u.created_at, 'last_sign_in_at', u.last_sign_in_at,
                  'providers', u.raw_app_meta_data->'providers') from auth.users u where u.id = uid),
    'profile', (select to_jsonb(p) from public.profiles p where p.id = uid),
    'pulls', (select coalesce(json_agg(to_jsonb(x) order by x.id), '[]') from public.pulls x where x.user_id = uid),
    'items', (select coalesce(json_agg(to_jsonb(x)), '[]') from public.user_items x where x.user_id = uid),
    'token_levels', (select coalesce(json_agg(to_jsonb(x)), '[]') from public.token_levels x where x.user_id = uid),
    'friends', (select coalesce(json_agg(to_jsonb(x)), '[]') from public.friendships x where x.a = uid or x.b = uid),
    'messages', (select coalesce(json_agg(to_jsonb(x) order by x.id), '[]') from public.messages x where x.sender = uid or x.receiver = uid),
    'battle_pass', (select coalesce(json_agg(to_jsonb(x)), '[]') from public.battle_pass x where x.user_id = uid),
    'ranked', (select coalesce(json_agg(to_jsonb(x)), '[]') from public.ranked x where x.user_id = uid),
    'ranked_matches', (select coalesce(json_agg(to_jsonb(x)), '[]') from public.ranked_matches x where x.p1 = uid or x.p2 = uid),
    'battles', (select coalesce(json_agg(to_jsonb(x)), '[]') from public.battles x where x.p1 = uid or x.p2 = uid),
    'daily_stats', (select coalesce(json_agg(to_jsonb(x)), '[]') from public.daily_stats x where x.user_id = uid),
    'shop_buys', (select coalesce(json_agg(to_jsonb(x)), '[]') from public.shop_buys2 x where x.user_id = uid),
    'promo_codes_used', (select coalesce(json_agg(to_jsonb(x)), '[]') from public.promo_redeems x where x.user_id = uid),
    'feedback', (select coalesce(json_agg(to_jsonb(x)), '[]') from public.feedback x where x.user_id = uid)
  );
end $function$;
revoke all on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;
