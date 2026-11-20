import type { Key } from '@/i18n';

// Les rangs du Market : 6 paliers de 3 divisions (dessins public/img/ranks), 70 Elo par division.
// L'Elo vient du serveur (_bourse_elo) : échelle logarithmique des pièces gagnées, Légende III = 10 000.
export const TIERS: Key[] = [
  'ui.bs_t_bronze',
  'ui.bs_t_silver',
  'ui.bs_t_plat',
  'ui.bs_t_gold',
  'ui.bs_t_diamond',
  'ui.bs_t_legend',
];
export const ELO_0 = 800,
  ELO_STEP = 70;
export const rankOf = (elo: number) => {
  const r = Math.max(0, Math.min(17, Math.floor((elo - ELO_0) / ELO_STEP)));
  return { r, tier: Math.floor(r / 3), div: (r % 3) + 1, img: `/img/ranks/rank${r + 1}.png` };
};
export const rankName = (t: (k: Key) => string, r: number) =>
  `${t(TIERS[Math.floor(r / 3)] ?? 'ui.bs_t_bronze')} ${'I'.repeat((r % 3) + 1)}`;
