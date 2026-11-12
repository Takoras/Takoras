import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';
import { adminApi } from '@/api';
import { useMe } from '@/api/queries';
import { Button } from '@/ui/Button';
import { confirm } from '@/ui/confirm';
import { act, dt } from './shared';
import s from './Admin.module.css';

// Signalements de joueurs (DSA) : ce qui a été signalé, le pseudo et la bio ACTUELS du joueur visé,
// et les actions rapides (vider la bio, renommer, marquer traité / rejeté, supprimer)
type Rep = {
  id: number;
  reason: 'pseudo' | 'bio' | 'profile' | 'cheat' | 'other';
  detail: string;
  status: 'new' | 'done' | 'dismissed';
  created_at: string;
  target: string;
  target_pseudo: string | null;
  target_bio: string | null;
  pseudo_now: string | null;
  bio_now: string | null;
  banned: boolean;
  reporter_pseudo: string | null;
  total: number;
};
const REASON = {
  pseudo: '🏷️ Pseudo',
  bio: '📝 Bio',
  profile: '🖼️ Profil',
  cheat: '🎯 Triche',
  other: '💬 Autre',
} as const;
const FILTERS = [
  ['new', '🆕 À traiter'],
  ['all', 'Tous'],
  ['done', '✅ Traités'],
  ['dismissed', '🙅 Rejetés'],
] as const;
type F = (typeof FILTERS)[number][0];

export function ReportsAdmin() {
  const isAdmin = !!useMe().data?.admin; // supprimer : admin seulement (le modo traite)
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['adm-rep'],
    queryFn: async () => ((await adminApi.reports()) as unknown as Rep[]) ?? [],
  });
  const [filter, setFilter] = useState<F>('new');
  const all = list.data ?? [];
  const shown = all.filter((r) => filter === 'all' || r.status === filter);
  const refresh = () => qc.invalidateQueries({ queryKey: ['adm-rep'] });
  const set = async (r: Rep, st: string) => {
    if (st === 'delete' && !(await confirm('Supprimer ce signalement ?', { danger: true }))) return;
    if (await act(() => adminApi.reportSet(r.id, st), st === 'delete' ? 'Signalement supprimé' : 'Statut mis à jour'))
      await refresh();
  };
  const clearBio = async (r: Rep) => {
    if (!(await confirm(`Vider la bio de ${r.pseudo_now ?? '?'} ?`, { danger: true }))) return;
    if (await act(() => adminApi.clearBio(r.target), 'Bio vidée')) await refresh();
  };
  const rename = async (r: Rep) => {
    const p = window.prompt(`Nouveau pseudo pour ${r.pseudo_now ?? '?'} (3 à 16 caractères)`, '');
    if (!p) return;
    if (await act(() => adminApi.setPseudo(r.target, p.trim()), 'Pseudo changé')) await refresh();
  };
  return (
    <div className={s.stack}>
      <div className={s.quick} role="group" aria-label="Filtres">
        {FILTERS.map(([k, l]) => (
          <button key={k} type="button" className={s.chip} aria-pressed={filter === k} onClick={() => setFilter(k)}>
            {l} <small className="muted">{all.filter((r) => k === 'all' || r.status === k).length}</small>
          </button>
        ))}
      </div>
      <ul className={s.fb}>
        {shown.map((r) => (
          <li key={r.id} className={s[r.status === 'new' ? 'new' : 'done']}>
            <div className={s.fbHead}>
              <span className={s.tag}>{REASON[r.reason]}</span>
              <b>
                <Link to={`/profile/${encodeURIComponent(r.pseudo_now ?? '')}`}>{r.pseudo_now ?? '?'}</Link>
                {r.banned ? ' · banni' : ''}
              </b>
              <small className="muted">
                {dt(r.created_at)} · par {r.reporter_pseudo ?? 'compte supprimé'} · {r.total} signalement(s) au total
              </small>
            </div>
            {r.detail ? <p>{r.detail}</p> : null}
            <p className="muted">
              Bio actuelle : {r.bio_now || '(vide)'}
              {r.target_pseudo && r.target_pseudo !== r.pseudo_now ? ` · pseudo signalé : ${r.target_pseudo}` : ''}
            </p>
            <div className={s.quick}>
              {r.bio_now ? (
                <Button size="sm" variant="danger" onClick={() => void clearBio(r)}>
                  🧽 Vider la bio
                </Button>
              ) : null}
              <Button size="sm" variant="danger" onClick={() => void rename(r)}>
                ✏️ Renommer
              </Button>
              {r.status === 'new' ? (
                <>
                  <Button size="sm" onClick={() => void set(r, 'done')}>
                    ✅ Traité
                  </Button>
                  <Button size="sm" onClick={() => void set(r, 'dismissed')}>
                    🙅 Rejeter
                  </Button>
                </>
              ) : (
                <Button size="sm" onClick={() => void set(r, 'new')}>
                  ↩︎ Rouvrir
                </Button>
              )}
              {isAdmin ? (
                <Button size="sm" variant="danger" onClick={() => void set(r, 'delete')}>
                  🗑 Supprimer
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      {list.data && !shown.length ? <p className="muted">Aucun signalement ici</p> : null}
    </div>
  );
}
