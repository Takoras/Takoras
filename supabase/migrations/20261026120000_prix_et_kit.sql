-- Prix recalculés + kit de départ.
-- Méthode (voir docs/economie.md) : 1 pull « vaut » ~33 pièces (prix de la recharge éclair : 500 pièces = 15 pulls).
-- Une potion vaut le nombre de pulls normaux qu'il faudrait pour avoir autant de chances d'un jeton 1/1000 ou plus,
-- × 33 pièces. Revenus d'un joueur actif : ~3 000 à 6 000 pièces par jour (cadeau du jour, quêtes, reventes).
update public.shop_items set price = v.p from (values
  ('potion1', 100), ('potion2', 200), ('potion3', 400), ('potion10', 1200), ('potion25', 4000),
  ('potion50', 9500), ('potion100', 31000), ('potion250', 72000), ('potion500', 90000),
  ('hourglass', 700),   -- 60 min de recharge = 20 pulls ≈ 660 pièces
  ('instant', 500),     -- 15 pulls (référence)
  ('b_plaine', 1000), ('b_doodle', 2500), ('a_etoile', 25000) -- cosmétiques : commun / rare / animé
) as v(id, p) where shop_items.id = v.id;

-- Kit de départ : donné une seule fois, quand le joueur choisit son pseudo pour la première fois
create or replace function public._starter_kit()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  if old.pseudo is null and new.pseudo is not null then
    new.coins := new.coins + 1500;
    new.stock := least(1000, new.stock + 10);
    perform public._add_item(new.id, 'potion1', 2);
    perform public._add_item(new.id, 'potion2', 1);
    perform public._add_item(new.id, 'instant', 1);
  end if;
  return new;
end $$;
revoke all on function public._starter_kit() from public, anon, authenticated;
drop trigger if exists starter_kit on public.profiles;
create trigger starter_kit before update of pseudo on public.profiles
  for each row execute function public._starter_kit();
