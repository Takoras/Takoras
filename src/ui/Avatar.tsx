import { useSyncExternalStore } from 'react';
import { publicApi } from '@/api';
import { AVATARS } from '@/lib/avatars';
import s from './Avatar.module.css';

// Photos de profil des pseudos affichés à l'écran : on les demande en une seule requête groupée
// (au lieu d'un MutationObserver global comme l'ancien site), puis on les garde en cache.
const cache = new Map<string, string>();
const asked = new Set<string>();
const subs = new Set<() => void>();
let queue: string[] = [];
let timer: ReturnType<typeof setTimeout> | undefined;
function want(pseudo: string) {
  if (!pseudo || asked.has(pseudo)) return;
  asked.add(pseudo);
  queue.push(pseudo);
  clearTimeout(timer);
  timer = setTimeout(async () => {
    const batch = queue;
    queue = [];
    try {
      const rows = await publicApi.avatarsOf(batch);
      rows.forEach((r) => cache.set(r.pseudo, r.avatar));
      subs.forEach((f) => f());
    } catch {
      /* pas grave : on garde l'initiale */
    }
  }, 60);
}
const subscribe = (f: () => void) => (subs.add(f), () => subs.delete(f));
// Après un changement de photo : on met à jour toutes les pastilles de ce pseudo
export function setAvatar(pseudo: string, avatar: string) {
  cache.set(pseudo, avatar);
  asked.add(pseudo);
  subs.forEach((f) => f());
}

export function Avatar({ pseudo, avatar, size = 40 }: { pseudo: string; avatar?: string | null; size?: number }) {
  const known = avatar && avatar !== 'default' ? avatar : undefined;
  const cached = useSyncExternalStore(subscribe, () => cache.get(pseudo));
  if (!known) want(pseudo);
  const src = AVATARS[known ?? cached ?? ''];
  return (
    <span className={s.av} style={{ width: size, height: size, fontSize: size / 2.4 }} aria-hidden>
      {src ? <img className="px" src={src} alt="" /> : (pseudo[0] ?? '?').toUpperCase()}
    </span>
  );
}
