import { useEffect, useRef, type ReactNode } from 'react';
import type { Lang } from '@/i18n';
import { reducedFx } from '@/lib/settings';
import s from './Cosmetics.module.css';

// Cosmétiques de profil (boutique) : effet de pseudo (n_…), contour de la photo (au_…), effet de bannière (fx_…).
// Même DA que le jeu : couleurs des mutations (Doré, Céleste, Ombre), reflet qui balaie comme sur les bandes du
// fond pixel, contours dessinés en vrais pixels (anneaux en orbite et étoiles en croix de PixelBg).
export const COSMETICS = {
  name: ['n_or', 'n_celeste', 'n_ombre', 'n_rose', 'n_glace', 'n_braise', 'n_arc'],
  aura: ['au_bleue', 'au_or', 'au_etoile', 'au_flamme', 'au_ombre'],
  bfx: ['fx_etoiles', 'fx_neige', 'fx_braises'],
} as const;
const NAMES: Record<string, [string, string]> = {
  n_or: ['Doré', 'Gold'],
  n_celeste: ['Céleste', 'Celestial'],
  n_ombre: ['Ombre', 'Shadow'],
  n_rose: ['Rose', 'Pink'],
  n_glace: ['Glace', 'Ice'],
  n_braise: ['Braise', 'Ember'],
  n_arc: ['Arc-en-ciel', 'Rainbow'],
  au_bleue: ['Orbite', 'Orbit'],
  au_or: ['Couronne', 'Crown'],
  au_etoile: ['Étoiles', 'Stars'],
  au_flamme: ['Flamme', 'Flame'],
  au_ombre: ['Ombre', 'Shadow'],
  fx_etoiles: ['Étoiles', 'Stars'],
  fx_neige: ['Neige', 'Snow'],
  fx_braises: ['Braises', 'Embers'],
};
export const cosmName = (id: string, lang: Lang) => NAMES[id]?.[lang === 'en' ? 1 : 0] ?? id;
export const isCosmetic = (kind: string) => kind === 'name' || kind === 'aura' || kind === 'bfx';

// classe à mettre sur un pseudo (rien si pas d'effet)
export const nameCls = (id?: string | null) => (id?.startsWith('n_') && s[id] ? `${s.name} ${s[id]}` : '');

// ---------- contour : un cadre en pixels autour de la photo ----------
const G = 40; // grille du dessin (40×40 pixels), agrandie sans lissage autour de la photo
const C = G / 2 - 0.5; // centre
const R = 17; // rayon de l'anneau, juste autour de la photo
type Px = (x: number, y: number, col: string, size?: number) => void;
const ring = (p: Px, r: number, col: string, every = 1) => {
  const n = Math.round(2 * Math.PI * r);
  for (let i = 0; i < n; i += every) {
    const a = (i / n) * Math.PI * 2;
    p(C + Math.cos(a) * r, C + Math.sin(a) * r, col);
  }
};
const at = (a: number, r: number): [number, number] => [C + Math.cos(a) * r, C + Math.sin(a) * r];
const star = (p: Px, x: number, y: number, k: number, col: string) => {
  // étoile en croix du fond pixel : un point, puis la croix à son pic
  if (k < 0.25) return;
  p(x, y, '#ffffff');
  if (k > 0.6) {
    p(x - 1, y, col);
    p(x + 1, y, col);
    p(x, y - 1, col);
    p(x, y + 1, col);
  }
  if (k > 0.9) {
    p(x - 2, y, col);
    p(x + 2, y, col);
    p(x, y - 2, col);
    p(x, y + 2, col);
  }
};
const AURA: Record<string, (p: Px, t: number) => void> = {
  // Orbite : un anneau fin bleu et trois pixels en orbite, comme les anneaux du fond des jetons rares
  au_bleue: (p, t) => {
    ring(p, R, '#2c4fd6');
    [
      [0.9, 0],
      [0.9, Math.PI],
      [-0.6, 1.3],
    ].forEach(([v = 0, o = 0], i) => {
      const [x, y] = at(t * v + o, R + (i === 2 ? 2 : 1));
      p(x, y, '#a9c2ff', 2);
      p(x + 0.5, y + 0.5, '#ffffff');
    });
  },
  // Couronne : anneau doré à huit clous, et un reflet qui fait le tour de temps en temps
  au_or: (p, t) => {
    ring(p, R, '#c98a12');
    for (let i = 0; i < 8; i++) {
      const [x, y] = at((i / 8) * Math.PI * 2 - Math.PI / 2, R + 1);
      p(x - 0.5, y - 0.5, '#f2c230', 2);
      p(x - 0.5, y - 0.5, '#fff3b0');
    }
    const ph = (t % 4) / 1.2; // le reflet passe en 1,2 s, toutes les 4 s
    if (ph < 1) {
      const a = -Math.PI / 2 + ph * Math.PI * 2;
      for (let k = 0; k < 4; k++) {
        const [x, y] = at(a - k * 0.06, R);
        p(x, y, k ? '#fff3b0' : '#ffffff');
      }
    }
  },
  // Étoiles : anneau pâle, et quatre étoiles en croix qui s'allument chacune à leur tour
  au_etoile: (p, t) => {
    ring(p, R, '#8ea8ff', 2);
    for (let i = 0; i < 4; i++) {
      const [x, y] = at(Math.PI / 4 + (i * Math.PI) / 2, R + 1.5);
      star(p, Math.round(x), Math.round(y), Math.max(0, Math.sin(t * 1.7 - i * 1.4)), '#cfe0ff');
    }
  },
  // Flamme : anneau orange, et des langues de feu courtes qui ondulent tout autour
  au_flamme: (p, t) => {
    ring(p, R, '#e2550b');
    const n = 20;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const h = Math.round(1.2 + Math.sin(i * 2.3 + t * 5) + Math.sin(i * 0.9 - t * 3) * 0.8);
      for (let k = 1; k <= h; k++) {
        const [x, y] = at(a, R + k);
        p(x, y, k === h ? '#ffd166' : '#ff8a00');
      }
    }
  },
  // Ombre : deux anneaux de pixels violets qui tournent en sens inverse, comme le fond des jetons 1/1 000 000
  au_ombre: (p, t) => {
    ring(p, R, '#4c1d95');
    const dots = (r: number, n: number, v: number) => {
      for (let i = 0; i < n; i++) {
        const [x, y] = at(t * v + (i / n) * Math.PI * 2, r);
        p(x, y, i % 3 ? '#a855f7' : '#f3e8ff');
      }
    };
    dots(R + 1.5, 14, 0.7);
    dots(R + 3, 9, -0.45);
  },
};

export function Aura({ id, children }: { id?: string | null; children: ReactNode }) {
  const draw = id ? AURA[id] : undefined;
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current,
      x = cv?.getContext('2d');
    if (!cv || !x || !draw) return;
    cv.width = cv.height = G;
    const p: Px = (px, py, col, size = 1) => {
      x.fillStyle = col;
      x.fillRect(Math.round(px), Math.round(py), size, size);
    };
    const frame = (t: number) => {
      x.clearRect(0, 0, G, G);
      draw(p, t);
    };
    if (reducedFx()) {
      frame(1);
      return;
    }
    // 12 images par seconde : ça bouge par crans, comme un sprite
    let raf = 0,
      last = -1;
    const t0 = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const step = Math.floor((now - t0) / 83);
      if (step === last) return;
      last = step;
      frame(step / 12);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [draw]);
  if (!draw) return <>{children}</>;
  return (
    <span className={s.aura}>
      {children}
      <canvas ref={ref} className={s.ring} aria-hidden />
    </span>
  );
}

// ---------- effet de bannière : quelques sprites pixel PAR-DESSUS la bannière (elle reste visible) ----------
// Dessinés à la main comme des sprites (grille de pixels agrandie sans lissage), peu nombreux, animés image par
// image à 10 i/s : étoiles en croix qui scintillent, flocons qui tombent en ondulant, braises qui montent.
const PXS = 3; // taille d'un pixel de sprite à l'écran
type Spr = string[]; // '#' = couleur principale, 'o' = couleur claire
const STAR: Spr[] = [
  ['o'],
  ['.#.', '#o#', '.#.'],
  ['..#..', '..#..', '##o##', '..#..', '..#..'],
];
const FLAKE: Spr[] = [
  ['#.#.#', '.#o#.', '#ooo#', '.#o#.', '#.#.#'],
  ['.o.', 'o#o', '.o.'],
  ['o'],
];
const EMBER: Spr[] = [['o#', '##'], ['#o', '#'], ['o']];
const BFX_PAL: Record<string, [string, string]> = {
  fx_etoiles: ['#a9c2ff', '#ffffff'],
  fx_neige: ['#cfe8ff', '#ffffff'],
  fx_braises: ['#ff7a1a', '#ffd166'],
};
type P = { x: number; y: number; v: number; p: number; k: number };
export function BannerFx({ id }: { id?: string | null }) {
  const pal = id ? BFX_PAL[id] : undefined;
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current,
      x = cv?.getContext('2d');
    if (!cv || !x || !pal || !id) return;
    let W = 0,
      H = 0,
      parts: P[] = [];
    const size = () => {
      W = cv.width = Math.max(1, Math.ceil(cv.clientWidth / PXS));
      H = cv.height = Math.max(1, Math.ceil(cv.clientHeight / PXS));
      const n = Math.max(8, Math.round((W * PXS) / 32)); // environ un sprite pour 32 px de large
      parts = Array.from({ length: n }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        v: 0.25 + Math.random() * 0.45,
        p: Math.random() * 10,
        k: Math.floor(Math.random() * 3),
      }));
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(cv);
    const blit = (spr: Spr, cx: number, cy: number) => {
      const h = spr.length,
        w = spr[0]?.length ?? 0;
      spr.forEach((row, j) =>
        [...row].forEach((c, i) => {
          if (c === '.') return;
          x.fillStyle = c === 'o' ? pal[1] : pal[0];
          x.fillRect(Math.round(cx - w / 2 + i), Math.round(cy - h / 2 + j), 1, 1);
        }),
      );
    };
    const frame = (f: number) => {
      x.clearRect(0, 0, W, H);
      for (const o of parts) {
        if (id === 'fx_etoiles') {
          // scintille : point → petite croix → grande croix → petite croix → point → éteinte
          const ph = Math.floor((f / 3 + o.p) % 10);
          const st = [0, 1, 2, 1, 0, -1, -1, -1, -1, -1][ph] ?? -1;
          const spr = st >= 0 ? STAR[st] : undefined;
          if (spr) blit(spr, o.x, o.y);
          if (ph === 9) {
            o.x = Math.random() * W;
            o.y = Math.random() * H;
          }
        } else if (id === 'fx_neige') {
          o.y += o.v * 0.5;
          if (o.y > H + 4) {
            o.y = -4;
            o.x = Math.random() * W;
          }
          const spr = FLAKE[o.k];
          if (spr) blit(spr, o.x + Math.round(Math.sin(f * 0.12 + o.p) * 2), o.y);
        } else {
          // braise : monte en vacillant, rétrécit puis s'éteint
          o.y -= o.v * 0.7;
          if (o.y < -3) {
            o.y = H + 3;
            o.x = Math.random() * W;
          }
          const life = o.y / H;
          const spr = EMBER[life > 0.6 ? 0 : life > 0.25 ? 1 : 2];
          if (spr && (life > 0.1 || f % 2)) blit(spr, o.x + (Math.sin(f * 0.3 + o.p) > 0.6 ? 1 : 0), o.y);
        }
      }
    };
    if (reducedFx()) {
      frame(6);
      return () => ro.disconnect();
    }
    let raf = 0,
      last = -1;
    const t0 = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const step = Math.floor((now - t0) / 100); // 10 images par seconde, comme un sprite
      if (step === last) return;
      last = step;
      frame(step);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [id, pal]);
  if (!pal) return null;
  return <canvas ref={ref} className={s.bfx} aria-hidden />;
}

// aperçu d'un cosmétique (case de la boutique, choix dans l'éditeur)
// `big` : en grand (objet à la une de la boutique)
export function CosmeticPreview({ id, label = 'Pseudo', big }: { id: string; label?: string; big?: boolean }) {
  const lg = big ? ` ${s.pvBig}` : '';
  if (id.startsWith('n_'))
    return (
      <span className={s.pvName + lg}>
        <b className={nameCls(id)}>{label}</b>
      </span>
    );
  if (id.startsWith('au_'))
    return (
      <span className={s.pvAura + lg}>
        <Aura id={id}>
          <span className={s.pvQ}>?</span>
        </Aura>
      </span>
    );
  return (
    <span className={s.pvBanner + lg}>
      <BannerFx id={id} />
    </span>
  );
}
