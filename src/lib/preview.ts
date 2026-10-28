import { useSyncExternalStore } from 'react';

// Aperçu « comme un joueur » : un admin voit le site sans rien d'admin (menus, boutons, onglets).
// Réglage gardé dans ce navigateur seulement ; le serveur, lui, ne change rien.
const KEY = 'takoras-as-player';
const subs = new Set<() => void>();
const read = () => {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
};
export function setPreview(on: boolean) {
  try {
    if (on) localStorage.setItem(KEY, '1');
    else localStorage.removeItem(KEY);
  } catch {
    /* navigation privée : tant pis */
  }
  subs.forEach((f) => f());
}
export const previewOn = read;
export function usePreview() {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    read,
  );
}
