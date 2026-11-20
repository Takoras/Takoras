-- Verrouillage des jetons retiré de l'inventaire : la fonction n'est plus appelable par les joueurs
revoke execute on function public.lock_pulls(bigint[], boolean) from public, anon, authenticated;
