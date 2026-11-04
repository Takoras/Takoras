-- 1) Bêta ouverte à tous : tant que la bêta est ouverte (site_settings beta = on), tout joueur connecté est testeur
--    (fiole bêta : se donner des jetons/objets, tirages de test, ouvrir Bodako). Fermer la bêta referme tout d'un coup.
--    Rien ne change pour l'admin (is_admin).
create or replace function public._is_tester()
 returns boolean language sql stable security definer set search_path to '' as $function$
  select (select auth.uid()) is not null and public._beta_open()
$function$;

-- 2) Le site lit « tester » dans eco_state : même règle
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
    'reset_at', r.reset_at);
end $function$;

-- 3) Potions : les tirages remis en file (ouverture quittée) étaient servis AVANT les potions, sans les utiliser.
--    Avec une potion active, on tire un nouveau tirage avec la potion (et on la décompte) ; la file attend
--    les tirages sans potion (on ne peut toujours pas relancer un mauvais résultat).
CREATE OR REPLACE FUNCTION public.take_pulls(n integer, force text DEFAULT NULL::text, luck numeric DEFAULT 1, p_variant text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid := auth.uid(); r public.profiles; res text[] := '{}'; vars text[] := '{}'; ids bigint[] := '{}'; nm text; o int; i int; l numeric; pots jsonb; v text;
  nr int := 0; nv int := 0; nf int := 0; lucks numeric[] := '{}'; pp public.pending_pulls; pid bigint;
  cap constant int := 500; have jsonb := '{}'; k text; c int; capped int := 0; capc bigint := 0;
begin
  if uid is null then raise exception 'not_logged_in'; end if; perform public._check_ban(); perform public._rate('take_pulls', 40);
  perform public._regen(uid);
  select * into r from public.profiles where id = uid for update;
  if r.pseudo is null then raise exception 'no_pseudo'; end if;
  if n > 1000 then raise exception 'too_many_pulls'; end if;
  if n < 1 or n > r.stock then raise exception 'not_enough_pulls'; end if;
  update public.profiles set stock = stock - n, stock_last = case when r.stock >= r.stock_max then now() else stock_last end where id = uid;
  if not (r.is_admin or public._is_tester()) then force := null; luck := 1; p_variant := null; end if;
  if force is not null and not exists (select 1 from public.jetons where serie = 'Takoras' and name = force) then force := null; end if;
  pots := r.potions;
  for i in 1..n loop
    pp := null;
    if force is null and p_variant is null and public._luck(pots) <= 1 then
      select * into pp from public.pending_pulls where user_id = uid order by id limit 1 for update;
    end if;
    if pp.id is not null then
      delete from public.pending_pulls where id = pp.id;
      nm := pp.jeton; o := pp.odds; v := pp.variant; l := coalesce(pp.luck, 1);
    else
      l := greatest(1, least(coalesce(luck, 1), 1000000)) * public._luck(pots);
      nm := coalesce(force, public._draw('Takoras', l));
      select odds into o from public.jetons where serie = 'Takoras' and name = nm;
      v := coalesce(p_variant, public._roll_variant());
      if p_variant = 'none' then v := null; end if;
      nf := nf + 1;
      if o >= 100 then nr := nr + 1; end if;
      if v is not null then nv := nv + 1; end if;
      select coalesce(jsonb_agg(jsonb_build_object('m', x->'m', 'n', (x->>'n')::int - 1)) filter (where (x->>'n')::int > 1), '[]')
        into pots from jsonb_array_elements(pots) x;
    end if;
    k := nm || '/' || coalesce(v, '');
    if have ? k then c := (have->>k)::int;
    else select count(*) into c from public.pulls where user_id = uid and jeton = nm and coalesce(variant, '') = coalesce(v, '') and sold_at is null;
    end if;
    if c >= cap then
      capped := capped + 1; capc := capc + public._sell_value(o) * public._vmult(v);
      insert into public.pull_stats as s (user_id, serie, jeton, variant, odds, total, first_at)
        values (uid, 'Takoras', nm, coalesce(v, ''), o, 1, now())
        on conflict (user_id, serie, jeton, variant) do update set total = s.total + 1;
      insert into public.pull_days as d (user_id, day, n) values (uid, current_date, 1)
        on conflict (user_id, day) do update set n = d.n + 1;
      pid := null;
    else
      insert into public.pulls (user_id, serie, jeton, odds, variant, luck) values (uid, 'Takoras', nm, o, v, round(l, 2)) returning id into pid;
      c := c + 1;
    end if;
    have := jsonb_set(have, array[k], to_jsonb(c));
    ids := ids || pid; lucks := lucks || round(l, 2);
    res := res || nm; vars := vars || coalesce(v, '');
  end loop;
  update public.profiles set potions = pots, coins = coins + capc where id = uid;
  if nf > 0 then perform public._bump(uid, p_pulls => nf, p_rares => nr, p_variants => nv); end if;
  return json_build_object('results', res, 'variants', vars, 'lucks', lucks, 'ids', ids,
    'capped', capped, 'capped_coins', capc, 'state', public.eco_state());
end $function$;
