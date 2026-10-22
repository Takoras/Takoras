import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link, NavLink } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { combatApi, errorText, invApi } from '@/api';
import {
  hexRGB,
  sellValue,
  SERIES,
  texOf,
  tierCol,
  tierKey,
  vImg,
  vOdds,
  VARIANTS,
  type Tier,
  type Variant,
} from '@/data/jetons';
import { statsOf, fmtLuck } from '@/engines/env';
import { moPlay, moSnap } from '@/engines/motion.js';
import { sfx } from '@/engines/sound.js';
import { openUI } from '@/app/ui-store';
import { useAuth } from '@/lib/auth';
import { useJn } from '@/lib/names';
import { locale, useSettings } from '@/lib/settings';
import { useT } from '@/i18n/useT';
import { Button } from '@/ui/Button';
import { confirm } from '@/ui/confirm';
import { toast } from '@/ui/toast';
import { VTag } from '@/ui/VTag';
import { CombatInfo, JetonModal } from './JetonModal';
import {
  cKey,
  levelInfo,
  lvlOf,
  needsConfirm,
  quickSelect,
  selTotals,
  seriesList,
  useInventory,
  visibleCards,
  VKEYS,
  type Card,
  type Coll,
  type Group,
  type Sort,
  type View,
} from './inv';
import s from './Inventory.module.css';

const TIERS: ('all' | Tier)[] = ['all', 'r_common', 'r_rare', 'r_epic', 'r_legend', 'r_myth'];
const SORTS: Sort[] = ['rarity', 'count', 'recent', 'name'];
const Coin = () => <img className={`px ${s.coin}`} src="/img/piece.png" alt="" width={14} height={14} />;

// Les deux onglets du menu Inventaire
export function InvTabs() {
  const t = useT();
  return (
    <nav className={s.tabs} aria-label={t('ui.nav_inv')}>
      <NavLink to="/inventaire" end>
        {t('ui.bestiary')}
      </NavLink>
      <NavLink to="/inventaire/objets">{t('ui.items')}</NavLink>
    </nav>
  );
}
export function NeedLogin({ title }: { title: string }) {
  const t = useT();
  return (
    <section className={s.empty}>
      <h1>{title}</h1>
      <p className="muted">{t('ui.acc_need')}</p>
      <Button variant="primary" onClick={() => openUI('account')}>
        {t('ui.login')}
      </Button>
    </section>
  );
}

// Bestiaire : tous les jetons d'une collection (silhouette si jamais trouvés), et la vente
export default function Bestiary() {
  const t = useT();
  const jn = useJn();
  const lang = useSettings((x) => x.lang);
  const user = useAuth((x) => x.user);
  const qc = useQueryClient();
  const inv = useInventory();
  const fmt = (n: number) => n.toLocaleString(locale(lang));
  const [view, setView] = useState<View>({
    serie: seriesList()[0] ?? 'Takoras',
    vtab: '',
    tier: 'all',
    own: false,
    q: '',
    sort: 'rarity',
  });
  const [selecting, setSelecting] = useState(false);
  const [sel, setSel] = useState<Map<string, number>>(new Map());
  const [open, setOpen] = useState<{ name: string; key: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const grid = useRef<HTMLUListElement>(null);
  const snap = useRef<{ m: Map<string, DOMRect>; dissolve: boolean } | null>(null);

  const d = inv.data;
  const cards = useMemo(() => (d ? visibleCards(d, view, jn) : []), [d, view, jn]);
  // Animation de la grille après une vente / un filtre (les jetons vendus se dissolvent en pixels)
  useLayoutEffect(() => {
    if (snap.current && grid.current)
      moPlay(snap.current.m, grid.current, '[data-key]', { dissolve: snap.current.dissolve });
    snap.current = null;
  }, [cards]);
  const remember = (dissolve = false) => {
    if (grid.current) snap.current = { m: moSnap(grid.current, '[data-key]'), dissolve };
  };
  const set = (p: Partial<View>) => {
    remember();
    setView((v) => ({ ...v, ...p }));
  };

  if (!user) return <NeedLogin title={t('ui.bst_title')} />;
  if (inv.isError) return <p className="muted">{t('ui.err_generic')}</p>;

  const groups = d?.groups.filter((g) => g.serie === view.serie) ?? [];
  const all = SERIES[view.serie] ?? [];
  const count = groups.reduce((n, g) => n + g.ids.length, 0);
  const value = groups.reduce((n, g) => n + g.ids.length * sellValue(g.odds, g.variant), 0);
  const found = d ? all.filter((j) => d.coll.has(cKey(view.serie, j.name))).length : 0;
  const vFound = d
    ? all.reduce((n, j) => n + VKEYS.filter((v) => d.coll.get(cKey(view.serie, j.name))?.vars[v]).length, 0)
    : 0;
  const vAll = all.length * VKEYS.length;
  const tot = selTotals(groups, sel);
  const series = seriesList();

  const refresh = async (dissolve: boolean) => {
    remember(dissolve);
    await inv.refetch();
  };
  const sell = async (ids: number[]) => {
    if (!ids.length || !d) return false;
    const set_ = new Set(ids);
    const v = d.groups.reduce(
      (n, g) => n + g.ids.filter((id) => set_.has(id)).length * sellValue(g.odds, g.variant),
      0,
    );
    if (
      needsConfirm(d.groups, ids) &&
      !(await confirm(t('ui.sell_rare_confirm', { n: ids.length, v: fmt(v) }), { danger: true, ok: t('ui.sell') }))
    )
      return false;
    try {
      const r = (await invApi.sell(ids)) as { sold: number; coins: number; state: unknown };
      qc.setQueryData(['me', user.id], r.state);
      sfx.upgrade();
      toast(`${t('ui.sold', { n: r.sold })} · +${fmt(r.coins)}`);
      void qc.invalidateQueries({ queryKey: ['history'] });
      return true;
    } catch (e) {
      sfx.deny();
      toast(errorText(e, lang), true);
      return false;
    }
  };
  const sellSelected = async () => {
    setBusy(true);
    if (await sell(tot.ids)) {
      setSel(new Map());
      setSelecting(false);
      await refresh(true);
    }
    setBusy(false);
  };
  const toggleMode = () => {
    sfx.click();
    if (selecting) setSel(new Map());
    else set({ own: true });
    setSelecting(!selecting);
  };
  const tap = (c: Card, step?: number) => {
    sfx.click();
    const g = c.g;
    if (selecting) {
      if (!g) return;
      if (!g.free.length) return toast(t('ui.inv_locked'), true);
      const cur = sel.get(g.key) ?? 0;
      const next = step ? Math.max(0, Math.min(g.free.length, cur + step)) : cur ? 0 : g.free.length;
      const m = new Map(sel);
      if (next) m.set(g.key, next);
      else m.delete(g.key);
      return setSel(m);
    }
    setOpen({ name: c.j.name, key: g?.key ?? '' });
  };

  const og = open && d ? d.groups.find((g) => g.key === open.key) : undefined;
  const oc = open && d ? d.coll.get(cKey(view.serie, open.name)) : undefined;
  return (
    <section className={`${s.page} ${selecting ? s.withBar : ''}`}>
      <header className={s.head}>
        <div>
          <p className="eyebrow">{t('ui.nav_inv')}</p>
          <h1>{t('ui.bst_title')}</h1>
          <p className="muted">
            {t('ui.inv_count', { n: fmt(count), k: groups.length })} · {t('ui.inv_value')} {fmt(value)} <Coin />
          </p>
        </div>
        <Button variant={selecting ? 'primary' : 'ghost'} onClick={toggleMode} aria-pressed={selecting}>
          {selecting ? t('ui.inv_done') : t('ui.inv_select')}
        </Button>
      </header>
      <InvTabs />
      {series.length > 1 ? (
        <div className={s.chips} role="group" aria-label={t('ui.bestiary')}>
          {series.map((x) => (
            <button
              key={x}
              type="button"
              aria-pressed={x === view.serie}
              onClick={() => {
                setSel(new Map());
                set({ serie: x });
              }}
            >
              {x}
            </button>
          ))}
        </div>
      ) : null}
      <div className={s.progress}>
        <div>
          <b>
            {found}/{all.length}
          </b>{' '}
          <span className="muted">{t('ui.bst_found')}</span>
          <span className={s.bar}>
            <i style={{ width: `${(found / (all.length || 1)) * 100}%` }} />
          </span>
        </div>
        <div>
          <b>
            {vFound}/{vAll}
          </b>{' '}
          <span className="muted">{t('ui.bst_variants')}</span>
          <span className={`${s.bar} ${s.vbar}`}>
            <i style={{ width: `${(vFound / (vAll || 1)) * 100}%` }} />
          </span>
        </div>
      </div>
      <div className={s.vtabs} role="tablist" aria-label={t('ui.v_none')}>
        {(['', ...VKEYS] as const).map((v) => (
          <button
            key={v || 'none'}
            type="button"
            role="tab"
            aria-selected={view.vtab === v}
            className={v ? s[`v_${v}`] : undefined}
            onClick={() => {
              if (v !== view.vtab) {
                sfx.click();
                setSel(new Map());
                set({ vtab: v });
              }
            }}
          >
            {v ? t(`ui.v_${v}`) : t('ui.v_none')}
            <small>{groups.filter((g) => g.variant === v).reduce((n, g) => n + g.ids.length, 0)}</small>
          </button>
        ))}
      </div>
      <div className={s.tools}>
        <div className={s.chips} role="group" aria-label={t('ui.sort_rarity')}>
          {TIERS.map((k) => (
            <button key={k} type="button" aria-pressed={view.tier === k} onClick={() => set({ tier: k })}>
              {t(k === 'all' ? 'ui.all' : `ui.${k}`)}
            </button>
          ))}
          <button type="button" aria-pressed={view.own} onClick={() => set({ own: !view.own })}>
            ✓ {t('ui.bst_owned_only')}
          </button>
        </div>
        <div className={s.right}>
          <input
            type="search"
            value={view.q}
            onChange={(e) => set({ q: e.target.value.trim() })}
            placeholder={t('ui.search')}
            aria-label={t('ui.search')}
          />
          <select
            value={view.sort}
            onChange={(e) => set({ sort: e.target.value as Sort })}
            aria-label={t('ui.sort_rarity')}
          >
            {SORTS.map((k) => (
              <option key={k} value={k}>
                {t(`ui.sort_${k}`)}
              </option>
            ))}
          </select>
        </div>
      </div>
      {!d ? (
        <p className="muted" aria-busy>
          …
        </p>
      ) : cards.length ? (
        <ul ref={grid} className={s.grid}>
          {cards.map((c) => (
            <CardView
              key={c.j.name}
              c={c}
              vtab={view.vtab}
              lvl={lvlOf(d, view.serie, c.j.name)}
              q={c.g ? (sel.get(c.g.key) ?? 0) : 0}
              selecting={selecting}
              onTap={tap}
            />
          ))}
        </ul>
      ) : (
        <div className={s.empty}>
          <p className="muted">{t(view.own ? 'ui.inv_empty' : 'ui.bst_none')}</p>
          <Link className={s.link} to="/">
            {t('ui.nav_home')}
          </Link>
        </div>
      )}
      {selecting ? (
        <div className={s.sellBar} role="region" aria-label={t('ui.sell')}>
          <p>
            <b>{t('ui.sel_n', { n: tot.n })}</b>
            {tot.n ? (
              <span>
                {' '}
                · +{fmt(tot.v)} <Coin />
              </span>
            ) : null}
          </p>
          <div>
            {(['dupes', 'common', 'all'] as const).map((q) => (
              <Button
                key={q}
                size="sm"
                onClick={() => {
                  sfx.click();
                  setSel(quickSelect(cards, q));
                }}
              >
                {t(`ui.sel_${q}`)}
              </Button>
            ))}
            <Button size="sm" onClick={() => setSel(new Map())}>
              {t('ui.sel_none')}
            </Button>
            <Button variant="primary" disabled={!tot.n} loading={busy} onClick={() => void sellSelected()}>
              {t('ui.sell')}
            </Button>
          </div>
        </div>
      ) : null}
      {open && d ? (
        <JetonModal
          name={open.name}
          serie={view.serie}
          variant={og ? og.variant : view.vtab}
          lvl={lvlOf(d, view.serie, open.name)}
          locked={!og && !oc}
          onClose={() => setOpen(null)}
        >
          {!og && !oc ? (
            <p className="muted">🔒 {t('ui.bst_unknown')}</p>
          ) : (
            <Sheet
              g={og}
              c={oc}
              name={open.name}
              serie={view.serie}
              vtab={view.vtab}
              onSell={async (ids) => {
                if (await sell(ids)) {
                  setOpen(null);
                  await refresh(true);
                }
              }}
              onLock={async (g, lock) => {
                try {
                  await invApi.lock(g.ids, lock);
                  toast(lock ? t('ui.locked_ok') : t('ui.unlocked'));
                } catch (e) {
                  toast(errorText(e, lang), true);
                }
                setOpen(null);
                await refresh(false);
              }}
              onLevel={async () => {
                try {
                  const r = (await combatApi.levelUp(open.name, view.serie)) as { lvl: number };
                  sfx.upgrade();
                  toast(`⬆️ ${t('arena.lvlOk', { j: jn(open.name), n: r.lvl })}`);
                  setOpen(null);
                  await refresh(true);
                } catch (e) {
                  sfx.deny();
                  toast(errorText(e, lang), true);
                }
              }}
            />
          )}
        </JetonModal>
      ) : null}
    </section>
  );
}

function CardView({
  c,
  vtab,
  lvl,
  q,
  selecting,
  onTap,
}: {
  c: Card;
  vtab: string;
  lvl: number;
  q: number;
  selecting: boolean;
  onTap: (c: Card, step?: number) => void;
}) {
  const t = useT();
  const jn = useJn();
  const lang = useSettings((x) => x.lang);
  const fmt = (n: number) => n.toLocaleString(locale(lang));
  const { j, g } = c,
    n = g?.ids.length ?? 0,
    locked = !!g && !g.free.length;
  const tier = tierKey(j.odds);
  const badge = g?.deck
    ? ['⚔️', t('ui.in_deck')]
    : g?.shown
      ? ['📌', t('ui.in_showcase')]
      : locked
        ? ['🔒', t('ui.lock')]
        : null;
  const label = g ? `${jn(j.name)} ×${n}` : c.seen ? `${jn(j.name)} ×0` : `#${c.num} ${t('ui.bst_unknown')}`;
  return (
    <li
      data-key={c.j.name}
      data-sig={`${n}|${locked}|${g?.deck ?? 0}|${g?.shown ?? 0}`}
      style={{ '--g': hexRGB(j.glow) } as CSSProperties}
      className={[s.card, !g && (c.seen ? s.gone : s.unk), q && s.sel, locked && s.locked].filter(Boolean).join(' ')}
    >
      <button
        type="button"
        className={s.cardBtn}
        onClick={() => onTap(c)}
        aria-label={label}
        aria-pressed={selecting && g ? q > 0 : undefined}
      >
        <span className={s.num}>#{String(c.num).padStart(2, '0')}</span>
        {g ? <span className={s.count}>×{n}</span> : null}
        {badge ? (
          <span className={s.badge} title={badge[1]}>
            {badge[0]}
          </span>
        ) : null}
        <img className={`${g || c.seen ? vImg(vtab) : `px ${s.sil}`}`} src={texOf(j)} alt="" />
        <b>{g || c.seen ? jn(j.name) : '???'}</b>
        <small>
          <span style={{ color: tierCol(tier) }}>1/{fmt(vOdds(j.odds, vtab))}</span>
          {g ? ` · ⚡${fmt(statsOf(j.name, j.odds, vtab, lvl).power)}` : c.seen ? ' · ×0' : ''}
        </small>
      </button>
      {selecting && g && g.free.length ? (
        <div className={s.step}>
          <button type="button" onClick={() => onTap(c, -1)} aria-label={`− ${jn(j.name)}`}>
            −
          </button>
          <span>
            {q}/{g.free.length}
          </span>
          <button type="button" onClick={() => onTap(c, 1)} aria-label={`+ ${jn(j.name)}`}>
            +
          </button>
        </div>
      ) : null}
    </li>
  );
}

// Contenu de la fiche dans le bestiaire : combien j'en ai, variantes trouvées, combat, actions
function Sheet({
  g,
  c,
  name,
  serie,
  vtab,
  onSell,
  onLock,
  onLevel,
}: {
  g?: Group;
  c?: Coll;
  name: string;
  serie: string;
  vtab: string;
  onSell: (ids: number[]) => Promise<void>;
  onLock: (g: Group, lock: boolean) => Promise<void>;
  onLevel: () => Promise<void>;
}) {
  const t = useT();
  const lang = useSettings((x) => x.lang);
  const inv = useInventory();
  const [busy, setBusy] = useState('');
  const fmt = (n: number) => n.toLocaleString(locale(lang));
  const run = (k: string, f: () => Promise<void>) => async () => {
    setBusy(k);
    await f();
    setBusy('');
  };
  const d = inv.data;
  if (!d) return null;
  const lv = levelInfo(d, serie, name);
  const allLocked = !!g && !g.free.length;
  return (
    <>
      <p className="muted">
        {t('ui.inv_have', { n: g?.ids.length ?? 0 })}
        {g?.shown ? ` · 📌 ${t('ui.shown_n', { n: g.shown })}` : ''}
        {c ? ` · ${t('ui.bst_got', { n: c.total })}` : ''}
        {g && g.luck > 1 ? ` · 🍀 ${t('ui.best_luck', { l: fmtLuck(g.luck) })}` : ''}
      </p>
      {c ? (
        <ul className={s.vlist} aria-label={t('ui.bst_variants')}>
          {VKEYS.map((v) => (
            <li key={v} className={c.vars[v] ? s.on : undefined}>
              {c.vars[v] ? (
                <VTag v={v} />
              ) : (
                <span className="muted">
                  {t(`ui.v_${v}`)} · 1/{fmt(VARIANTS[v as Variant].odds)}
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : null}
      <CombatInfo name={name} lvl={lv.L} variant={g?.variant ?? vtab}>
        {lv.owned ? (
          lv.L >= 10 ? (
            <small className="muted">{t('arena.lvlMax')}</small>
          ) : (
            <>
              <Button size="sm" disabled={!lv.can} loading={busy === 'lvl'} onClick={run('lvl', onLevel)}>
                ⬆️ {t('arena.lvlUp', { n: lv.L + 1 })} · {t('arena.lvlCost', { n: lv.L })}
              </Button>
              {lv.can ? null : <small className="muted">{t('arena.lvlNeed', { n: lv.L, h: lv.have })}</small>}
            </>
          )
        ) : null}
      </CombatInfo>
      {g ? (
        <div className={s.actions}>
          {g.free.length && g.free[0] !== undefined ? (
            <Button
              variant="primary"
              loading={busy === 'one'}
              onClick={run('one', () => onSell([g.free[0] as number]))}
            >
              {t('ui.sell_one')} · +{fmt(sellValue(g.odds, g.variant))} <Coin />
            </Button>
          ) : null}
          {g.free.length > 1 ? (
            <Button loading={busy === 'dupes'} onClick={run('dupes', () => onSell(g.free.slice(0, g.ids.length - 1)))}>
              {t('ui.sell_dupes', { n: g.ids.length - 1 })}
            </Button>
          ) : null}
          <Button loading={busy === 'lock'} onClick={run('lock', () => onLock(g, !allLocked))}>
            {allLocked ? `🔓 ${t('ui.unlock')}` : `🔒 ${t('ui.lock')}`}
          </Button>
        </div>
      ) : null}
    </>
  );
}
