-- Cosmétiques retirés de la boutique pour l'instant (pas supprimés : ceux qui les ont les gardent)
update public.shop_items set active = false where id in ('b_plaine', 'b_doodle', 'a_etoile');
