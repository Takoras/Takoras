-- Pity : ×10 au 50e tirage, ×25 au 100e (au lieu de ×10 tous les 100), pour Takoras et chaque série
do $$ declare d text; f text; begin
  foreach f in array array['take_pulls', 'take_pulls_serie'] loop
    d := pg_get_functiondef(('public.' || f)::regproc);
    d := replace(d, 'if pc >= 100 then l := l * 10; pc := 0; pities := pities || i; end if;',
      'if pc >= 100 then l := l * 25; pc := 0; pities := pities || i; elsif pc = 50 then l := l * 10; pities := pities || i; end if;');
    if d not like '%elsif pc = 50 then l := l * 10%' then raise exception '% : pity introuvable', f; end if;
    execute d;
  end loop;
end $$;
