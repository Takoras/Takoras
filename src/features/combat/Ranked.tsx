/* eslint-disable react-refresh/only-export-components -- le hook du nom de rang vit avec ses badges */
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { locale, useSettings } from '@/lib/settings';
import { useT } from '@/i18n/useT';
import { sfx } from '@/engines/sound.js';
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
        <RankBadge r={r} size={132} />
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
const STEP = 132,
  ROAD_H = 250;
const roadY = (i: number) => ROAD_H / 2 - 18 + Math.sin(i * 0.95) * 62;
export function RankRoad({ elo }: { elo: number }) {
  const t = useT();
  const name = useRankName();
  const cur = rankOf(elo);
  const list = useRef<HTMLDivElement>(null);
  // la marche actuelle est visible sans avoir à chercher
  useEffect(() => {
    const el = list.current;
    if (el) el.scrollLeft = (cur.idx + 0.5) * STEP - el.clientWidth / 2;
  }, [cur.idx]);
  const pts = ROAD.map((r, i) => [i * STEP + STEP / 2, roadY(i)] as const);
  const path = (n: number) =>
    pts
      .slice(0, n)
      .map(([x, y], i) => {
        if (!i) return `M${x} ${y}`;
        const [px, py] = pts[i - 1] ?? [x, y];
        return `C${px + STEP / 2} ${py} ${x - STEP / 2} ${y} ${x} ${y}`;
      })
      .join(' ');
  const W = ROAD.length * STEP;
  return (
    <section className={s.road} aria-labelledby="road-t">
      <h2 id="road-t">{t('arena.road')}</h2>
      {/* chemin qui défile : focusable au clavier pour pouvoir le parcourir (accessibilité) */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
      <div ref={list} className={s.roadScroll} tabIndex={0} aria-labelledby="road-t">
        <div className={s.roadTrack} style={{ width: W, height: ROAD_H }}>
          <svg className={s.roadPath} width={W} height={ROAD_H} aria-hidden>
            <path d={path(pts.length)} className={s.roadAll} />
            <path d={path(cur.idx + 1)} className={s.roadDone} />
          </svg>
          <ol>
            {ROAD.map((r, i) => (
              <li
                key={r.idx}
                className={r.idx < cur.idx ? s.done : r.idx === cur.idx ? s.here : undefined}
                aria-current={r.idx === cur.idx ? 'step' : undefined}
                style={
                  {
                    '--rc': r.col,
                    left: (pts[i]?.[0] ?? 0) - 56,
                    top: (pts[i]?.[1] ?? 0) - 44,
                    animationDelay: `${(i % 5) * -0.6}s`,
                  } as CSSProperties
                }
              >
                {r.idx === cur.idx ? <em>{t('arena.you')}</em> : null}
                <RankBadge r={r} size={r.idx === cur.idx ? 76 : 60} />
                <b>{name(r)}</b>
                <small>{r.min > 0 ? `${r.min}+` : `< ${r.max}`}</small>
              </li>
            ))}
          </ol>
        </div>
      </div>
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
      timer = window.setTimeout(() => void tick(), 3000);
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
  const q = useQuery({
    queryKey: ['ranked-around', uid, elo],
    enabled: !!uid,
    queryFn: () => combatApi.rankedAround(),
  });
  const rows = q.data ?? [];
  if (rows.length < 2) return null;
  return (
    <section className={s.around} aria-labelledby="around-t">
      <h2 id="around-t">{t('arena.around')}</h2>
      <ol>
        {rows.map((r) => {
          const rk = rankOf(r.elo);
          return (
            <li key={r.pos} className={r.me ? s.meRow : undefined} style={{ '--rc': rk.col } as CSSProperties}>
              <span className={s.pos}>#{r.pos}</span>
              <RankBadge r={rk} size={22} />
              {r.me ? <b>{r.pseudo}</b> : <Link to={`/profil/${encodeURIComponent(r.pseudo)}`}>{r.pseudo}</Link>}
              <small>{name(rk)}</small>
              <b className={s.aroundElo}>{r.elo.toLocaleString(locale(lang))}</b>
            </li>
          );
        })}
      </ol>
      <Link to="/classement" className={s.aroundAll}>
        {t('arena.aroundAll')} →
      </Link>
    </section>
  );
}
