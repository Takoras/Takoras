import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi, tables } from '@/api';
import { Button } from '@/ui/Button';
import { confirm } from '@/ui/confirm';
import { toast } from '@/ui/toast';
import { act, day } from './shared';
import s from './Admin.module.css';

// Patch notes : une ligne par changement, qui commence par + (nouveau) ~ (changé) ! (corrigé) - (retiré). FR + EN obligatoires.
type Line = { t: 'new' | 'change' | 'fix' | 'removed'; x: string };
type Note = {
  id: number;
  title: string;
  title_en: string | null;
  lines: Line[] | null;
  lines_en: Line[] | null;
  created_at: string;
};
const MARK: Record<string, Line['t']> = { '+': 'new', '~': 'change', '!': 'fix', '-': 'removed' };
const BACK: Record<Line['t'], string> = { new: '+', change: '~', fix: '!', removed: '-' };
export const parseLines = (v: string): Line[] =>
  v
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => ({ t: MARK[l[0] ?? ''] ?? 'new', x: (MARK[l[0] ?? ''] ? l.slice(1) : l).trim() }))
    .filter((l) => l.x);
const toText = (l: Line[] | null) => (l ?? []).map((x) => `${BACK[x.t] ?? '+'} ${x.x}`).join('\n');

export function PatchnotesAdmin() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['adm-pn'],
    queryFn: async () => ((await tables.patchnotes()).data ?? []) as unknown as Note[],
  });
  const [edit, setEdit] = useState<number | null>(null);
  const [f, setF] = useState({ title: '', lines: '', title_en: '', lines_en: '' });
  const refresh = () =>
    Promise.all([qc.invalidateQueries({ queryKey: ['adm-pn'] }), qc.invalidateQueries({ queryKey: ['patchnotes'] })]);
  const save = async () => {
    const lines = parseLines(f.lines),
      linesEn = parseLines(f.lines_en);
    if (!f.title.trim() || !lines.length) return toast('Mets un titre et au moins une ligne', true);
    if (!f.title_en.trim() || !linesEn.length) return toast('Mets aussi la version anglaise (titre + lignes)', true);
    const ok = await act(
      () =>
        adminApi.patchnoteSave({
          p_id: edit,
          p_title: f.title.trim(),
          p_lines: lines,
          p_title_en: f.title_en.trim(),
          p_lines_en: linesEn,
        }),
      edit ? 'Patch note modifiée' : 'Patch note publiée 📢 (popup chez les joueurs à leur prochaine visite)',
    );
    if (ok) {
      setEdit(null);
      setF({ title: '', lines: '', title_en: '', lines_en: '' });
      await refresh();
    }
  };
  return (
    <div className={s.stack}>
      <section className={s.box}>
        <h3>{edit ? 'Modifier la patch note' : 'Nouvelle patch note'}</h3>
        <p className="muted">
          Une ligne par changement : <b>+</b> nouveau · <b>~</b> changé · <b>!</b> corrigé · <b>-</b> retiré
        </p>
        <div className={s.two}>
          <div className={s.stack}>
            <input
              className={s.input}
              value={f.title}
              onChange={(e) => setF({ ...f, title: e.target.value })}
              placeholder="Titre (FR)"
              aria-label="Titre FR"
            />
            <textarea
              className={s.input}
              rows={6}
              value={f.lines}
              onChange={(e) => setF({ ...f, lines: e.target.value })}
              placeholder={'+ Nouveau truc\n! Bug corrigé'}
              aria-label="Lignes FR"
            />
          </div>
          <div className={s.stack}>
            <input
              className={s.input}
              value={f.title_en}
              onChange={(e) => setF({ ...f, title_en: e.target.value })}
              placeholder="Title (EN)"
              aria-label="Titre EN"
            />
            <textarea
              className={s.input}
              rows={6}
              value={f.lines_en}
              onChange={(e) => setF({ ...f, lines_en: e.target.value })}
              placeholder={'+ New thing\n! Bug fixed'}
              aria-label="Lignes EN"
            />
          </div>
        </div>
        <div className={s.row}>
          <Button variant="primary" size="sm" onClick={() => void save()}>
            {edit ? 'Enregistrer' : 'Publier'}
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEdit(null);
              setF({ title: '', lines: '', title_en: '', lines_en: '' });
            }}
          >
            Nouvelle
          </Button>
        </div>
      </section>
      <ul className={s.msgs}>
        {(list.data ?? []).map((n) => (
          <li key={n.id}>
            <small className="muted">
              {day(n.created_at)} · {(n.lines ?? []).length} lignes
            </small>
            <p>
              <b>{n.title}</b>
            </p>
            <div className={s.quick}>
              <Button
                size="sm"
                onClick={() => {
                  setEdit(n.id);
                  setF({
                    title: n.title,
                    lines: toText(n.lines),
                    title_en: n.title_en ?? '',
                    lines_en: toText(n.lines_en),
                  });
                }}
              >
                ✏️ Modifier
              </Button>
              <Button
                size="sm"
                variant="danger"
                aria-label="Supprimer la patch note"
                onClick={async () => {
                  if (!(await confirm('Supprimer cette patch note ?', { danger: true }))) return;
                  if (await act(() => adminApi.patchnoteDelete(n.id), 'Patch note supprimée')) await refresh();
                }}
              >
                🗑
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
