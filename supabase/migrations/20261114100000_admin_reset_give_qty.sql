-- À appliquer (Supabase était déconnecté).
-- 1) Donner un objet : les cosmétiques (pseudo, contour, effet de bannière) vont dans profiles.cosmetics comme à
--    l'achat (avant : ils finissaient par erreur dans user_items) ; quantité possible pour les objets à stock.
CREATE OR REPLACE FUNCTION public.admin_give_item(target uuid, p_item text, p_qty integer DEFAULT 1)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
declare it public.shop_items; n int := greatest(1, least(coalesce(p_qty, 1), 1000));
begin
  if not public._is_admin() then raise exception 'forbidden'; end if;
  select * into it from public.shop_items where id = p_item;
  if not found then raise exception 'unknown_item'; end if;
  if it.kind in ('banner', 'avatar', 'name', 'aura', 'bfx') then
    begin perform public._apply_item(target, it); exception when others then if sqlerrm <> 'owned' then raise; end if; end;
  else
    perform public._add_item(target, p_item, n);
  end if;
end $function$;
REVOKE ALL ON FUNCTION public.admin_give_item(uuid, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_give_item(uuid, text, integer) TO authenticated;

-- 2) Effacer TOUTES les stats d'un joueur : tout ce qui lui appartient (tirages, objets, quêtes, passe, boutique,
--    historiques…) et son profil remis à zéro (pièces, stock, potions, cosmétiques, vitrine…). On garde le compte :
--    id, pseudo, numéro, date d'inscription, rôles, ban. Le signalement, les avis et les amis ne sont pas touchés.
CREATE OR REPLACE FUNCTION public.admin_reset_player(target uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
declare t text; c record; sets text := '';
begin
  if not public._is_admin() then raise exception 'forbidden'; end if;
  if target is null or not exists (select 1 from public.profiles where id = target) then raise exception 'unknown_player'; end if;
  for t in
    select distinct table_name from information_schema.columns
    where table_schema = 'public' and column_name = 'user_id'
      and table_name not in ('feedback', 'reports', 'friendships', 'messages', 'admin_log')
      and table_name in (select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE')
  loop
    execute format('delete from public.%I where user_id = $1', t) using target;
  end loop;
  for c in
    select column_name from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_default is not null
      and column_name not in ('id', 'pseudo', 'num', 'created_at', 'is_admin', 'is_mod', 'banned', 'beta', 'pseudo_free', 'pseudo_changed_at')
  loop
    sets := sets || format('%I = DEFAULT, ', c.column_name);
  end loop;
  if sets <> '' then
    execute format('update public.profiles set %s where id = $1', left(sets, length(sets) - 2)) using target;
  end if;
end $function$;
REVOKE ALL ON FUNCTION public.admin_reset_player(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reset_player(uuid) TO authenticated;
