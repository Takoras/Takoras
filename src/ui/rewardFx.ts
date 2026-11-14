import type { QueryClient } from '@tanstack/react-query';
import { reducedFx } from '@/lib/settings';
import { flyCoins, flyIcons, lastFly } from './fx';

// Partout sur le site : quand ton solde monte (quête, bonus du jour, vente, code, cadeau…), des pièces partent de
// l'endroit où tu viens de toucher et filent jusqu'au compteur, qui encaisse avec un petit choc. Un écran qui fait
// déjà voler ses pièces lui-même (passe, boutique) n'en déclenche pas une deuxième fois.
let lastTap: DOMRect | null = null;
const tapRect = () => {
  if (lastTap && performance.now() - tapAt < 4000) return lastTap;
  return new DOMRect(innerWidth / 2 - 20, innerHeight / 2 - 20, 40, 40);
};
let tapAt = 0;

export function installRewardFx(qc: QueryClient) {
  const down = (e: PointerEvent) => {
    lastTap = new DOMRect(e.clientX - 20, e.clientY - 20, 40, 40);
    tapAt = performance.now();
  };
  addEventListener('pointerdown', down, { capture: true, passive: true });
  const prev = new Map<string, number>();
  const unsub = qc.getQueryCache().subscribe((ev) => {
    if (ev.type !== 'updated') return;
    const key = ev.query.queryKey;
    if (key[0] !== 'me') return;
    const coins = (ev.query.state.data as { coins?: number } | undefined)?.coins;
    if (typeof coins !== 'number') return;
    const id = JSON.stringify(key);
    const before = prev.get(id);
    prev.set(id, coins);
    if (before === undefined || coins <= before) return;
    // un écran vient déjà de faire voler ses pièces : pas de doublon
    if (performance.now() - lastFly() < 3500) return;
    const gain = coins - before;
    if (reducedFx()) return bump('[data-coin-target]');
    flyCoins(tapRect(), Math.max(1, Math.min(6, Math.round(Math.log10(gain + 1) * 2))), () => undefined);
  });
  return () => {
    unsub();
    removeEventListener('pointerdown', down, { capture: true });
  };
}

// un objet gagné ailleurs que dans le passe ou la boutique (code, quête…) : il file vers l'onglet Inventaire
export function celebrateItem(src: string) {
  if (reducedFx()) return bump('[data-inv-target]');
  flyIcons(tapRect(), src, 1, '[data-inv-target]', () => undefined, 34);
}

// effets coupés : la cible fait juste son petit choc
function bump(sel: string) {
  const t = [...document.querySelectorAll<HTMLElement>(sel)].find((x) => x.getClientRects().length);
  t?.animate([{ scale: '1' }, { scale: '1.15' }, { scale: '1' }], { duration: 220, easing: 'ease-out' });
}
