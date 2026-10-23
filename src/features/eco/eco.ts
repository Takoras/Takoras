import { useEffect, useState } from 'react';
import { useMe } from '@/api/queries';

// Coûts identiques au serveur (_upgrade_cost, _regen_cost) : affichage seulement, le serveur décide.
export const BASE_MAX = 5,
  TOP_MAX = 50,
  MAX_OPEN = 50;
export const nextMax = (m: number) => Math.min(TOP_MAX, m + 1);
export const upgradeCost = (target: number) =>
  Math.max(100, Math.round((100 * Math.max(1, target - BASE_MAX) ** 1.4) / 50) * 50);
export const regenCost = (target: number) =>
  Math.round((300 * Math.max(1, Math.floor((180 - target) / 10)) ** 1.8) / 50) * 50;
export const mmss = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

// Horloge partagée (1 s) pour les comptes à rebours
export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => !document.hidden && setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

export type Eco = {
  coins: number;
  stock: number;
  max: number;
  regen: number;
  step: number;
  nextIn: number;
  full: boolean;
  luck: number;
  streak: number;
  streakToday: boolean;
};

// État économique « vivant » : le serveur donne le stock et le temps avant le prochain pull au moment de la lecture,
// on fait avancer le stock nous-mêmes entre deux lectures (comme l'ancien site).
export function predictEco(me: Record<string, unknown>, fetchedAt: number, now: number): Eco {
  const max = Number(me.max ?? BASE_MAX),
    stock0 = Number(me.stock ?? 0);
  const step = Number(me.step ?? 180) * 1000,
    nextIn0 = Number(me.next_in ?? 0) * 1000;
  const e = now - fetchedAt;
  const gained = stock0 >= max ? 0 : e >= nextIn0 ? 1 + Math.floor((e - nextIn0) / step) : 0;
  // la recharge s'arrête au stock max, mais un stock déjà au-dessus (codes, recharge éclair…) reste tel quel
  const stock = stock0 >= max ? stock0 : Math.min(max, stock0 + gained);
  const full = stock >= max;
  const nextIn = full ? 0 : e < nextIn0 ? nextIn0 - e : step - ((e - nextIn0) % step);
  return {
    coins: Number(me.coins ?? 0),
    stock,
    max,
    regen: Number(me.regen ?? 180),
    step,
    nextIn,
    full,
    luck: Number(me.luck ?? 1),
    streak: Number(me.streak ?? 0),
    streakToday: !!me.streak_today,
  };
}

export function useEco(): Eco | null {
  const me = useMe();
  const now = useNow();
  if (!me.data) return null;
  return predictEco(me.data, me.dataUpdatedAt, now);
}
