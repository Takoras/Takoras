/* eslint-disable react-refresh/only-export-components -- le hook du nom de rang vit avec ses badges */
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { locale, useSettings } from '@/lib/settings';
import { useT } from '@/i18n/useT';
import { sfx } from '@/engines/sound.js';
import { Button } from '@/ui/Button';
import { Modal } from '@/ui/Modal';
import { call, rankOf, ROAD, type Rank, type RankedMe } from './rankedApi';
import s from './Ranked.module.css';

const ROMAN = ['', 'I', 'II', 'III'];

// Nom d'un rang : « Fer 2 », « Maître », « Légende »
export function useRankName() {
  const t = useT();
  return (r: Rank) => {
    const name = t(`arena.r_${r.k}` as 'arena.r_iron');
    return r.divs > 1 ? t('arena.rankName', { r: name, d: r.div }) : name;
  };
}

// Badge d'un rang : écusson à la couleur du rang, division en chiffres romains (★ pour Maître et Légende)
export function RankBadge({ r, size = 44 }: { r: Rank; size?: number }) {
  return (
    <span className={s.badge} style={{ '--rc': r.col, '--sz': `${size}px` } as CSSProperties} aria-hidden>
      <i>{r.divs > 1 ? ROMAN[r.div] : '★'}</i>
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
        <div className={s.bar} role="progressbar" aria-label={next ? name(next) : name(r)} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
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

// Route des rangs : toutes les marches de Fer 1 à Légende, la tienne mise en avant
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
      <ol ref={list}>
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
      <div className={s.search}>
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
