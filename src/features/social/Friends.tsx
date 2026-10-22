import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { errorText, socialApi } from '@/api';
import { sfx } from '@/engines/sound.js';
import { useAuth } from '@/lib/auth';
import { useSettings } from '@/lib/settings';
import { useT } from '@/i18n/useT';
import { Avatar } from '@/ui/Avatar';
import { Button } from '@/ui/Button';
import { confirm } from '@/ui/confirm';
import { toast } from '@/ui/toast';
import { NeedLogin } from '@/app/NeedLogin';
import { openChat } from './chatStore';
import { friendRequest } from './FriendButton';
import { dateOf, useFriends, type Friend } from './social';
import s from './Social.module.css';

// Page Amis : ajouter par pseudo, demandes reçues, amis (chat), demandes envoyées
export default function Friends() {
  const t = useT();
  const lang = useSettings((x) => x.lang);
  const user = useAuth((x) => x.user);
  const qc = useQueryClient();
  const fr = useFriends();
  const [pseudo, setPseudo] = useState('');
  const [busy, setBusy] = useState(false);
  if (!user) return <NeedLogin title={t('ui.nav_friends')} />;
  const list = fr.data ?? [];
  const inc = list.filter((f) => f.incoming),
    out = list.filter((f) => f.status === 'pending' && !f.incoming),
    ok = list.filter((f) => f.status === 'accepted');
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
  const row = (f: Friend, actions: React.ReactNode) => (
    <li key={f.id} className={s.fr}>
      <Avatar pseudo={f.pseudo} size={44} />
      <div className={s.who}>
        <Link to={`/profil/${encodeURIComponent(f.pseudo)}`}>{f.pseudo}</Link>
        <small className="muted">
          {f.status === 'accepted'
            ? f.last_at
              ? t('ui.fr_last', { d: dateOf(f.last_at) })
              : t('ui.fr_no_msg')
            : f.incoming
              ? t('ui.fr_wants')
              : t('ui.fr_sent')}
        </small>
      </div>
      {Number(f.unread) ? (
        <i className={s.badge} aria-label={`${f.unread}`}>
          {f.unread}
        </i>
      ) : null}
      <div className={s.act}>{actions}</div>
    </li>
  );
  return (
    <section className={s.page}>
      <header>
        <p className="eyebrow">{t('ui.nav_friends')}</p>
        <h1>{t('ui.fr_title')}</h1>
      </header>
      <form className={s.add} onSubmit={(e) => void add(e)}>
        <input
          value={pseudo}
          onChange={(e) => setPseudo(e.target.value)}
          placeholder={t('ui.fr_add_ph')}
          maxLength={16}
          autoComplete="off"
          aria-label={t('ui.fr_add_ph')}
        />
        <Button type="submit" variant="primary" loading={busy}>
          ➕ {t('ui.fr_add')}
        </Button>
      </form>
      {!fr.data ? (
        <p className="muted" aria-busy>
          …
        </p>
      ) : (
        <>
          {inc.length ? (
            <section aria-labelledby="fr-inc">
              <h2 id="fr-inc" className={s.h2}>
                {t('ui.fr_requests')} <small className="muted">{inc.length}</small>
              </h2>
              <ul className={s.list}>
                {inc.map((f) =>
                  row(
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
            </section>
          ) : null}
          <section aria-labelledby="fr-ok">
            <h2 id="fr-ok" className={s.h2}>
              {t('ui.fr_list')} <small className="muted">{ok.length}</small>
            </h2>
            {ok.length ? (
              <ul className={s.list}>
                {ok.map((f) =>
                  row(
                    f,
                    <>
                      <Button size="sm" variant="primary" onClick={() => openChat(f.id)}>
                        💬 {t('ui.fr_chat')}
                      </Button>
                      <Button size="sm" onClick={() => void remove(f)} aria-label={`${t('ui.fr_remove')} ${f.pseudo}`}>
                        ✕
                      </Button>
                    </>,
                  ),
                )}
              </ul>
            ) : (
              <p className="muted">{t('ui.fr_empty')}</p>
            )}
          </section>
          {out.length ? (
            <section aria-labelledby="fr-out">
              <h2 id="fr-out" className={s.h2}>
                {t('ui.fr_pending')} <small className="muted">{out.length}</small>
              </h2>
              <ul className={s.list}>
                {out.map((f) =>
                  row(
                    f,
                    <Button size="sm" onClick={() => void respond(f, false)}>
                      {t('ui.cancel')}
                    </Button>,
                  ),
                )}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </section>
  );
}
