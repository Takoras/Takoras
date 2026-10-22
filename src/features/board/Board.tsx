import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { publicApi } from '@/api';
import { useMe } from '@/api/queries';
import { hexRGB, jetonOf, SERIES, texOf } from '@/data/jetons';
import { useJn } from '@/lib/names';
import { locale, useSettings } from '@/lib/settings';
import { useT } from '@/i18n/useT';
import { Avatar } from '@/ui/Avatar';
import { Segmented } from '@/ui/Segmented';
import s from './Board.module.css';

// Classement : podium (top 3) + liste, par tirages, meilleur tirage, variantes ou collection, cette semaine ou depuis toujours
const KINDS = [
  ['ui.k_pulls', 'pulls'],
  ['ui.k_gain', 'gain'],
  ['ui.k_vars', 'variants'],
  ['ui.k_collec', 'collec'],
] as const;
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
  const jn = useJn();
  const lang = useSettings((x) => x.lang);
  const me = useMe();
  const [kind, setKind] = useState(0);
  const [period, setPeriod] = useState<Period>('week');
  const id = KINDS[kind]?.[1] ?? 'pulls';
  const q = useQuery({
    queryKey: ['board', id, period],
    queryFn: async () => (await publicApi.leaderboard(id, period === 'week' ? weekStart() : null, 50)) as Row[],
    refetchInterval: 60_000,
  });
  const fmt = (n: number) => Number(n).toLocaleString(locale(lang));
  const val = (r: Row) => {
    if (id === 'gain') {
      const j = jetonOf(r.jeton);
      return (
        <span className={s.gain} style={{ '--g': hexRGB(j.glow) } as CSSProperties}>
          <img className="px" src={texOf(j)} alt="" width={20} height={20} />
          {jn(r.jeton)} · 1/{fmt(r.value)}
        </span>
      );
    }
    if (id === 'collec') return t('ui.u_collec', { n: fmt(r.value), t: SERIES.Takoras?.length ?? 0 });
    return t(id === 'pulls' ? 'ui.u_pulls' : 'ui.u_vars', { n: fmt(r.value) });
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
          <p className="eyebrow">{t('ui.board_tag')}</p>
          <h1>{t('ui.board_title')}</h1>
        </div>
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
