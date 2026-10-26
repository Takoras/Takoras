import { useEffect, useEffectEvent, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { errorText, publicApi, socialApi } from '@/api';
import { itemImg, itemText, type ShopItem } from '@/data/items';
import { sfx } from '@/engines/sound.js';
import { useAuth } from '@/lib/auth';
import { locale, useSettings } from '@/lib/settings';
import { sb } from '@/lib/supabase';
import { useT } from '@/i18n/useT';
import { Avatar } from '@/ui/Avatar';
import { toast } from '@/ui/toast';
import { closeChat, openChat, useChat } from './chatStore';
import { dismiss, notify, timeOf, useFriends, useNotifs, type Friend, type Msg } from './social';
import s from './Social.module.css';

// Tout ce qui est social et en direct, présent sur toutes les pages : fenêtre de chat (ouverte depuis Amis), notifications,
// et les abonnements temps réel (messages, demandes d'ami, prix de la boutique).
export function SocialLayer() {
  useSocialRealtime();
  usePriceRealtime();
  return (
    <>
      <ChatDock />
      <Notifs />
    </>
  );
}

function useSocialRealtime() {
  const uid = useAuth((x) => x.user?.id);
  const qc = useQueryClient();
  const t = useT();
  const say = useEffectEvent((k: 'ui.fr_got' | 'ui.fr_now', n: string) => t(k, { n }));
  useEffect(() => {
    if (!uid) {
      closeChat();
      return;
    }
    const friends = () => (qc.getQueryData(['friends', uid]) as Friend[] | undefined) ?? [];
    const reload = () =>
      qc.fetchQuery({
        queryKey: ['friends', uid],
        queryFn: async () => (await socialApi.friends()) as unknown as Friend[],
      });
    // Le serveur (RLS) n'envoie que les lignes qui nous concernent
    const ch = sb
      .channel(`social-${uid}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, ({ new: m }) => {
        const r = m as { id: number; sender: string; receiver: string; body: string; created_at: string };
        const other = r.sender === uid ? r.receiver : r.sender;
        const st = useChat.getState();
        if (st.open === other) {
          qc.setQueryData<Msg[]>(['conv', other], (l = []) =>
            l.some((x) => x.id === r.id)
              ? l
              : [...l, { id: r.id, mine: r.sender === uid, body: r.body, created_at: r.created_at }],
          );
          if (r.sender !== uid) {
            if (!st.min && document.visibilityState === 'visible')
              void socialApi.markRead(other).catch(() => undefined);
            else sfx.message();
          }
          return;
        }
        if (r.sender === uid) return;
        void reload().then((l) => {
          const f = l.find((x) => x.id === other);
          if (!f) return;
          sfx.message();
          notify({
            title: f.pseudo,
            pseudo: f.pseudo,
            body: r.body.length > 80 ? `${r.body.slice(0, 80)}…` : r.body,
            go: () => openChat(f.id),
          });
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, ({ eventType, new: n }) => {
        const f = n as { requested_by?: string; status?: string };
        const before = new Set(
          friends()
            .filter((x) => x.status === 'accepted')
            .map((x) => x.id),
        );
        void reload().then((l) => {
          if (eventType === 'INSERT' && f.requested_by && f.requested_by !== uid) {
            const x = l.find((y) => y.id === f.requested_by);
            if (x) {
              sfx.message();
              toast(`📨 ${say('ui.fr_got', x.pseudo)}`);
            }
          }
          if (eventType === 'UPDATE' && f.status === 'accepted' && f.requested_by === uid) {
            const x = l.find((y) => y.status === 'accepted' && !before.has(y.id));
            if (x) {
              sfx.upgrade();
              toast(`🤝 ${say('ui.fr_now', x.pseudo)}`);
            }
          }
          void qc.invalidateQueries({ queryKey: ['friend'] });
        });
      })
      .subscribe();
    return () => void sb.removeChannel(ch);
  }, [uid, qc]);
}

// Prix changé par l'admin (seulement pour la boutique actuelle) : notif chez tout le monde, clic = boutique
function usePriceRealtime() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const t = useT();
  const title = useEffectEvent((down: boolean) => t(down ? 'ui.price_down' : 'ui.price_up'));
  const goShop = useEffectEvent(() => void nav('/boutique'));
  useEffect(() => {
    const ch = sb
      .channel('prix')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'price_changes' }, ({ new: n }) => {
        const c = n as { item: string; old_price: number; new_price: number };
        void (async () => {
          const shop = (await publicApi.shopToday()) as unknown as { items: (ShopItem & { price: number })[] };
          qc.setQueryData(['shop'], { ...shop, at: Date.now() });
          const it = shop.items.find((x) => x.id === c.item);
          if (!it) return;
          sfx.message();
          const down = c.new_price < c.old_price,
            lang = useSettings.getState().lang,
            f = (v: number) => v.toLocaleString(locale(lang));
          notify(
            {
              title: `💰 ${title(down)}`,
              body: `${itemText(it, lang)[0]} : ${f(c.old_price)} → ${f(c.new_price)}`,
              tone: down ? 'down' : 'up',
              img: itemImg(it),
              go: () => goShop(),
            },
            7000,
          );
        })().catch(() => undefined);
      })
      .subscribe();
    return () => void sb.removeChannel(ch);
  }, [qc]);
}

function ChatDock() {
  const t = useT();
  const { dock, open, min } = useChat();
  const fr = useFriends();
  const list = fr.data ?? [];
  if (!dock) return null;
  const f = open ? list.find((x) => x.id === open) : undefined;
  return (
    <section className={`${s.dock} ${min ? s.min : ''}`} aria-label={t('ui.fr_chats')}>
      {f ? (
        <Conversation f={f} min={min} />
      ) : (
        <>
          <header className={s.dockHead}>
            <b>💬 {t('ui.fr_chats')}</b>
            <button type="button" className={s.x} onClick={closeChat} aria-label={t('ui.close')}>
              ✕
            </button>
          </header>
          <div className={s.pick}>
            {list
              .filter((x) => x.status === 'accepted')
              .map((x) => (
                <button key={x.id} type="button" onClick={() => openChat(x.id)}>
                  <Avatar pseudo={x.pseudo} size={34} />
                  <span>{x.pseudo}</span>
                  {Number(x.unread) ? <i className={s.badge}>{x.unread}</i> : null}
                </button>
              ))}
            {list.some((x) => x.status === 'accepted') ? null : <p className="muted">{t('ui.fr_empty')}</p>}
          </div>
        </>
      )}
    </section>
  );
}

function Conversation({ f, min }: { f: Friend; min: boolean }) {
  const t = useT();
  const lang = useSettings((x) => x.lang);
  const uid = useAuth((x) => x.user?.id);
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const conv = useQuery({
    queryKey: ['conv', f.id],
    queryFn: async () => ((await socialApi.conversation(f.id)) as unknown as Msg[]) ?? [],
    staleTime: Infinity,
  });
  const msgs = conv.data ?? [];
  // Messages lus dès qu'on ouvre la conversation
  useEffect(() => {
    if (Number(f.unread) > 0)
      void socialApi.markRead(f.id).then(
        () => qc.invalidateQueries({ queryKey: ['friends', uid] }),
        () => undefined,
      );
  }, [f.id, f.unread, qc, uid]);
  useEffect(() => {
    if (box.current) box.current.scrollTop = box.current.scrollHeight;
  }, [msgs.length, min]);
  // Sur téléphone, pas de clavier qui saute tout seul
  useEffect(() => {
    if (!min && !matchMedia('(pointer: coarse)').matches) input.current?.focus({ preventScroll: true });
  }, [f.id, min]);
  const send = async (e: FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText('');
    try {
      const id = (await socialApi.send(f.id, body)) as number;
      qc.setQueryData<Msg[]>(['conv', f.id], (l = []) =>
        l.some((m) => m.id === id) ? l : [...l, { id, mine: true, body, created_at: new Date().toISOString() }],
      );
    } catch (err) {
      setText(body);
      sfx.deny();
      toast(errorText(err, lang), true);
    }
  };
  let last = '';
  return (
    <>
      <header className={s.dockHead}>
        <button type="button" className={s.x} onClick={() => openChat(null)} aria-label={t('ui.back')}>
          ‹
        </button>
        <Avatar pseudo={f.pseudo} size={28} />
        <Link to={`/profil/${encodeURIComponent(f.pseudo)}`} className={s.dockName}>
          {f.pseudo}
        </Link>
        <button
          type="button"
          className={s.x}
          onClick={() => useChat.setState({ min: !min })}
          aria-label={min ? '▢' : '–'}
          aria-expanded={!min}
        >
          {min ? '▢' : '–'}
        </button>
        <button type="button" className={s.x} onClick={closeChat} aria-label={t('ui.close')}>
          ✕
        </button>
      </header>
      {min ? null : (
        <>
          <div ref={box} className={s.msgs} role="log" aria-live="polite">
            {msgs.length ? (
              msgs.map((m) => {
                const day = new Date(m.created_at).toLocaleDateString(locale(lang));
                const sep = day !== last;
                last = day;
                return (
                  <div key={m.id}>
                    {sep ? <p className={s.day}>{day}</p> : null}
                    <div className={`${s.m} ${m.mine ? s.me : ''}`}>
                      <p>{m.body}</p>
                      <small>{timeOf(m.created_at)}</small>
                    </div>
                  </div>
                );
              })
            ) : conv.isPending ? (
              <p className="muted" aria-busy>
                …
              </p>
            ) : (
              <p className="muted">{t('ui.fr_first')}</p>
            )}
          </div>
          <form className={s.form} onSubmit={(e) => void send(e)}>
            <input
              ref={input}
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={500}
              placeholder={t('ui.fr_write', { n: f.pseudo })}
              aria-label={t('ui.fr_write', { n: f.pseudo })}
              autoComplete="off"
            />
            <button type="submit" aria-label={t('ui.send')}>
              ➤
            </button>
          </form>
        </>
      )}
    </>
  );
}

function Notifs() {
  const list = useNotifs((x) => x.list);
  return (
    <div className={s.notifs} aria-live="polite">
      {list.map((n) => (
        <button
          key={n.id}
          type="button"
          className={`${s.notif} ${n.tone ? s[n.tone] : ''}`}
          onClick={() => {
            dismiss(n.id);
            n.go();
          }}
        >
          {n.pseudo ? (
            <Avatar pseudo={n.pseudo} size={36} />
          ) : n.img ? (
            <img
              className="px"
              src={n.img.src}
              alt=""
              width={36}
              height={36}
              style={n.img.tint ? ({ '--df': n.img.tint } as React.CSSProperties) : undefined}
            />
          ) : null}
          <span>
            <b>{n.title}</b>
            <small>{n.body}</small>
          </span>
        </button>
      ))}
    </div>
  );
}
