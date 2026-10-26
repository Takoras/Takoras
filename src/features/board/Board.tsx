import { useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { combatApi, publicApi } from '@/api';
import { useMe } from '@/api/queries';
import { SERIES } from '@/data/jetons';
import { locale, useSettings } from '@/lib/settings';
import { useT } from '@/i18n/useT';
import { Avatar } from '@/ui/Avatar';
import { Segmented } from '@/ui/Segmented';
import { RankBadge, useRankName } from '../combat/Ranked';
import { rankOf } from '../combat/rankedApi';
import s from './Board.module.css';

// Classement : podium (top 3) + liste. Collection, Elo du classé, pulls ouverts (cette semaine ou depuis toujours)
// et temps de jeu.
const KINDS = [
  ['ui.k_collec', 'collec'],
  ['ui.k_elo', 'elo'],
  ['ui.k_pulls', 'pulls'],
  ['ui.k_time', 'time'],
] as const;
// Elo et temps de jeu : depuis toujours (pas de période)
const NO_PERIOD = new Set(['elo', 'time']);
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

export default function Board() {
  const t = useT();
  const lang = useSettings((x) => x.lang);
  const me = useMe();
  const [kind, setKind] = useState(0);
  const [period, setPeriod] = useState<Period>('week');
  const id = KINDS[kind]?.[1] ?? 'pulls';
  const rankName = useRankName();
  const q = useQuery({
    queryKey: ['board', id, NO_PERIOD.has(id) ? 'all' : period],
    queryFn: async () =>
      id === 'elo'
        ? (await combatApi.rankedTop(50)).map((r) => ({ pseudo: r.pseudo, value: r.elo, jeton: '', odds: 0 }))
        : id === 'time'
          ? (await publicApi.leaderboardTime(50)).map((r) => ({ ...r, jeton: '', odds: 0 }))
          : ((await publicApi.leaderboard(id, period === 'week' ? weekStart() : null, 50)) as Row[]),
    refetchInterval: 60_000,
  });
  const fmt = (n: number) => Number(n).toLocaleString(locale(lang));
  const val = (r: Row) => {
    if (id === 'elo') {
      const rk = rankOf(r.value);
      return (
        <span className={s.gain}>
          <RankBadge r={rk} size={18} />
          {rankName(rk)} · {fmt(r.value)} Elo
        </span>
      );
    }
    if (id === 'time') return playTime(r.value, locale(lang));
    if (id === 'collec') return t('ui.u_collec', { n: fmt(r.value), t: SERIES.Takoras?.length ?? 0 });
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
    <section className={s.page}>
      <header className={s.head}>
        <div>
          <h1>{t('ui.board_title')}</h1>
        </div>
        {NO_PERIOD.has(id) ? null : (
          <Segmented<Period>
            label={t('ui.board_tag')}
            value={period}
            onChange={setPeriod}
            options={[
              ['week', t('ui.week')],
              ['all', t('ui.all_time')],
            ]}
          />
        )}
      </header>
      <div className={s.kinds} role="group" aria-label={t('ui.board_title')}>
        {KINDS.map(([k], i) => (
          <button key={k} type="button" aria-pressed={i === kind} onClick={() => setKind(i)}>
            {t(k)}
          </button>
        ))}
      </div>
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
            {rows.slice(3).map((r, i) => (
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
