/* eslint-disable react-refresh/only-export-components -- le hook du nom de rang vit avec ses badges */
import type { CSSProperties } from 'react';
import { locale, useSettings } from '@/lib/settings';
import { useT } from '@/i18n/useT';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { combatApi } from '@/api';
import { useAuth } from '@/lib/auth';
import { rankOf, ROAD, type Rank, type RankedMe } from './rankedApi';
import s from './Ranked.module.css';

// Nom d'un rang : « Bois 2 », « Maître », « Takoras »
export function useRankName() {
  const t = useT();
  return (r: Rank) => {
    const name = t(`arena.r_${r.k}` as 'arena.r_wood');
    return r.divs > 1 ? t('arena.rankName', { r: name, d: r.div }) : name;
  };
}

// Badge d'un rang : sprite pixel (Bois 1 → Rubis 3 = rank1..rank18), écusson dessiné pour Maître et Takoras
export function RankBadge({ r, size = 44 }: { r: Rank; size?: number }) {
  if (r.divs > 1)
    return (
      <img
        className={`px ${s.sprite}`}
        src={`/img/ranks/rank${r.idx + 1}.png`}
        alt=""
        width={size}
        height={size}
        style={{ '--sz': `${size}px` } as CSSProperties}
      />
    );
  return (
    <span
      className={`${s.badge} ${r.k === 'takoras' ? s.top : ''}`}
      style={{ '--rc': r.col, '--sz': `${size}px` } as CSSProperties}
      aria-hidden
    >
      <i>★</i>
    </span>
  );
}

// Carte du rang : badge, nom, Elo, place au classement et barre jusqu'à la prochaine division
export function RankCard({ me }: { me: RankedMe | undefined }) {
  const t = useT();
  const lang = useSettings((x) => x.lang);
  const name = useRankName();
  const elo = me?.elo ?? 1000;
  const r = rankOf(elo),
    next = ROAD[r.idx + 1];
  const pct = r.max == null ? 100 : Math.max(4, Math.min(100, ((elo - Math.max(r.min, r.max - 50)) / 50) * 100));
  // Ton rang en grand, sans boîte : badge qui flotte dans son halo, nom du rang, Elo, barre jusqu'à la division suivante
  return (
    <div className={s.hero} style={{ '--rc': r.col } as CSSProperties}>
      <div className={s.heroBadge}>
        <RankBadge r={r} size={200} />
      </div>
      <div className={s.heroMain}>
        <b className={s.heroName}>{name(r)}</b>
        <div className={s.heroLine}>
          <span className={s.heroElo}>
            {elo.toLocaleString(locale(lang))} <small>Elo</small>
          </span>
          {me?.top ? <span>{t('arena.eloTop', { n: me.top })}</span> : null}
        </div>
        <div
          className={s.heroBar}
          role="progressbar"
          aria-label={next ? name(next) : name(r)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pct)}
        >
          <i style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

// Près de toi : les 2 joueurs juste devant, toi, et les 2 juste derrière (classement Elo)
export function RankAround({ elo }: { elo: number }) {
  const t = useT();
  const lang = useSettings((x) => x.lang);
  const uid = useAuth((x) => x.user?.id);
  const name = useRankName();
  // Un seul classement : le haut du top 10, puis « … », puis les joueurs juste devant et derrière toi
  const around = useQuery({
    queryKey: ['ranked-around', uid, elo],
    enabled: !!uid,
    queryFn: () => combatApi.rankedAround(),
  });
  const top = useQuery({ queryKey: ['ranked-top', 10], queryFn: () => combatApi.rankedTop(10), staleTime: 60_000 });
  const byPos = new Map<number, { pos: number; pseudo: string; elo: number; me: boolean }>();
  (top.data ?? []).forEach((r, i) => byPos.set(i + 1, { pos: i + 1, pseudo: r.pseudo, elo: r.elo, me: false }));
  (around.data ?? []).forEach((r) => byPos.set(r.pos, { ...r }));
  const mePos = (around.data ?? []).find((r) => r.me)?.pos ?? 0;
  // si tu es loin du top : on garde les 5 premiers, puis toi et tes voisins
  const rows = [...byPos.values()]
    .sort((a, b) => a.pos - b.pos)
    .filter((r) => mePos <= 8 || r.pos <= 5 || Math.abs(r.pos - mePos) <= 2);
  if (!rows.length) return null;
  return (
    <section className={s.around} aria-labelledby="around-t">
      <h2 id="around-t">{t('arena.eloBoard')}</h2>
      <ol>
        {rows.map((r, i) => {
          const rk = rankOf(r.elo),
            gap = i > 0 && r.pos - (rows[i - 1]?.pos ?? 0) > 1;
          return (
            <li
              key={r.pos}
              className={[r.me ? s.meRow : '', gap ? s.gapRow : ''].join(' ')}
              style={{ '--rc': rk.col } as CSSProperties}
            >
              <span className={s.pos}>#{r.pos}</span>
              <RankBadge r={rk} size={22} />
              {r.me ? <b>{r.pseudo}</b> : <Link to={`/profile/${encodeURIComponent(r.pseudo)}`}>{r.pseudo}</Link>}
              <small>{name(rk)}</small>
              <b className={s.aroundElo}>{r.elo.toLocaleString(locale(lang))}</b>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
