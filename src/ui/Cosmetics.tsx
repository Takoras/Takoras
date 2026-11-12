import type { ReactNode } from 'react';
import { reducedFx } from '@/lib/settings';
import { PixelBg } from './PixelBg';
import s from './Cosmetics.module.css';

// Cosmétiques de profil (boutique) : couleur de pseudo (n_…), aura autour de la photo (au_…), effet sur la bannière
// (fx_…). Même DA que le reste du jeu, sobre : pseudo d'une couleur unie, anneau fin fixe, fond pixel PixelBg.
export const COSMETICS = {
  name: ['n_or', 'n_rose', 'n_glace', 'n_arc'],
  aura: ['au_bleue', 'au_or', 'au_flamme', 'au_ombre'],
  bfx: ['fx_etoiles', 'fx_neige', 'fx_braises'],
} as const;
export const COSM_NAMES: Record<string, string> = {
  n_or: 'Or',
  n_rose: 'Rose',
  n_glace: 'Glace',
  n_arc: 'Arc-en-ciel',
  au_bleue: 'Bleue',
  au_or: 'Dorée',
  au_flamme: 'Flamme',
  au_ombre: 'Ombre',
  fx_etoiles: 'Étoiles',
  fx_neige: 'Neige',
  fx_braises: 'Braises',
};
export const isCosmetic = (kind: string) => kind === 'name' || kind === 'aura' || kind === 'bfx';

// classe à mettre sur un pseudo (rien si pas de couleur)
export const nameCls = (id?: string | null) => (id?.startsWith('n_') ? (s[id] ?? '') : '');

// ---------- aura : un anneau fin et fixe autour de la photo, à la couleur choisie ----------
export function Aura({ id, children }: { id?: string | null; children: ReactNode }) {
  if (!id || !s[id]) return <>{children}</>;
  return <span className={`${s.aura} ${s[id]}`}>{children}</span>;
}

// ---------- effet de bannière : le fond pixel du jeu (bandes, rayons, poussière, étoiles) dans une teinte ----------
const BFX: Record<string, { glow: string; odds: number }> = {
  fx_etoiles: { glow: '#6f8dff', odds: 20_000 }, // nuit bleue : bandes, rayons, poussière et étoiles
  fx_neige: { glow: '#cfe8ff', odds: 2000 }, // givre : bandes claires et poussière
  fx_braises: { glow: '#ff7a1a', odds: 2000 }, // braises : bandes orange et poussière qui monte
};
export function BannerFx({ id }: { id?: string | null }) {
  const fx = id ? BFX[id] : undefined;
  if (!fx) return null;
  return <PixelBg className={s.bfx} odds={fx.odds} glow={fx.glow} still={reducedFx()} />;
}

// aperçu d'un cosmétique (case de la boutique, choix dans l'éditeur)
export function CosmeticPreview({ id, label = 'Pseudo' }: { id: string; label?: string }) {
  if (id.startsWith('n_'))
    return (
      <span className={s.pvName}>
        <b className={nameCls(id)}>{label}</b>
      </span>
    );
  if (id.startsWith('au_'))
    return (
      <span className={s.pvAura}>
        <Aura id={id}>
          <img className="px" src="/img/pp/bleu.png" alt="" />
        </Aura>
      </span>
    );
  return (
    <span className={s.pvBanner}>
      <BannerFx id={id} />
    </span>
  );
}
