-- Appliquée via MCP (bourse_acces_10_jetons). Accès à la Bourse à partir de 10 jetons différents obtenus ;
-- seuls les jetons déjà obtenus sont visibles et achetables (revendre une position existante reste possible).
-- `_bourse_have(uid)` compte les couples série/jeton de `pulls`. bourse_state renvoie { locked, have, need, season }
-- sous le seuil, filtre `assets` et `feed` ; bourse_trade lève bourse_locked / bourse_unknown ;
-- bourse_claim_pay lève bourse_locked ; bourse_board renvoie [] sous le seuil.
create or replace function public._bourse_have(p_uid uuid) returns integer
language sql stable security definer set search_path to '' as $$
  select count(distinct serie || '|' || jeton)::int from public.pulls where user_id = p_uid
$$;
revoke all on function public._bourse_have(uuid) from public, anon, authenticated;
