import { useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { errorText, publicApi, socialApi } from '@/api';
import { useMe } from '@/api/queries';
import { sfx } from '@/engines/sound.js';
import { useAuth } from '@/lib/auth';
import { useSettings } from '@/lib/settings';
import { useT } from '@/i18n/useT';
import { Avatar } from '@/ui/Avatar';
import { Button } from '@/ui/Button';
import { confirm } from '@/ui/confirm';
import { toast } from '@/ui/toast';
import { NeedLogin } from '@/app/NeedLogin';
import { friendRequest } from './FriendButton';
import { dateOf, useFriends, type Friend } from './social';
import s from './Social.module.css';

type Tab = 'ok' | 'inc' | 'out';

// Page Amis : à gauche ta carte (pseudo, ID à partager) et l'ajout par pseudo ;
// à droite tes amis en cartes (en ligne, Elo, collection), les demandes reçues et envoyées.
export default function Friends() {
  const t = useT();
  const lang = useSettings((x) => x.lang);
  const user = useAuth((x) => x.user);
  const me = useMe();
  const qc = useQueryClient();
  const fr = useFriends();
  const pseudo0 = me.data?.pseudo ?? '';
  const prof = useQuery({
    queryKey: ['profile', pseudo0],
    enabled: !!pseudo0,
    queryFn: async () => (await publicApi.profile(pseudo0)) as { num?: number; avatar?: string } | null,
  });
  const [pseudo, setPseudo] = useState('');
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab | null>(null);
  if (!user) return <NeedLogin title={t('ui.nav_friends')} />;
  const list = fr.data ?? [];
  const inc = list.filter((f) => f.incoming),
    out = list.filter((f) => f.status === 'pending' && !f.incoming),
    ok = list.filter((f) => f.status === 'accepted');
  const online = ok.filter((f) => f.online).length;
  // onglet par défaut : les demandes reçues s'il y en a
  const cur: Tab = tab ?? (inc.length ? 'inc' : 'ok');
  const reload = () => qc.invalidateQueries({ queryKey: ['friends'] });
  const add = async (e: FormEvent) => {
    e.preventDefault();
    const v = pseudo.trim();
    if (!v) return;
    setBusy(true);
    if (await friendRequest(v, lang, t)) setPseudo('');
    setBusy(false);
    void reload();
  };
  const respond = async (f: Friend, yes: boolean) => {
    try {
      await socialApi.respond(f.id, yes);
      if (yes) {
        sfx.upgrade();
        toast(t('ui.fr_now', { n: f.pseudo }));
      } else sfx.click();
    } catch (err) {
      toast(errorText(err, lang), true);
    }
    void reload();
  };
  const remove = async (f: Friend) => {
    if (!(await confirm(t('ui.fr_remove_q', { n: f.pseudo }), { danger: true }))) return;
    try {
      await socialApi.remove(f.id);
    } catch (err) {
      toast(errorText(err, lang), true);
    }
    void reload();
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(pseudo0);
      sfx.click();
      toast('Pseudo copié : envoie-le à tes amis !');
    } catch {
      toast(pseudo0);
    }
  };
  const card = (f: Friend, actions: ReactNode) => (
    <li key={f.id} className={`${s.frCard} ${f.online ? s.isOn : ''}`}>
      <span className={s.frAva}>
        <Avatar pseudo={f.pseudo} avatar={f.avatar} size={56} />
        {f.status === 'accepted' ? <i className={s.dotOn} aria-hidden /> : null}
      </span>
      <div className={s.who}>
        <Link to={`/profil/${encodeURIComponent(f.pseudo)}`}>{f.pseudo}</Link>
        <small className="muted">
          {f.status === 'accepted'
            ? f.online
              ? 'En ligne'
              : f.last_at
                ? t('ui.fr_last', { d: dateOf(f.last_at) })
                : 'Hors ligne'
            : f.incoming
              ? t('ui.fr_wants')
              : t('ui.fr_sent')}
        </small>
        {f.status === 'accepted' ? (
          <span className={s.chips}>
            {f.elo != null ? <b title="Elo">⚔ {f.elo}</b> : null}
            {f.collection != null ? <b title="Jetons trouvés">◆ {f.collection}</b> : null}
          </span>
        ) : null}
      </div>
      {Number(f.unread) ? (
        <i className={s.badge} aria-label={`${f.unread}`}>
          {f.unread}
        </i>
      ) : null}
      <div className={s.act}>{actions}</div>
    </li>
  );
  const TABS: [Tab, string, number][] = [
    ['ok', t('ui.fr_list'), ok.length],
    ['inc', t('ui.fr_requests'), inc.length],
    ['out', t('ui.fr_pending'), out.length],
  ];
  return (
    <section className={s.frPage}>
      <header className={s.frHead}>
        <h1>{t('ui.fr_title')}</h1>
        <p className="muted">
          {ok.length} ami{ok.length > 1 ? 's' : ''} · <span className={s.onTxt}>{online} en ligne</span>
        </p>
      </header>

      <aside className={s.frSide}>
        {/* ta carte : ce qu'il faut donner à un ami pour qu'il t'ajoute */}
        <div className={s.meCard}>
          <Avatar pseudo={pseudo0 || '?'} avatar={prof.data?.avatar} size={72} />
          <div>
            <small className="muted">Ton pseudo</small>
            <b>{pseudo0 || '…'}</b>
            {prof.data?.num ? <small className={s.meId}>ID #{prof.data.num}</small> : null}
          </div>
          <Button size="sm" onClick={() => void copy()} disabled={!pseudo0}>
            Copier
          </Button>
        </div>
        <form className={s.addBox} onSubmit={(e) => void add(e)}>
          <h2 className={s.h2}>Ajouter un ami</h2>
          <p className="muted">Entre son pseudo exact : il recevra ta demande.</p>
          <div className={s.add}>
            <input
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              placeholder={t('ui.fr_add_ph')}
              maxLength={16}
              autoComplete="off"
              aria-label={t('ui.fr_add_ph')}
            />
            <Button type="submit" variant="primary" loading={busy}>
              {t('ui.fr_add')}
            </Button>
          </div>
        </form>
      </aside>

      <div className={s.frMain}>
        <div className={s.frTabs} role="tablist" aria-label={t('ui.fr_title')}>
          {TABS.map(([k, l, n]) => (
            <button key={k} type="button" role="tab" aria-selected={cur === k} onClick={() => setTab(k)}>
              {l}
              {n ? <i className={k === 'inc' ? s.badge : s.cnt}>{n}</i> : null}
            </button>
          ))}
        </div>
        {!fr.data ? (
          <p className="muted" aria-busy>
            …
          </p>
        ) : cur === 'inc' ? (
          inc.length ? (
            <ul className={s.frGrid}>
              {inc.map((f) =>
                card(
                  f,
                  <>
                    <Button size="sm" variant="primary" onClick={() => void respond(f, true)}>
                      ✓ {t('ui.fr_accept')}
                    </Button>
                    <Button size="sm" onClick={() => void respond(f, false)} aria-label={t('ui.cancel')}>
                      ✕
                    </Button>
                  </>,
                ),
              )}
            </ul>
          ) : (
            <p className="muted">Aucune demande pour l’instant.</p>
          )
        ) : cur === 'out' ? (
          out.length ? (
            <ul className={s.frGrid}>
              {out.map((f) =>
                card(
                  f,
                  <Button size="sm" onClick={() => void respond(f, false)}>
                    {t('ui.cancel')}
                  </Button>,
                ),
              )}
            </ul>
          ) : (
            <p className="muted">Aucune demande envoyée.</p>
          )
        ) : ok.length ? (
          <ul className={s.frGrid}>
            {ok.map((f) =>
              card(
                f,
                <Button size="sm" onClick={() => void remove(f)} aria-label={`${t('ui.fr_remove')} ${f.pseudo}`}>
                  ✕
                </Button>,
              ),
            )}
          </ul>
        ) : (
          <p className="muted">{t('ui.fr_empty')}</p>
        )}
      </div>
    </section>
  );
}
