-- Tests de sécurité (phase 2). À lancer avec le MCP Supabase (execute_sql) ou psql.
-- Tout est annulé à la fin (raise exception) : le message d'erreur affiche le résultat.
-- Remplacer :joueur par l'id d'un joueur NON admin et NON testeur, :admin par l'id de l'admin.
-- Attendu : tout « refusé », joueur tester=false, admin tester=true.
do $$
declare r text := '';
begin
  perform set_config('request.jwt.claims', '{"sub":":joueur","role":"authenticated"}', true);
  execute 'set local role authenticated';
  r := r || 'joueur tester=' || (public.eco_state()::jsonb->>'tester');
  begin perform public.beta_give(p_coins => 1); r := r || ' beta_give=PASSE(!)'; exception when others then r := r || ' beta_give=refusé'; end;
  begin perform public.battle_result(':joueur', ':admin'); r := r || ' battle_result=PASSE(!)'; exception when others then r := r || ' battle_result=refusé'; end;
  begin update public.profiles set pseudo = pseudo where id = ':joueur'; r := r || ' update_pseudo=PASSE(!)'; exception when others then r := r || ' update_pseudo=refusé'; end;
  begin execute 'truncate public.patchnotes'; r := r || ' truncate=PASSE(!)'; exception when others then r := r || ' truncate=refusé'; end;
  begin perform public.admin_set_tester(':joueur', true); r := r || ' admin_set_tester=PASSE(!)'; exception when others then r := r || ' admin_set_tester=refusé'; end;
  begin perform public.admin_stats(); r := r || ' admin_stats=PASSE(!)'; exception when others then r := r || ' admin_stats=refusé'; end;
  execute 'reset role';
  perform set_config('request.jwt.claims', '{"sub":":admin","role":"authenticated"}', true);
  execute 'set local role authenticated';
  r := r || ' | admin tester=' || (public.eco_state()::jsonb->>'tester');
  execute 'reset role';
  raise exception 'RESULTAT (annulé) : %', r;
end $$;
