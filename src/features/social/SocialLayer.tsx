import { useRef } from 'react';
import { usePoll } from '@/lib/poll';
import { useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { publicApi, socialApi } from '@/api';
import { itemImg, itemText, type ShopItem } from '@/data/items';
import { sfx } from '@/engines/sound.js';
import { useAuth } from '@/lib/auth';
import { locale, useSettings } from '@/lib/settings';
import { sb } from '@/lib/supabase';
import { useT } from '@/i18n/useT';
import { Avatar } from '@/ui/Avatar';
import { toast } from '@/ui/toast';
import { dismiss, notify, useNotifs, type Friend } from './social';
import s from './Social.module.css';

// Tout ce qui est social et en direct, présent sur toutes les pages : notifications, et les abonnements
// temps réel (demandes d'ami, prix de la boutique). Plus de messages entre joueurs.
export function SocialLayer() {
  useSocialRealtime();
  usePriceRealtime();
  return (
    <>
      <Notifs />
    </>
  );
}

// Demandes d'ami et amis acceptés : on revérifie toutes les 90 s (plus de connexion en direct ouverte en permanence)
function useSocialRealtime() {
  const uid = useAuth((x) => x.user?.id);
  const qc = useQueryClient();
  const t = useT();
  usePoll(
    async () => {
      if (!uid) return;
      const before = (qc.getQueryData(['friends', uid]) as Friend[] | undefined) ?? null;
      const l = (await socialApi.friends()) as unknown as Friend[];
      qc.setQueryData(['friends', uid], l);
      if (!before) return; // premier passage : rien à annoncer
      const had = new Map(before.map((x) => [x.id, x.status]));
      for (const x of l) {
        if (!had.has(x.id) && x.status === 'pending' && x.incoming) {
          sfx.message();
          toast(t('ui.fr_got', { n: x.pseudo }));
        }
        if (had.get(x.id) === 'pending' && x.status === 'accepted' && !x.incoming) {
          sfx.upgrade();
          toast(t('ui.fr_now', { n: x.pseudo }));
        }
      }
      void qc.invalidateQueries({ queryKey: ['friend'] });
    },
    90_000,
    !!uid,
  );
}

// Prix changé par l'admin (seulement pour la boutique actuelle) : notif chez tout le monde, clic = boutique.
// On revérifie toutes les 2 min les derniers changements de prix.
function usePriceRealtime() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const t = useT();
  const last = useRef<number | null>(null);
  usePoll(async () => {
    const { data } = await sb
      .from('price_changes')
      .select('id, item, old_price, new_price')
      .order('id', { ascending: false })
      .limit(5);
    const rows = (data ?? []) as { id: number; item: string; old_price: number; new_price: number }[];
    const top = rows[0]?.id ?? 0;
    if (last.current === null) {
      last.current = top; // premier passage : on ne rejoue pas les anciens changements
      return;
    }
    const fresh = rows.filter((r) => r.id > (last.current ?? 0));
    last.current = Math.max(last.current, top);
    if (!fresh.length) return;
    const shop = (await publicApi.shopToday()) as unknown as { items: (ShopItem & { price: number })[] };
    qc.setQueryData(['shop'], { ...shop, at: Date.now() });
    for (const c of fresh) {
      const it = shop.items.find((x) => x.id === c.item);
      if (!it) continue;
      sfx.message();
      const down = c.new_price < c.old_price,
        lang = useSettings.getState().lang,
        f = (v: number) => v.toLocaleString(locale(lang));
      notify(
        {
          title: t(down ? 'ui.price_down' : 'ui.price_up'),
          body: `${itemText(it, lang)[0]} : ${f(c.old_price)} → ${f(c.new_price)}`,
          tone: down ? 'down' : 'up',
          img: itemImg(it),
          go: () => void nav('/shop'),
        },
        7000,
      );
    }
  }, 120_000);
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
