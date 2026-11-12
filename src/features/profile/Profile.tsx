import { useRef, useState, type CSSProperties } from 'react';
import { useSwingAll } from '@/ui/useSwing';
import { SerieName } from '@/ui/SerieName';
import { useNavigate, useParams } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { accountApi, errorText, publicApi } from '@/api';
import { useMe } from '@/api/queries';
import { BANNER_IMG, bannerName } from '@/data/items';
import {
  colorOf,
  hexRGB,
  jetonOf,
  MYSTERE,
  SERIES,
  TEMPLATE,
  texOf,
  vImg,
  vOdds,
  glowVars,
  type Variant,
} from '@/data/jetons';
import { sfx } from '@/engines/sound.js';
import { openUI } from '@/app/ui-store';
import { AVATARS, FREE_PP } from '@/lib/avatars';
import { signOut, useAuth } from '@/lib/auth';
import { useJn } from '@/lib/names';
import { locale, reducedFx, useSettings } from '@/lib/settings';
import { useT } from '@/i18n/useT';
import { Avatar, setAvatar } from '@/ui/Avatar';
import { Button } from '@/ui/Button';
import { confirm } from '@/ui/confirm';
import { Modal } from '@/ui/Modal';
import { PixelBg } from '@/ui/PixelBg';
import { useStaggerIn } from '@/ui/useStaggerIn';
import { Aura, BannerFx, cosmName, COSMETICS, CosmeticPreview, nameCls } from '@/ui/Cosmetics';
import { toast } from '@/ui/toast';
import { VTag } from '@/ui/VTag';
import { JetonModal } from '../inventory/JetonModal';
import { useInventory } from '../inventory/inv';
import { NeedLogin } from '@/app/NeedLogin';
import { Icon } from '@/app/Icon';
import { FriendButton } from '../social/FriendButton';
import { ReportButton } from './ReportButton';
import { RankBadge, useRankName } from '../combat/Ranked';
import { rankOf } from '../combat/rankedApi';
import iv from '../inventory/Inventory.module.css';
import s from './Profile.module.css';
import lk from './Locker.module.css';

type Shown = { id: number; jeton: string; odds: number; variant: string | null } | null;
export type Prof = {
  pseudo: string;
  num: number;
  streak: number;
  beta: boolean;
  wins: number;
  losses: number;
  avatar: string;
  banner: string | null;
  bio: string;
  joined: string;
  banners: string[] | null;
  avatars: string[] | null;
  email: string | null;
  provider: string | null;
  pseudo_free: boolean | null;
  pseudo_next: string | null;
  showcase: Shown[] | null;
  pulls: number;
  best_pull: { jeton: string; odds: number; variant: string | null; eff: number } | null;
  collection: number;
  owned: number;
  name_fx?: string | null;
  aura?: string | null;
  banner_fx?: string | null;
  cosmetics?: string[] | null;
};

// Profil d'un joueur, même DA que la boutique et le passe : bannière (ou fond pixel à la couleur de son meilleur
// jeton), carte du joueur avec son rang, chiffres en pastilles, meilleur tirage en trophée, vitrine de 5 cases
// et bestiaires. Sur son propre profil : modifier (aperçu en direct), choisir la vitrine, et la zone privée.
export default function Profile() {
  const t = useT();
  const jn = useJn();
  const lang = useSettings((x) => x.lang);
  const params = useParams();
  const user = useAuth((x) => x.user);
  const me = useMe();
  const nav = useNavigate();
  const pseudo = params.pseudo ?? me.data?.pseudo ?? '';
  const fmt = (n: number) => n.toLocaleString(locale(lang));
  const prof = useQuery({
    queryKey: ['profile', pseudo.toLowerCase()],
    enabled: !!pseudo,
    queryFn: async () => (await publicApi.profile(pseudo)) as unknown as Prof | null,
  });
  const [jeton, setJeton] = useState<{ name: string; variant: string; locked: boolean; single?: boolean } | null>(null);
  const [slot, setSlot] = useState<number | null>(null);
  const [edit, setEdit] = useState(false);
  const [serie, setSerie] = useState<string | null>('Takoras'); // bestiaire montré en dessous (pas de fenêtre)
  const pageRef = useRef<HTMLElement>(null);
  useStaggerIn(
    pageRef,
    `.${s.bannerTilt}, .${s.head}, .${s.strip} > li, .${s.best}, .${s.showcase} > li, .${s.series} > *, .${s.private}`,
    !!prof.data,
  );
  useSwingAll(pageRef, `.${s.sc}, .${s.scEmpty}, .${s.best}, .${s.series} > button`, 0.4, prof.data);

  if (!params.pseudo && !user) return <NeedLogin title={t('app.account')} />;
  if (prof.isError) return <p className="muted">{t('ui.err_generic')}</p>;
  if (!pseudo || prof.isPending)
    return (
      <p className="muted" aria-busy>
        …
      </p>
    );
  const p = prof.data;
  if (!p)
    return (
      <section className={s.empty}>
        <h1>{t('ui.profile_404')}</h1>
      </section>
    );
  const mine = !!me.data?.pseudo && p.pseudo === me.data.pseudo;
  const bp = p.best_pull;
  const show = p.showcase ?? [];
  const total = Object.values(SERIES).reduce((n, l) => n + l.length, 0);
  const bannerSrc = p.banner ? BANNER_IMG[p.banner] : undefined;
  // bannière « meilleur jeton » (option des cosmétiques) : le fond pixel à la couleur de ton meilleur tirage
  const bestBanner = p.banner === 'best';
  // couleur du profil : celle de son meilleur jeton (fond de la bannière quand il n'en a pas)
  // couleur du profil : celle de son meilleur jeton, mutation comprise (Ombre = violet, Doré = or…)
  const tone = bp ? colorOf(jetonOf(bp.jeton), bp.variant) : '#3966f7';
  return (
    <section ref={pageRef} className={s.page} style={{ '--tone': hexRGB(tone) } as CSSProperties}>
      {/* bannière : l'image achetée, sinon un fond pixel à la couleur de son meilleur jeton */}
      {/* la bannière flotte et penche vers la souris, avec un reflet qui suit le pointeur (comme une carte tenue en main) */}
      <div
        className={s.bannerTilt}
        onPointerMove={(e) => {
          if (e.pointerType !== 'mouse' || reducedFx()) return;
          const el = e.currentTarget,
            r = el.getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width,
            y = (e.clientY - r.top) / r.height;
          el.style.setProperty('--ry', `${((x - 0.5) * 9).toFixed(2)}deg`);
          el.style.setProperty('--rx', `${((0.5 - y) * 7).toFixed(2)}deg`);
          el.style.setProperty('--gx', `${(x * 100).toFixed(1)}%`);
          el.style.setProperty('--gy', `${(y * 100).toFixed(1)}%`);
        }}
        onPointerLeave={(e) => {
          e.currentTarget.style.setProperty('--ry', '0deg');
          e.currentTarget.style.setProperty('--rx', '0deg');
        }}
      >
        <div className={s.banner}>
          {bannerSrc ? (
            <img className="px" src={bannerSrc} alt="" />
          ) : bestBanner ? (
            <PixelBg className={s.bannerBg} odds={bp?.eff ?? 1} glow={tone} still={reducedFx()} />
          ) : null}
          <BannerFx id={p.banner_fx} />
        </div>
      </div>

      {/* la carte du joueur chevauche la bannière : photo, pseudo, bio, actions ; à droite son rang */}
      <header className={s.head}>
        <div className={s.pp}>
          <Aura id={p.aura}>
            <Avatar pseudo={p.pseudo} avatar={p.avatar} size={128} />
          </Aura>
        </div>
        <div className={s.id}>
          <h1>
            <span className={nameCls(p.name_fx)}>{p.pseudo}</span>{' '}
            <small className={s.num}>#{String(p.num).padStart(6, '0')}</small>
          </h1>
          {p.bio ? <p className={s.bio}>{p.bio}</p> : null}
          <div className={s.headActions}>
            {mine ? (
              <Button size="sm" variant="primary" onClick={() => setEdit(true)}>
                {t('ui.edit_profile')}
              </Button>
            ) : user ? (
              <>
                <FriendButton pseudo={p.pseudo} />
                <ReportButton pseudo={p.pseudo} />
              </>
            ) : null}
          </div>
        </div>
        {/* à droite : le rang classé, et ses chiffres juste en dessous */}
        <div className={s.rankCol}>
          <EloHero pseudo={p.pseudo} wins={p.wins || 0} losses={p.losses || 0} />
          <ul className={s.strip}>
            <li>
              <b>{fmt(p.pulls)}</b> {t('ui.st_pulls')}
            </li>
            <li>
              <b>{fmt(p.owned)}</b> {t('ui.st_owned')}
            </li>
            <li>
              <b>
                {p.collection}/{total}
              </b>{' '}
              {t('ui.bestiaries').toLowerCase()}
            </li>
            <li className={s.since}>{t('ui.joined', { d: new Date(p.joined).toLocaleDateString(locale(lang)) })}</li>
          </ul>
        </div>
      </header>

      <div className={s.duo}>
        {/* meilleur tirage : le trophée, en grand, sur le fond de sa rareté */}
        {bp ? (
          <button
            type="button"
            className={s.best}
            style={glowVars(jetonOf(bp.jeton), bp.variant) as CSSProperties}
            onClick={() => setJeton({ name: bp.jeton, variant: bp.variant ?? '', locked: false, single: true })}
          >
            <PixelBg
              className={s.bestBg}
              odds={bp.eff}
              glow={colorOf(jetonOf(bp.jeton), bp.variant)}
              still={reducedFx()}
            />
            <span className={s.bestImg}>
              <img className={vImg(bp.variant)} src={texOf(jetonOf(bp.jeton))} alt="" />
            </span>
            <span className={s.bestTxt}>
              <small>{t('ui.st_best')}</small>
              <b>
                {jn(bp.jeton)} <VTag v={bp.variant} />
              </b>
              <span className={s.bestOdds}>1/{fmt(bp.eff)}</span>
            </span>
          </button>
        ) : null}

        {/* vitrine : 5 cases, comme la boutique ; sur son profil, une case vide se remplit d'un clic */}
        <section className={s.showBox} aria-labelledby="sc-t">
          <h2 id="sc-t" className={s.h2}>
            {t('ui.showcase')}
          </h2>
          <ul className={s.showcase}>
            {Array.from({ length: 5 }, (_, i) => {
              const x = show[i];
              if (!x)
                return (
                  <li key={`e${i}`} className={s.scEmpty}>
                    {mine ? (
                      <button type="button" onClick={() => setSlot(i)} aria-label={t('ui.pick_title', { n: i + 1 })}>
                        +
                      </button>
                    ) : null}
                  </li>
                );
              const j = jetonOf(x.jeton);
              return (
                <li key={`${i}:${x.id}`} className={s.sc} style={glowVars(j, x.variant) as CSSProperties}>
                  <button
                    type="button"
                    onClick={() =>
                      mine ? setSlot(i) : setJeton({ name: x.jeton, variant: x.variant ?? '', locked: false })
                    }
                  >
                    <span className={s.scArt}>
                      <img className={vImg(x.variant)} src={texOf(j)} alt="" />
                    </span>
                    <b>{jn(x.jeton)}</b>
                    <small>
                      {x.variant ? `${t(`ui.v_${x.variant}` as 'ui.v_gold')} · ` : ''}1/
                      {fmt(vOdds(x.odds, (x.variant ?? '') as Variant))}
                    </small>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <Bestiaries pseudo={p.pseudo} open={serie} onOpen={(x) => setSerie(serie === x ? null : x)} />
      {/* le bestiaire de la série choisie, directement dans la page, comme dans l'inventaire */}
      {serie ? (
        <Collection
          pseudo={p.pseudo}
          serie={serie}
          onOpen={(name, locked) => setJeton({ name, variant: '', locked })}
        />
      ) : null}

      {mine ? (
        <section className={s.private} aria-labelledby="pv-t">
          <h2 id="pv-t" className={s.h2}>
            {t('ui.private_zone')} <small>{t('ui.private_hint')}</small>
          </h2>
          <div className={s.pvGrid}>
            <div className={s.row}>
              <span>{t('ui.pv_login')}</span>
              <b>{p.provider === 'discord' ? 'Discord' : (p.provider ?? '—')}</b>
            </div>
            <div className={s.row}>
              <span>{t('ui.pv_email')}</span>
              <b>{p.email ?? '—'}</b>
            </div>
            <div className={s.pvActions}>
              <Button size="sm" onClick={() => openUI('settings')}>
                {t('ui.settings')}
              </Button>
              <Button
                size="sm"
                onClick={async () => {
                  await signOut();
                  void nav('/');
                }}
              >
                {t('ui.logout')}
              </Button>
            </div>
          </div>
        </section>
      ) : null}
      <TheirJeton pseudo={p.pseudo} jeton={jeton} onClose={() => setJeton(null)} />
      {mine && slot !== null ? <ShowcasePicker p={p} slot={slot} onClose={() => setSlot(null)} /> : null}
      {mine && edit ? <EditProfile p={p} onClose={() => setEdit(false)} /> : null}
    </section>
  );
}

// Bestiaires d'un joueur : une carte par série (tirage) ; toucher = son bestiaire de cette série
function Bestiaries({
  pseudo,
  open,
  onOpen,
}: {
  pseudo: string;
  open: string | null;
  onOpen: (serie: string) => void;
}) {
  const t = useT();
  const q = useQuery({ queryKey: ['collection', pseudo.toLowerCase()], queryFn: () => publicApi.collectionOf(pseudo) });
  return (
    <>
      <h2 className={s.h2}>{t('ui.bestiaries')}</h2>
      <div className={s.series}>
        {Object.keys(SERIES).map((name) => {
          const all = SERIES[name] ?? [],
            got = new Set((q.data ?? []).filter((r) => (r.serie || 'Takoras') === name).map((r) => r.jeton));
          return (
            <button key={name} type="button" aria-pressed={open === name} onClick={() => onOpen(name)}>
              <img
                className="px"
                src={name === 'Takoras' ? '/img/jetons/takoras.png' : texOf(all[0] ?? jetonOf('Mobu'))}
                alt=""
              />
              <span>
                <b>
                  <SerieName name={name} h="1.4em" />
                </b>
                <small>{q.data ? `${all.filter((j) => got.has(j.name)).length} / ${all.length}` : '…'}</small>
              </span>
            </button>
          );
        })}
        <div className={s.seriesSoon} aria-disabled="true">
          <img className="px" src={TEMPLATE} alt="" />
          <span>
            <b>{t('ui.bst_next')}</b>
            <small>{t('ui.pk_soon')}</small>
          </span>
        </div>
      </div>
    </>
  );
}

// Le bestiaire d'un joueur pour une série : ceux déjà eus en couleur, avec les variantes trouvées
function Collection({
  pseudo,
  serie,
  onOpen,
}: {
  pseudo: string;
  serie: string;
  onOpen: (name: string, locked: boolean) => void;
}) {
  const jn = useJn();
  const lang = useSettings((x) => x.lang);
  const fmt = (n: number) => n.toLocaleString(locale(lang));
  const q = useQuery({ queryKey: ['collection', pseudo.toLowerCase()], queryFn: () => publicApi.collectionOf(pseudo) });
  const got = new Map<string, Set<string>>();
  (q.data ?? [])
    .filter((r) => (r.serie || 'Takoras') === serie)
    .forEach((r) => {
      const v = got.get(r.jeton) ?? new Set<string>();
      if (r.variant) v.add(r.variant);
      got.set(r.jeton, v);
    });
  const all = [...(SERIES[serie] ?? [])].sort((a, b) => a.odds - b.odds);
  // les jetons se balancent au survol, accrochés par le haut (comme dans le bestiaire)
  const gridRef = useRef<HTMLUListElement>(null);
  useSwingAll(gridRef, `.${iv.cardBtn}`, 0.35, `${serie}|${q.data?.length ?? 0}`);
  // même style que le bestiaire de l'inventaire : jetons posés librement, « ? » pour ceux pas trouvés
  return (
    <ul ref={gridRef} className={`${iv.grid} ${s.collGrid}`}>
      {all.map((j, i) => {
        const c = got.get(j.name);
        return (
          <li
            key={j.name}
            style={(c ? glowVars(j) : { '--g': '113, 113, 122' }) as CSSProperties}
            className={`${iv.card} ${c ? '' : iv.unk}`}
          >
            <button
              type="button"
              className={iv.cardBtn}
              style={{ '--i': Math.min(i, 24) } as CSSProperties}
              onClick={() => {
                sfx.click();
                onOpen(j.name, !c);
              }}
            >
              <span className={iv.num}>#{c ? String(i + 1).padStart(2, '0') : '?'}</span>
              <img className="px" src={c ? texOf(j) : MYSTERE} alt="" />
              <b>{c ? jn(j.name) : '???'}</b>
              <small>{c ? `1/${fmt(j.odds)}` : '?'}</small>
              {/* toujours les 3 mutations : en couleur s'il l'a trouvée, grisée sinon */}
              {c ? (
                <span className={iv.vstamps}>
                  {(['gold', 'celeste', 'ombre'] as const).map((v) => (
                    <i
                      key={v}
                      className={c.has(v) ? undefined : iv.vOff}
                      style={{ backgroundImage: `url(/img/stamps/${v}.png)` }}
                    />
                  ))}
                </span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

// Fiche d'un jeton chez un joueur : combien il en a, combien il en a eu, ses mutations trouvées (tampons)
function TheirJeton({
  pseudo,
  jeton,
  onClose,
}: {
  pseudo: string;
  jeton: { name: string; variant: string; locked: boolean; single?: boolean } | null;
  onClose: () => void;
}) {
  const t = useT();
  const lang = useSettings((x) => x.lang);
  const fmt = (n: number) => n.toLocaleString(locale(lang));
  const q = useQuery({ queryKey: ['collection', pseudo.toLowerCase()], queryFn: () => publicApi.collectionOf(pseudo) });
  const rows = (q.data ?? []).filter((r) => r.jeton === jeton?.name);
  const owned = rows.reduce((n, r) => n + Number(r.owned ?? 0), 0),
    total = rows.reduce((n, r) => n + Number(r.total), 0);
  return (
    <JetonModal
      name={jeton?.name ?? null}
      variant={jeton?.variant}
      locked={jeton?.locked}
      single={jeton?.single}
      found={Object.fromEntries(rows.map((r) => [r.variant ?? '', true]))}
      facts={
        <>
          <li>{t('ui.their_have', { n: fmt(owned) })}</li>
          <li>{t('ui.bst_got', { n: fmt(total) })}</li>
        </>
      }
      onClose={onClose}
    />
  );
}

const saveProfile = (
  p: Prof,
  part: Partial<{ p_avatar: string; p_banner: string | null; p_bio: string; p_showcase: (number | null)[] }>,
) =>
  accountApi.updateProfile({
    p_avatar: p.avatar,
    p_banner: p.banner,
    p_bio: p.bio,
    p_showcase: (p.showcase ?? []).map((x) => x?.id ?? null),
    ...part,
  });

// Choisir le jeton d'une case de la vitrine, en deux temps : les séries en onglets et une case par jeton possédé
// (pastilles pour ses mutations), du plus rare au plus commun ; puis, s'il en a plusieurs, la mutation à montrer.
// Avec une seule version, un clic la pose directement. En haut : ce qu'il y a dans la case, pour la vider.
function ShowcasePicker({ p, slot, onClose }: { p: Prof; slot: number; onClose: () => void }) {
  const t = useT();
  const jn = useJn();
  const lang = useSettings((x) => x.lang);
  const qc = useQueryClient();
  const inv = useInventory();
  const series = Object.keys(SERIES);
  const [serie, setSerie] = useState(series[0] ?? 'Takoras');
  // jeton ouvert dans sa fiche, et la mutation choisie en bas de la fiche
  const [open, setOpen] = useState<string | null>(null);
  const [pv, setPv] = useState('');
  const [busy, setBusy] = useState<number | null>(null);
  const show = p.showcase ?? [];
  const cur = show[slot] ?? null;
  const used = new Set(show.filter(Boolean).map((x) => x?.id));
  const fmt = (n: number) => n.toLocaleString(locale(lang));
  // une case par jeton possédé (toutes ses mutations dedans), le plus rare d'abord
  const VORD = ['', 'gold', 'celeste', 'ombre'];
  const byTok = new Map<
    string,
    { name: string; serie?: string; vs: { g: (typeof groups)[number]; eff: number; free?: number }[] }
  >();
  const groups = (inv.data?.groups ?? []).filter((g) => (g.serie || 'Takoras') === serie);
  for (const g of groups) {
    const e = byTok.get(g.name) ?? { name: g.name, serie: g.serie, vs: [] };
    e.vs.push({ g, eff: vOdds(g.odds, (g.variant || '') as Variant), free: g.ids.find((i) => !used.has(i)) });
    byTok.set(g.name, e);
  }
  const toks = [...byTok.values()]
    .map((e) => ({ ...e, vs: e.vs.sort((a, b) => VORD.indexOf(a.g.variant || '') - VORD.indexOf(b.g.variant || '')) }))
    .sort((a, b) => (b.vs[0]?.g.odds ?? 0) - (a.vs[0]?.g.odds ?? 0));
  const opened = open ? byTok.get(open) : undefined;
  const openedFree = opened?.vs.find((v) => (v.g.variant || '') === pv)?.free;
  const vName = (v?: string | null) => (v ? t(`ui.v_${v}` as 'ui.v_gold') : t('ui.pk_normal'));
  const save = async (id: number | null) => {
    // 5 cases fixes : le jeton va exactement dans la case choisie
    const ids = Array.from({ length: 5 }, (_, i) => show[i]?.id ?? null);
    ids[slot] = id;
    setBusy(id ?? -1);
    try {
      await saveProfile(p, { p_showcase: ids });
      sfx.click();
      onClose();
      await qc.invalidateQueries({ queryKey: ['profile', p.pseudo.toLowerCase()] });
      void qc.invalidateQueries({ queryKey: ['inv'] });
    } catch (e) {
      toast(errorText(e, lang), true);
    } finally {
      setBusy(null);
    }
  };
  return (
    <Modal open onClose={onClose} title={t('ui.pick_title', { n: slot + 1 })} wide>
      <div className={s.pk}>
        {/* ce qu'il y a dans la case maintenant */}
        {cur ? (
          <div className={s.pkCur} style={glowVars(jetonOf(cur.jeton), cur.variant) as CSSProperties}>
            <img className={vImg(cur.variant)} src={texOf(jetonOf(cur.jeton))} alt="" />
            <span>
              <b>
                {jn(cur.jeton)} <VTag v={cur.variant} />
              </b>
              <small>1/{fmt(vOdds(cur.odds, (cur.variant ?? '') as Variant))}</small>
            </span>
            <Button size="sm" onClick={() => void save(null)} loading={busy === -1}>
              {t('ui.pick_remove')}
            </Button>
          </div>
        ) : null}

        {
          <div key="tok" className={s.pkStep}>
            <div className={s.pkBar}>
              <div className={s.pkSeries} role="tablist">
                {series.map((x) => (
                  <button key={x} type="button" role="tab" aria-selected={x === serie} onClick={() => setSerie(x)}>
                    <SerieName name={x} h="1.2em" />
                  </button>
                ))}
              </div>
            </div>
            {!inv.data ? (
              <p className="muted" aria-busy>
                …
              </p>
            ) : toks.length ? (
              // les mêmes cases que le bestiaire de l'inventaire : numéro, nombre, jeton, nom, rareté, 3 tampons
              <ul className={`${iv.grid} ${s.pkTok}`}>
                {toks.map((e, i) => {
                  const top = e.vs[0];
                  if (!top) return null;
                  const j = jetonOf(e.name, e.serie);
                  const has = new Set(e.vs.map((v) => v.g.variant || ''));
                  const n = e.vs.reduce((a, v) => a + v.g.ids.length, 0);
                  const no = (SERIES[serie] ?? []).findIndex((x) => x.name === e.name) + 1;
                  return (
                    <li key={e.name} className={iv.card} style={glowVars(j) as CSSProperties}>
                      <button
                        type="button"
                        className={iv.cardBtn}
                        style={{ '--i': Math.min(i, 24) } as CSSProperties}
                        disabled={busy !== null}
                        onClick={() => {
                          sfx.click();
                          // s'ouvre sur la première version encore libre (sinon la première)
                          setPv((e.vs.find((v) => v.free) ?? top).g.variant || '');
                          setOpen(e.name);
                        }}
                        aria-label={jn(e.name)}
                      >
                        <span className={iv.num}>#{String(no).padStart(2, '0')}</span>
                        <span className={iv.count}>×{n}</span>
                        <img className="px" src={texOf(j)} alt="" />
                        <b>{jn(e.name)}</b>
                        <small>1/{fmt(j.odds)}</small>
                        <span className={iv.vstamps}>
                          {(['gold', 'celeste', 'ombre'] as const).map((v) => (
                            <i
                              key={v}
                              className={has.has(v) ? undefined : iv.vOff}
                              title={vName(v)}
                              style={{ backgroundImage: `url(/img/stamps/${v}.png)` }}
                            />
                          ))}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className={s.pkEmpty}>{t('ui.none')}</p>
            )}
          </div>
        }
      </div>
      {/* la fiche du jeton : on touche le tampon de la mutation voulue, puis « Mettre en vitrine » */}
      <JetonModal
        name={open}
        serie={serie}
        variant={pv}
        found={Object.fromEntries(
          ['', 'gold', 'celeste', 'ombre'].map((k) => [k, !!opened?.vs.some((v) => (v.g.variant || '') === k)]),
        )}
        pick={setPv}
        onClose={() => setOpen(null)}
      >
        <Button
          variant="primary"
          disabled={!openedFree || busy !== null}
          onClick={() => openedFree && void save(openedFree)}
        >
          {openedFree ? t('ui.pick_put') : t('ui.already_showcase')}
        </Button>
        <Button onClick={() => setOpen(null)}>{t('ui.back')}</Button>
      </JetonModal>
    </Modal>
  );
}

// Modifier le profil : en haut l'aperçu en direct (bannière, photo, pseudo, bio, comme sur le profil),
// puis le pseudo (1 fois / 30 jours) et la bio, les photos (celles à débloquer mènent à la boutique) et les bannières.
function EditProfile({ p, onClose }: { p: Prof; onClose: () => void }) {
  const t = useT();
  const lang = useSettings((x) => x.lang);
  const user = useAuth((x) => x.user);
  const qc = useQueryClient();
  const nav = useNavigate();
  const [pseudo, setPseudo] = useState(p.pseudo);
  const [bio, setBio] = useState(p.bio);
  const [banner, setBanner] = useState(p.banner ?? '');
  const [avatar, setAv] = useState(p.avatar || 'default');
  const [nameFx, setNameFx] = useState(p.name_fx ?? '');
  const [auraFx, setAuraFx] = useState(p.aura ?? '');
  const [bannerFx, setBannerFx] = useState(p.banner_fx ?? '');
  const owned = p.cosmetics ?? [];
  const [busy, setBusy] = useState(false);
  const canRename = !!p.pseudo_free || !p.pseudo_next;
  const pps = ['default', ...FREE_PP, ...Object.keys(AVATARS).filter((a) => !FREE_PP.includes(a))];
  const tone = p.best_pull ? colorOf(jetonOf(p.best_pull.jeton), p.best_pull.variant) : '#3966f7';
  const save = async () => {
    setBusy(true);
    try {
      let name = p.pseudo;
      if (canRename && pseudo !== p.pseudo) {
        if (!(await confirm(t(p.pseudo_free ? 'ui.pseudo_confirm_free' : 'ui.pseudo_confirm', { n: pseudo })))) return;
        await accountApi.changePseudo(pseudo);
        name = pseudo;
      }
      await saveProfile(p, { p_banner: banner || null, p_bio: bio.trim(), p_avatar: avatar });
      if (nameFx !== (p.name_fx ?? '') || auraFx !== (p.aura ?? '') || bannerFx !== (p.banner_fx ?? ''))
        await accountApi.equipCosmetics(nameFx || null, auraFx || null, bannerFx || null);
      setAvatar(name, avatar);
      sfx.upgrade();
      onClose();
      void qc.invalidateQueries({ queryKey: ['me', user?.id] });
      await qc.invalidateQueries({ queryKey: ['profile'] });
      if (name !== p.pseudo) void nav(`/profile/${encodeURIComponent(name)}`);
    } catch (e) {
      sfx.deny();
      toast(errorText(e, lang), true);
    } finally {
      setBusy(false);
    }
  };
  // ---------- le vestiaire : aperçu en direct à gauche, rayons de cases à droite ----------
  type Tab = 'id' | 'pp' | 'banner' | 'name' | 'aura' | 'bfx';
  const [tab, setTab] = useState<Tab>('pp');
  const shelvesRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  useSwingAll(shelvesRef, `.${lk.tabs} > button`, 0.5);
  useSwingAll(panelRef, `.${lk.tile}`, 0.35, tab);
  // survoler une case l'essaie sur l'aperçu (même verrouillée), sans rien changer
  const [hov, setHov] = useState<{ k: Tab; v: string } | null>(null);
  const show = (k: Tab, v: string) => (hov?.k === k ? hov.v : v);
  const vAv = show('pp', avatar),
    vBanner = show('banner', banner),
    vName = show('name', nameFx),
    vAura = show('aura', auraFx),
    vBfx = show('bfx', bannerFx);
  const bestOdds = p.best_pull?.eff ?? 1;
  const goShop = (to = '/shop') => {
    onClose();
    void nav(to);
  };
  const ppOwned = (a: string) => a === 'default' || FREE_PP.includes(a) || (p.avatars ?? []).includes(a);
  const allBanners = Object.keys(BANNER_IMG);
  // les rayons du vestiaire, chacun avec son image pixel (comme les rayons de la boutique)
  const firstBanner = (p.banners ?? [])[0] ?? allBanners[0] ?? '';
  const TABS: [Tab, React.ReactNode, string, number, number][] = [
    ['id', <Icon key="i" name="user" size={26} />, t('ui.lk_id'), 0, 0],
    [
      'pp',
      avatar === 'default' ? (
        <span key="i" className={lk.shLetter}>
          {(p.pseudo[0] ?? '?').toUpperCase()}
        </span>
      ) : (
        <img key="i" className={`px ${lk.shRound}`} src={AVATARS[avatar]} alt="" />
      ),
      t('ui.pe_pp'),
      pps.filter(ppOwned).length,
      pps.length,
    ],
    [
      'banner',
      <img key="i" className={`px ${lk.shWide}`} src={BANNER_IMG[firstBanner]} alt="" />,
      t('ui.pe_banner'),
      (p.banners ?? []).length + 1,
      allBanners.length + 1,
    ],
    [
      'name',
      <b key="i" className={`${lk.shAa} ${nameCls(nameFx || 'n_or')}`}>
        Aa
      </b>,
      t('ui.fx_name'),
      COSMETICS.name.filter((x) => owned.includes(x)).length,
      COSMETICS.name.length,
    ],
    [
      'aura',
      <span key="i" className={lk.shAura}>
        <Aura id={auraFx || 'au_or'}>
          <span className={lk.shDot} />
        </Aura>
      </span>,
      t('ui.fx_aura'),
      COSMETICS.aura.filter((x) => owned.includes(x)).length,
      COSMETICS.aura.length,
    ],
    [
      'bfx',
      <img key="i" className="px" src="/img/fx/particle-2.gif" alt="" />,
      t('ui.lk_bfx'),
      COSMETICS.bfx.filter((x) => owned.includes(x)).length,
      COSMETICS.bfx.length,
    ],
  ];
  // ce que fait une case : équiper, essayer au survol, ou (verrouillée) mener à la boutique
  const setter: Record<Tab, (x: string) => void> = {
    id: () => undefined,
    pp: setAv,
    banner: setBanner,
    name: setNameFx,
    aura: setAuraFx,
    bfx: setBannerFx,
  };
  const tp = (k: Tab, v: string, to = '/shop') => ({
    lockTag: to === '/pass' ? t('ui.lk_pass') : t('ui.nav_shop'),
    onPick: () => (sfx.click(), setter[k](v)),
    onLocked: () => goShop(to),
    onTry: () => setHov({ k, v }),
    onUntry: () => setHov((h) => (h?.k === k && h.v === v ? null : h)),
    lockLabel: t('ui.pp_shop'),
  });
  const ppName = (a: string) => {
    const k = `ui.pp_${a}` as 'ui.pp_etoile',
      n = t(k);
    return n === k ? a.charAt(0).toUpperCase() + a.slice(1) : n;
  };
  return (
    <Modal open onClose={onClose} title={t('ui.edit_profile')} xl>
      <form
        className={lk.locker}
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        {/* aperçu en direct : ce que les autres verront */}
        <div className={lk.stage} style={{ '--tone': hexRGB(tone) } as CSSProperties} aria-hidden>
          <div className={lk.card}>
            <div className={lk.banner}>
              {vBanner === 'best' ? (
                <PixelBg className={lk.bannerBg} odds={bestOdds} glow={tone} still={reducedFx()} />
              ) : vBanner && BANNER_IMG[vBanner] ? (
                <img className="px" src={BANNER_IMG[vBanner]} alt="" />
              ) : null}
              <BannerFx key={vBfx} id={vBfx} />
            </div>
            <div className={lk.who}>
              <Aura key={vAura} id={vAura}>
                <span className={lk.pp}>
                  {vAv === 'default' ? (
                    <span>{(pseudo[0] ?? '?').toUpperCase()}</span>
                  ) : (
                    <img className="px" src={AVATARS[vAv]} alt="" />
                  )}
                </span>
              </Aura>
              <b className={lk.name}>
                <span key={vName} className={nameCls(vName)}>
                  {pseudo || p.pseudo}
                </span>
              </b>
              <small className={lk.bio}>{bio.trim() || '…'}</small>
            </div>
          </div>
        </div>

        <div className={lk.side}>
          <div ref={shelvesRef} className={lk.tabs} role="tablist" aria-label={t('ui.edit_profile')}>
            {TABS.map(([k, ic, l, n, tot]) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={tab === k}
                onClick={() => (sfx.click(), setTab(k))}
              >
                <span className={lk.shIc} aria-hidden>
                  {ic}
                </span>
                <span className={lk.shTxt}>
                  <b>{l}</b>
                  {tot ? <small>{t('ui.lk_owned', { n, m: tot })}</small> : null}
                </span>
              </button>
            ))}
          </div>

          <div key={tab} ref={panelRef} className={lk.panel}>
            {tab === 'id' ? (
              <div className={lk.fields}>
                <div className={s.peField}>
                  <label htmlFor="pe-pseudo">{t('ui.acc_pseudo')}</label>
                  <input
                    id="pe-pseudo"
                    value={pseudo}
                    maxLength={16}
                    disabled={!canRename}
                    autoComplete="off"
                    onChange={(e) => setPseudo(e.target.value.trim())}
                  />
                  <small>
                    {p.pseudo_free
                      ? t('ui.pseudo_free')
                      : canRename
                        ? t('ui.pseudo_month')
                        : t('ui.pseudo_next', { d: new Date(p.pseudo_next ?? '').toLocaleDateString(locale(lang)) })}
                  </small>
                </div>
                <div className={s.peField}>
                  <label htmlFor="pe-bio">{t('ui.pe_bio')}</label>
                  <textarea id="pe-bio" value={bio} maxLength={120} rows={3} onChange={(e) => setBio(e.target.value)} />
                  <small className={s.peCount}>{bio.length}/120</small>
                </div>
              </div>
            ) : (
              <div className={`${lk.grid} ${tab === 'banner' || tab === 'bfx' ? lk.gridWide : ''}`}>
                {tab === 'pp'
                  ? pps.map((a) => (
                      <LockerTile
                        key={a}
                        {...tp('pp', a)}
                        on={avatar === a}
                        have={ppOwned(a)}
                        label={a === 'default' ? t('ui.none') : ppName(a)}
                      >
                        {a === 'default' ? (
                          <span className={lk.letter}>{(p.pseudo[0] ?? '?').toUpperCase()}</span>
                        ) : (
                          <img className={`px ${lk.round}`} src={AVATARS[a]} alt="" />
                        )}
                      </LockerTile>
                    ))
                  : null}
                {tab === 'banner' ? (
                  <>
                    <LockerTile {...tp('banner', '')} on={!banner} have label={t('ui.none')} wide>
                      <span className={lk.empty} />
                    </LockerTile>
                    <LockerTile {...tp('banner', 'best')} on={banner === 'best'} have label={t('ui.pe_best')} wide>
                      <PixelBg className={lk.bannerBg} odds={bestOdds} glow={tone} still={reducedFx()} />
                    </LockerTile>
                    {allBanners.map((b) => (
                      <LockerTile
                        key={b}
                        {...tp('banner', b, b === 'yeux' ? '/pass' : '/shop')}
                        on={banner === b}
                        have={(p.banners ?? []).includes(b)}
                        label={bannerName(b, lang)}
                        wide
                      >
                        <img className="px" src={BANNER_IMG[b]} alt="" />
                      </LockerTile>
                    ))}
                  </>
                ) : null}
                {tab === 'name' || tab === 'aura' || tab === 'bfx' ? (
                  <>
                    <LockerTile
                      {...tp(tab, '')}
                      on={!{ name: nameFx, aura: auraFx, bfx: bannerFx }[tab]}
                      have
                      label={t('ui.none')}
                      wide={tab === 'bfx'}
                    >
                      <span className={lk.empty} />
                    </LockerTile>
                    {COSMETICS[tab].map((x) => (
                      <LockerTile
                        key={x}
                        {...tp(tab, x)}
                        on={{ name: nameFx, aura: auraFx, bfx: bannerFx }[tab] === x}
                        have={owned.includes(x)}
                        label={cosmName(x, lang)}
                        wide={tab === 'bfx'}
                      >
                        <CosmeticPreview id={x} label={(pseudo || p.pseudo).slice(0, 8)} />
                      </LockerTile>
                    ))}
                  </>
                ) : null}
              </div>
            )}
          </div>

          <div className={lk.actions}>
            <Button onClick={onClose}>{t('ui.cancel')}</Button>
            <Button type="submit" variant="primary" loading={busy}>
              {t('ui.save')}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

// une case du vestiaire : sélectionnée (✓), possédée, ou verrouillée (🔒, mène à la boutique) ;
// la survoler l'essaie sur l'aperçu
function LockerTile({
  on,
  have,
  label,
  wide,
  lockLabel,
  lockTag,
  onPick,
  onLocked,
  onTry,
  onUntry,
  children,
}: {
  on: boolean;
  have: boolean;
  label: string;
  wide?: boolean;
  lockLabel: string;
  lockTag: string;
  onPick: () => void;
  onLocked: () => void;
  onTry: () => void;
  onUntry: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`${lk.tile} ${wide ? lk.wide : ''} ${have ? '' : lk.lockedT}`}
      aria-pressed={on}
      aria-label={have ? label : `${label} · ${lockLabel}`}
      onClick={have ? onPick : onLocked}
      onPointerEnter={onTry}
      onPointerLeave={onUntry}
      onFocus={onTry}
      onBlur={onUntry}
    >
      <span className={lk.tileArt}>{children}</span>
      <small>{label}</small>
      {on ? <img className={`px ${lk.check}`} src="/img/ui/ok.png" alt="" /> : null}
      {have ? null : (
        <i className={lk.lock} aria-hidden>
          {lockTag}
        </i>
      )}
    </button>
  );
}

// Rang classé en grand sur le profil : gros badge qui brille, nom du rang dans sa couleur, Elo énorme
function EloHero({ pseudo, wins, losses }: { pseudo: string; wins: number; losses: number }) {
  const t = useT();
  const lang = useSettings((x) => x.lang);
  const name = useRankName();
  const q = useQuery({
    queryKey: ['ranked-of', pseudo],
    queryFn: async () => (await publicApi.rankedOf(pseudo)) as unknown as { elo: number; games: number } | null,
  });
  const elo = q.data?.elo ?? 1000;
  const r = rankOf(elo);
  return (
    <div className={s.elo} style={{ '--rc': r.col } as CSSProperties} aria-label={`${name(r)} · ${elo} Elo`}>
      <span className={s.eloBadge}>
        <RankBadge r={r} size={104} />
      </span>
      <div>
        <small className={s.eloRank}>{name(r)}</small>
        <b>
          {elo.toLocaleString(locale(lang))} <span>Elo</span>
        </b>
        {q.data?.games ? null : <small className="muted">{t('ui.elo_none')}</small>}
        {wins || losses ? (
          <span className={s.record}>
            <em className={s.win}>{wins} V</em>
            <em className={s.loss}>{losses} D</em>
            <em>{Math.round((wins / Math.max(1, wins + losses)) * 100)} %</em>
          </span>
        ) : null}
      </div>
    </div>
  );
}
