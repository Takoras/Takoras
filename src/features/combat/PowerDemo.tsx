import { useEffect, useRef } from 'react';
import { RG } from '@/engines/ring-engine.js';
import { jetonOf, texOf } from '@/data/jetons';
import { PW_COL } from '@/data/kit';
import s from './PowerDemo.module.css';

// « Vidéo d'exemple » du pouvoir : une petite scène jouée en boucle par le vrai moteur du Ring.
// Ton jeton (en bas) utilise son pouvoir contre deux ennemis ; pour les pouvoirs de défense, c'est l'ennemi qui attaque.
const DEFENSE = new Set(['rampart', 'mirror', 'sun']);
type Frame = ([number, number, number] | null)[];

function scenario(name: string) {
  const pw = RG.kit(name).pw;
  const team = (n: string[]) => n.map((x) => ({ name: x, lvl: 1, variant: '' }));
  const st = RG.create([team([name, 'Mobu', 'Pikko']), team(['Carmin', 'Rouillé', 'Nyx'])], 'arene');
  for (const b of st.bodies) b.alive = b.i === 0 || (b.side === 1 && b.i === 1);
  const pos = DEFENSE.has(pw) ? [0, 250, 0, -600, 420, -300] : [0, 500, 0, -100, 260, -330];
  [0, 3, 4].forEach((id, k) => {
    const b = st.bodies.find((x) => x.id === id);
    if (b) [b.x, b.y] = [pos[k * 2] ?? 0, pos[k * 2 + 1] ?? 0];
  });
  const shots = DEFENSE.has(pw)
    ? [
        { i: 0, ax: 0, ay: -1, f: 0, pow: true },
        { i: 0, ax: 0, ay: 1000, f: 0.85, pow: false },
      ]
    : pw === 'telekinesis' || pw === 'surf' || pw === 'beam' || pw === 'starfall' || pw === 'blink'
      ? [{ i: 0, ax: 0, ay: -1000, f: pw === 'starfall' ? 0.55 : pw === 'blink' ? 0.6 : 0.85, pow: true }, null]
      : [{ i: 0, ax: 0, ay: -1000, f: 0.8, pow: true }, null];
  const before = RG.clone(st);
  const r = RG.resolve(st, shots as never);
  const bodies = (r.ids ?? []).map(
    (id) => before.bodies.find((b) => b.id === id) ?? before.bodies.find((b) => b.id === id - 100),
  );
  return { frames: r.frames as Frame[], bodies, ev: r.ev, R: RG.ringR(before), pw };
}

export function PowerDemo({ name }: { name: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    const c = cv?.getContext('2d');
    if (!cv || !c) return;
    const sc = scenario(name);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const imgs = new Map<string, HTMLImageElement>();
    for (const b of sc.bodies) {
      if (!b || imgs.has(b.name)) continue;
      const im = new Image();
      im.onload = () => {
        if (reduce) draw(performance.now()); // effets réduits : pas de boucle, on redessine quand le sprite arrive
      };
      im.src = texOf(jetonOf(b.name));
      imgs.set(b.name, im);
    }
    const W = cv.width,
      k = (W / 2 - 6) / 720, // cadré sur la zone de l'action (pas toute l'arène)
      col = PW_COL[sc.pw] ?? '#a78bfa';
    let f = 0,
      raf = 0,
      hold = 0,
      last = performance.now();
    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      // on joue la scène, on reste 1,2 s sur la fin, puis on recommence
      if (f >= sc.frames.length - 1) {
        hold += dt;
        if (hold > 1.2) {
          f = 0;
          hold = 0;
        }
      } else f = Math.min(sc.frames.length - 1, f + dt * 120);
      c.clearRect(0, 0, W, W);
      c.fillStyle = '#16131f';
      c.beginPath();
      c.arc(W / 2, W / 2, sc.R * k, 0, 7);
      c.fill();
      c.strokeStyle = 'rgba(196,181,253,.35)';
      c.lineWidth = 2;
      c.stroke();
      const fr = sc.frames[Math.floor(f)] ?? [];
      // anneau du pouvoir au départ
      const p0 = sc.frames[0]?.[0];
      if (p0 && f < 40) {
        c.strokeStyle = col;
        c.globalAlpha = 1 - f / 40;
        c.lineWidth = 3;
        c.beginPath();
        c.arc(W / 2 + p0[0] * k, W / 2 + p0[1] * k, p0[2] * k * (1.2 + f / 30), 0, 7);
        c.stroke();
        c.globalAlpha = 1;
      }
      fr.forEach((p, i) => {
        const b = sc.bodies[i];
        if (!p || !b) return;
        const im = imgs.get(b.name),
          x = W / 2 + p[0] * k,
          y = W / 2 + p[1] * k,
          r = p[2] * k;
        c.fillStyle = b.side === 0 ? 'rgba(167,139,250,.5)' : 'rgba(251,146,60,.5)';
        c.beginPath();
        c.arc(x, y, r + 2, 0, 7);
        c.fill();
        if (im?.complete && im.naturalWidth) {
          c.imageSmoothingEnabled = false;
          c.drawImage(im, x - r, y - r, r * 2, r * 2);
        }
      });
      if (!reduce) raf = requestAnimationFrame(draw);
    };
    if (reduce) f = Math.floor(sc.frames.length * 0.6);
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [name]);
  return <canvas ref={ref} className={s.demo} width={240} height={240} aria-hidden />;
}
