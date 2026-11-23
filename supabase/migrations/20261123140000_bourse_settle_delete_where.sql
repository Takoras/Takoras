-- Le Market renvoyait « Une erreur est survenue » à tous les joueurs depuis le 21/11 :
-- le versement quotidien des dividendes (_bourse_settle) faisait « delete from _bourse_div » sans WHERE,
-- refusé par safeupdate sur les requêtes des joueurs (pas sur celles de l'administration, d'où des tests verts).
do $$ declare d text; begin
  d := pg_get_functiondef('public._bourse_settle(bigint,date)'::regprocedure);
  if d not like '%delete from _bourse_div;%' then raise exception '_bourse_settle: ligne introuvable'; end if;
  d := replace(d, 'delete from _bourse_div;', 'delete from _bourse_div where true;');
  execute d;
end $$;
