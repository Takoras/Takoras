import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { errorText, passApi } from '@/api';
import { itemImg, itemText, type ShopItem } from '@/data/items';
import { sfx } from '@/engines/sound.js';
import { useAuth } from '@/lib/auth';
import { locale, reducedFx, useSettings } from '@/lib/settings';
import { useT } from '@/i18n/useT';
import { NeedLogin } from '@/app/NeedLogin';
import { Button } from '@/ui/Button';
import { Modal } from '@/ui/Modal';
import { PixelBg } from '@/ui/PixelBg';
import { Segmented } from '@/ui/Segmented';
import { Tween } from '@/ui/Tween';
import { toast } from '@/ui/toast';
import { flyCoins, flyIcons, shockwave } from '@/ui/fx';
import { useSwingAll } from '@/ui/useSwing';
import { useStaggerIn } from '@/ui/useStaggerIn';
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
const icon = (r: Reward) =>
  r?.coins ? '/img/piece.png' : itemImg(ITEMS[r?.item ?? ''] ?? { id: 'instant', kind: 'instant' }).src;
const GOLD = 'rgb(242 194 48)';
const BLUE = 'rgb(142 170 255)';
const wait = (ms: number) => new Promise((ok) => setTimeout(ok, ms));
const frame = () => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));

// Passe de combat, même DA que la boutique : en haut ta progression (grand palier, barre d'XP, prochaine récompense)
// et le premium ; dessous la route des 50 paliers (premium en haut, gratuit en bas) sur une ligne de progression
// continue. Récupérer : éclair, onde de choc, et la récompense file vers le solde (pièces) ou l'inventaire (objets).
export default function Pass() {
  const t = useT();
  const lang = useSettings((x) => x.lang);
  const user = useAuth((x) => x.user);
  const qc = useQueryClient();
  const pageRef = useRef<HTMLElement>(null);
  const list = useRef<HTMLOListElement>(null);
  const [tab, setTab] = useState<'rewards' | 'missions'>('rewards');
  const [premOpen, setPremOpen] = useState(false);
  const [info, setInfo] = useState<{ t: number; prem: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const q = useQuery({
    queryKey: ['pass', user?.id],
    enabled: !!user,
    queryFn: async () => (await passApi.state()) as unknown as PassState,
  });
  const d = q.data;
  const tier = d ? Math.min(50, Math.floor(d.xp / XP_TIER)) : 0;
  useStaggerIn(pageRef, `.${s.head}, .${s.hero}, .${s.prem}, .${s.board}, .${s.missions} > *`, !!d);
  const swingKey = tab === 'rewards' ? d : tab;
  useSwingAll(list, `.${s.tile}`, 0.45, swingKey);
  useSwingAll(pageRef, `.${s.hero}, .${s.prem}`, 0.25, swingKey);
  // le palier en cours est au milieu de la route, sans chercher (à l'arrivée et en revenant sur l'onglet)
  const centered = useRef(false);
  useEffect(() => {
    if (tab !== 'rewards') {
      centered.current = false;
      return;
    }
    if (centered.current || !d) return;
    const el = list.current?.querySelector<HTMLElement>('[aria-current]');
    if (el && list.current) {
      list.current.scrollLeft = el.offsetLeft - list.current.clientWidth / 2 + el.offsetWidth / 2;
      centered.current = true;
    }
  }, [tab, d]);
  // PC : la molette fait défiler la route, et on peut l'attraper à la souris (avec de l'élan quand on lâche)
  useEffect(() => {
    const el = list.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    let down = false,
      moved = 0,
      lastX = 0,
      v = 0,
      raf = 0,
      lastT = 0;
    const pd = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      cancelAnimationFrame(raf);
      down = true;
      moved = 0;
      v = 0;
      lastX = e.clientX;
      lastT = performance.now();
    };
    const pm = (e: PointerEvent) => {
      if (!down) return;
      const dx = e.clientX - lastX;
      const now = performance.now();
      moved += Math.abs(dx);
      if (moved > 6) el.classList.add(s.grab ?? '');
      el.scrollLeft -= dx;
      v = (-dx / Math.max(1, now - lastT)) * 16;
      lastX = e.clientX;
      lastT = now;
    };
    const pu = () => {
      if (!down) return;
      down = false;
      el.classList.remove(s.grab ?? '');
      if (reducedFx()) return;
      const glide = () => {
        v *= 0.92;
        el.scrollLeft += v;
        if (Math.abs(v) > 0.4) raf = requestAnimationFrame(glide);
      };
      raf = requestAnimationFrame(glide);
    };
    // après un glisser, le relâchement ne compte pas comme un clic sur une case
    const click = (e: MouseEvent) => {
      if (moved > 6) {
        e.stopPropagation();
        e.preventDefault();
      }
    };
    el.addEventListener('wheel', wheel, { passive: false });
    el.addEventListener('pointerdown', pd);
    addEventListener('pointermove', pm);
    addEventListener('pointerup', pu);
    el.addEventListener('click', click, true);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('wheel', wheel);
      el.removeEventListener('pointerdown', pd);
      removeEventListener('pointermove', pm);
      removeEventListener('pointerup', pu);
      el.removeEventListener('click', click, true);
    };
  }, [tab, d]);
  // téléphone : la page du passe ne défile pas, on fait juste glisser la route
  useEffect(() => {
    const h = document.documentElement;
    if (!h.classList.contains('phone')) return;
    h.classList.add('lockScroll');
    return () => h.classList.remove('lockScroll');
  }, []);
  if (!user) return <NeedLogin title={t('ui.bp_title')} />;
  if (!d)
    return (
      <section ref={pageRef} className={s.page}>
        <p className="muted" aria-busy>
          …
        </p>
      </section>
    );
  const n = (v: number) => v.toLocaleString(locale(lang));
  const days = Math.max(0, Math.ceil(d.ends_in / 86400));
  const name = (r: Reward) => {
    if (!r) return '';
    if (r.coins) return t('ui.bp_coins', { n: '' }).trim();
    const it = ITEMS[r.item ?? ''];
    return it?.kind === 'potion'
      ? `Chance ×${it.data.mult}`
      : it?.kind === 'banner'
        ? 'Bannière'
        : it?.kind === 'avatar'
          ? 'Photo de profil'
          : it
            ? itemText(it, lang)[0]
            : (r.item ?? '');
  };
  const label = (r: Reward) => {
    if (!r) return '';
    if (r.coins) return t('ui.bp_coins', { n: n(r.coins) });
    const it = ITEMS[r.item ?? ''];
    return `${it ? itemText(it, lang)[0] : r.item}${(r.qty ?? 1) > 1 ? ` ×${r.qty}` : ''}`;
  };
  const amount = (r: Reward) => (r?.coins ? n(r.coins) : (r?.qty ?? 1) > 1 ? `×${r?.qty}` : '');
  const tileOf = (tr: number, p: boolean) => list.current?.querySelector<HTMLElement>(`[data-k="${tr}-${p ? 1 : 0}"]`);

  // l'effet d'une case récupérée : éclair, deux ondes de choc, petit « pop », et la récompense s'envole
  const burst = (el: HTMLElement | null | undefined, r: Reward, prem: boolean, light = false, onLand?: () => void) => {
    if (!el) return onLand?.();
    const rect = el.getBoundingClientRect();
    const fast = reducedFx();
    const flash = document.createElement('div');
    flash.className = s.flash ?? '';
    el.appendChild(flash);
    flash
      .animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: fast ? 120 : light ? 380 : 550,
        easing: 'cubic-bezier(.3,0,.2,1)',
        fill: 'forwards',
      })
      .finished.finally(() => flash.remove());
    if (fast) return onLand?.();
    const col = prem ? GOLD : BLUE;
    shockwave(rect, 'rgb(255 255 255)', 14, 0, light ? 16 : 22);
    if (!light) shockwave(rect, col, 14, 100, 40);
    el.animate([{ scale: '1.12' }, { scale: '1' }], { duration: 600, easing: 'cubic-bezier(.16,1,.3,1)' });
    if (r?.coins) flyCoins(rect, light ? 1 : 3, (i) => (sfx.pop(), i === 0 ? onLand?.() : undefined));
    else
      flyIcons(
        rect,
        icon(r),
        1,
        '[data-inv-target]',
        () => {
          sfx.pop();
          onLand?.();
        },
        34,
      );
  };

  const claim = async (tr: number, prem: boolean, r: Reward) => {
    if (busy) return;
    setBusy(true);
    try {
      const res = (await passApi.claim(tr, prem)) as { state: object };
      sfx.upgrade();
      // la case passe à « récupérée » tout de suite, l'effet se joue sur la nouvelle case
      qc.setQueryData(['pass', user.id], (o: PassState | undefined) =>
        o ? (prem ? { ...o, pclaimed: [...o.pclaimed, tr] } : { ...o, claimed: [...o.claimed, tr] }) : o,
      );
      await frame();
      let done = false;
      const apply = () => {
        if (done) return;
        done = true;
        qc.setQueryData(['me', user.id], (old: object | undefined) => ({ ...old, ...res.state }));
      };
      setTimeout(apply, 2500);
      burst(tileOf(tr, prem), r, prem, false, apply);
      void qc.invalidateQueries({ queryKey: ['items'] });
    } catch (e) {
      sfx.deny();
      toast(errorText(e, lang), true);
    } finally {
      setBusy(false);
    }
  };

  // tout récupérer : la route défile toute seule et les cases éclatent l'une après l'autre, de plus en plus vite
  const claimAll = async () => {
    if (busy) return;
    setBusy(true);
    const todo = d.tiers.flatMap((x) =>
      [false, true]
        .filter((p) => x.t <= tier && (p ? x.prem && d.premium : x.free) && !(p ? d.pclaimed : d.claimed).includes(x.t))
        .map((p) => [x.t, p, p ? x.prem : x.free] as const),
    );
    try {
      const r = (await passApi.claimAll()) as { claimed: number; state: object };
      const box = list.current;
      // la caméra suit : la route est d'abord ramenée à l'écran, puis elle glisse en douceur vers chaque case
      box?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      const cam = { x: box?.scrollLeft ?? 0, to: box?.scrollLeft ?? 0, on: true };
      const follow = () => {
        if (!box || !cam.on) return;
        cam.x += (cam.to - cam.x) * 0.16;
        box.scrollLeft = cam.x;
        requestAnimationFrame(follow);
      };
      requestAnimationFrame(follow);
      // position du palier dans la route (la case est placée dans sa colonne : on prend la colonne)
      const aim = (tile: HTMLElement | null | undefined) => {
        const col = tile?.closest('li');
        if (!box || !col) return;
        if (box.scrollWidth <= box.clientWidth + 1) {
          // téléphone : la route est verticale, c'est la page qui suit
          col.scrollIntoView({ block: 'center', behavior: 'smooth' });
          return;
        }
        const max = box.scrollWidth - box.clientWidth;
        cam.to = Math.min(max, Math.max(0, col.offsetLeft - box.clientWidth / 2 + col.offsetWidth / 2));
      };
      aim(todo[0] ? tileOf(todo[0][0], todo[0][1]) : null);
      await wait(400);
      // de plus lent à plus vite, et tout le passe tient en ~10 s maximum (attentes du début et de la fin comprises)
      const w = todo.map((_, i) => Math.max(0.25, 0.88 ** i));
      const k = Math.min(
        320,
        8500 /
          Math.max(
            1,
            w.reduce((a, b) => a + b, 0),
          ),
      );
      let i = 0;
      for (const [tr, p, rw] of todo) {
        const gap = (w[i++] ?? 0.25) * k;
        aim(tileOf(tr, p));
        qc.setQueryData(['pass', user.id], (o: PassState | undefined) =>
          o ? (p ? { ...o, pclaimed: [...o.pclaimed, tr] } : { ...o, claimed: [...o.claimed, tr] }) : o,
        );
        await frame();
        burst(tileOf(tr, p), rw, p, true);
        sfx.click();
        await wait(gap);
      }
      await wait(300);
      cam.on = false;
      sfx.upgrade();
      await wait(700);
      qc.setQueryData(['me', user.id], (old: object | undefined) => ({ ...old, ...r.state }));
      void q.refetch();
      void qc.invalidateQueries({ queryKey: ['items'] });
    } catch (err) {
      sfx.deny();
      toast(errorText(err, lang), true);
    } finally {
      setBusy(false);
    }
  };

  const vFree = d.tiers.reduce((x, r) => x + worth(r.free), 0),
    vPrem = d.tiers.reduce((x, r) => x + worth(r.prem), 0);
  const ready = (prem: boolean) =>
    d.tiers.filter((x) => x.t <= tier && (prem ? x.prem : x.free) && !(prem ? d.pclaimed : d.claimed).includes(x.t))
      .length;
  const nReady = ready(false) + (d.premium ? ready(true) : 0);
  const into = tier >= 50 ? XP_TIER : d.xp % XP_TIER;
  const pct = (into / XP_TIER) * 100;
  const nextT = d.tiers.find((x) => x.t === Math.min(50, tier + 1));

  const tile = (tr: number, r: Reward, prem: boolean) => {
    if (!r) return <span className={`${s.tile} ${s.none}`} aria-hidden />;
    const got = (prem ? d.pclaimed : d.claimed).includes(tr),
      open = tr <= tier,
      locked = prem && !d.premium,
      can = open && !got && !locked;
    const cls = [
      s.tile,
      prem && s.gold,
      got && s.got,
      can && s.ready,
      isCosmetic(r) && s.rare,
      !open && s.future,
      locked && s.locked,
    ]
      .filter(Boolean)
      .join(' ');
    const body = (
      <>
        <span className={s.art}>
          <img
            className={`px ${r.item?.startsWith('b_') ? s.wide : r.item?.startsWith('a_') ? s.round : ''}`}
            src={icon(r)}
            alt=""
          />
        </span>
        <b className={s.amt}>{amount(r) || '\u00a0'}</b>
        <small className={s.lbl}>{name(r)}</small>
        {isCosmetic(r) ? <em className={s.excl}>Exclusif</em> : null}
        {got ? (
          <i className={s.check} aria-hidden>
            ✓
          </i>
        ) : locked ? (
          <i className={s.lock} aria-hidden />
        ) : null}
      </>
    );
    // à récupérer : un clic la prend ; sinon un clic ouvre la fenêtre qui explique la récompense
    return (
      <button
        type="button"
        className={cls}
        data-k={`${tr}-${prem ? 1 : 0}`}
        disabled={can && busy}
        onClick={() => (can ? void claim(tr, prem, r) : (sfx.click(), setInfo({ t: tr, prem })))}
      >
        {/* nom lu par les lecteurs d'écran, puis ce qui est écrit dans la case */}
        {can ? <span className="visually-hidden">{t('ui.bp_claim')} · </span> : null}
        {body}
      </button>
    );
  };

  // fenêtre d'un palier
  const infoTier = info ? d.tiers.find((x) => x.t === info.t) : undefined;
  const infoR: Reward = info && infoTier ? (info.prem ? infoTier.prem : infoTier.free) : null;
  const infoGot = !!info && (info.prem ? d.pclaimed : d.claimed).includes(info.t);
  const infoItem = ITEMS[infoR?.item ?? ''];
  const infoDesc = !infoR
    ? ''
    : infoR.coins
      ? 'Des pièces ajoutées à ton solde : pour la boutique et les améliorations.'
      : infoItem?.kind === 'avatar'
        ? 'Une photo de profil exclusive de cette saison. Elle ne sera jamais vendue en boutique.'
        : infoItem?.kind === 'banner'
          ? 'Une bannière de profil exclusive de cette saison. Elle ne sera jamais vendue en boutique.'
          : infoItem
            ? (itemText(infoItem, lang)[1] ?? '')
            : '';
  const infoState = !info
    ? ''
    : infoGot
      ? '✓ Déjà récupéré'
      : info.prem && !d.premium
        ? 'Réservé au passe premium'
        : info.t <= tier
          ? 'Prêt à récupérer'
          : `Encore ${n((info.t - 1) * XP_TIER + XP_TIER - d.xp)} XP pour l’atteindre`;

  // la prochaine récompense en grand, dans la carte du haut (gratuite, et premium en doré)
  const peek = (r: Reward, prem: boolean) =>
    r ? (
      <span className={`${s.nx} ${prem ? s.nxGold : ''}`}>
        <span className={s.nxArt}>
          <img
            className={`px ${r.item?.startsWith('b_') ? s.wide : r.item?.startsWith('a_') ? s.round : ''}`}
            src={icon(r)}
            alt=""
          />
        </span>
        <b>{amount(r) || '\u00a0'}</b>
        <small>{name(r)}</small>
        {prem && !d.premium ? <i className={s.lock} aria-hidden /> : null}
      </span>
    ) : null;

  return (
    <section ref={pageRef} className={s.page}>
      <header className={s.head} data-tour="pass">
        <h1>{t('ui.bp_title')}</h1>
        <span className={s.chip}>{t('ui.bp_season', { n: d.season })}</span>
        <span className={s.chip}>
          <b>{t('ui.bp_ends', { n: days })}</b>
        </span>
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
      </header>

      {tab === 'rewards' ? (
        <>
          <div className={s.top}>
            {/* ta progression : grand palier, barre d'XP qui glisse, et ce que tu gagnes au prochain */}
            <div className={s.hero}>
              <PixelBg className={s.heroBg} odds={1000 + tier * 2000} glow="#3966f7" still={reducedFx()} />
              <div className={s.lvl}>
                <small>Palier</small>
                <b>
                  <Tween value={tier} ms={900} format={(v) => String(Math.round(v))} />
                </b>
                <small>/ 50</small>
              </div>
              <div className={s.heroInfo}>
                <div
                  className={s.bar}
                  role="progressbar"
                  aria-label={t('ui.bp_xp')}
                  aria-valuemin={0}
                  aria-valuemax={XP_TIER}
                  aria-valuenow={into}
                >
                  <i style={{ width: `${pct}%` }} />
                </div>
                <p className={s.xpTxt}>
                  <b>
                    <Tween value={into} ms={1200} pow={4} format={(v) => n(Math.round(v))} />
                  </b>{' '}
                  / {n(XP_TIER)} XP
                  <span>{tier >= 50 ? t('ui.bp_done') : t('ui.bp_next', { n: n(XP_TIER - into), t: tier + 1 })}</span>
                </p>
                <div className={s.actions}>
                  {nReady > 0 ? (
                    <Button variant="primary" onClick={() => void claimAll()} disabled={busy}>
                      Tout récupérer · {nReady}
                    </Button>
                  ) : null}
                </div>
              </div>
              {nextT && tier < 50 ? (
                <div className={s.nexts} aria-label={t('ui.bp_next', { n: n(XP_TIER - into), t: tier + 1 })}>
                  {peek(nextT.free, false)}
                  {peek(nextT.prem, true)}
                </div>
              ) : null}
            </div>
            {/* le premium de la saison : la photo exclusive flotte, la valeur des deux pistes comparée */}
            <button type="button" className={s.prem} onClick={() => setPremOpen(true)}>
              <span className={s.ppWrap}>
                <img className={`px ${s.premPp}`} src="/img/pp/oeil.png" alt="" />
              </span>
              <b>{t('ui.bp_prem')}</b>
              <span className={s.premVal}>
                <img className="px" src="/img/piece.png" alt="" width={18} height={18} />
                {n(vPrem)}
                <em>×{Math.max(1, Math.round(vPrem / Math.max(1, vFree)))}</em>
              </span>
              <small>{d.premium ? `✓ ${t('ui.bp_prem_owned')}` : t('ui.pk_soon')}</small>
            </button>
          </div>

          <div className={s.board}>
            <div className={s.rows} aria-hidden>
              <span className={s.rowGold}>{t('ui.bp_prem_short')}</span>
              <span>{t('ui.bp_free')}</span>
            </div>
            {/* les 50 paliers : premium en haut, numéro sur la ligne de progression, gratuit en bas */}
            {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- liste qui défile au clavier */}
            <ol ref={list} className={s.track} tabIndex={0} aria-label={t('ui.bp_title')}>
              {d.tiers.map((x) => {
                // remplissage de la ligne jusqu'à ce palier : plein si atteint, en partie pour le prochain
                const f = x.t <= tier ? 1 : x.t === tier + 1 ? pct / 100 : 0;
                return (
                  <li
                    key={x.t}
                    className={x.t <= tier ? s.reached : undefined}
                    aria-current={x.t === Math.min(50, tier + 1) ? 'step' : undefined}
                    style={{ '--f': f } as CSSProperties}
                  >
                    {tile(x.t, x.prem, true)}
                    <span className={s.num}>{x.t}</span>
                    {tile(x.t, x.free, false)}
                  </li>
                );
              })}
            </ol>
          </div>

          {/* fenêtre d'un palier : ce que c'est, combien, et où on en est */}
          <Modal open={!!infoR} onClose={() => setInfo(null)} title={info ? `Palier ${info.t}` : ''}>
            {info && infoR ? (
              <div className={`${s.info} ${info.prem ? s.infoGold : ''}`}>
                <div className={s.infoArt}>
                  <span>
                    <img
                      className={`px ${infoR.item?.startsWith('b_') ? s.wide : infoR.item?.startsWith('a_') ? s.round : ''}`}
                      src={icon(infoR)}
                      alt=""
                    />
                  </span>
                </div>
                <div className={s.infoTxt}>
                  <span className={s.infoTag}>{info.prem ? t('ui.bp_prem_short') : t('ui.bp_free')}</span>
                  <h3>{label(infoR)}</h3>
                  <p>{infoDesc}</p>
                  <p className={`${s.infoState} ${infoGot ? s.ok : ''}`}>{infoState}</p>
                </div>
              </div>
            ) : null}
          </Modal>

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
                  <img className={`px ${s.premBan}`} src="/img/bannieres/yeux.png" alt="" />
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
