-- « Tout ouvrir » ouvre tout le stock d'un coup ; le stock est plafonné à 1000 pulls (au-delà, l'ouverture deviendrait trop lourde).
-- On remplace seulement les plafonds dans les fonctions existantes (rien d'autre ne change).
do $$
declare f regprocedure; def text;
begin
  def := pg_get_functiondef('public.take_pulls(integer, text, numeric, text)'::regprocedure);
  if position('if n > 50 then' in def) > 0 then
    execute replace(replace(def, 'if n > 50 then', 'if n > 1000 then'), '-- max 50 d''un coup', '-- max 1000 d''un coup');
  end if;
  foreach f in array array['public.refund_pulls(bigint[])'::regprocedure, 'public.redeem_code(text)'::regprocedure,
    'public.beta_give(bigint, integer, text, integer, text, text)'::regprocedure, 'public.admin_give(uuid, bigint, integer)'::regprocedure] loop
    def := pg_get_functiondef(f);
    if position('least(100000, ' in def) > 0 then execute replace(def, 'least(100000, ', 'least(1000, '); end if;
  end loop;
end $$;

-- Objets qui donnent des pulls (recharge éclair…) : même plafond de 1000
do $$
declare def text := pg_get_functiondef('public._apply_item(uuid, public.shop_items)'::regprocedure);
  a text := 'set stock = stock + greatest(1, coalesce((it.data->>''pulls'')::int, 1)) where id = uid;';
begin
  if position(a in def) > 0 then
    execute replace(def, a, 'set stock = least(1000, stock + greatest(1, coalesce((it.data->>''pulls'')::int, 1))) where id = uid;');
  end if;
end $$;
