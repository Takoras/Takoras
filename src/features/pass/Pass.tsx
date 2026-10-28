import { burstAt } from '@/lib/pfx';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { errorText, passApi } from '@/api';
import { itemImg, itemText, type ShopItem } from '@/data/items';
import { sfx } from '@/engines/sound.js';
import { useAuth } from '@/lib/auth';
import { locale, useSettings } from '@/lib/settings';
import { useT } from '@/i18n/useT';
import { NeedLogin } from '@/app/NeedLogin';
import { Button } from '@/ui/Button';
import { Modal } from '@/ui/Modal';
import { Segmented } from '@/ui/Segmented';
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
// Objets que le passe peut donner (nom, image, et prix boutique pour estimer la valeur de chaque piste)
const ITEMS: Record<string, ShopItem & { price: number }> = {
  potion1: { id: 'potion1', kind: 'potion', data: { mult: 1.3, rolls: 10 }, price: 100 },
  potion2: { id: 'potion2', kind: 'potion', data: { mult: 2, rolls: 6 }, price: 200 },
  potion3: { id: 'potion3', kind: 'potion', data: { mult: 5, rolls: 3 }, price: 400 },
  potion10: { id: 'potion10', kind: 'potion', data: { mult: 10, rolls: 4 }, price: 1200 },
  potion25: { id: 'potion25', kind: 'potion', data: { mult: 25, rolls: 5 }, price: 4000 },
  potion50: { id: 'potion50', kind: 'potion', data: { mult: 50, rolls: 6 }, price: 9500 },
  potion100: { id: 'potion100', kind: 'potion', data: { mult: 100, rolls: 10 }, price: 31000 },
  instant: { id: 'instant', kind: 'instant', data: { pulls: 15 }, price: 500 },
  hourglass: { id: 'hourglass', kind: 'hourglass', data: { minutes: 60 }, price: 700 },
  // exclusifs du passe premium (saison 1) : jamais vendus en boutique
  a_oeil: { id: 'a_oeil', kind: 'avatar', data: {}, price: 20000 },
  b_yeux: { id: 'b_yeux', kind: 'banner', data: {}, price: 15000 },
};
const worth = (r: Reward) => (!r ? 0 : r.coins ? r.coins : (ITEMS[r.item ?? '']?.price ?? 0) * (r.qty ?? 1));
const isCosmetic = (r: Reward) => !!r?.item && (r.item.startsWith('b_') || r.item.startsWith('a_'));

// Passe de combat façon Brawl : 50 paliers, une piste premium (en haut, dorée) et une gratuite (en bas).
// Chaque palier se récupère en touchant sa case. XP surtout en combat, un peu en ouvrant des pulls (onglet Missions).
export default function Pass() {
  const t = useT();
  const lang = useSettings((x) => x.lang);
  const user = useAuth((x) => x.user);
  const qc = useQueryClient();
  const list = useRef<HTMLOListElement>(null);
  const [tab, setTab] = useState<'rewards' | 'missions'>('rewards');
  const [premOpen, setPremOpen] = useState(false);
  const q = useQuery({
    queryKey: ['pass', user?.id],
    enabled: !!user,
    queryFn: async () => (await passApi.state()) as unknown as PassState,
  });
  const d = q.data;
  const tier = d ? Math.min(50, Math.floor(d.xp / XP_TIER)) : 0;
  // le palier en cours est au milieu de l'écran, sans chercher
  useEffect(() => {
    const el = list.current?.querySelector<HTMLElement>('[aria-current]');
    if (el && list.current) list.current.scrollLeft = el.offsetLeft - list.current.clientWidth / 2;
  }, [tier, tab, d]);
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
  const claim = async (tr: number, prem: boolean, el?: HTMLElement) => {
    try {
      const res = (await passApi.claim(tr, prem)) as { state: unknown };
      qc.setQueryData(['me', user.id], res.state);
      burstAt(el ?? null, prem ? '#fbbf24' : '#a78bfa', 1.3);
      sfx.upgrade();
      toast(`${t('ui.bp_got')}`);
      void q.refetch();
      void qc.invalidateQueries({ queryKey: ['items'] });
    } catch (e) {
      sfx.deny();
      toast(errorText(e, lang), true);
    }
  };
  const vFree = d.tiers.reduce((x, r) => x + worth(r.free), 0),
    vPrem = d.tiers.reduce((x, r) => x + worth(r.prem), 0);
  const ready = (prem: boolean) =>
    d.tiers.filter((x) => x.t <= tier && (prem ? x.prem : x.free) && !(prem ? d.pclaimed : d.claimed).includes(x.t))
      .length;
  const tile = (tr: number, r: Reward, prem: boolean) => {
    if (!r) return <span className={`${s.tile} ${s.none} ${prem ? s.gold : ''}`} aria-hidden />;
    const got = (prem ? d.pclaimed : d.claimed).includes(tr),
      open = tr <= tier,
      locked = prem && !d.premium,
      can = open && !got && !locked;
    const qty = r.coins ? n(r.coins) : (r.qty ?? 1) > 1 ? `×${r.qty}` : '';
    const it = ITEMS[r.item ?? ''];
    // nom court et clair sous chaque récompense
    const short = r.coins
      ? t('ui.bp_coins', { n: '' }).trim()
      : it?.kind === 'potion'
        ? `Chance ×${it.data.mult}`
        : it?.kind === 'banner'
          ? 'Bannière'
          : it?.kind === 'avatar'
            ? 'Photo de profil'
            : it
              ? itemText(it, lang)[0]
              : '';
    const cls = `${s.tile} ${prem ? s.gold : ''} ${got ? s.got : ''} ${can ? s.ready : ''} ${isCosmetic(r) ? s.rare : ''} ${!open ? s.future : ''}`;
    const body = (
      <>
        <img className={`px ${isCosmetic(r) && r.item?.startsWith('b_') ? s.wide : ''}`} src={icon(r)} alt="" />
        {qty ? <b className={s.qty}>{qty}</b> : null}
        {/* nom affiché en CSS (attr) : ne gêne pas le nom lu par les lecteurs d'écran */}
        <small className={s.lbl} data-l={short} aria-hidden />
        {got ? (
          <i className={s.check} aria-hidden>
            ✓
          </i>
        ) : locked ? (
          <i className={s.lock} aria-hidden />
        ) : can ? (
          <i className={s.bang} aria-hidden>
            !
          </i>
        ) : null}
      </>
    );
    return can ? (
      <button
        type="button"
        className={cls}
        onClick={(e) => void claim(tr, prem, e.currentTarget)}
        aria-label={`${t('ui.bp_claim')} · ${label(r)}`}
      >
        {body}
      </button>
    ) : (
      <span className={cls} role="img" aria-label={label(r)}>
        {body}
      </span>
    );
  };
  const pct = tier >= 50 ? 100 : ((d.xp % XP_TIER) / XP_TIER) * 100;
  return (
    <section className={s.page}>
      <header className={s.head} data-tour="pass">
        <div className={s.season}>
          <small>{t('ui.bp_season', { n: d.season })}</small>
          <h1>{t('ui.bp_title')}</h1>
          <small className={s.ends}>{t('ui.bp_ends', { n: days })}</small>
        </div>
        <div className={s.tabs}>
          <Segmented
            value={tab}
            onChange={setTab}
            label={t('ui.bp_title')}
            options={[
              ['rewards', t('ui.bp_tab_rewards')],
              ['missions', t('ui.bp_tab_missions')],
            ]}
          />
        </div>
        <div className={s.xp}>
          <span className={s.badge} aria-label={`${tier} / 50`}>
            {tier}
          </span>
          <div className={s.xpCol}>
            <div
              className={s.bar}
              role="progressbar"
              aria-label={t('ui.bp_xp')}
              aria-valuemin={0}
              aria-valuemax={XP_TIER}
              aria-valuenow={d.xp % XP_TIER}
            >
              <i style={{ width: `${pct}%` }} />
              <span>
                {tier >= 50 ? XP_TIER : d.xp % XP_TIER} / {XP_TIER}
              </span>
            </div>
            <small className="muted">
              {tier >= 50 ? t('ui.bp_done') : t('ui.bp_next', { n: n(XP_TIER - (d.xp % XP_TIER)), t: tier + 1 })}
            </small>
          </div>
          <span className={s.next}>{Math.min(50, tier + 1)}</span>
        </div>
      </header>

      {tab === 'rewards' ? (
        <>
          <div className={s.board}>
            <div className={s.rail}>
              {/* panneau premium de la saison (Halloween) : toucher = voir ce qu'il débloque */}
              <button type="button" className={s.premCard} onClick={() => setPremOpen(true)}>
                <img className={`px ${s.premPp}`} src="/img/pp/oeil.png" alt="" />
                <b>{t('ui.bp_prem_short')}</b>
                <small>{d.premium ? `✓ ${t('ui.bp_prem_owned')}` : 'Débloquer'}</small>
                {ready(true) && d.premium ? <i className={s.dot}>{ready(true)}</i> : null}
              </button>
              <div className={s.ticket}>
                <b>{t('ui.bp_free')}</b>
                {ready(false) ? <i className={s.dot}>{ready(false)}</i> : null}
              </div>
            </div>
            {/* les 50 paliers : premium en haut, numéro sur la ligne de progression, gratuit en bas */}
            {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- liste qui défile au clavier */}
            <ol ref={list} className={s.track} tabIndex={0} aria-label={t('ui.bp_title')}>
              {d.tiers.map((x) => (
                <li
                  key={x.t}
                  className={x.t <= tier ? s.reached : undefined}
                  aria-current={x.t === Math.min(50, tier + 1) ? 'step' : undefined}
                  style={{ '--i': x.t } as CSSProperties}
                >
                  {tile(x.t, x.prem, true)}
                  <span className={s.num}>{x.t}</span>
                  {tile(x.t, x.free, false)}
                </li>
              ))}
            </ol>
          </div>

          <Modal open={premOpen} onClose={() => setPremOpen(false)} title={t('ui.bp_prem')}>
            <div className={s.premium}>
              <div className={s.premShow}>
                <figure>
                  <img className="px" src="/img/pp/oeil.png" alt="" />
                  <figcaption>
                    Photo « Œil » <small>palier 50 · exclusive</small>
                  </figcaption>
                </figure>
                <figure>
                  <img className={`px ${s.premBan}`} src="/img/bannieres/yeux.webp" alt="" />
                  <figcaption>
                    Bannière « Yeux » <small>palier 30 · exclusive</small>
                  </figcaption>
                </figure>
              </div>
              <div className={s.compare}>
                <span>
                  <small>{t('ui.bp_free')}</small>
                  <b>
                    <img className="px" src="/img/piece.png" alt="" width={18} height={18} /> {n(vFree)}
                  </b>
                </span>
                <span className={s.vs} aria-hidden>
                  →
                </span>
                <span className={s.big}>
                  <small>{t('ui.bp_prem_short')}</small>
                  <b>
                    <img className="px" src="/img/piece.png" alt="" width={22} height={22} /> {n(vPrem)}
                  </b>
                </span>
                <span className={s.mult}>×{Math.max(1, Math.round(vPrem / Math.max(1, vFree)))}</span>
              </div>
              {d.premium ? (
                <b className={s.owned}>✓ {t('ui.bp_prem_owned')}</b>
              ) : (
                <Button variant="primary" disabled title={t('ui.packs_soon')}>
                  Débloquer · {t('ui.pk_soon')}
                </Button>
              )}
            </div>
          </Modal>
        </>
      ) : (
        <div className={s.missions}>
          <ul className={s.how} aria-label={t('ui.bp_xp_from')}>
            <li>
              <b>+120</b>
              {t('ui.bp_src_win')}
            </li>
            <li>
              <b>+60</b>
              {t('ui.bp_src_lose')}
            </li>
            <li>
              <b>+15</b>
              {t('ui.bp_src_pull')} <small>{d.pull_xp}/600</small>
            </li>
            <li>
              <b>+134</b>
              {t('ui.bp_src_quest')}
            </li>
          </ul>
          <Weekly />
        </div>
      )}
    </section>
  );
}

type Wk = {
  quests: { id: 'pulls' | 'wins' | 'quests'; target: number; value: number; coins: number; claimed: boolean }[];
};
// Quêtes de la semaine : 3 objectifs, des pièces + 667 XP de passe chacun
function Weekly() {
  const t = useT();
  const lang = useSettings((x) => x.lang);
  const uid = useAuth((x) => x.user?.id);
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['weekly', uid],
    enabled: !!uid,
    queryFn: async () => (await passApi.weekly()) as unknown as Wk,
  });
  if (!q.data) return null;
  const n = (v: number) => v.toLocaleString(locale(lang));
  const claim = async (id: string) => {
    try {
      qc.setQueryData(['me', uid], await passApi.claimWeekly(id));
      sfx.upgrade();
      toast(t('ui.bp_got'));
      void q.refetch();
      void qc.invalidateQueries({ queryKey: ['pass'] });
    } catch (e) {
      sfx.deny();
      toast(errorText(e, lang), true);
    }
  };
  return (
    <section className={s.weekly} aria-labelledby="wk-t">
      <h2 id="wk-t">{t('ui.wk_title')}</h2>
      <ul>
        {q.data.quests.map((x) => {
          const ok = x.value >= x.target;
          return (
            <li key={x.id} className={x.claimed ? s.wkDone : ok ? s.wkReady : undefined}>
              <span>
                <b>{t(`ui.wk_${x.id}`, { n: x.target })}</b>
                <small>{t('ui.wk_reward', { c: n(x.coins) })}</small>
              </span>
              <span
                className={s.wkBar}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={x.target}
                aria-valuenow={x.value}
                aria-label={t(`ui.wk_${x.id}`, { n: x.target })}
              >
                <i style={{ width: `${Math.min(100, (x.value / x.target) * 100)}%` }} />
              </span>
              {x.claimed ? (
                <b className={s.ok}>✓</b>
              ) : (
                <Button size="sm" variant={ok ? 'primary' : 'ghost'} disabled={!ok} onClick={() => void claim(x.id)}>
                  {ok ? t('ui.bp_claim') : `${x.value}/${x.target}`}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
