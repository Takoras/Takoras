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
  return (
    <div className={s.card} style={{ '--rc': r.col } as CSSProperties}>
      <RankBadge r={r} size={56} />
      <div className={s.cardMain}>
        <small>{t('arena.rank')}</small>
        <b className={s.rankName}>{name(r)}</b>
        <div
          className={s.bar}
          role="progressbar"
          aria-label={next ? name(next) : name(r)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pct)}
        >
          <i style={{ width: `${pct}%` }} />
        </div>
        <small>
          {next
            ? t('arena.nextDiv', { n: (next.min - elo).toLocaleString(locale(lang)), r: name(next) })
            : t('arena.maxRank')}
        </small>
      </div>
      <div className={s.elo}>
        <b>{elo.toLocaleString(locale(lang))}</b>
        <small>Elo</small>
        {me?.games ? <small>{t('arena.record', { w: me.wins, l: me.losses })}</small> : null}
        {me?.games ? <small>{t('arena.eloTop', { n: me.top })}</small> : null}
      </div>
    </div>
  );
}

// Route des rangs : toutes les marches de Bois 1 à Takoras, la tienne mise en avant
export function RankRoad({ elo }: { elo: number }) {
  const t = useT();
  const name = useRankName();
  const cur = rankOf(elo);
  const list = useRef<HTMLOListElement>(null);
  // la marche actuelle est visible sans avoir à chercher
  useEffect(() => {
    const el = list.current?.querySelector<HTMLElement>('[aria-current]');
    if (el && list.current) list.current.scrollLeft = el.offsetLeft - list.current.clientWidth / 2 + el.clientWidth / 2;
  }, [cur.idx]);
  return (
    <section className={s.road} aria-labelledby="road-t">
      <h2 id="road-t">{t('arena.road')}</h2>
      <p className="muted">{t('arena.roadTxt')}</p>
      {/* liste qui défile : focusable au clavier pour pouvoir la parcourir (accessibilité) */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
      <ol ref={list} tabIndex={0} aria-labelledby="road-t">
        {ROAD.map((r) => (
          <li
            key={r.idx}
            className={r.idx < cur.idx ? s.done : r.idx === cur.idx ? s.here : undefined}
            aria-current={r.idx === cur.idx ? 'step' : undefined}
            style={{ '--rc': r.col } as CSSProperties}
          >
            <RankBadge r={r} size={36} />
            <b>{name(r)}</b>
            <small>{r.min > 0 ? `${r.min}+` : `< ${r.max}`}</small>
            {r.idx === cur.idx ? <em>{t('arena.you')}</em> : null}
          </li>
        ))}
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
