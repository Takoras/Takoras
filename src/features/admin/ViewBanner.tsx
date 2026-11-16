import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { sandboxApi } from '@/api';
import { useAuth } from '@/lib/auth';
import { Button } from '@/ui/Button';
import s from './ViewBanner.module.css';

// Un modo incarne un joueur de test : bandeau en bas de l'écran, partout, avec de quoi revenir à son compte
export function ViewBanner() {
  const uid = useAuth((x) => x.user?.id);
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['my-view', uid],
    enabled: !!uid,
    staleTime: 60_000,
    queryFn: async () => (await sandboxApi.myView()) as unknown as { pseudo: string; server: string; server_id: number } | null,
  });
  // pendant qu'on joue dans un serveur de test, ses faux joueurs continuent de jouer (un passage toutes les 20 s)
  const sid = q.data?.server_id;
  useEffect(() => {
    if (!sid) return;
    const id = setInterval(() => void sandboxApi.tick(sid).catch(() => undefined), 20_000);
    return () => clearInterval(id);
  }, [sid]);
  if (!q.data) return null;
  const back = async () => {
    await sandboxApi.view(null);
    qc.clear();
    location.assign('/admin');
  };
  return (
    <div className={s.bar} role="status">
      <span>
        Test serveur <b>{q.data.server}</b> · tu joues en tant que <b>{q.data.pseudo}</b>
      </span>
      <Button size="sm" variant="gold" onClick={() => void back()}>
        Revenir à mon compte
      </Button>
    </div>
  );
}
