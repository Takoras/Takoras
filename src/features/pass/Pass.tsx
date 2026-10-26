import { useEffect, useRef, type CSSProperties } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { errorText, passApi } from '@/api';
import { itemImg, itemText, type ShopItem } from '@/data/items';
import { sfx } from '@/engines/sound.js';
import { useAuth } from '@/lib/auth';
import { locale, useSettings } from '@/lib/settings';
import { useT } from '@/i18n/useT';
import { NeedLogin } from '@/app/NeedLogin';
import { Button } from '@/ui/Button';
import { toast } from '@/ui/toast';
import s from './Pass.module.css';

type Reward = { coins?: number; item?: string; qty?: number } | null;
type PassState = {
  season: number;
  xp: number;
  premium: boolean;
  claimed: number[];
  pclaimed: number[];
  pull_xp: number;
  ends_in: number;
  tiers: { t: number; free: Reward; prem: Reward }[];
};
const XP_TIER = 1000;
// Objets que le passe peut donner (pour leur nom et leur image)
const ITEMS: Record<string, ShopItem> = {
  potion1: { id: 'potion1', kind: 'potion', data: { mult: 1.3, rolls: 10 } },
  potion2: { id: 'potion2', kind: 'potion', data: { mult: 2, rolls: 6 } },
  potion3: { id: 'potion3', kind: 'potion', data: { mult: 5, rolls: 3 } },
  potion10: { id: 'potion10', kind: 'potion', data: { mult: 10, rolls: 4 } },
  potion25: { id: 'potion25', kind: 'potion', data: { mult: 25, rolls: 5 } },
  potion50: { id: 'potion50', kind: 'potion', data: { mult: 50, rolls: 6 } },
  instant: { id: 'instant', kind: 'instant', data: { pulls: 15 } },
  hourglass: { id: 'hourglass', kind: 'hourglass', data: { minutes: 60 } },
  b_doodle: { id: 'b_doodle', kind: 'banner', data: {} },
  a_etoile: { id: 'a_etoile', kind: 'avatar', data: { anim: true } },
};

// Passe de combat : 50 paliers de 1 000 XP par saison de 42 jours. XP surtout en combat (classé), un peu en ouvrant des pulls.
// Piste gratuite (tous les 3 paliers) et piste premium (les autres paliers), premium pas encore achetable.
export default function Pass() {
  const t = useT();
  const lang = useSettings((x) => x.lang);
  const user = useAuth((x) => x.user);
  const qc = useQueryClient();
  const list = useRef<HTMLOListElement>(null);
  const q = useQuery({
    queryKey: ['pass', user?.id],
    enabled: !!user,
    queryFn: async () => (await passApi.state()) as unknown as PassState,
  });
  const d = q.data;
  const tier = d ? Math.min(50, Math.floor(d.xp / XP_TIER)) : 0;
  // le palier en cours est visible sans chercher
  useEffect(() => {
    const el = list.current?.querySelector<HTMLElement>('[aria-current]');
    if (el && list.current) list.current.scrollLeft = el.offsetLeft - list.current.clientWidth / 2;
  }, [tier]);
  if (!user) return <NeedLogin title={t('ui.bp_title')} />;
  if (!d)
    return (
      <p className="muted" aria-busy>
        …
      </p>
    );
  const n = (v: number) => v.toLocaleString(locale(lang));
  const days = Math.max(0, Math.ceil(d.ends_in / 86400));
  const label = (r: Reward) => {
    if (!r) return '';
    if (r.coins) return t('ui.bp_coins', { n: n(r.coins) });
    const it = ITEMS[r.item ?? ''];
    return `${it ? itemText(it, lang)[0] : r.item}${(r.qty ?? 1) > 1 ? ` ×${r.qty}` : ''}`;
  };
  const icon = (r: Reward) =>
    r?.coins ? '/img/piece.png' : itemImg(ITEMS[r?.item ?? ''] ?? { id: 'instant', kind: 'instant' }).src;
  const claim = async (tr: number, prem: boolean) => {
    try {
      const res = (await passApi.claim(tr, prem)) as { state: unknown };
      qc.setQueryData(['me', user.id], res.state);
      sfx.upgrade();
      toast(`${t('ui.bp_got')}`);
      void q.refetch();
      void qc.invalidateQueries({ queryKey: ['items'] });
    } catch (e) {
      sfx.deny();
      toast(errorText(e, lang), true);
    }
  };
  const cell = (tr: number, r: Reward, prem: boolean) => {
    if (!r) return <span className={s.empty} aria-hidden />;
    const got = (prem ? d.pclaimed : d.claimed).includes(tr),
      open = tr <= tier,
      can = open && !got && (!prem || d.premium);
    return (
      <div className={`${s.reward} ${got ? s.got : ''} ${can ? s.ready : ''} ${prem ? s.prem : ''}`}>
        <img className="px" src={icon(r)} alt="" width={36} height={36} />
        <small>{label(r)}</small>
        {got ? (
          <b className={s.ok}>✓</b>
        ) : can ? (
          <Button size="sm" variant="primary" onClick={() => void claim(tr, prem)}>
            {t('ui.bp_claim')}
          </Button>
        ) : prem && open ? (
          <small className="muted"></small>
        ) : null}
      </div>
    );
  };
  return (
    <section className={s.page}>
      <header className={s.head}>
        <div>
          <h1>{t('ui.bp_title')}</h1>
          <p className="muted">
            {t('ui.bp_season', { n: d.season })} · {t('ui.bp_ends', { n: days })}
          </p>
        </div>
        <div className={s.level}>
          <b>{tier}</b>
          <small>/ 50</small>
        </div>
      </header>
      <div
        className={s.bar}
        role="progressbar"
        aria-label={t('ui.bp_xp')}
        aria-valuemin={0}
        aria-valuemax={XP_TIER}
        aria-valuenow={d.xp % XP_TIER}
      >
        <i style={{ width: `${tier >= 50 ? 100 : ((d.xp % XP_TIER) / XP_TIER) * 100}%` }} />
      </div>
      <p className="muted">
        {tier >= 50 ? t('ui.bp_done') : t('ui.bp_next', { n: n(XP_TIER - (d.xp % XP_TIER)), t: tier + 1 })} ·{' '}
        {t('ui.bp_pulls', { n: d.pull_xp })}
      </p>
      <ul className={s.how}>
        <li>{t('ui.bp_how_win')}</li>
        <li>{t('ui.bp_how_lose')}</li>
        <li>{t('ui.bp_how_pull')}</li>
        <li>{t('ui.bp_how_quest')}</li>
      </ul>
      <div className={s.premium}>
        <div>
          <b>{t('ui.bp_prem')}</b>
          <small className="muted">{t('ui.bp_prem_txt')}</small>
        </div>
        <Button disabled title={t('ui.packs_soon')}>
          5,00 € · {t('ui.pk_soon')}
        </Button>
      </div>
      {/* les 50 paliers : piste gratuite en haut, premium en bas */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- liste qui défile au clavier */}
      <ol ref={list} className={s.track} tabIndex={0} aria-label={t('ui.bp_title')}>
        {d.tiers.map((x) => (
          <li
            key={x.t}
            className={x.t <= tier ? s.reached : undefined}
            aria-current={x.t === Math.min(50, tier + 1) ? 'step' : undefined}
            style={{ '--i': x.t } as CSSProperties}
          >
            <span className={s.num}>{x.t}</span>
            {cell(x.t, x.free, false)}
            {cell(x.t, x.prem, true)}
          </li>
        ))}
      </ol>
      <p className="muted">{t('ui.bp_fair')}</p>
    </section>
  );
}
