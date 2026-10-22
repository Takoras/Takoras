import { useState, type CSSProperties } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { accountApi, errorText, publicApi } from '@/api';
import { useMe } from '@/api/queries';
import { BANNER_IMG, bannerName } from '@/data/items';
import { hexRGB, jetonOf, SERIES, texOf, tierCol, tierKey, vImg, VARIANTS } from '@/data/jetons';
import { sfx } from '@/engines/sound.js';
import { openUI } from '@/app/ui-store';
import { AVATARS, FREE_PP } from '@/lib/avatars';
import { signOut, useAuth } from '@/lib/auth';
import { useJn } from '@/lib/names';
import { locale, useSettings } from '@/lib/settings';
import { useT } from '@/i18n/useT';
import { Avatar, setAvatar } from '@/ui/Avatar';
import { Button } from '@/ui/Button';
import { confirm } from '@/ui/confirm';
import { Modal } from '@/ui/Modal';
import { toast } from '@/ui/toast';
import { VTag } from '@/ui/VTag';
import { JetonModal } from '../inventory/JetonModal';
import { useInventory } from '../inventory/inv';
import { NeedLogin } from '../inventory/Bestiary';
import { FriendButton } from '../social/FriendButton';
import s from './Profile.module.css';

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
};

// Profil d'un joueur : bannière, photo, bio, stats, vitrine de 5 jetons et collection.
// Sur son propre profil : modifier, choisir la vitrine, et la zone privée (compte, déconnexion).
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
  const [jeton, setJeton] = useState<{ name: string; variant: string; locked: boolean } | null>(null);
  const [slot, setSlot] = useState<number | null>(null);
  const [edit, setEdit] = useState(false);

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
  const total = SERIES.Takoras?.length ?? 0;
  const show = p.showcase ?? [];
  return (
    <section className={s.page}>
      <div className={`${s.banner} ${p.banner && BANNER_IMG[p.banner] ? '' : s.noBanner}`}>
        {p.banner && BANNER_IMG[p.banner] ? (
          <img className="px" src={BANNER_IMG[p.banner]} alt="" />
        ) : mine ? (
          <span className="muted">{t('ui.no_banner')}</span>
        ) : null}
      </div>
      <header className={s.head}>
        <div className={s.pp}>
          <Avatar pseudo={p.pseudo} avatar={p.avatar} size={104} />
        </div>
        <div className={s.id}>
          <h1>
            {p.pseudo} <small className={s.num}>#{String(p.num).padStart(6, '0')}</small>
            {p.streak > 0 ? (
              <span className={s.streak} title={t('ui.streak_ok', { n: p.streak })}>
                {' '}
                🔥 {p.streak}
              </span>
            ) : null}
          </h1>
          <p className="muted">{p.bio || (mine ? t('ui.bio_empty_me') : '')}</p>
        </div>
        {mine ? (
          <Button onClick={() => setEdit(true)}>✏️ {t('ui.edit_profile')}</Button>
        ) : user ? (
          <FriendButton pseudo={p.pseudo} />
        ) : null}
      </header>
      <dl className={s.stats}>
        <div>
          <dt>{t('ui.st_pulls')}</dt>
          <dd>{fmt(p.pulls)}</dd>
        </div>
        <div>
          <dt>
            {t('ui.st_best')}
            {bp ? ` · 1/${fmt(bp.eff)}` : ''}
          </dt>
          <dd>
            {bp ? (
              <>
                {jn(bp.jeton)} <VTag v={bp.variant} />
              </>
            ) : (
              '—'
            )}
          </dd>
        </div>
        <div>
          <dt>{t('ui.st_collec')}</dt>
          <dd>
            {p.collection}/{total}
          </dd>
        </div>
        <div>
          <dt>{t('ui.st_owned')}</dt>
          <dd>{fmt(p.owned)}</dd>
        </div>
      </dl>
      <h2 className={s.h2}>
        {t('ui.showcase')} {mine ? <small className="muted">{t('ui.showcase_click')}</small> : null}
      </h2>
      <ul className={s.showcase}>
        {Array.from({ length: 5 }, (_, i) => {
          const x = show[i];
          if (!x)
            return (
              <li key={`e${i}`} className={`${s.sc} ${s.scEmpty}`}>
                {mine ? (
                  <button type="button" onClick={() => setSlot(i)} aria-label={t('ui.pick_title', { n: i + 1 })}>
                    +
                  </button>
                ) : null}
              </li>
            );
          const j = jetonOf(x.jeton);
          return (
            <li key={`${i}:${x.id}`} className={s.sc} style={{ '--g': hexRGB(j.glow) } as CSSProperties}>
              <button
                type="button"
                onClick={() =>
                  mine ? setSlot(i) : setJeton({ name: x.jeton, variant: x.variant ?? '', locked: false })
                }
              >
                {x.variant ? (
                  <span className={s.scV}>
                    <VTag v={x.variant} />
                  </span>
                ) : null}
                <img className={vImg(x.variant)} src={texOf(j)} alt="" />
                <b>{jn(x.jeton)}</b>
                <small style={{ color: tierCol(tierKey(x.odds)) }}>1/{fmt(x.odds)}</small>
              </button>
            </li>
          );
        })}
      </ul>
      <Collection pseudo={p.pseudo} onOpen={(name, locked) => setJeton({ name, variant: '', locked })} />
      {p.beta ? (
        <div className={s.beta}>
          <span aria-hidden>🧪</span>
          <div>
            <b>{t('ui.beta_tester')}</b>
            <small>{t('ui.beta_thanks')}</small>
          </div>
        </div>
      ) : null}
      <p className="muted">
        {t('ui.joined', { d: new Date(p.joined).toLocaleDateString(locale(lang)) })}
        {p.wins || p.losses ? ` · ${t('ui.battles_rec', { w: p.wins || 0, l: p.losses || 0 })}` : ''}
      </p>
      {mine ? (
        <section className={s.private} aria-labelledby="pv-t">
          <h2 id="pv-t" className={s.h2}>
            🔒 {t('ui.private_zone')} <small className="muted">{t('ui.private_hint')}</small>
          </h2>
          <div className={s.row}>
            <span>{t('ui.pv_login')}</span>
            <b>{p.provider === 'discord' ? 'Discord' : (p.provider ?? '—')}</b>
          </div>
          <div className={s.row}>
            <span>{t('ui.pv_email')}</span>
            <b>{p.email ?? '—'}</b>
          </div>
          <div className={s.row}>
            <span>{t('ui.settings')}</span>
            <Button size="sm" onClick={() => openUI('settings')}>
              {t('ui.open')}
            </Button>
          </div>
          <Button
            onClick={async () => {
              await signOut();
              void nav('/');
            }}
          >
            {t('ui.logout')}
          </Button>
        </section>
      ) : null}
      <JetonModal
        name={jeton?.name ?? null}
        variant={jeton?.variant}
        locked={jeton?.locked}
        onClose={() => setJeton(null)}
      />
      {mine && slot !== null ? <ShowcasePicker p={p} slot={slot} onClose={() => setSlot(null)} /> : null}
      {mine && edit ? <EditProfile p={p} onClose={() => setEdit(false)} /> : null}
    </section>
  );
}

// Collection d'un joueur : tous les jetons du jeu, ceux déjà eus en couleur, avec les variantes trouvées
function Collection({ pseudo, onOpen }: { pseudo: string; onOpen: (name: string, locked: boolean) => void }) {
  const t = useT();
  const jn = useJn();
  const lang = useSettings((x) => x.lang);
  const fmt = (n: number) => n.toLocaleString(locale(lang));
  const q = useQuery({ queryKey: ['collection', pseudo.toLowerCase()], queryFn: () => publicApi.collectionOf(pseudo) });
  const got = new Map<string, Set<string>>();
  (q.data ?? []).forEach((r) => {
    const v = got.get(r.jeton) ?? new Set<string>();
    if (r.variant) v.add(r.variant);
    got.set(r.jeton, v);
  });
  const all = [...(SERIES.Takoras ?? [])].sort((a, b) => a.odds - b.odds);
  return (
    <>
      <h2 className={s.h2}>
        {t('ui.bestiary')}{' '}
        <small className="muted">{q.data ? `${all.filter((j) => got.has(j.name)).length}/${all.length}` : ''}</small>
      </h2>
      <ul className={s.coll}>
        {all.map((j) => {
          const c = got.get(j.name);
          return (
            <li key={j.name} style={{ '--g': hexRGB(j.glow) } as CSSProperties} className={c ? undefined : s.unk}>
              <button
                type="button"
                onClick={() => {
                  sfx.click();
                  onOpen(j.name, !c);
                }}
                aria-label={c ? `${jn(j.name)} · 1/${fmt(j.odds)}` : `??? · 1/${fmt(j.odds)}`}
              >
                <img className={c ? 'px' : `px ${s.sil}`} src={texOf(j)} alt="" />
                <small>1/{fmt(j.odds)}</small>
                <span className={s.dots} aria-hidden>
                  {Object.keys(VARIANTS).map((v) => (
                    <i key={v} className={`${s.dot} ${s[`d_${v}`]} ${c?.has(v) ? s.on : ''}`} />
                  ))}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </>
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

// Choisir le jeton d'une case de la vitrine
function ShowcasePicker({ p, slot, onClose }: { p: Prof; slot: number; onClose: () => void }) {
  const t = useT();
  const jn = useJn();
  const lang = useSettings((x) => x.lang);
  const qc = useQueryClient();
  const inv = useInventory();
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'rarity' | 'name'>('rarity');
  const fmt = (n: number) => n.toLocaleString(locale(lang));
  const show = p.showcase ?? [];
  const used = new Set(show.filter(Boolean).map((x) => x?.id));
  const list = (inv.data?.groups ?? [])
    .filter((g) => jn(g.name).toLowerCase().includes(q.toLowerCase()))
    .sort(sort === 'name' ? (a, b) => jn(a.name).localeCompare(jn(b.name)) : (a, b) => b.odds - a.odds);
  const save = async (id: number | null) => {
    // 5 cases fixes : le jeton va exactement dans la case choisie
    const ids = Array.from({ length: 5 }, (_, i) => show[i]?.id ?? null);
    ids[slot] = id;
    try {
      await saveProfile(p, { p_showcase: ids });
      sfx.click();
      onClose();
      await qc.invalidateQueries({ queryKey: ['profile', p.pseudo.toLowerCase()] });
      void qc.invalidateQueries({ queryKey: ['inv'] });
    } catch (e) {
      toast(errorText(e, lang), true);
    }
  };
  return (
    <Modal open onClose={onClose} title={t('ui.pick_title', { n: slot + 1 })} wide>
      <div className={s.pkTools}>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value.trim())}
          placeholder={t('ui.search')}
          aria-label={t('ui.search')}
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as 'rarity' | 'name')}
          aria-label={t('ui.sort_rarity')}
        >
          <option value="rarity">{t('ui.sort_rarity')}</option>
          <option value="name">{t('ui.sort_name')}</option>
        </select>
      </div>
      {!inv.data ? (
        <p className="muted" aria-busy>
          …
        </p>
      ) : list.length ? (
        <ul className={s.pk}>
          {list.map((g) => {
            const j = jetonOf(g.name, g.serie),
              id = g.ids.find((i) => !used.has(i));
            return (
              <li key={g.key} style={{ '--g': hexRGB(j.glow) } as CSSProperties}>
                <button
                  type="button"
                  className={id ? undefined : s.off}
                  onClick={() => (id ? void save(id) : toast(t('ui.already_showcase')))}
                >
                  <img className={vImg(g.variant)} src={texOf(j)} alt="" />
                  <b>
                    {jn(g.name)} <VTag v={g.variant} />
                  </b>
                  <small>
                    1/{fmt(g.odds)}
                    {g.ids.length > 1 ? ` · ×${g.ids.length}` : ''}
                  </small>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="muted">{t('ui.inv_empty')}</p>
      )}
      {show[slot] ? <Button onClick={() => void save(null)}>{t('ui.pick_remove')}</Button> : null}
    </Modal>
  );
}

// Modifier le profil : pseudo (1 fois / 30 jours), bio, bannière achetée, photo
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
  const [busy, setBusy] = useState(false);
  const canRename = !!p.pseudo_free || !p.pseudo_next;
  const pps = ['default', ...FREE_PP, ...Object.keys(AVATARS).filter((a) => !FREE_PP.includes(a))];
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
      setAvatar(name, avatar);
      sfx.upgrade();
      toast(t('ui.profile_saved'));
      onClose();
      void qc.invalidateQueries({ queryKey: ['me', user?.id] });
      await qc.invalidateQueries({ queryKey: ['profile'] });
      if (name !== p.pseudo) void nav(`/profil/${encodeURIComponent(name)}`);
    } catch (e) {
      sfx.deny();
      toast(errorText(e, lang), true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open onClose={onClose} title={t('ui.edit_profile')} wide>
      <form
        className={s.pe}
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <label htmlFor="pe-pseudo">
          {t('ui.acc_pseudo')}{' '}
          <small className="muted">
            {p.pseudo_free
              ? t('ui.pseudo_free')
              : canRename
                ? t('ui.pseudo_month')
                : t('ui.pseudo_next', { d: new Date(p.pseudo_next ?? '').toLocaleDateString(locale(lang)) })}
          </small>
        </label>
        <input
          id="pe-pseudo"
          value={pseudo}
          maxLength={16}
          disabled={!canRename}
          autoComplete="off"
          onChange={(e) => setPseudo(e.target.value.trim())}
        />
        <label htmlFor="pe-bio">
          {t('ui.pe_bio')} <small className="muted">{bio.length}/120</small>
        </label>
        <textarea id="pe-bio" value={bio} maxLength={120} rows={2} onChange={(e) => setBio(e.target.value)} />
        <fieldset>
          <legend>{t('ui.pe_banner')}</legend>
          {(p.banners ?? []).length ? (
            <div className={s.banners}>
              <button type="button" aria-pressed={!banner} onClick={() => setBanner('')}>
                {t('ui.none')}
              </button>
              {(p.banners ?? []).map((b) => (
                <button
                  key={b}
                  type="button"
                  aria-pressed={banner === b}
                  onClick={() => setBanner(b)}
                  aria-label={bannerName(b, lang)}
                >
                  {BANNER_IMG[b] ? <img className="px" src={BANNER_IMG[b]} alt="" /> : bannerName(b, lang)}
                </button>
              ))}
            </div>
          ) : (
            <p className="muted">{t('ui.no_banner_owned')}</p>
          )}
        </fieldset>
        <fieldset>
          <legend>{t('ui.pe_pp')}</legend>
          <div className={s.pps}>
            {pps.map((a) => {
              const owned = a === 'default' || FREE_PP.includes(a) || (p.avatars ?? []).includes(a);
              return (
                <button
                  key={a}
                  type="button"
                  aria-pressed={avatar === a}
                  className={owned ? undefined : s.lockedPp}
                  aria-label={owned ? a : `${a} · ${t('ui.pp_shop')}`}
                  onClick={() => {
                    if (!owned) {
                      onClose();
                      toast(t('ui.pp_shop'));
                      return void nav('/boutique');
                    }
                    sfx.click();
                    setAv(a);
                  }}
                >
                  {a === 'default' ? (
                    <span>{(p.pseudo[0] ?? '?').toUpperCase()}</span>
                  ) : (
                    <img className="px" src={AVATARS[a]} alt="" />
                  )}
                  {owned ? null : <i aria-hidden>🔒</i>}
                </button>
              );
            })}
          </div>
        </fieldset>
        <div className={s.peActions}>
          <Button type="submit" variant="primary" loading={busy}>
            {t('ui.save')}
          </Button>
          <Button onClick={onClose}>{t('ui.cancel')}</Button>
        </div>
      </form>
    </Modal>
  );
}
