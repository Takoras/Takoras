import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api';
import { Button } from '@/ui/Button';
import { confirm } from '@/ui/confirm';
import { act, dt } from './shared';
import s from './Admin.module.css';

type Fb = {
  id: number;
  kind: 'bug' | 'idea' | 'add' | 'other';
  body: string;
  page: string | null;
  device: string | null;
  pseudo: string | null;
  status: 'new' | 'seen' | 'done';
  created_at: string;
};
const KIND = { bug: '🐞 Bug', idea: '💡 Idée', add: '✨ Ajout', other: '💬 Autre' } as const;
const FILTERS = [
  ['new', '🆕 Nouveaux'],
  ['all', 'Tous'],
  ['bug', '🐞 Bugs'],
  ['idea', '💡 Idées'],
  ['add', '✨ Ajouts'],
  ['other', '💬 Autres'],
  ['done', '✅ Faits'],
] as const;
type F = (typeof FILTERS)[number][0];
const match = (f: Fb, k: F) =>
  k === 'all'
    ? true
    : k === 'new'
      ? f.status === 'new'
      : k === 'done'
        ? f.status === 'done'
        : f.kind === k && f.status !== 'done';

// Retours des joueurs (bugs, idées…) : filtres, marquer vu / fait / rouvrir, supprimer
export function FeedbackAdmin() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['adm-fb'],
    queryFn: async () => ((await adminApi.feedback()) as unknown as Fb[]) ?? [],
  });
  const [filter, setFilter] = useState<F>('new');
  const all = list.data ?? [];
  const set = async (f: Fb, st: string) => {
    if (st === 'delete' && !(await confirm('Supprimer ce retour ?', { danger: true }))) return;
    if (await act(() => adminApi.feedbackSet(f.id, st), st === 'delete' ? 'Retour supprimé' : 'Statut mis à jour'))
      await qc.invalidateQueries({ queryKey: ['adm-fb'] });
  };
  return (
    <div className={s.stack}>
      <div className={s.quick} role="group" aria-label="Filtres">
        {FILTERS.map(([k, l]) => (
          <button key={k} type="button" className={s.chip} aria-pressed={filter === k} onClick={() => setFilter(k)}>
            {l} <small className="muted">{all.filter((f) => match(f, k)).length}</small>
          </button>
        ))}
      </div>
      <ul className={s.fb}>
        {all
          .filter((f) => match(f, filter))
          .map((f) => (
            <li key={f.id} className={s[f.status]}>
              <div className={s.fbHead}>
                <span className={s.tag}>{KIND[f.kind]}</span>
                <b>{f.pseudo || '?'}</b>
                <small className="muted">
                  {dt(f.created_at)} · {f.page ?? ''}
                </small>
                <span>{f.status === 'new' ? '🆕' : f.status === 'seen' ? '👀 vu' : '✅ fait'}</span>
              </div>
              <p>{f.body}</p>
              {f.device ? <small className="muted">{f.device}</small> : null}
              <div className={s.quick}>
                {f.status !== 'seen' ? (
                  <Button size="sm" onClick={() => void set(f, 'seen')}>
                    👀 Vu
                  </Button>
                ) : null}
                {f.status !== 'done' ? (
                  <Button size="sm" onClick={() => void set(f, 'done')}>
                    ✅ Fait
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => void set(f, 'new')}>
                    ↩︎ Rouvrir
                  </Button>
                )}
                <Button size="sm" variant="danger" onClick={() => void set(f, 'delete')}>
                  🗑 Supprimer
                </Button>
              </div>
            </li>
          ))}
      </ul>
      {list.data && !all.filter((f) => match(f, filter)).length ? <p className="muted">Aucun retour ici</p> : null}
    </div>
  );
}
