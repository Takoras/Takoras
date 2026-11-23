-- Vraies probas données dans les noms de fichiers (nid10000.png, Capsule220.png) :
-- Nid 1/10 000 (au lieu de 1/50), Terrarium devient Capsule 1/220 (au lieu de 1/1 500).
-- Les tirages déjà faits gardent leur jeton, avec le bon nom et la bonne proba. Actions Market (aucune détenue) remises au départ.
update public.jetons set odds = 10000 where serie = 'Bodako' and name = 'Nid';
update public.jetons set name = 'Capsule', odds = 220 where serie = 'Bodako' and name = 'Terrarium';
update public.pulls set odds = 10000 where serie = 'Bodako' and jeton = 'Nid';
update public.pulls set jeton = 'Capsule', odds = 220 where serie = 'Bodako' and jeton = 'Terrarium';
update public.pull_stats set odds = 10000 where jeton = 'Nid';
update public.pull_stats set jeton = 'Capsule', odds = 220 where jeton = 'Terrarium';
update public.bourse_assets set odds = 10000, shares = 400, k = 400 * 400 * 10, p0 = 10
  where jeton = 'Nid' and season_id in (select id from public.bourse_seasons where serie = 'Bodako' and not closed);
update public.bourse_assets set jeton = 'Capsule', odds = 220, shares = 700, k = 700 * 700 * 10, p0 = 10
  where jeton = 'Terrarium' and season_id in (select id from public.bourse_seasons where serie = 'Bodako' and not closed);
