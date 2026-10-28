/* eslint-disable react-refresh/only-export-components -- le hook du nom de rang vit avec ses badges */
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { locale, useSettings } from '@/lib/settings';
import { useT } from '@/i18n/useT';
import { sfx } from '@/engines/sound.js';
import { RCFG } from '@/engines/ring-config.js';
import { Button } from '@/ui/Button';
import { Modal } from '@/ui/Modal';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { combatApi } from '@/api';
import { useAuth } from '@/lib/auth';
import { call, rankOf, ROAD, type Rank, type RankedMe } from './rankedApi';
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

// Carte du rang : badge, nom, Elo, bilan et progression jusqu'à la prochaine division
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
        <small className={s.heroTag}>{t('arena.rank')}</small>
        <b className={s.heroName}>{name(r)}</b>
        <div className={s.heroLine}>
          <span className={s.heroElo}>
            {elo.toLocaleString(locale(lang))} <small>Elo</small>
          </span>
          {me?.games ? <span>{t('arena.record', { w: me.wins, l: me.losses })}</span> : null}
          {me?.games ? <span>{t('arena.eloTop', { n: me.top })}</span> : null}
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
        <small className={s.heroNext}>
          {next
            ? t('arena.nextDiv', { n: (next.min - elo).toLocaleString(locale(lang)), r: name(next) })
            : t('arena.maxRank')}
        </small>
      </div>
    </div>
  );
}

// Route des rangs : un chemin qui serpente, les badges flottent dessus ; la partie déjà faite est colorée
// Route des rangs : les 8 rangs côte à côte (sans défilement), reliés par une barre qui se remplit jusqu'à toi.
// Sous chaque badge, les divisions (1, 2, 3) en petites pastilles ; ton rang flotte et brille.
const TIERS = RCFG.RANKS.map((r) => ({ k: r.k, col: r.col, steps: ROAD.filter((x) => x.k === r.k) }));
export function RankRoad({ elo }: { elo: number }) {
  const t = useT();
  const name = useRankName();
  const cur = rankOf(elo);
  const here = TIERS.findIndex((x) => x.k === cur.k);
  return (
    <section className={s.road} aria-labelledby="road-t">
      <h2 id="road-t">{t('arena.road')}</h2>
      <ol className={s.tiers} style={{ '--done': here } as CSSProperties}>
        {TIERS.map((x, i) => {
          const first = x.steps[0] as Rank,
            on = i === here;
          const shown = on ? cur : first;
          return (
            <li
              key={x.k}
              className={i < here ? s.done : on ? s.here : undefined}
              aria-current={on ? 'step' : undefined}
              style={{ '--rc': x.col, animationDelay: `${i * -0.5}s` } as CSSProperties}
            >
              {on ? <em>{t('arena.you')}</em> : null}
              <span className={s.tierBadge}>
                <RankBadge r={shown} size={on ? 84 : 64} />
              </span>
              <b>{on ? name(cur) : t(`arena.r_${x.k}` as 'arena.r_wood')}</b>
              <small>{first.min > 0 ? `${first.min}+` : `< ${x.steps.at(-1)?.max ?? ''}`}</small>
              {x.steps.length > 1 ? (
                <span className={s.pips} aria-hidden>
                  {x.steps.map((d) => (
                    <i key={d.idx} className={d.idx < cur.idx ? s.pipDone : d.idx === cur.idx ? s.pipNow : undefined} />
                  ))}
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

// Recherche d'un adversaire : on redemande au serveur toutes les 3 s (l'écart d'Elo toléré grandit avec l'attente)
export function SearchModal({
  elo,
  onMatch,
  onError,
  onClose,
}: {
  elo: number;
  onMatch: (id: string) => void;
  onError: (code: string) => void;
  onClose: () => void;
}) {
  const t = useT();
  const [sec, setSec] = useState(0);
  const [win, setWin] = useState(75);
  const live = useRef(true);
  const cbs = useRef({ onMatch, onError });
  useEffect(() => {
    cbs.current = { onMatch, onError };
  });
  useEffect(() => {
    live.current = true;
    const t0 = Date.now();
    const clock = setInterval(() => setSec(Math.floor((Date.now() - t0) / 1000)), 250);
    let timer = 0;
    const tick = async () => {
      const r = await call('join').catch(
        () => ({ error: 'network', now: 0 }) as { error: string; now: number; match?: string; window?: number },
      );
      if (!live.current) return;
      if (r.match) {
        live.current = false;
        sfx.announce?.();
        return cbs.current.onMatch(r.match);
      }
      if (r.error) {
        live.current = false;
        return cbs.current.onError(r.error);
      }
      if (r.window) setWin(r.window);
      // on redemande de moins en moins souvent si l'attente dure (économise les appels au serveur du classé)
      const waited = Date.now() - t0;
      timer = window.setTimeout(() => void tick(), waited < 20_000 ? 3000 : waited < 60_000 ? 5000 : 8000);
    };
    void tick();
    return () => {
      clearInterval(clock);
      clearTimeout(timer);
      if (live.current) void call('cancel');
      live.current = false;
    };
  }, []);
  const mm = String(Math.floor(sec / 60)),
    ss = String(sec % 60).padStart(2, '0');
  return (
    <Modal open onClose={onClose} title={t('arena.searching')}>
      <div className={s.search} data-busy>
        <span className={s.radar} aria-hidden>
          <RankBadge r={rankOf(elo)} size={52} />
        </span>
        <b className={s.clock} aria-live="off">
          {mm}:{ss}
        </b>
        <p className="muted">{t('arena.searchTxt', { e: elo, w: win })}</p>
        <Button onClick={onClose}>{t('arena.cancel')}</Button>
      </div>
    </Modal>
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
              {r.me ? <b>{r.pseudo}</b> : <Link to={`/profil/${encodeURIComponent(r.pseudo)}`}>{r.pseudo}</Link>}
              <small>{name(rk)}</small>
              <b className={s.aroundElo}>{r.elo.toLocaleString(locale(lang))}</b>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
