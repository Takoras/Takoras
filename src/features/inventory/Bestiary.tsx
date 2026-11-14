import { PULLS, serieTheme } from '@/engines/env';
import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { SerieName } from '@/ui/SerieName';
import { Link, NavLink } from 'react-router';
import { NeedLogin } from '@/app/NeedLogin';
import { useQueryClient } from '@tanstack/react-query';
import { errorText, invApi } from '@/api';
import { MYSTERE, sellValue, SERIES, texOf, glowVars, jetonOf, TEMPLATE } from '@/data/jetons';
import { fmtLuck } from '@/engines/env';
import { moPlay, moSnap } from '@/engines/motion.js';
import { sfx } from '@/engines/sound.js';
import { useAuth } from '@/lib/auth';
import { useJn } from '@/lib/names';
import { locale, useSettings } from '@/lib/settings';
import { useT } from '@/i18n/useT';
import { Button } from '@/ui/Button';
import { confirm } from '@/ui/confirm';
import { toast } from '@/ui/toast';
import { JetonModal } from './JetonModal';
import { useSwingAll } from '@/ui/useSwing';
import { useStaggerIn } from '@/ui/useStaggerIn';
import { Tween } from '@/ui/Tween';

const rnd = (n: number) => String(Math.round(n));
import { BoardSection } from '../board/Board';
import {
  cKey,
  gKey,
  needsConfirm,
  quickSelect,
  selTotals,
  seriesList,
  useInventory,
  visibleCards,
  VKEYS,
  type Card,
  type Group,
  type Sort,
  type View,
} from './inv';
import s from './Inventory.module.css';

const SORTS: Sort[] = ['rarity', 'count', 'recent', 'name'];
const Coin = () => <img className={`px ${s.coin}`} src="/img/piece.png" alt="" width={14} height={14} />;

// Les deux onglets du menu Inventaire
export function InvTabs() {
  const t = useT();
  const ref = useRef<HTMLElement>(null);
  useSwingAll(ref, 'a', 0.5); // les onglets penchent et se balancent au passage de la souris
  return (
    <nav ref={ref} className={s.tabs} aria-label={t('ui.nav_inv')}>
      <NavLink to="/inventory" end>
        {t('ui.bestiary')}
      </NavLink>
      <NavLink to="/inventory/items">{t('ui.items')}</NavLink>
    </nav>
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
    mut: false,
    q: '',
    sort: 'rarity',
  });
  const [selecting, setSelecting] = useState(false);
  const [sel, setSel] = useState<Map<string, number>>(new Map());
  // fiche ouverte : le jeton et la mutation montrée (les boutons de vente suivent le tampon touché)
  const [open, setOpen] = useState<{ name: string; v: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const grid = useRef<HTMLUListElement>(null);
  // étagères et filtres : ils penchent, flottent et se balancent comme les blocs de l'accueil
  const shelvesRef = useRef<HTMLDivElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  useSwingAll(shelvesRef, `.${s.shelf}`, 0.4);
  useSwingAll(chipsRef, 'button', 0.5);
  const snap = useRef<{ m: Map<string, DOMRect>; dissolve: boolean } | null>(null);

  const d = inv.data;
  // comme l'accueil et le combat : la page attend sa collection, ses images et ses polices, puis apparaît bloc par bloc
  const pageRef = useRef<HTMLElement>(null);
  useStaggerIn(pageRef, `.${s.head}, .${s.tabs}, .${s.shelves}, .${s.progress}, .${s.tools}`, !!d);
  const cards = useMemo(() => (d ? visibleCards(d, view, jn) : []), [d, view, jn]);
  // les jetons se balancent au survol, accrochés par le haut (rattaché quand la liste change)
  useSwingAll(grid, `.${s.cardBtn}`, 0.35, cards);
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
  // tant que la collection n'est pas arrivée : rien (sinon la page s'affichait vide puis tout sautait en place)
  if (!d) return <section ref={pageRef} className={s.page} aria-busy />;

  const groups = d?.groups.filter((g) => g.serie === view.serie) ?? [];
  const all = SERIES[view.serie] ?? [];
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
    // on ouvre sur les normaux, ou sur la première mutation qu'on possède
    setOpen({ name: c.j.name, v: g ? '' : (VKEYS.find((k) => c.vs[k]) ?? '') });
  };

  const og = open && d ? d.groups.find((g) => g.key === gKey(view.serie, open.name, open.v)) : undefined;
  const oc = open && d ? d.coll.get(cKey(view.serie, open.name)) : undefined;
  return (
    <section ref={pageRef} className={`${s.page} ${selecting ? s.withBar : ''}`}>
      <header className={s.head} data-tour="inv">
        <div>
          <h1>{t('ui.bst_title')}</h1>
        </div>
        <Button variant={selecting ? 'primary' : 'ghost'} onClick={toggleMode} aria-pressed={selecting}>
          {selecting ? t('ui.inv_done') : t('ui.inv_select')}
        </Button>
      </header>
      <InvTabs />
      {/* étagères : une carte par série (pull) + la prochaine série à venir */}
      <div ref={shelvesRef} className={s.shelves} role="group" aria-label={t('arena.serie')}>
        {series.map((x) => {
          const js = SERIES[x] ?? [],
            f = d ? js.filter((j) => d.coll.has(cKey(x, j.name))).length : 0;
          return (
            <button
              key={x}
              type="button"
              className={s.shelf}
              aria-pressed={x === view.serie}
              onClick={() => {
                setSel(new Map());
                set({ serie: x });
              }}
            >
              <img
                className="px"
                src={PULLS.find((p) => p.name === x)?.img ?? texOf(js[0] ?? jetonOf('Mobu'))}
                alt=""
              />
              <span>
                <b>
                  <SerieName name={x} h="1.4em" />
                </b>
                <small>{`${f} / ${js.length}`}</small>
              </span>
            </button>
          );
        })}
        <div className={`${s.shelf} ${s.shelfSoon}`} aria-disabled="true">
          <img className="px" src={TEMPLATE} alt="" />
          <span>
            <b>{t('ui.bst_next')}</b>
            <small>{t('ui.pk_soon')}</small>
          </span>
        </div>
      </div>
      {/* barres de la collection à la couleur de la série (bleu Takoras, vert Bodako…) */}
      <div
        className={s.progress}
        style={{ '--sc': serieTheme(view.serie).main, '--sc-hi': serieTheme(view.serie).hi } as CSSProperties}
      >
        <div>
          <b>
            {/* en changeant de série, les chiffres défilent jusqu'aux nouveaux (pas de saut) */}
            <Tween value={found} format={rnd} ms={700} />/<Tween value={all.length} format={rnd} ms={700} />
          </b>{' '}
          <span className="muted">{t('ui.bst_found')}</span>
          <span className={s.bar}>
            <i style={{ width: `${(found / (all.length || 1)) * 100}%` }} />
          </span>
        </div>
        <div>
          <b>
            <Tween value={vFound} format={rnd} ms={700} />/<Tween value={vAll} format={rnd} ms={700} />
          </b>{' '}
          <span className="muted">{t('ui.bst_variants')}</span>
          <span className={`${s.bar} ${s.vbar}`}>
            <i style={{ width: `${(vFound / (vAll || 1)) * 100}%` }} />
          </span>
        </div>
      </div>
      <div className={s.tools}>
        <div ref={chipsRef} className={s.chips} role="group" aria-label={t('ui.sort_rarity')}>
          <button type="button" aria-pressed={view.own} onClick={() => set({ own: !view.own })}>
            ✓ {t('ui.bst_owned_only')}
          </button>
          {/* seulement les jetons dont on a trouvé au moins une mutation */}
          <button type="button" aria-pressed={!!view.mut} onClick={() => set({ mut: !view.mut })}>
            ✦ {t('ui.bst_mut_only')}
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
          {cards.map((c, k) => (
            <CardView
              key={c.j.name}
              c={c}
              i={k}
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
          variant={open.v}
          onShow={(v) => setOpen((o) => (o ? { ...o, v } : o))}
          locked={!og && !oc}
          found={oc?.vars}
          facts={
            <>
              <li>{t('ui.inv_have', { n: og?.ids.length ?? 0 })}</li>
              {oc ? <li>{t('ui.bst_got', { n: oc.total })}</li> : null}
              {og?.shown ? <li>{t('ui.shown_n', { n: og.shown })}</li> : null}
              {/* la chance la plus basse avec laquelle il a été tiré : plus elle est basse, plus c'est fort */}
              {og && og.luck > 1 ? <li>{t('ui.best_luck', { l: fmtLuck(og.luck) })}</li> : null}
              {og && og.luck === 1 ? <li>{t('ui.best_luck_1')}</li> : null}
            </>
          }
          onClose={() => setOpen(null)}
        >
          {og ? (
            <Sheet
              g={og}
              onSell={async (ids) => {
                // la fiche reste ouverte et se met à jour (Tu en as N…)
                if (await sell(ids)) await refresh(true);
              }}
              onLock={async (g, lock) => {
                try {
                  await invApi.lock(g.ids, lock);
                  toast(lock ? t('ui.locked_ok') : t('ui.unlocked'));
                } catch (e) {
                  toast(errorText(e, lang), true);
                }
                await refresh(false);
              }}
            />
          ) : null}
        </JetonModal>
      ) : null}
      {/* classement du temps de jeu, tout en bas de l'inventaire */}
      <div className={s.boardBottom}>
        <BoardSection kind="time" title={t('ui.k_time')} />
      </div>
    </section>
  );
}

// Un jeton du bestiaire : une boîte légère, droite et posée (elle arrive juste en cascade) ;
// en dessous, ses 3 mutations en tampons (grisés tant qu'on ne les a pas)
function CardView({
  c,
  i,
  q,
  selecting,
  onTap,
}: {
  c: Card;
  i: number;
  q: number;
  selecting: boolean;
  onTap: (c: Card, step?: number) => void;
}) {
  const t = useT();
  const jn = useJn();
  const lang = useSettings((x) => x.lang);
  const fmt = (n: number) => n.toLocaleString(locale(lang));
  const { j, g } = c,
    n = c.total,
    locked = !!g && !g.free.length,
    all = [g, ...Object.values(c.vs)].filter((x): x is Group => !!x);
  // jamais trouvé : mystère total (fond gris neutre, pas de numéro, pas de rareté, pas de nom)
  const known = n > 0 || c.seen;
  const badge = all.some((x) => x.shown)
      ? ['', t('ui.in_showcase')]
      : locked
        ? ['', t('ui.lock')]
        : null;
  return (
    <li
      data-key={c.j.name}
      data-sig={`${n}|${locked}|${badge?.[1] ?? ''}`}
      style={(known ? glowVars(j) : { '--g': '113, 113, 122' }) as CSSProperties}
      className={['dd-card', s.card, !n && (c.seen ? s.gone : s.unk), q && s.sel, locked && s.locked].filter(Boolean).join(' ')}
    >
      <button
        type="button"
        className={s.cardBtn}
        style={{ '--i': Math.min(i, 24) } as CSSProperties}
        onClick={() => onTap(c)}
        aria-pressed={selecting && g ? q > 0 : undefined}
      >
        <span className={s.num}>#{known ? String(c.num).padStart(2, '0') : '?'}</span>
        {n ? <span className={s.count}>×{n}</span> : null}
        {badge ? (
          <span className={s.badge} title={badge[1]}>
            {badge[0]}
          </span>
        ) : null}
        <img className="px" src={known ? texOf(j) : MYSTERE} alt="" />
        <b>{known ? jn(j.name) : '???'}</b>
        {known ? <small>1/{fmt(j.odds)}</small> : <small>?</small>}
        {known ? (
          <span className={s.vstamps} aria-label={t('ui.bst_variants')}>
            {VKEYS.map((v) => (
              <i
                key={v}
                className={(c.found[v] ?? 0) > 0 ? undefined : s.vOff}
                title={t(`ui.v_${v}`)}
                style={{ backgroundImage: `url(/img/stamps/${v}.png)` }}
              />
            ))}
          </span>
        ) : null}
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

// Boutons de la fiche dans le bestiaire : vendre, vendre les doublons, verrouiller
function Sheet({
  g,
  onSell,
  onLock,
}: {
  g: Group;
  onSell: (ids: number[]) => Promise<void>;
  onLock: (g: Group, lock: boolean) => Promise<void>;
}) {
  const t = useT();
  const lang = useSettings((x) => x.lang);
  const [busy, setBusy] = useState('');
  const fmt = (n: number) => n.toLocaleString(locale(lang));
  const run = (k: string, f: () => Promise<void>) => async () => {
    setBusy(k);
    await f();
    setBusy('');
  };
  const allLocked = !g.free.length;
  return (
    <>
      {g.free.length && g.free[0] !== undefined ? (
        <Button variant="primary" loading={busy === 'one'} onClick={run('one', () => onSell([g.free[0] as number]))}>
          {t('ui.sell_one')} · +{fmt(sellValue(g.odds, g.variant))} <Coin />
        </Button>
      ) : null}
      {g.free.length > 1 ? (
        <Button loading={busy === 'dupes'} onClick={run('dupes', () => onSell(g.free.slice(0, g.ids.length - 1)))}>
          {t('ui.sell_dupes', { n: g.ids.length - 1 })}
        </Button>
      ) : null}
      <Button loading={busy === 'lock'} onClick={run('lock', () => onLock(g, !allLocked))}>
        {allLocked ? t('ui.unlock') : t('ui.lock')}
      </Button>
    </>
  );
}
