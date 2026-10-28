/* eslint-disable react-refresh/only-export-components -- le magasin des annonces vit à côté de son affichage */
import { usePoll } from '@/lib/poll';
import { useEffect } from 'react';
import { create } from 'zustand';
import { tables } from '@/api';
import { sfx } from '@/engines/sound.js';
import { useT } from '@/i18n/useT';
import { Button } from '@/ui/Button';
import { Modal } from '@/ui/Modal';
import { toast } from '@/ui/toast';
import { dateOf, lsGet, lsSet } from './social';
import s from './Social.module.css';

// Annonces de l'admin : plein écran en direct, bandeau en haut, historique (cloche) avec les annonces ratées.
// Mêmes clés de stockage que l'ancien site : ce qui a été lu là-bas reste lu ici.
type Ann = {
  id: number;
  body: string;
  author: string | null;
  banner: boolean;
  fullscreen: boolean;
  created_at: string;
};
type St = { list: Ann[]; seen: number | null; closed: number; full: { a: Ann; more: Ann[] } | null; hist: boolean };
const SEEN = 'takoras-ann-seen',
  CLOSED = 'takoras-ann-closed';
export const useAnn = create<St>(() => ({
  list: [],
  seen: lsGet<number | null>(SEEN, null),
  closed: lsGet(CLOSED, 0),
  full: null,
  hist: false,
}));

function markSeen() {
  const { list, seen } = useAnn.getState();
  const top = Math.max(seen ?? 0, list[0]?.id ?? 0);
  lsSet(SEEN, top);
  useAnn.setState({ seen: top });
}
export const unreadAnn = (st: St) => st.list.filter((a) => a.id > (st.seen ?? 0)).length;
export const openAnnHistory = () => {
  sfx.click();
  useAnn.setState({ hist: true });
};

export function Announcements() {
  const t = useT();
  const { list, closed, full, hist, seen } = useAnn();
  useEffect(() => {
    void (async () => {
      const { data } = await tables.announcements(30);
      const l = ((data ?? []) as Ann[]).sort((a, b) => b.id - a.id);
      let sn = useAnn.getState().seen;
      // Premier passage sur le site : seulement les annonces des 3 derniers jours
      if (sn === null) sn = l.find((a) => Date.now() - Date.parse(a.created_at) > 3 * 864e5)?.id ?? 0;
      const missed = l.filter((a) => a.id > (sn ?? 0));
      useAnn.setState({ list: l, seen: sn });
      if (missed[0]) {
        sfx.announce();
        useAnn.setState({ full: { a: missed[0], more: missed.slice(1) } });
      } else markSeen();
    })().catch(() => undefined);
  }, []);
  // nouvelles annonces : on revérifie toutes les 90 s (plus de connexion en direct ouverte en permanence)
  usePoll(async () => {
    const st = useAnn.getState();
    if (!st.list.length) return; // le premier chargement s'en occupe
    const { data } = await tables.announcements(30);
    const l = ((data ?? []) as Ann[]).sort((a, b) => b.id - a.id);
    const known = new Set(st.list.map((x) => x.id));
    const fresh = l.filter((a) => !known.has(a.id) && a.id > (st.list[0]?.id ?? 0) && a.id > (st.seen ?? 0));
    useAnn.setState({ list: l });
    const a = fresh[0];
    if (!a) return;
    if (a.fullscreen) {
      sfx.announce();
      useAnn.setState({ full: { a, more: fresh.slice(1) } });
    } else {
      sfx.message();
      toast(`${a.body}`);
    }
  }, 90_000);

  const bar = list.find((x) => x.banner);
  const who = (a: Ann) => `${a.author ? `${a.author} · ` : ''}${dateOf(a.created_at)}`;
  return (
    <>
      {bar && bar.id > closed ? (
        <div className={s.annBar} role="region" aria-label={t('ui.ann_title')}>
          <span aria-hidden></span>
          <p>{bar.body}</p>
          <small className="muted">{who(bar)}</small>
          <button
            type="button"
            onClick={() => {
              sfx.click();
              lsSet(CLOSED, bar.id);
              useAnn.setState({ closed: bar.id });
            }}
            aria-label={t('ui.close')}
          >
            ✕
          </button>
        </div>
      ) : null}
      <Modal
        open={!!full}
        onClose={() => {
          markSeen();
          useAnn.setState({ full: null });
        }}
        locked
      >
        {full ? (
          <div className={s.annFull}>
            <p className={s.annTag}>{t('ui.ann_title')}</p>
            <p className={s.annBody}>{full.a.body}</p>
            <small className="muted">{who(full.a)}</small>
            {full.more.length ? (
              <div className={s.annMore}>
                <b>{t('ui.ann_missed', { n: full.more.length })}</b>
                {full.more.slice(0, 5).map((m) => (
                  <div key={m.id}>
                    <p>{m.body}</p>
                    <small className="muted">{dateOf(m.created_at)}</small>
                  </div>
                ))}
              </div>
            ) : null}
            <Button
              variant="primary"
              block
              onClick={() => {
                sfx.click();
                markSeen();
                useAnn.setState({ full: null });
              }}
            >
              {t('ui.ann_ok')}
            </Button>
          </div>
        ) : null}
      </Modal>
      <Modal
        open={hist}
        onClose={() => {
          markSeen();
          useAnn.setState({ hist: false });
        }}
        title={`${t('ui.ann_hist')}`}
      >
        <ul className={s.annHist}>
          {list.map((a) => (
            <li key={a.id} className={a.id > (seen ?? 0) ? s.new : undefined}>
              <p>{a.body}</p>
              <small className="muted">
                {who(a)}
                {a.id > (seen ?? 0) ? (
                  <>
                    {' '}
                    · <b>{t('ui.new')}</b>
                  </>
                ) : null}
              </small>
            </li>
          ))}
          {list.length ? null : <li className="muted">{t('ui.ann_none')}</li>}
        </ul>
      </Modal>
    </>
  );
}
