import { SERIES, type Jeton } from './jetons';

// Vraies probabilités avec une chance donnée (même calcul que le serveur, _draw) :
// on teste les jetons du plus rare au plus commun, la chance multiplie chaque probabilité (plafond ×500).
export function realOdds(luck: number, list: Jeton[] = SERIES.Takoras ?? []) {
  const sorted = [...list].sort((a, b) => b.odds - a.odds);
  let rest = 1;
  const out = sorted.map((j) => {
    const p = rest * Math.min(1, Math.min(500, luck) / j.odds);
    rest -= p;
    return { j, p };
  });
  const last = out.at(-1);
  if (last) last.p += rest;
  return out.reverse();
}
export const pct = (p: number, lang: 'fr' | 'en') => ((p * 100 >= 1 ? (p * 100).toFixed(1) : (p * 100).toPrecision(2)).replace('.', lang === 'fr' ? ',' : '.')) + ' %';
