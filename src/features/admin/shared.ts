import { BANNER_IMG, bannerName } from '@/data/items';
import { locale } from '@/lib/settings';
import { errorText } from '@/api';
import { toast } from '@/ui/toast';

// Petits outils communs à l'admin (réservé aux comptes admin ; le serveur vérifie chaque action)
export const fmt = (n: number) => Number(n ?? 0).toLocaleString(locale());
export const day = (d: string) => new Date(d).toLocaleDateString(locale());
export const dt = (d: string) =>
  new Date(d).toLocaleString(locale(), { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
// Objets qu'on peut donner (mêmes libellés que l'ancien panel)
export const ITEMS: [string, string][] = [
  // (même liste que la boutique : chance × pour N tirages)
  ['potion1', '🧪 Potion ×1,3 (10 tirages)'],
  ['potion2', '🧪 Potion ×2 (6 tirages)'],
  ['potion3', '🧪 Potion ×5 (3 tirages)'],
  ['potion10', '🧪 Potion ×10 (4 tirages)'],
  ['potion25', '🧪 Potion ×25 (5 tirages)'],
  ['potion50', '🧪 Potion ×50 (6 tirages)'],
  ['potion100', '🧪 Potion ×100 (10 tirages)'],
  ['potion250', '🧪 Potion ×250 (10 tirages)'],
  ['potion500', '🧪 Potion ×500 (5 tirages)'],
  ['instant', '⚡ Recharge éclair (+15 tirages)'],
  ['hourglass', '⏳ Sablier 1 h'],
  ['a_etoile', '✨ Photo animée Étoile'],
  ...Object.keys(BANNER_IMG).map((b): [string, string] => [`b_${b}`, `🎨 Bannière ${bannerName(b, 'fr')}`]),
];
export const itemLabel = (id: string) => ITEMS.find(([k]) => k === id)?.[1] ?? id;
// Exécute une action admin : message de réussite, ou l'erreur du serveur
export async function act(f: () => Promise<unknown>, ok: string) {
  try {
    await f();
    if (ok) toast(ok);
    return true;
  } catch (e) {
    toast(errorText(e, 'fr'), true);
    return false;
  }
}

// Après une remise à zéro de son propre compte : on oublie aussi ce que ce navigateur a retenu
// (tuto vu, notes de mise à jour vues, historique…) pour tout revoir comme un nouveau joueur. Les réglages restent.
export function forgetLocalProgress() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('takoras-') && k !== 'takoras-settings' && k !== 'takoras-muted')
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* navigation privée */
  }
}
