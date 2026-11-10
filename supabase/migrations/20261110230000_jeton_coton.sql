-- Nouveau jeton de la série Bodako : Coton (1/10 000)
insert into public.jetons (serie, name, odds) values ('Bodako', 'Coton', 10000) on conflict do nothing;
