-- Admin : se donner le passe complet (premium + les 50 paliers) pour tester les récompenses
create or replace function public.admin_bp_max()
 returns json language plpgsql security definer set search_path to '' as $function$
declare uid uuid := auth.uid();
begin
  if not public._is_admin() then raise exception 'forbidden'; end if;
  perform public._bp_row(uid);
  update public.battle_pass set premium = true, xp = greatest(xp, 50 * 1000) where user_id = uid;
  return public.bp_state();
end $function$;
revoke all on function public.admin_bp_max() from public, anon;
grant execute on function public.admin_bp_max() to authenticated;

-- Tout récupérer d'un coup (gratuit + premium si acheté) : mêmes règles que bp_claim, palier par palier
create or replace function public.bp_claim_all()
 returns json language plpgsql security definer set search_path to '' as $function$
declare uid uuid := auth.uid(); r public.battle_pass; rw jsonb; it public.shop_items; t int; p boolean; n int := 0;
begin
  if uid is null then raise exception 'not_logged_in'; end if;
  perform public._check_ban(); perform public._rate('bp_claim_all', 10);
  r := public._bp_row(uid);
  for t in 1..least(50, r.xp / 1000) loop
    foreach p in array array[false, true] loop
      if p and not r.premium then continue; end if;
      if (case when p then t = any(r.pclaimed) else t = any(r.claimed) end) then continue; end if;
      rw := public._bp_reward(t, p);
      if rw is null then continue; end if;
      if p then update public.battle_pass set pclaimed = pclaimed || t where user_id = uid returning * into r;
      else update public.battle_pass set claimed = claimed || t where user_id = uid returning * into r; end if;
      if rw ? 'coins' then
        update public.profiles set coins = coins + (rw->>'coins')::int where id = uid;
      else
        select * into it from public.shop_items where id = rw->>'item';
        if it.kind in ('banner', 'avatar') then
          begin perform public._apply_item(uid, it); exception when others then null; end;
        else perform public._add_item(uid, it.id, (rw->>'qty')::int); end if;
      end if;
      n := n + 1;
    end loop;
  end loop;
  return json_build_object('claimed', n, 'state', public.eco_state());
end $function$;
revoke all on function public.bp_claim_all() from public, anon;
grant execute on function public.bp_claim_all() to authenticated;
