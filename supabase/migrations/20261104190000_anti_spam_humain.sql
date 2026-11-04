-- Anti-spam calé sur un humain : un joueur très rapide clique au plus ~10 fois par seconde (600 / min) ;
-- le maximum observé en 7 jours est 185 tirages en une minute. Les tirages (Takoras et séries en pièces)
-- passent donc à 600 / min (personne ne la touche en jouant, un robot qui martèle reste bloqué) ;
-- les dons de la fiole bêta à 60 / min. On ne change que le nombre dans chaque fonction.
do $$
declare
  t record;
  def text;
begin
  for t in
    select * from (values
      ('take_pulls', $a$_rate('take_pulls', 40)$a$, $b$_rate('take_pulls', 600)$b$),
      ('take_pulls_serie', $a$_rate('take_pulls_serie', 40)$a$, $b$_rate('take_pulls_serie', 600)$b$),
      ('beta_give', $a$_rate('beta_give', 20)$a$, $b$_rate('beta_give', 60)$b$),
      ('beta_give_jeton', $a$_rate('beta_give_jeton', 20)$a$, $b$_rate('beta_give_jeton', 60)$b$)
    ) as v(fn, anchor, repl)
  loop
    select pg_get_functiondef(p.oid) into def
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = t.fn;
    if def is null then raise exception 'fonction % introuvable', t.fn; end if;
    if position(t.repl in def) > 0 then continue; end if; -- déjà fait
    if (length(def) - length(replace(def, t.anchor, ''))) / length(t.anchor) <> 1 then
      raise exception 'limite attendue introuvable dans %', t.fn;
    end if;
    execute replace(def, t.anchor, t.repl);
  end loop;
end $$;
