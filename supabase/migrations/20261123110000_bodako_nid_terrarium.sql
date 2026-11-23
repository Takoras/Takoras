-- Bodako : Nid 1/50 et Terrarium 1/1 500, et leurs actions dans la saison Market Bodako en cours (prix de départ 10)
insert into public.jetons (serie, name, odds) values ('Bodako', 'Nid', 50), ('Bodako', 'Terrarium', 1500) on conflict do nothing;
insert into public.bourse_assets (season_id, jeton, odds, shares, k, p0)
select s.id, j.name, j.odds, t, t * t * 10, 10
from public.bourse_seasons s
join public.jetons j on j.serie = s.serie and j.name in ('Nid', 'Terrarium'),
lateral (select (case when j.odds <= 10 then 2000 when j.odds <= 100 then 1200 when j.odds <= 1000 then 700 else 400 end)::numeric t) x
where s.serie = 'Bodako' and not s.closed
  and not exists (select 1 from public.bourse_assets a where a.season_id = s.id and a.jeton = j.name);
