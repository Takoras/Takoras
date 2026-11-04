-- Sécurité, lot 1 : anti-spam (même limite que le reste du jeu, public._rate : N appels par minute) sur
-- les demandes d'amis, l'ouverture des séries payées en pièces (Bodako) et les dons de la fiole bêta.
-- On n'écrit qu'UNE ligne dans chaque fonction (juste après la vérification de connexion / testeur) ;
-- si l'endroit attendu n'est pas trouvé tel quel, la migration s'arrête sans rien changer.
do $$
declare
  t record;
  def text;
begin
  for t in
    select * from (values
      ('friend_request', $a$if me is null then raise exception 'not_logged_in'; end if;$a$,
        $b$if me is null then raise exception 'not_logged_in'; end if; perform public._rate('friend_request', 10);$b$),
      ('take_pulls_serie', $a$if uid is null then raise exception 'not_logged_in'; end if; perform public._check_ban();$a$,
        $b$if uid is null then raise exception 'not_logged_in'; end if; perform public._check_ban(); perform public._rate('take_pulls_serie', 40);$b$),
      ('beta_give', $a$if not public._is_tester() then raise exception 'forbidden'; end if;$a$,
        $b$if not public._is_tester() then raise exception 'forbidden'; end if; perform public._rate('beta_give', 20);$b$),
      ('beta_give_jeton', $a$if not public._is_tester() then raise exception 'forbidden'; end if;$a$,
        $b$if not public._is_tester() then raise exception 'forbidden'; end if; perform public._rate('beta_give_jeton', 20);$b$)
    ) as v(fn, anchor, repl)
  loop
    select pg_get_functiondef(p.oid) into def
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = t.fn;
    if def is null then raise exception 'fonction % introuvable', t.fn; end if;
    if position('_rate(''' || t.fn || '''' in def) > 0 then continue; end if; -- déjà fait
    if (length(def) - length(replace(def, t.anchor, ''))) / length(t.anchor) <> 1 then
      raise exception 'endroit attendu introuvable (ou en double) dans %', t.fn;
    end if;
    execute replace(def, t.anchor, t.repl);
  end loop;
end $$;
