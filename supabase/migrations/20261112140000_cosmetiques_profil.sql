-- Cosmétiques de profil (appliqué en prod le 12/11/2026) : couleur de pseudo (name), aura (aura), effet de bannière (bfx).
-- Colonnes profiles.cosmetics / name_fx / aura / banner_fx, 11 objets en boutique (n_*, au_*, fx_*),
-- _apply_item / buy_item / _stock / shop_today / profile_public étendus, et equip_cosmetics(p_name, p_aura, p_bfx).
-- (voir l'historique des migrations Supabase pour le SQL complet)

-- 12 nov. 2026 : nouveaux effets (appliqué via MCP)
insert into shop_items (id, kind, price, daily_limit, data, active) values
('n_celeste','name',6000,1,'{"anim":true}',true),
('n_ombre','name',9000,1,'{"anim":true}',true),
('n_braise','name',7000,1,'{"anim":true}',true),
('au_etoile','aura',10000,1,'{"anim":true}',true)
on conflict (id) do nothing;
