-- Menu testeur : se donner un jeton de N'IMPORTE QUELLE série (avant : Takoras seulement). Ajout seulement.
create or replace function public.beta_give_jeton(p_serie text, p_jeton text, p_variant text default null, p_qty integer default 1)
returns json language plpgsql security definer set search_path to '' as $function$
declare uid uuid := auth.uid(); o int;
begin
  if uid is null then raise exception 'not_logged_in'; end if;
  if not public._is_tester() then raise exception 'forbidden'; end if;
  select odds into o from public.jetons where serie = p_serie and name = p_jeton;
  if o is null then raise exception 'unknown_jeton'; end if;
  insert into public.pulls (user_id, serie, jeton, odds, variant)
    select uid, p_serie, p_jeton, o, nullif(p_variant, '') from generate_series(1, greatest(1, least(50, coalesce(p_qty, 1))));
  return public.eco_state();
end $function$;
revoke all on function public.beta_give_jeton(text, text, text, integer) from public, anon;
grant execute on function public.beta_give_jeton(text, text, text, integer) to authenticated;

-- Les testeurs peuvent aussi ouvrir les séries payées en pièces (Bodako) pour les tester
create or replace function public.take_pulls_serie(p_serie text, n integer, force text default null, luck numeric default 1, p_variant text default null)
returns json language plpgsql security definer set search_path to '' as $function$
declare uid uuid := auth.uid(); r public.profiles; res text[] := '{}'; vars text[] := '{}'; ids bigint[] := '{}'; nm text; o int; i int; l numeric; pots jsonb; v text;
  nr int := 0; nv int := 0; nf int := 0; lucks numeric[] := '{}'; pid bigint; cost int;
begin
  if p_serie = 'Takoras' then return public.take_pulls(n, force, luck, p_variant); end if;
  if uid is null then raise exception 'not_logged_in'; end if; perform public._check_ban();
  if not exists (select 1 from public.jetons where serie = p_serie) then raise exception 'bad_serie'; end if;
  perform public._regen(uid);
  select * into r from public.profiles where id = uid for update;
  if not (r.is_admin or public._is_tester()) then raise exception 'serie_locked'; end if; -- Bodako : admins et testeurs
  if r.pseudo is null then raise exception 'no_pseudo'; end if;
  if n < 1 or n > 10 then raise exception 'too_many_pulls'; end if;
  cost := case when n = 10 then 2700 else 300 * n end;
  if r.coins < cost then raise exception 'not_enough_coins'; end if;
  update public.profiles set coins = coins - cost where id = uid;
  if force is not null and not exists (select 1 from public.jetons where serie = p_serie and name = force) then force := null; end if;
  pots := r.potions;
  for i in 1..n loop
    l := greatest(1, least(coalesce(luck, 1), 1000000)) * public._luck(pots);
    nm := coalesce(force, public._draw(p_serie, l));
    select odds into o from public.jetons where serie = p_serie and name = nm;
    v := coalesce(p_variant, public._roll_variant());
    if p_variant = 'none' then v := null; end if;
    nf := nf + 1;
    if o >= 100 then nr := nr + 1; end if;
    if v is not null then nv := nv + 1; end if;
    select coalesce(jsonb_agg(jsonb_build_object('m', x->'m', 'n', (x->>'n')::int - 1)) filter (where (x->>'n')::int > 1), '[]')
      into pots from jsonb_array_elements(pots) x;
    insert into public.pulls (user_id, serie, jeton, odds, variant, luck) values (uid, p_serie, nm, o, v, round(l, 2)) returning id into pid;
    ids := ids || pid; lucks := lucks || round(l, 2);
    res := res || nm; vars := vars || coalesce(v, '');
  end loop;
  update public.profiles set potions = pots where id = uid;
  if nf > 0 then perform public._bump(uid, p_pulls => nf, p_rares => nr, p_variants => nv); end if;
  return json_build_object('results', res, 'variants', vars, 'lucks', lucks, 'ids', ids, 'state', public.eco_state());
end $function$;
revoke all on function public.take_pulls_serie(text, integer, text, numeric, text) from public, anon;
grant execute on function public.take_pulls_serie(text, integer, text, numeric, text) to authenticated;
