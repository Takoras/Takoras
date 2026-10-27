-- Profil : un jeton déjà obtenu peut servir de photo de profil (« j:Nom » ou « j:Nom:variante »),
-- et la collection publique d'un joueur dit aussi combien il en a encore (pour sa fiche jeton).

create or replace function public.update_profile(p_avatar text, p_banner text, p_bio text, p_showcase bigint[])
returns void language plpgsql security definer set search_path to '' as $$
declare uid uuid := auth.uid(); r public.profiles; jn text; jv text;
begin
  if uid is null then raise exception 'not_logged_in'; end if;
  select * into r from public.profiles where id = uid;
  if p_avatar like 'j:%' then
    jn := split_part(p_avatar, ':', 2); jv := nullif(split_part(p_avatar, ':', 3), '');
    if not exists (select 1 from public.pulls p where p.user_id = uid and p.jeton = jn and coalesce(p.variant, '') = coalesce(jv, '')) then
      raise exception 'bad_avatar';
    end if;
  elsif p_avatar is distinct from r.avatar and not (coalesce(p_avatar, 'default') = any(array['default', 'bleu', 'rouge', 'vert', 'yeux', 'dunes']) or p_avatar = any(r.avatars)) then
    raise exception 'bad_avatar';
  end if;
  if p_banner is not null and not p_banner = any(r.banners) then raise exception 'bad_banner'; end if;
  if char_length(coalesce(p_bio, '')) > 120 then raise exception 'bad_bio'; end if;
  if coalesce(array_length(p_showcase, 1), 0) > 5 then raise exception 'bad_showcase'; end if;
  if exists (select 1 from unnest(p_showcase) x where x is not null and not exists (select 1 from public.pulls p where p.id = x and p.user_id = uid and p.sold_at is null)) then raise exception 'bad_showcase'; end if;
  if (select count(x) - count(distinct x) from unnest(p_showcase) x) > 0 then raise exception 'bad_showcase'; end if;
  update public.profiles set avatar = coalesce(p_avatar, 'default'), banner = p_banner, bio = coalesce(p_bio, ''), showcase = p_showcase where id = uid;
end $$;

drop function if exists public.collection_of(text);
create function public.collection_of(p_pseudo text)
returns table(jeton text, variant text, total bigint, serie text, owned bigint) language sql stable security definer set search_path to '' as $$
  select p.jeton, coalesce(p.variant, ''), count(*), p.serie, count(*) filter (where p.sold_at is null)
  from public.pulls p join public.profiles pr on pr.id = p.user_id
  where lower(pr.pseudo) = lower(p_pseudo) group by p.jeton, coalesce(p.variant, ''), p.serie;
$$;
grant execute on function public.collection_of(text) to anon, authenticated;
