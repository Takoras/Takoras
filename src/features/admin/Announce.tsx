import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi, tables } from '@/api';
import { Button } from '@/ui/Button';
import { confirm } from '@/ui/confirm';
import { act, dt } from './shared';
import s from './Admin.module.css';

type Ann = { id: number; body: string; banner: boolean; fullscreen: boolean; created_at: string };

// Annonces : écrire à tout le site (plein écran et/ou bandeau), voir et supprimer les anciennes
export function Announce() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['adm-ann'],
    queryFn: async () => ((await tables.announcements(50)).data ?? []) as Ann[],
  });
  const [body, setBody] = useState('');
  const [full, setFull] = useState(true);
  const [banner, setBanner] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ['adm-ann'] });
  return (
    <div className={s.stack}>
      <section className={s.box}>
        <h3>Nouvelle annonce</h3>
        <textarea
          className={s.input}
          rows={3}
          maxLength={500}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Ton message à tous les joueurs…"
          aria-label="Message de l’annonce"
        />
        <div className={s.row}>
          <small className="muted">{body.length}/500</small>
          <label className={s.check}>
            <input type="checkbox" checked={full} onChange={(e) => setFull(e.target.checked)} /> Plein écran
          </label>
          <label className={s.check}>
            <input type="checkbox" checked={banner} onChange={(e) => setBanner(e.target.checked)} /> Bandeau
          </label>
          <Button
            variant="primary"
            size="sm"
            disabled={!body.trim() || (!full && !banner)}
            onClick={async () => {
              if (!(await confirm('Envoyer cette annonce à tous les joueurs ?'))) return;
              if (await act(() => adminApi.announce(body.trim(), full, banner), 'Annonce envoyée à tout le monde 📢')) {
                setBody('');
                await refresh();
              }
            }}
          >
            Envoyer
          </Button>
        </div>
      </section>
      <ul className={s.msgs}>
        {(list.data ?? []).map((a) => (
          <li key={a.id}>
            <small className="muted">
              {dt(a.created_at)} · {[a.fullscreen && 'plein écran', a.banner && 'bandeau'].filter(Boolean).join(' + ')}
            </small>
            <p>{a.body}</p>
            <Button
              size="sm"
              variant="danger"
              aria-label="Supprimer l’annonce"
              onClick={async () => {
                if (!(await confirm('Supprimer cette annonce ?', { danger: true }))) return;
                if (await act(() => adminApi.deleteAnnouncement(a.id), 'Annonce supprimée')) await refresh();
              }}
            >
              🗑
            </Button>
          </li>
        ))}
        {list.data && !list.data.length ? <li className="muted">Aucune annonce</li> : null}
      </ul>
    </div>
  );
}
