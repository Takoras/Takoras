import { useEffect, useRef, type RefObject } from 'react';
import { hexRGB } from '@/data/jetons';

// Le fond pixel art de l'ouverture (opening.js, drawBg), pour n'importe quel cadre : un petit canvas agrandi
// sans lissage. Plus le jeton est rare, plus il est chargé : bande → bandes + rayons + poussière →
// reflets + étoiles → anneaux en orbite et ondes de choc (1/100 000) → double anneau (1/1 000 000).
// Quand le jeton change (mutation), rien n'est remplacé : la couleur glisse vers la nouvelle et les
// éléments du nouveau niveau apparaissent en fondu pendant que ceux de l'ancien s'effacent.
const PX = 5; // taille d'un « pixel » du fond à l'écran
const DUST = [0, 0, 26, 50, 80, 120];
const STARS = [0, 0, 0, 40, 55, 75];
const level = (odds: number) =>
  odds >= 1_000_000 ? 5 : odds >= 100_000 ? 4 : odds >= 10_000 ? 3 : odds >= 1000 ? 2 : odds >= 60 ? 1 : 0;
const rgbOf = (hex: string) => hexRGB(hex).split(', ').map(Number) as [number, number, number];

type Band = [number, number];
const bandsOf = (lv: number): Band[] =>
  lv === 0
    ? [[0.2, 0.35]]
    : lv >= 5
      ? [
          [0.16, 0.5],
          [0.86, 0.5],
          [0.5, 0.16],
          [0.03, 0.2],
        ]
      : lv >= 3
        ? [
            [0.16, 1],
            [0.86, 1],
            [0.5, 0.25],
            [0.03, 0.3],
          ]
        : [
            [0.18, 1],
            [0.84, 1],
          ];

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
      stars: { x: number; y: number; p: number }[] = [];
    const size = () => {
      W = cv.width = Math.max(1, Math.ceil(cv.clientWidth / PX));
      H = cv.height = Math.max(1, Math.ceil(cv.clientHeight / PX));
      dust = Array.from({ length: DUST[5] ?? 0 }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        v: 0.04 + Math.random() * 0.1,
        a: Math.random(),
      }));
      stars = Array.from({ length: STARS[5] ?? 0 }, () => ({
        x: (Math.random() * W) | 0,
        y: (Math.random() * H) | 0,
        p: Math.random() * 6,
      }));
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(cv);
    const col = (a: number) => `rgba(${cur[0] | 0},${cur[1] | 0},${cur[2] | 0},${a})`;

    // un niveau entier (rayons, bandes, anneaux), avec une opacité globale pour les fondus
    const scene = (lv: number, ga: number, t: number, cx: number, cy: number, cw: number) => {
      if (ga <= 0.001) return;
      ctx.globalAlpha = ga;
      if (lv >= 2) {
        const n = lv >= 4 ? 16 : 12,
          R = Math.hypot(W, H),
          turn = t * (lv >= 4 ? 0.14 : 0.08);
        for (let i = 0; i < n; i++) {
          const a0 = turn + (i / n) * Math.PI * 2,
            a1 = a0 + (Math.PI / n) * 0.55;
          ctx.fillStyle = col(
            lv >= 4 ? 0.13 + 0.07 * Math.sin(t * 3 + i) : lv >= 3 ? 0.1 + 0.05 * Math.sin(t * 2 + i) : 0.08,
          );
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(a0) * R, cy + Math.sin(a0) * R);
          ctx.lineTo(cx + Math.cos(a1) * R, cy + Math.sin(a1) * R);
          ctx.fill();
        }
      }
      // bandes en escalier qui glissent doucement (l'escalier vient de l'agrandissement sans lissage)
      const slope = -0.1,
        thick = Math.max(6, H * 0.09);
      bandsOf(lv).forEach(([pos, alpha], k) => {
        const shift = Math.sin(t * 0.35 + k) * 3;
        const y0 = H * pos + shift - (slope * W) / 2;
        ctx.fillStyle = col(alpha * (lv === 0 ? 1 : 0.95));
        ctx.beginPath();
        ctx.moveTo(0, y0);
        ctx.lineTo(W, y0 + slope * W);
        ctx.lineTo(W, y0 + slope * W + thick);
        ctx.lineTo(0, y0 + thick);
        ctx.fill();
        // reflet blanc qui parcourt la bande (à partir de 1/10 000)
        if (lv >= 3 && alpha >= 0.5) {
          const x = ((t * 40 + (k * W) / 2) % (W + 60)) - 30;
          ctx.fillStyle = 'rgba(255,255,255,.55)';
          ctx.beginPath();
          ctx.moveTo(x, y0 + slope * x);
          ctx.lineTo(x + 8, y0 + slope * (x + 8));
          ctx.lineTo(x + 2, y0 + slope * (x + 2) + thick);
          ctx.lineTo(x - 6, y0 + slope * (x - 6) + thick);
          ctx.fill();
        }
      });
      // 1/100 000 : anneau de pixels en orbite et ondes de choc ; 1/1 000 000 : deux anneaux
      if (lv >= 4) {
        const R0 = cw * 0.78;
        const rings: [number, number, number][] = [
          [1, 22, 0.9],
          ...(lv >= 5 ? [[-1.4, 14, 1.25] as [number, number, number]] : []),
        ];
        rings.forEach(([dir, n, k]) => {
          for (let i = 0; i < n; i++) {
            const a = t * 0.9 * dir + (i / n) * Math.PI * 2,
              R = R0 * k + Math.sin(t * 3 + i) * 1.5;
            ctx.fillStyle = i % 3 ? col(0.9) : 'rgba(255,255,255,.95)';
            ctx.fillRect((cx + Math.cos(a) * R) | 0, (cy + Math.sin(a) * R * 0.92) | 0, i % 4 ? 1 : 2, i % 4 ? 1 : 2);
          }
        });
        const period = lv >= 5 ? 1.2 : 1.8,
          ph = (t % period) / period;
        ctx.strokeStyle = col(0.8 * (1 - ph));
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, R0 + ph * W * 0.55, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };

    const draw = (t: number, dt: number) => {
      // la couleur glisse vers la cible ; un nouveau niveau arrive en fondu
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

      // poussière de pixels qui monte (à partir de 1/1000), et étoiles en croix (à partir de 1/10 000)
      const on = (i: number, counts: number[]) =>
        (i < (counts[lvNow] ?? 0) ? (lvPrev === lvNow ? 1 : f) : 0) +
        (lvPrev !== lvNow && i < (counts[lvPrev] ?? 0) ? 1 - f : 0);
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
        ctx.fillStyle = `rgba(255,255,255,${kk * w})`;
        ctx.fillRect(st.x, st.y, 1, 1);
        if (kk > 0.85) {
          ctx.fillRect(st.x - 1, st.y, 3, 1);
          ctx.fillRect(st.x, st.y - 1, 1, 3);
        }
      });
      if (lvPrev !== lvNow && fade >= 1) lvPrev = lvNow;
    };

    let raf = 0,
      last = 0;
    const t0 = performance.now();
    const loop = (now: number) => {
      draw((now - t0) / 1000, last ? Math.min(0.05, (now - last) / 1000) : 0);
      last = now;
      // effets réduits : on ne redessine que pendant une transition de couleur ou de niveau
      const settled = lvPrev === lvNow && target.current.rgb.every((v, i) => Math.abs(v - (cur[i] ?? v)) < 0.5);
      raf = still && settled ? 0 : requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    // en mode figé, un changement de cible relance juste la transition
    const wake = setInterval(() => {
      if (!raf) {
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
