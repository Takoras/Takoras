-- Elo public d'un joueur (affiché en haut de son profil)
create or replace function public.ranked_of(p_pseudo text)
returns json language sql stable security definer set search_path to '' as $$
  select json_build_object('elo', coalesce(r.elo, 1000), 'games', coalesce(r.games, 0), 'best_elo', coalesce(r.best_elo, 1000))
  from public.profiles p left join public.ranked r on r.user_id = p.id
  where p.pseudo = p_pseudo and not p.banned;
$$;
revoke all on function public.ranked_of(text) from public;
grant execute on function public.ranked_of(text) to anon, authenticated;
