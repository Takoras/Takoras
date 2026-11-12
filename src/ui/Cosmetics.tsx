import { useEffect, useRef, type ReactNode } from 'react';
import { reducedFx } from '@/lib/settings';
import s from './Cosmetics.module.css';

// Cosmétiques de profil (boutique) : couleur de pseudo (n_…), aura autour de la photo (au_…), effet sur la bannière
// (fx_…). Même DA que le reste du jeu : du vrai pixel art (petits canvas agrandis sans lissage, animés image par
// image comme les sprites), sobre — quelques pixels bien placés plutôt que des lueurs floues.
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
export const nameCls = (id?: string | null) => (id && s[id] ? `${s.name} ${s[id]}` : '');

// petit canvas pixel art, redessiné à `fps` images par seconde (une seule image fixe en effets allégés)
function usePixelCanvas(
  draw: (x: CanvasRenderingContext2D, w: number, h: number, frame: number) => void,
  grid: (el: HTMLCanvasElement) => [number, number],
  fps: number,
  key: string,
) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    const x = cv?.getContext('2d');
    if (!cv || !x) return;
    let raf = 0,
      last = 0,
      frame = 0;
    const size = () => {
      const [w, h] = grid(cv);
      cv.width = Math.max(1, w);
      cv.height = Math.max(1, h);
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(cv);
    const once = () => {
      x.clearRect(0, 0, cv.width, cv.height);
      draw(x, cv.width, cv.height, frame);
    };
    if (reducedFx()) {
      once();
      return () => ro.disconnect();
    }
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (t - last < 1000 / fps) return;
      last = t;
      frame++;
      once();
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- le dessin ne dépend que de l'effet choisi (key)
  }, [key]);
  return ref;
}

// ---------- aura : un anneau de pixels autour de la photo ----------
const AURA: Record<string, { c: string[]; fps: number }> = {
  au_bleue: { c: ['#2443b3', '#5b8cff', '#a9c2ff'], fps: 4 },
  au_or: { c: ['#a16207', '#f2c230', '#fff3b0'], fps: 4 },
  au_flamme: { c: ['#b91c1c', '#ff6a00', '#ffb800', '#ffe066'], fps: 8 },
  au_ombre: { c: ['#1e1b4b', '#5b21b6', '#a855f7', '#e9d5ff'], fps: 6 },
};
const N = 36; // l'anneau est dessiné sur une grille de 36×36 pixels, agrandie sans lissage
function drawAura(id: string, x: CanvasRenderingContext2D, f: number) {
  const a = AURA[id];
  if (!a) return;
  const c = N / 2 - 0.5,
    R = N / 2 - 3; // rayon de l'anneau (juste autour de la photo)
  const P = (px: number, py: number, col: string) => {
    x.fillStyle = col;
    x.fillRect(Math.round(px), Math.round(py), 1, 1);
  };
  const steps = 72;
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 2,
      X = c + Math.cos(t) * R,
      Y = c + Math.sin(t) * R;
    if (id === 'au_bleue' || id === 'au_or') {
      // anneau net, avec un reflet qui fait le tour (un pixel clair qui avance)
      P(X, Y, a.c[1] ?? '#fff');
      const hl = ((f * 3) % steps) - i;
      if (hl === 0 || hl === 1) P(X, Y, a.c[2] ?? '#fff');
      if (i % 9 === 0) P(c + Math.cos(t) * (R + 1), c + Math.sin(t) * (R + 1), a.c[0] ?? '#000');
    } else if (id === 'au_flamme') {
      // flammes : des colonnes de pixels qui montent de l'anneau, et changent à chaque image
      P(X, Y, a.c[1] ?? '#f60');
      const h = (Math.sin(i * 1.7 + f * 0.9) + Math.sin(i * 0.6 - f * 0.5)) * 0.6 + 0.9;
      for (let k = 1; k <= Math.max(0, Math.round(h)); k++) {
        const col = k === 1 ? (a.c[2] ?? '#fb0') : k === 2 ? (a.c[1] ?? '#f60') : (a.c[3] ?? '#fe6');
        P(c + Math.cos(t) * (R + k), c + Math.sin(t) * (R + k), col);
      }
    } else {
      // ombre : anneau sombre, et des éclats violets qui tournent autour
      P(X, Y, a.c[1] ?? '#5b21b6');
      if ((i + f * 2) % 18 === 0) {
        P(c + Math.cos(t) * (R + 1), c + Math.sin(t) * (R + 1), a.c[2] ?? '#a855f7');
        P(c + Math.cos(t) * (R + 2), c + Math.sin(t) * (R + 2), a.c[3] ?? '#e9d5ff');
      }
    }
  }
}
export function Aura({ id, children }: { id?: string | null; children: ReactNode }) {
  const on = !!id && !!AURA[id];
  const ref = usePixelCanvas(
    (x, _w, _h, f) => on && drawAura(id ?? '', x, f),
    () => [N, N],
    AURA[id ?? '']?.fps ?? 4,
    id ?? '',
  );
  if (!on) return <>{children}</>;
  return (
    <span className={s.aura}>
      <canvas ref={ref} className={s.ring} aria-hidden />
      {children}
    </span>
  );
}

// ---------- effet de bannière : quelques pixels qui vivent sur la bannière ----------
const PX = 4; // taille d'un pixel de l'effet à l'écran
type Dot = { x: number; y: number; v: number; p: number };
const dots = new WeakMap<HTMLCanvasElement, Dot[]>();
export function BannerFx({ id }: { id?: string | null }) {
  const on = !!id && ['fx_etoiles', 'fx_neige', 'fx_braises'].includes(id);
  const ref = usePixelCanvas(
    (x, w, h, f) => {
      if (!on) return;
      let d = dots.get(x.canvas);
      const n = id === 'fx_etoiles' ? Math.round((w * h) / 420) : Math.round((w * h) / 260);
      if (!d || d.length !== n) {
        d = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h, v: 0.15 + Math.random() * 0.35, p: Math.random() * 9 }));
        dots.set(x.canvas, d);
      }
      for (const o of d) {
        if (id === 'fx_etoiles') {
          // étoiles qui scintillent ; à leur pic, une petite croix de pixels
          const k = Math.sin(f * 0.35 + o.p);
          if (k < -0.2) continue;
          x.fillStyle = k > 0.8 ? '#ffffff' : 'rgba(255,255,255,0.55)';
          x.fillRect(o.x | 0, o.y | 0, 1, 1);
          if (k > 0.92) {
            x.fillStyle = 'rgba(255,255,255,0.5)';
            x.fillRect((o.x | 0) - 1, o.y | 0, 3, 1);
            x.fillRect(o.x | 0, (o.y | 0) - 1, 1, 3);
          }
        } else if (id === 'fx_neige') {
          // flocons d'un pixel qui tombent doucement en ondulant
          o.y += o.v * 0.6;
          if (o.y > h) {
            o.y = -1;
            o.x = Math.random() * w;
          }
          x.fillStyle = o.v > 0.35 ? '#ffffff' : 'rgba(220,235,255,0.6)';
          x.fillRect((o.x + Math.sin(f * 0.15 + o.p) * 1.2) | 0, o.y | 0, 1, 1);
        } else {
          // braises qui montent et s'éteignent (jaune → orange → rouge)
          o.y -= o.v * 0.7;
          if (o.y < 0) {
            o.y = h + 1;
            o.x = Math.random() * w;
          }
          const life = o.y / h;
          x.fillStyle = life > 0.66 ? '#ffd166' : life > 0.33 ? '#ff8a00' : 'rgba(220,38,38,0.7)';
          x.fillRect((o.x + Math.sin(f * 0.2 + o.p)) | 0, o.y | 0, 1, 1);
        }
      }
    },
    (el) => [Math.ceil(el.clientWidth / PX), Math.ceil(el.clientHeight / PX)],
    12,
    id ?? '',
  );
  if (!on) return null;
  return <canvas ref={ref} className={s.bfx} aria-hidden />;
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
