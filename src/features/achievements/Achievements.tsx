import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { achApi, errorText } from '@/api';
import { jetonOf, texOf } from '@/data/jetons';
import { sfx } from '@/engines/sound.js';
import { useAuth } from '@/lib/auth';
import { locale, reducedFx, useSettings } from '@/lib/settings';
import { NeedLogin } from '@/app/NeedLogin';
import { Button } from '@/ui/Button';
import { Segmented } from '@/ui/Segmented';
import { Swap } from '@/ui/Swap';
import { toast } from '@/ui/toast';
import { useStaggerIn } from '@/ui/useStaggerIn';
import { useSwingAll } from '@/ui/useSwing';
import { flyCoins } from '@/ui/fx';
import { achText } from './text';
import sh from '../shop/Shop.module.css';
import s from './Achievements.module.css';
import { Bump, Presence, Skeleton } from '@/ui/motion';

// Succès : les rayons de la boutique pour choisir une catégorie (ils penchent et se balancent au survol), et les
// succès en cases comme l'inventaire. Chaque succès a son image pixel, sa barre de progression et sa récompense ;
// « Récupérer » fait voler les pièces jusqu'au solde. La progression vient du serveur (impossible à tricher).
export type Ach = {
  id: string;
  cat: string;
  stat: string;
  target: number;
  coins: number;
  secret: boolean;
  value: number;
  claimed: boolean;
};
const CATS = ['pull', 'coll', 'rare', 'mut', 'eco', 'shop', 'pass', 'quest', 'social', 'cosm', 'time'] as const;
const CAT_IMG: Record<string, string> = {
  pull: '/img/tokens/mystery.png',
  coll: texOf(jetonOf('Mobu')),
  rare: texOf(jetonOf('Takoras')),
  mut: '/img/stamps/ombre.png',
  eco: '/img/coin.png',
  shop: '/img/potions/luck-10.png',
  pass: '/img/ui/ico/star.png',
  quest: '/img/items/recharge.png',
  social: '/img/avatars/blue.png',
  cosm: '/img/avatars/eyes.png',
  time: '/img/items/hourglass.png',
};
// l'image d'un succès : celle de sa catégorie, ou plus précise (le jeton de cette rareté, le tampon de la mutation…)
const RARE_TOKEN: Record<string, string> = {
  r100: 'Azura',
  r1000: 'Vyolis',
  r10000: 'Astra',
  r100000: 'Néphéris',
  r1000000: 'Takoras',
  nopot1000: 'Lumis',
  nopot100000: 'Zénith',
};
const imgOf = (a: Ach) => {
  if (RARE_TOKEN[a.stat]) return texOf(jetonOf(RARE_TOKEN[a.stat] as string));
  if (a.stat === 'gold' || a.stat === 'celeste' || a.stat === 'ombre') return `/img/stamps/${a.stat}.png`;
  if (a.stat === 'takoras_ombre') return texOf(jetonOf('Takoras'));
  if (a.stat === 'bodako') return texOf(jetonOf('Ronce'));
  if (a.stat === 'bought') return '/img/potions/luck-2.png';
  if (a.stat === 'banner') return '/img/banners/plains.png';
  return CAT_IMG[a.cat] ?? '/img/tokens/mystery.png';
};

export function useAchievements() {
  const uid = useAuth((x) => x.user?.id);
  return useQuery({ ...achQ(uid), enabled: !!uid });
}
const achQ = (uid?: string) => ({
  queryKey: ['ach', uid],
  staleTime: 60_000,
  queryFn: async () => ((await achApi.mine()) as { list: Ach[] }).list,
});
// chargement d'avance (Layout) : la page des succès s'ouvre déjà remplie
export const prefetch = (qc: QueryClient, uid: string) => qc.prefetchQuery(achQ(uid));
type Sort = 'ready' | 'gain' | 'easy' | 'hard';
export const isReady = (a: Ach) => !a.claimed && a.value >= a.target;

export default function Achievements() {
  const lang = useSettings((x) => x.lang);
  const T = achText(lang);
  const user = useAuth((x) => x.user);
  const qc = useQueryClient();
  const q = useAchievements();
  const [cat, setCat] = useState<string>('all');
  const [sort, setSort] = useState<Sort>('ready');
  const [busy, setBusy] = useState(false);
  const pageRef = useRef<HTMLElement>(null);
  const shelvesRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  useStaggerIn(pageRef, `.${s.head}, .${sh.shelf}`, !!q.data);
  useSwingAll(shelvesRef, `.${sh.shelf}`, 0.5, q.data ? 1 : 0, 70);
  useSwingAll(gridRef, `.${s.card}`, 0.3, `${cat}|${sort}|${q.data?.length ?? 0}`);
  const fmt = (n: number) => n.toLocaleString(locale(lang));
  const list = q.data ?? [];
  const done = list.filter((a) => a.claimed).length;
  const ready = list.filter(isReady);
  const shown = cat === 'all' ? list : list.filter((a) => a.cat === cat);
  // tri : les obtenus toujours à la fin ; sinon prêts d'abord, plus grosse récompense, plus simple ou plus dur à finir
  const pr = (a: Ach) => Math.min(1, a.value / a.target);
  const order = (a: Ach) => (a.claimed ? 2 : sort === 'ready' && !isReady(a) ? 1 : 0);
  const by: Record<Sort, (a: Ach, b: Ach) => number> = {
    ready: (a, b) => pr(b) - pr(a),
    gain: (a, b) => b.coins - a.coins,
    easy: (a, b) => pr(b) - pr(a) || a.coins - b.coins,
    hard: (a, b) => pr(a) - pr(b) || b.coins - a.coins,
  };
  const sorted = [...shown].sort((a, b) => order(a) - order(b) || by[sort](a, b));

  // succès récupéré : il s'efface, les autres glissent à leur nouvelle place, puis il réapparaît en douceur plus bas
  const [leaving, setLeaving] = useState<string | null>(null);
  const before = useRef<{ rects: Map<string, DOMRect>; id: string } | null>(null);
  const orderKey = sorted.map((a) => a.id).join();
  useLayoutEffect(() => {
    const snap = before.current;
    before.current = null;
    if (!snap || reducedFx()) return;
    gridRef.current?.querySelectorAll<HTMLElement>('[data-ach]').forEach((el) => {
      const id = el.dataset.ach ?? '';
      const a = snap.rects.get(id);
      if (!a) return;
      const b = el.getBoundingClientRect();
      if (id === snap.id) {
        el.animate(
          [
            { opacity: 0, transform: 'scale(.94)' },
            { opacity: 1, transform: 'none' },
          ],
          {
            duration: 360,
            delay: 260,
            easing: 'cubic-bezier(.2,.8,.2,1)',
            fill: 'backwards',
          },
        );
        return;
      }
      const dx = a.left - b.left,
        dy = a.top - b.top;
      if (dx || dy)
        el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], {
          duration: 460,
          easing: 'cubic-bezier(.2,.8,.2,1)',
        });
    });
  }, [orderKey]);

  if (!user) return <NeedLogin title={T.title} />;

  const claim = async (a: Ach, el: HTMLElement | null) => {
    try {
      const st = await achApi.claim(a.id);
      sfx.upgrade();
      if (el) flyCoins(el.getBoundingClientRect(), Math.min(6, 2 + Math.round(Math.log10(a.coins))), () => undefined);
      qc.setQueryData(['me', user.id], (old: object | undefined) => ({ ...old, ...(st as object) }));
      if (!reducedFx()) {
        setLeaving(a.id);
        await new Promise((ok) => setTimeout(ok, 260));
      }
      const rects = new Map<string, DOMRect>();
      gridRef.current
        ?.querySelectorAll<HTMLElement>('[data-ach]')
        .forEach((x) => rects.set(x.dataset.ach ?? '', x.getBoundingClientRect()));
      before.current = { rects, id: a.id };
      qc.setQueryData(['ach', user.id], (o: Ach[] | undefined) =>
        o?.map((x) => (x.id === a.id ? { ...x, claimed: true } : x)),
      );
      setLeaving(null);
    } catch (e) {
      sfx.deny();
      toast(errorText(e, lang), true);
    }
  };
  const claimAll = async () => {
    setBusy(true);
    for (const a of ready) {
      const el = document.querySelector<HTMLElement>(`[data-ach="${a.id}"]`);
      await claim(a, el);
      await new Promise((ok) => setTimeout(ok, 140));
    }
    setBusy(false);
  };

  return (
    <section ref={pageRef} className={s.page}>
      <header className={s.head} data-depth>
        <h1>{T.title}</h1>
        <span className={s.total} aria-label={T.of.replace('{a}', String(done)).replace('{b}', String(list.length))}>
          <b>{done}</b>/{list.length || 100}
          <span className={s.bar} aria-hidden>
            <i style={{ width: `${list.length ? (done / list.length) * 100 : 0}%` }} />
          </span>
        </span>
        <span className={s.sort}>
          <Segmented<Sort>
            value={sort}
            label={T.sort}
            options={(['ready', 'gain', 'easy', 'hard'] as const).map((k) => [k, T.sorts[k] ?? k] as const)}
            onChange={(v) => {
              sfx.click();
              setSort(v);
            }}
          />
        </span>
        <Presence show={ready.length > 1}>
          <Button variant="primary" loading={busy} onClick={() => void claimAll()}>
            {T.claimAll.replace('{n}', String(ready.length))}
          </Button>
        </Presence>
      </header>

      <div className={s.layout}>
        {/* les catégories : les rayons de la boutique */}
        <div ref={shelvesRef} className={`${sh.shelves} ${s.shelves}`} role="group" aria-label={T.title} data-depth>
          {['all', ...CATS].map((c) => {
            const inCat = c === 'all' ? list : list.filter((a) => a.cat === c);
            const nReady = inCat.filter(isReady).length;
            const complete = inCat.length > 0 && inCat.every((a) => a.claimed);
            return (
              <button
                key={c}
                type="button"
                className={`${sh.shelf} ${complete ? s.complete : ''}`}
                aria-pressed={cat === c}
                onClick={() => {
                  sfx.click();
                  setCat(c);
                }}
              >
                <img className="px" src={c === 'all' ? '/img/ui/ico/trophy.png' : CAT_IMG[c]} alt="" />
                <span>
                  <b>{c === 'all' ? T.all : T.cats[c]}</b>
                  <small>
                    {inCat.filter((a) => a.claimed).length}/{inCat.length}
                  </small>
                </span>
                <Presence show={nReady > 0}>
                  <Bump as="i" v={nReady} className={s.dot}>
                    {nReady}
                  </Bump>
                </Presence>
              </button>
            );
          })}
        </div>

        <div ref={gridRef} className={s.depthGrid} data-depth>
          {!q.data ? (
            <Skeleton n={12} h={210} min={220} />
          ) : (
            <Swap k={`${cat}|${sort}`}>
              <ul className={s.grid}>
                {sorted.map((a, i) => {
                  const hidden = a.secret && !a.claimed && a.value < a.target;
                  const pct = Math.min(100, (a.value / a.target) * 100);
                  const r = isReady(a);
                  return (
                    <li
                      key={a.id}
                      data-ach={a.id}
                      className={`${s.card} ${r ? s.ready : ''} ${a.claimed ? s.done : ''} ${leaving === a.id ? s.leaving : ''}`}
                      style={{ '--i': Math.min(i, 20) } as CSSProperties}
                    >
                      <span className={s.art}>
                        <img
                          className={`px ${hidden ? s.hiddenImg : ''}`}
                          src={imgOf(a)}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          width={64}
                          height={64}
                        />
                        {a.claimed ? <img className={`px ${s.check}`} src="/img/ui/ok.png" alt="" /> : null}
                      </span>
                      <b className={s.name}>
                        {hidden
                          ? T.secret
                          : ((a.target === 1 && T.s1[a.stat]) || T.s[a.stat] || a.stat).replace('{n}', fmt(a.target))}
                      </b>
                      <small className={s.cat}>{hidden ? T.secretHint : T.cats[a.cat]}</small>
                      <span className={s.prog} aria-label={`${fmt(a.value)} / ${fmt(a.target)}`}>
                        <i style={{ width: `${pct}%` }} />
                      </span>
                      <span className={s.foot}>
                        <small className={s.count}>
                          {fmt(a.value)}/{fmt(a.target)}
                        </small>
                        <span className={s.reward}>
                          +{fmt(a.coins)} <img className="px" src="/img/coin.png" alt="" width={16} height={16} />
                        </span>
                      </span>
                      {r ? (
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={busy}
                          onClick={(e) => void claim(a, e.currentTarget)}
                        >
                          {T.claim}
                        </Button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </Swap>
          )}
        </div>
      </div>
    </section>
  );
}
