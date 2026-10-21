-- Phase 2 (sécurité) : le menu testeur n'est plus ouvert à tout le monde pendant la bêta.
-- Avant : profiles.beta (= « a joué pendant la bêta », badge) servait aussi d'accès testeur, donc 9 joueurs sur 9
-- pouvaient se donner pièces / jetons / variantes (beta_give) et forcer leurs tirages (take_pulls).
-- Maintenant : nouvelle colonne profiles.tester, cochée par l'admin. Le badge bêta (profiles.beta) ne change pas.

alter table public.profiles add column if not exists tester boolean not null default false;
-- L'admin garde l'accès au menu testeur
update public.profiles set tester = true where is_admin;

-- Testeur = coché par l'admin ET bêta ouverte
create or replace function public._is_tester()
 returns boolean language sql stable security definer set search_path to ''
as $function$
  select coalesce((select tester from public.profiles where id = (select auth.uid())), false) and public._beta_open()
$function$;

-- eco_state et admin_player : on remplace un morceau précis de leur définition (erreur si le morceau n'est pas trouvé)
do $$
declare d text;
begin
  d := pg_get_functiondef('public.eco_state()'::regprocedure);
  if position('''tester'', r.beta and public._beta_open()' in d) = 0 then raise exception 'eco_state: morceau introuvable'; end if;
  execute replace(d, '''tester'', r.beta and public._beta_open()', '''tester'', r.tester and public._beta_open()');

  d := pg_get_functiondef('public.admin_player(uuid)'::regprocedure);
  if position('''is_admin'', r.is_admin,' in d) = 0 then raise exception 'admin_player: morceau introuvable'; end if;
  execute replace(d, '''is_admin'', r.is_admin,', '''is_admin'', r.is_admin, ''tester'', r.tester, ''beta'', r.beta,');
end $$;

-- L'admin coche / décoche « testeur » sur un joueur
create or replace function public.admin_set_tester(target uuid, p_on boolean)
 returns void language plpgsql security definer set search_path to ''
as $function$
begin
  if not public._is_admin() then raise exception 'forbidden'; end if;
  update public.profiles set tester = coalesce(p_on, false) where id = target;
end $function$;
revoke all on function public.admin_set_tester(uuid, boolean) from public, anon;
grant execute on function public.admin_set_tester(uuid, boolean) to authenticated;
