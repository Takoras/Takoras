-- Descriptions (onglet Database de Supabase) des tables et fonctions du classé du Ring
comment on table public.ranked is 'Classé du Ring : Elo de chaque joueur, bilan (matchs, victoires, défaites, nuls), meilleur Elo, tuto du Ring fait ou non.';
comment on table public.ranked_queue is 'Classé : joueurs qui cherchent un adversaire (Elo, équipe figée, arrivée, dernier passage). Lu et écrit seulement par la fonction Edge « ranked ».';
comment on table public.ranked_matches is 'Classé : matchs en ligne. État du Ring calculé par le serveur, tour, chrono (deadline), dernier tour joué (tirs révélés), résultat et Elo avant/après. Lisible par les deux joueurs seulement (temps réel).';
comment on table public.ranked_shots is 'Classé : tirs secrets du tour en cours (révélés dans ranked_matches.last une fois le tour calculé). Jamais lisibles par les joueurs.';
comment on function public.ranked_me() is 'Mon classé : Elo, bilan, place, tuto fait, match en cours, en file ou non.';
comment on function public.ranked_tuto_done() is 'Marque le tuto du Ring comme fait (obligatoire avant le premier match).';
comment on function public.ranked_top(integer) is 'Classement Elo (joueurs ayant joué au moins un match).';
comment on function public.ranked_around() is 'Classement Elo autour de moi : 2 joueurs devant, moi, 2 derrière.';
comment on function public._ranked_team(uuid) is 'Interne (fonction Edge) : équipe de 3 d''un joueur (son deck) avec niveau, variante et rareté.';
comment on function public._ranked_pair(uuid, integer, jsonb) is 'Interne (fonction Edge) : cherche un adversaire d''Elo proche (écart toléré qui grandit avec l''attente) ou met le joueur en file.';
comment on function public._ranked_end(uuid, smallint, text) is 'Interne (fonction Edge) : fin de match, calcul de l''Elo des deux joueurs (K 40 puis 24) et du bilan.';
