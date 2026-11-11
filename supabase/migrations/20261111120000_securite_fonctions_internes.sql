-- Fonctions internes (préfixe _) : appelées seulement par d'autres fonctions du serveur, jamais par le site.
-- _shop_slots permettait de lire la boutique mystère du jour sans rien révéler ; _revealed de voir les cases d'un autre.
revoke execute on function public._shop_slots(uuid, bigint) from public, anon, authenticated;
revoke execute on function public._revealed(uuid, bigint, text) from public, anon, authenticated;
revoke execute on function public._featured(bigint) from public, anon, authenticated;
revoke execute on function public._pull_count() from public, anon, authenticated;
revoke execute on function public._bp_reward(integer, boolean) from public, anon, authenticated;
revoke execute on function public._shop_reset_in() from public, anon, authenticated;
-- révéler une case demande d'être connecté : inutile de l'ouvrir aux visiteurs
revoke execute on function public.reveal_slot(integer) from public, anon;
grant execute on function public.reveal_slot(integer) to authenticated;
