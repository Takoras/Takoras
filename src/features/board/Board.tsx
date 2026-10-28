import { useState } from 'react';
import { Link, Navigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { publicApi } from '@/api';
import { useMe } from '@/api/queries';
import { locale, useSettings } from '@/lib/settings';
import { useT } from '@/i18n/useT';
import { Avatar } from '@/ui/Avatar';
import { Segmented } from '@/ui/Segmented';
import s from './Board.module.css';

// Classements « tirages ouverts » et « temps de jeu » : podium (top 3) + liste jusqu'au 10e, cette semaine ou depuis toujours.
// Il n'y a plus de page Classement : l'Elo est dans Combat, les tirages sur l'accueil, le temps de jeu dans l'inventaire.
export const playTime = (sec: number, lang: string) => {
  const h = Math.floor(sec / 3600),
    m = Math.floor((sec % 3600) / 60);
  return h ? `${h.toLocaleString(lang)} h ${String(m).padStart(2, '0')}` : `${m} min`;
};
type Period = 'week' | 'all';
type Row = { pseudo: string; value: number; jeton: string; odds: number };
// Lundi 0 h de la semaine en cours (heure locale, comme l'ancien site)
export function weekStart(now = new Date()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toISOString();
}

export function BoardSection({ kind: id, title }: { kind: 'pulls' | 'time'; title: string }) {
  const t = useT();
  const lang = useSettings((x) => x.lang);
  const me = useMe();
  const [period, setPeriod] = useState<Period>('week');
  const q = useQuery({
    queryKey: ['board', id, period],
    queryFn: async () => {
      const since = period === 'week' ? weekStart() : null;
      if (id === 'time')
        return (await publicApi.leaderboardTime(since, 10)).map((r) => ({
          pseudo: r.pseudo,
          value: Number(r.value),
          jeton: '',
          odds: 0,
        }));
      return (await publicApi.leaderboard(id, since, 10)) as Row[];
    },
    refetchInterval: 60_000,
  });
  const fmt = (n: number) => Number(n).toLocaleString(locale(lang));
  const val = (r: Row) => {
    if (id === 'time') return playTime(r.value, locale(lang));
    return t('ui.u_pulls', { n: fmt(r.value) });
  };
  const mine = (r: Row) => !!me.data?.pseudo && r.pseudo === me.data.pseudo;
  const name = (r: Row) => (
    <>
      <Link to={`/profil/${encodeURIComponent(r.pseudo)}`}>{r.pseudo}</Link>
      {mine(r) ? <span className="muted"> ({t('ui.you_tag')})</span> : null}
    </>
  );
  const rows = q.data ?? [];
  return (
    <section className={s.page} aria-label={title}>
      <header className={s.head}>
        <h2>{title}</h2>
        <Segmented<Period>
          label={t('ui.board_tag')}
          value={period}
          onChange={setPeriod}
          options={[
            ['week', t('ui.week')],
            ['all', t('ui.all_time')],
          ]}
        />
      </header>
      {q.isPending ? (
        <p className="muted" aria-busy>
          …
        </p>
      ) : rows.length ? (
        <>
          <ol className={s.podium}>
            {[1, 0, 2].map((i) => {
              const r = rows[i];
              return r ? (
                <li key={i} className={`${s.pod} ${s[`p${i + 1}`]}`}>
                  <Avatar pseudo={r.pseudo} size={i === 0 ? 84 : 64} />
                  <b>{name(r)}</b>
                  <small>{val(r)}</small>
                  <div className={s.step} aria-label={`#${i + 1}`}>
                    {i + 1}
                  </div>
                </li>
              ) : (
                <li key={i} aria-hidden />
              );
            })}
          </ol>
          <ol className={s.list} start={4}>
            {rows.slice(3, 10).map((r, i) => (
              <li key={r.pseudo} className={mine(r) ? s.me : undefined}>
                <span className={s.rank}>{i + 4}</span>
                <Avatar pseudo={r.pseudo} size={28} />
                <span className={s.who}>{name(r)}</span>
                <span className={s.val}>{val(r)}</span>
              </li>
            ))}
          </ol>
        </>
      ) : (
        <p className="muted">{t('ui.board_empty')}</p>
      )}
    </section>
  );
}

// L'ancienne adresse /classement mène au Combat (le classement Elo y est)
export default function Board() {
  return <Navigate to="/combat" replace />;
}
