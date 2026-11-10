import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { errorText, publicApi, socialApi } from '@/api';
import { useMe } from '@/api/queries';
import { sfx } from '@/engines/sound.js';
import { useAuth } from '@/lib/auth';
import { useSettings } from '@/lib/settings';
import { useT } from '@/i18n/useT';
import type { Key } from '@/i18n';
import { Avatar } from '@/ui/Avatar';
import { Button } from '@/ui/Button';
import { confirm } from '@/ui/confirm';
import { toast } from '@/ui/toast';
import { useSwingAll } from '@/ui/useSwing';
import { useStaggerIn } from '@/ui/useStaggerIn';
import { NeedLogin } from '@/app/NeedLogin';
import { useFriends, type Friend } from './social';
import s from './Friends.module.css';

type Tab = 'ok' | 'inc' | 'out';

// Page Amis : la disposition de l'ancienne page (ta carte et l'ajout à gauche, onglets à droite)
// avec la DA de la boutique et du passe (cases sombres, en ligne d'abord, balancement au survol).
// Pas de notification : chaque action se voit sur place (case qui part, bouton « Copié », message sous le champ).
export default function Friends() {
  const t = useT();
  const lang = useSettings((x) => x.lang);
  const user = useAuth((x) => x.user);
  const me = useMe();
  const qc = useQueryClient();
  const fr = useFriends();
  const pageRef = useRef<HTMLElement>(null);
  const pseudo0 = me.data?.pseudo ?? '';
  const prof = useQuery({
    queryKey: ['profile', pseudo0],
    enabled: !!pseudo0,
    queryFn: async () => (await publicApi.profile(pseudo0)) as { num?: number; avatar?: string } | null,
  });
  const [pseudo, setPseudo] = useState('');
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<{ txt: string; ok: boolean } | null>(null);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<Tab | null>(null);
  useStaggerIn(
    pageRef,
    `.${s.head}, .${s.me}, .${s.addBox}, .${s.tabs}, .${s.reqs} > li, .${s.grid} > li, .${s.empty}`,
    !!fr.data,
  );
  useSwingAll(pageRef, `.${s.card}, .${s.me}`, 0.45, `${String(fr.dataUpdatedAt)}|${tab ?? ''}`);
  if (!user) return <NeedLogin title={t('ui.nav_friends')} />;

  const list = fr.data ?? [];
  const inc = list.filter((f) => f.incoming),
    out = list.filter((f) => f.status === 'pending' && !f.incoming),
    // en ligne d'abord, puis par pseudo
    ok = list
      .filter((f) => f.status === 'accepted')
      .sort((a, b) => Number(!!b.online) - Number(!!a.online) || a.pseudo.localeCompare(b.pseudo));
  const online = ok.filter((f) => f.online).length;
  // onglet par défaut : les demandes reçues s'il y en a
  const cur: Tab = tab ?? (inc.length ? 'inc' : 'ok');
  const TABS: [Tab, string, number][] = [
    ['ok', t('ui.fr_list'), ok.length],
    ['inc', t('ui.fr_requests'), inc.length],
    ['out', t('ui.fr_pending'), out.length],
  ];
  const reload = () => qc.invalidateQueries({ queryKey: ['friends'] });

  // une case qui part (acceptée, refusée, retirée) : elle s'efface doucement avant la mise à jour
  const leave = async (id: string) => {
    const el = pageRef.current?.querySelector<HTMLElement>(`[data-fid="${id}"]`);
    if (el)
      await el
        .animate(
          [
            { opacity: 1, scale: '1' },
            { opacity: 0, scale: '.94' },
          ],
          {
            duration: 240,
            easing: 'ease-in',
            fill: 'forwards',
          },
        )
        .finished.catch(() => undefined);
  };

  const add = async (e: FormEvent) => {
    e.preventDefault();
    const v = pseudo.trim();
    if (!v || busy) return;
    setBusy(true);
    try {
      const r = await socialApi.request(v);
      sfx.upgrade();
      setSaid({ txt: t(`ui.fr_res_${r}` as Key, { n: v }), ok: true });
      setPseudo('');
    } catch (err) {
      sfx.deny();
      setSaid({ txt: errorText(err, lang), ok: false });
    }
    setBusy(false);
    void reload();
  };
  const respond = async (f: Friend, yes: boolean) => {
    try {
      await socialApi.respond(f.id, yes);
      if (yes) sfx.upgrade();
      else sfx.click();
      await leave(f.id);
    } catch (err) {
      toast(errorText(err, lang), true);
    }
    void reload();
  };
  const remove = async (f: Friend) => {
    if (!(await confirm(t('ui.fr_remove_q', { n: f.pseudo }), { danger: true }))) return;
    try {
      await socialApi.remove(f.id);
      await leave(f.id);
    } catch (err) {
      toast(errorText(err, lang), true);
    }
    void reload();
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(pseudo0);
      sfx.click();
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* presse-papier bloqué : le pseudo reste affiché, on peut le sélectionner */
    }
  };
  const status = (f: Friend) => (f.online ? 'En ligne' : 'Hors ligne');
  const href = (p: string) => `/profile/${encodeURIComponent(p)}`;

  return (
    <section ref={pageRef} className={s.page}>
      <header className={s.head}>
        <h1>{t('ui.fr_title')}</h1>
        <span className={s.chip}>
          <i className={s.dot} aria-hidden />
          {online} en ligne
        </span>
        <span className={s.chip}>
          {ok.length} ami{ok.length > 1 ? 's' : ''}
        </span>
      </header>

      {/* à gauche : ta carte et l'ajout (comme l'ancienne page) */}
      <aside className={s.side}>
        <div className={s.me}>
          <Avatar pseudo={pseudo0 || '?'} avatar={prof.data?.avatar} size={84} />
          <div className={s.meTxt}>
            <b>{pseudo0 || '…'}</b>
            {prof.data?.num ? <small>#{String(prof.data.num).padStart(6, '0')}</small> : null}
          </div>
          <Button size="sm" onClick={() => void copy()} disabled={!pseudo0}>
            {copied ? 'Copié ✓' : 'Copier mon pseudo'}
          </Button>
        </div>
        <form className={s.addBox} onSubmit={(e) => void add(e)}>
          <label htmlFor="fr-add">Ajouter un ami</label>
          <div className={s.add}>
            <input
              id="fr-add"
              value={pseudo}
              onChange={(e) => {
                setPseudo(e.target.value);
                setSaid(null);
              }}
              placeholder={t('ui.fr_add_ph')}
              maxLength={16}
              autoComplete="off"
            />
            <Button type="submit" variant="primary" loading={busy} disabled={!pseudo.trim()}>
              Ajouter
            </Button>
          </div>
          <p className={`${s.said} ${said ? (said.ok ? s.saidOk : s.saidKo) : ''}`} role="status">
            {said?.txt ?? ''}
          </p>
        </form>
      </aside>

      {/* à droite : les onglets (amis, demandes reçues, envoyées) */}
      <div className={s.main}>
        <div className={s.tabs} role="tablist" aria-label={t('ui.fr_title')}>
          {TABS.map(([k, l, n]) => (
            <button key={k} type="button" role="tab" aria-selected={cur === k} onClick={() => setTab(k)}>
              {l}
              {n ? <i className={k === 'inc' ? s.count : s.cnt}>{n}</i> : null}
            </button>
          ))}
        </div>
        {!fr.data ? (
          <p className="muted" aria-busy>
            …
          </p>
        ) : cur === 'ok' ? (
          ok.length ? (
            <ul key="ok" className={s.grid}>
              {ok.map((f) => (
                <li key={f.id} data-fid={f.id} className={`${s.card} ${f.online ? s.on : ''}`}>
                  <Link to={href(f.pseudo)} className={s.cardLink}>
                    <span className={s.ava}>
                      <Avatar pseudo={f.pseudo} avatar={f.avatar} size={76} />
                      <i className={s.dot} aria-hidden />
                    </span>
                    <b className={s.name}>{f.pseudo}</b>
                    <small className={s.st}>{status(f)}</small>
                    <span className={s.stats}>
                      {f.elo != null ? (
                        <span>
                          <b>{f.elo}</b> Elo
                        </span>
                      ) : null}
                      {f.collection != null ? (
                        <span>
                          <b>{f.collection}</b> jetons
                        </span>
                      ) : null}
                    </span>
                  </Link>
                  <button
                    type="button"
                    className={`${s.x} ${s.rm}`}
                    onClick={() => void remove(f)}
                    aria-label={`${t('ui.fr_remove')} ${f.pseudo}`}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className={s.empty}>{t('ui.fr_empty')}</p>
          )
        ) : (cur === 'inc' ? inc : out).length ? (
          <ul key={cur} className={s.reqs}>
            {(cur === 'inc' ? inc : out).map((f) => (
              <li key={f.id} data-fid={f.id} className={`${s.req} ${cur === 'out' ? s.reqOut : ''}`}>
                <Link to={href(f.pseudo)} className={s.reqWho}>
                  <Avatar pseudo={f.pseudo} avatar={f.avatar} size={48} />
                  <span>
                    <b>{f.pseudo}</b>
                    <small>{cur === 'inc' ? t('ui.fr_wants') : t('ui.fr_sent')}</small>
                  </span>
                </Link>
                {cur === 'inc' ? (
                  <Button size="sm" variant="primary" onClick={() => void respond(f, true)}>
                    {t('ui.fr_accept')}
                  </Button>
                ) : null}
                <button
                  type="button"
                  className={s.x}
                  onClick={() => void respond(f, false)}
                  aria-label={`${t('ui.cancel')} · ${f.pseudo}`}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className={s.empty}>{cur === 'inc' ? 'Aucune demande pour l’instant.' : 'Aucune demande envoyée.'}</p>
        )}
      </div>
    </section>
  );
}
