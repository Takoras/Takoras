import { useEffect, useRef, type RefObject } from 'react';
import { hexRGB } from '@/data/jetons';
import { calmFx } from '@/lib/settings';

// Le fond pixel art des jetons et objets (fiche, vitrine, meilleur jeton, boutique, passe…) : un petit canvas
// agrandi sans lissage. 11 paliers de rareté, du plus simple au plus beau. Chaque palier est un modèle en blanc,
// teinté à la couleur du jeton (jamais d'arc-en-ciel) ; un palier peut changer de style, pas seulement en ajouter.
//  0  < 1/10        une bande douce
//  1  1/10          deux bandes qui glissent
//  2  1/60          bandes en escalier + poussière qui monte
//  3  1/250         trame de points + bandes fines + poussière
//  4  1/1 000       rayons lents + deux larges bandes
//  5  1/5 000       plus de rayons, reflet qui balaie les bandes, étoiles en croix
//  6  1/25 000      aurore : rubans de pixels qui ondulent, étoiles, rayons doux
//  7  1/100 000     ondes de choc + anneau de pixels en orbite + aurore
//  8  1/500 000     couronne de rayons qui respire + deux anneaux contraires + paillettes qui tombent
//  9  1/1 000 000   galaxie : bras en spirale autour du jeton, cœur lumineux, anneaux, éclats
// 10  1/100 000 000 le sacre : longue couronne de rayons fins, trois anneaux, galaxie, traits qui convergent,
//                   onde lente, paillettes ; le blanc domine, la couleur du jeton le souligne
// Quand le jeton change (mutation), rien n'est remplacé d'un coup : la couleur glisse vers la nouvelle et le
// nouveau palier apparaît en fondu pendant que l'ancien s'efface.
const PX = 5; // taille d'un « pixel » du fond à l'écran
const STEPS = [10, 60, 250, 1000, 5000, 25_000, 100_000, 500_000, 1_000_000, 100_000_000];
const level = (odds: number) => STEPS.filter((s) => odds >= s).length;
const DUST = [0, 0, 22, 30, 40, 50, 46, 50, 54, 60, 70];
const STARS = [0, 0, 0, 0, 0, 26, 30, 34, 38, 42, 48];
const GLIT = [0, 0, 0, 0, 0, 0, 0, 0, 22, 26, 34];
const rgbOf = (hex: string) => hexRGB(hex).split(', ').map(Number) as [number, number, number];

export function PixelBg({
  odds,
  glow,
  center,
  still,
  className,
}: {
  odds: number;
  glow: string;
  /** l'élément autour duquel tournent les rayons et les anneaux (le jeton) */
  center?: RefObject<HTMLElement | null>;
  /** une seule image, sans animation (effets réduits) */
  still?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  // cibles lues à chaque image : changer de mutation ne relance pas le dessin
  const target = useRef({ lv: level(odds), rgb: rgbOf(glow) });
  useEffect(() => {
    target.current = { lv: level(odds), rgb: rgbOf(glow) };
  }, [odds, glow]);

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    const cur: [number, number, number] = [...target.current.rgb];
    let lvNow = target.current.lv,
      lvPrev = lvNow,
      fade = 1; // 0 → 1 : passage de lvPrev à lvNow
    let W = 0,
      H = 0,
      dust: { x: number; y: number; v: number; a: number }[] = [],
      stars: { x: number; y: number; p: number }[] = [],
      glit: { x: number; y: number; v: number; p: number }[] = [],
      dens = 1; // petits cadres : moins de particules (la densité suit la surface)
    const max = (a: number[]) => a[a.length - 1] ?? 0;
    const size = () => {
      W = cv.width = Math.max(1, Math.ceil(cv.clientWidth / PX));
      H = cv.height = Math.max(1, Math.ceil(cv.clientHeight / PX));
      dens = Math.max(0.25, Math.min(1, (W * H) / 15000));
      dust = Array.from({ length: Math.max(...DUST) }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        v: 0.04 + Math.random() * 0.1,
        a: Math.random(),
      }));
      stars = Array.from({ length: max(STARS) }, () => ({
        x: (Math.random() * W) | 0,
        y: (Math.random() * H) | 0,
        p: Math.random() * 6,
      }));
      glit = Array.from({ length: max(GLIT) }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        v: 0.05 + Math.random() * 0.12,
        p: Math.random() * 6,
      }));
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(cv);
    // couleur du jeton (teinte) et blanc : les deux seules couleurs du fond
    const col = (a: number) => `rgba(${cur[0] | 0},${cur[1] | 0},${cur[2] | 0},${a})`;
    // blanc légèrement teinté par le jeton (les hauts paliers sont surtout blancs)
    const wh = (a: number) =>
      `rgba(${((255 + cur[0]) >> 1) | 0},${((255 + cur[1]) >> 1) | 0},${((255 + cur[2]) >> 1) | 0},${a})`;
    const TAU = Math.PI * 2;

    // ---------- briques ----------
    // bande penchée (l'escalier vient de l'agrandissement sans lissage) ; `shine` : un reflet qui la parcourt
    const band = (pos: number, a: number, thick: number, t: number, k: number, shine = false, steps = 0) => {
      const slope = -0.1,
        shift = Math.sin(t * 0.35 + k) * 3,
        y0 = H * pos + shift - (slope * W) / 2;
      ctx.fillStyle = col(a);
      if (steps) {
        // bande en marches (palier 2) : des paliers plats au lieu d'une pente continue
        const sw = Math.max(4, Math.round(W / steps));
        for (let x = 0; x < W; x += sw) ctx.fillRect(x, Math.round(y0 + slope * x), sw, thick);
      } else {
        ctx.beginPath();
        ctx.moveTo(0, y0);
        ctx.lineTo(W, y0 + slope * W);
        ctx.lineTo(W, y0 + slope * W + thick);
        ctx.lineTo(0, y0 + thick);
        ctx.fill();
      }
      if (shine) {
        const x = ((t * 40 + (k * W) / 2) % (W + 60)) - 30;
        ctx.fillStyle = wh(0.5);
        ctx.beginPath();
        ctx.moveTo(x, y0 + slope * x);
        ctx.lineTo(x + 8, y0 + slope * (x + 8));
        ctx.lineTo(x + 2, y0 + slope * (x + 2) + thick);
        ctx.lineTo(x - 6, y0 + slope * (x - 6) + thick);
        ctx.fill();
      }
    };
    // rayons qui partent du jeton
    const rays = (
      cx: number,
      cy: number,
      n: number,
      turn: number,
      a: (i: number) => number,
      wide: number,
      white = false,
    ) => {
      const R = Math.hypot(W, H);
      for (let i = 0; i < n; i++) {
        const a0 = turn + (i / n) * TAU,
          a1 = a0 + (Math.PI / n) * wide;
        ctx.fillStyle = white && i % 2 ? wh(a(i)) : col(a(i));
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a0) * R, cy + Math.sin(a0) * R);
        ctx.lineTo(cx + Math.cos(a1) * R, cy + Math.sin(a1) * R);
        ctx.fill();
      }
    };
    // anneau de pixels en orbite (un pixel sur trois blanc, quelques gros)
    const ring = (cx: number, cy: number, R: number, n: number, sp: number, t: number) => {
      for (let i = 0; i < n; i++) {
        const a = t * sp + (i / n) * TAU,
          rr = R + Math.sin(t * 3 + i) * 1.2,
          big = i % 4 === 0;
        ctx.fillStyle = i % 3 ? col(0.9) : wh(0.95);
        ctx.fillRect((cx + Math.cos(a) * rr) | 0, (cy + Math.sin(a) * rr * 0.92) | 0, big ? 2 : 1, big ? 2 : 1);
      }
    };
    // onde de choc : cercle qui s'élargit et s'efface
    const ripple = (cx: number, cy: number, R0: number, period: number, t: number, a: number, off = 0) => {
      const ph = ((t + off) % period) / period;
      ctx.strokeStyle = col(a * (1 - ph));
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(0, R0 + ph * W * 0.6), 0, TAU);
      ctx.stroke();
    };
    // aurore : rubans de pixels qui ondulent horizontalement
    const aurora = (n: number, t: number, a: number) => {
      for (let k = 0; k < n; k++) {
        const base = H * (0.22 + k * 0.28),
          amp = H * 0.07;
        for (let x = 0; x < W; x++) {
          const y = base + Math.sin(x * 0.06 + t * 0.7 + k * 2) * amp + Math.sin(x * 0.017 - t * 0.4) * amp * 0.8;
          const h = 2 + Math.round((Math.sin(x * 0.11 + t + k) + 1) * 2);
          ctx.fillStyle = k % 2 ? wh(a * 0.45) : col(a);
          ctx.fillRect(x, y | 0, 1, h);
        }
      }
    };
    // galaxie : bras en spirale autour du jeton
    const galaxy = (cx: number, cy: number, cw: number, t: number, a: number, arms = 3) => {
      const n = Math.round(150 * dens + 40),
        rMax = Math.max(W, H) * 0.55;
      for (let i = 0; i < n; i++) {
        const arm = i % arms,
          d = cw * 0.45 + (i / n) * rMax,
          ang = (arm / arms) * TAU + d * 0.045 - t * 0.25;
        const fall = 1 - (i / n) * 0.85;
        ctx.fillStyle = i % 5 === 0 ? wh(a * fall * 0.9) : col(a * fall * 0.6);
        ctx.fillRect((cx + Math.cos(ang) * d) | 0, (cy + Math.sin(ang) * d * 0.7) | 0, 1, 1);
      }
    };
    // trame de petits points (palier 3)
    const dither = (a: number, t: number) => {
      ctx.fillStyle = col(a);
      const off = Math.floor(t * 2) % 6;
      for (let y = 2; y < H; y += 6) for (let x = (y / 6) % 2 ? 3 : 0; x < W; x += 6) ctx.fillRect(x + off, y, 1, 1);
    };
    // traits qui convergent vers le jeton (palier 10)
    const converge = (cx: number, cy: number, t: number, a: number) => {
      const n = Math.round(14 + 14 * dens);
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * TAU + i * 0.37,
          ph = (t * 0.35 + i * 0.137) % 1,
          r = (1 - ph) * Math.hypot(W, H) * 0.6;
        ctx.strokeStyle = wh(a * ph);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r);
        ctx.lineTo(cx + Math.cos(ang) * (r + 6), cy + Math.sin(ang) * (r + 6));
        ctx.stroke();
      }
    };

    // ---------- un palier entier, avec une opacité globale pour les fondus ----------
    const scene = (lv: number, ga: number, t: number, cx: number, cy: number, cw: number) => {
      if (ga <= 0.001) return;
      ctx.globalAlpha = ga;
      const thick = Math.max(6, H * 0.09);
      switch (lv) {
        case 0:
          band(0.2, 0.35, thick, t, 0);
          break;
        case 1:
          band(0.18, 0.7, thick, t, 0);
          band(0.82, 0.55, thick, t, 1);
          break;
        case 2:
          band(0.18, 0.85, thick, t, 0, false, 9);
          band(0.55, 0.3, thick * 0.6, t, 2, false, 9);
          band(0.85, 0.85, thick, t, 1, false, 9);
          break;
        case 3:
          dither(0.18, t);
          band(0.16, 0.8, thick * 0.7, t, 0);
          band(0.5, 0.25, thick * 0.35, t, 2);
          band(0.86, 0.8, thick * 0.7, t, 1);
          break;
        case 4:
          rays(cx, cy, 10, t * 0.06, () => 0.08, 0.55);
          band(0.16, 1, thick, t, 0);
          band(0.86, 1, thick, t, 1);
          break;
        case 5:
          rays(cx, cy, 12, t * 0.08, (i) => 0.1 + 0.05 * Math.sin(t * 2 + i), 0.55);
          band(0.16, 1, thick, t, 0, true);
          band(0.86, 1, thick, t, 1, true);
          band(0.5, 0.25, thick * 0.5, t, 2);
          break;
        case 6:
          rays(cx, cy, 12, t * 0.05, () => 0.06, 0.45);
          aurora(2, t, 0.55);
          band(0.06, 0.35, thick * 0.4, t, 3);
          break;
        case 7: {
          rays(cx, cy, 14, t * 0.1, (i) => 0.1 + 0.06 * Math.sin(t * 3 + i), 0.5);
          aurora(2, t, 0.4);
          const R0 = Math.max(0, cw * 0.78);
          ripple(cx, cy, R0, 1.8, t, 0.8);
          ripple(cx, cy, R0, 1.8, t, 0.5, 0.9);
          ring(cx, cy, R0 * 0.9, 22, 0.9, t);
          break;
        }
        case 8: {
          // couronne de rayons qui respire (alternée couleur / blanc)
          const br = 0.5 + 0.5 * Math.sin(t * 1.6);
          rays(cx, cy, 18, t * 0.12, (i) => (i % 2 ? 0.07 : 0.13) * (0.7 + 0.5 * br), 0.5, true);
          const R0 = Math.max(0, cw * 0.78);
          ripple(cx, cy, R0, 1.5, t, 0.8);
          ripple(cx, cy, R0, 1.5, t, 0.5, 0.75);
          ring(cx, cy, R0 * 0.9, 24, 0.9, t);
          ring(cx, cy, R0 * 1.25, 16, -1.3, t);
          band(0.12, 0.45, thick * 0.6, t, 0, true);
          band(0.9, 0.45, thick * 0.6, t, 1, true);
          break;
        }
        case 9: {
          const R0 = Math.max(0, cw * 0.78);
          rays(cx, cy, 16, t * 0.1, (i) => (i % 2 ? 0.06 : 0.11), 0.45, true);
          galaxy(cx, cy, cw, t, 0.75);
          ripple(cx, cy, R0, 1.3, t, 0.9);
          ring(cx, cy, R0 * 0.95, 26, 1, t);
          ring(cx, cy, R0 * 1.35, 18, -1.4, t);
          break;
        }
        default: {
          // le sacre (1/100 000 000 et plus)
          const R0 = Math.max(0, cw * 0.78),
            br = 0.5 + 0.5 * Math.sin(t * 1.2);
          rays(cx, cy, 36, t * 0.05, (i) => (i % 3 === 0 ? 0.16 : 0.07) * (0.75 + 0.4 * br), 0.28, true);
          rays(cx, cy, 12, -t * 0.08, () => 0.06, 0.7);
          galaxy(cx, cy, cw, t, 0.8, 4);
          converge(cx, cy, t, 0.75);
          ripple(cx, cy, R0, 2.4, t, 0.9);
          ripple(cx, cy, R0, 2.4, t, 0.6, 1.2);
          ring(cx, cy, R0 * 0.95, 28, 0.8, t);
          ring(cx, cy, R0 * 1.3, 22, -1.1, t);
          ring(cx, cy, R0 * 1.7, 16, 0.6, t);
        }
      }
      ctx.globalAlpha = 1;
    };

    const draw = (t: number, dt: number) => {
      // la couleur glisse vers la cible ; un nouveau palier arrive en fondu
      const tg = target.current;
      const k = dt > 0 ? 1 - Math.exp(-dt * 7) : 1;
      cur[0] += (tg.rgb[0] - cur[0]) * k;
      cur[1] += (tg.rgb[1] - cur[1]) * k;
      cur[2] += (tg.rgb[2] - cur[2]) * k;
      if (tg.lv !== lvNow) {
        lvPrev = fade < 0.5 ? lvPrev : lvNow;
        lvNow = tg.lv;
        fade = dt > 0 ? 0 : 1;
      }
      fade = Math.min(1, fade + dt / 0.5);
      const f = fade * fade * (3 - 2 * fade);

      ctx.clearRect(0, 0, W, H);
      const box = cv.getBoundingClientRect();
      const c = center?.current?.getBoundingClientRect();
      // en proportion de la taille AFFICHÉE du canvas : juste même si la page est zoomée ou la fiche à l'échelle
      const bw = box.width || 1,
        bh = box.height || 1;
      const cx = c ? ((c.left + c.width / 2 - box.left) / bw) * W : W / 2;
      const cy = c ? ((c.top + c.height / 2 - box.top) / bh) * H : H * 0.4;
      const cw = c ? (c.width / bw) * W : W * 0.3;
      scene(lvPrev, lvPrev === lvNow ? 0 : 1 - f, t, cx, cy, cw);
      scene(lvNow, lvPrev === lvNow ? 1 : f, t, cx, cy, cw);

      // poussière qui monte, étoiles en croix, paillettes qui tombent : chacune selon le palier
      const on = (i: number, counts: number[]) =>
        (i < (counts[lvNow] ?? 0) * dens ? (lvPrev === lvNow ? 1 : f) : 0) +
        (lvPrev !== lvNow && i < (counts[lvPrev] ?? 0) * dens ? 1 - f : 0);
      dust.forEach((d, i) => {
        d.y -= d.v;
        if (d.y < -2) {
          d.y = H + 2;
          d.x = Math.random() * W;
        }
        const w = on(i, DUST);
        if (w <= 0) return;
        ctx.fillStyle = col((0.35 + 0.35 * Math.sin(t * 2 + d.a * 6)) * w);
        ctx.fillRect(d.x | 0, d.y | 0, 1, 1);
      });
      stars.forEach((st, i) => {
        const w = on(i, STARS);
        const kk = Math.max(0, Math.sin(t * 1.6 + st.p));
        if (w <= 0 || kk < 0.3) return;
        ctx.fillStyle = wh(kk * w);
        ctx.fillRect(st.x, st.y, 1, 1);
        if (kk > 0.85) {
          ctx.fillRect(st.x - 1, st.y, 3, 1);
          ctx.fillRect(st.x, st.y - 1, 1, 3);
        }
      });
      glit.forEach((g, i) => {
        const w = on(i, GLIT);
        g.y += g.v;
        if (g.y > H + 2) {
          g.y = -2;
          g.x = Math.random() * W;
        }
        if (w <= 0) return;
        const tw = Math.sin(t * 5 + g.p) > 0.2;
        ctx.fillStyle = tw ? wh(0.85 * w) : col(0.6 * w);
        ctx.fillRect((g.x + Math.sin(t + g.p) * 1.5) | 0, g.y | 0, 1, tw ? 2 : 1);
      });
      if (lvPrev !== lvNow && fade >= 1) lvPrev = lvNow;
    };

    let raf = 0,
      last = 0;
    const t0 = performance.now();
    const loop = (now: number) => {
      // le premier « now » peut précéder t0 : le temps ne doit jamais être négatif ; et une erreur de dessin
      // ne doit jamais arrêter la boucle (sinon le fond reste vide)
      try {
        draw(Math.max(0, (now - t0) / 1000), last ? Math.min(0.05, Math.max(0, (now - last) / 1000)) : 0);
      } catch {
        /* image ratée : on continue à la suivante */
      }
      last = now;
      // effets réduits : on ne redessine que pendant une transition de couleur ou de palier
      const settled = lvPrev === lvNow && target.current.rgb.every((v, i) => Math.abs(v - (cur[i] ?? v)) < 0.5);
      raf = (still || calmFx()) && settled ? 0 : requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    // en mode figé, seul un changement de cible (couleur, palier) relance le dessin, le temps d'une transition
    const wake = setInterval(() => {
      const moved =
        target.current.lv !== lvNow || target.current.rgb.some((v, i) => Math.abs(v - (cur[i] ?? v)) >= 0.5);
      const live = !still && !calmFx(); // qualité changée en Haut : la boucle repart
      if (!raf && (moved || live)) {
        last = 0;
        raf = requestAnimationFrame(loop);
      }
    }, 250);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(wake);
      ro.disconnect();
    };
  }, [center, still]);
  return <canvas ref={ref} className={className} aria-hidden style={{ imageRendering: 'pixelated' }} />;
}
