-- Appliquée via MCP (apply_migration « bourse_precision_fixe »), validée par l'utilisateur :
-- 11 colonnes numeric sans limite du Market (hype jusqu'à 3 760 chiffres, k, prix et % de l'historique, coût des positions…)
-- passent en précision fixe (6 à 12 décimales). Valeurs arrondies une fois, puis à chaque écriture ; prix inchangés.
alter table public.bourse_assets
  alter column hype type numeric(20, 12),
  alter column share type numeric(20, 12),
  alter column k type numeric(30, 8),
  alter column p0 type numeric(20, 8);
alter table public.bourse_players
  alter column koo type numeric(20, 8),
  alter column divs type numeric(20, 8),
  alter column final_score type numeric(20, 8);
alter table public.bourse_positions
  alter column cost type numeric(20, 8);
alter table public.bourse_ticks
  alter column price type numeric(20, 8),
  alter column pct type numeric(20, 10);
alter table public.bourse_trades
  alter column price type numeric(20, 8);
