import { useEffect, useRef, useState } from 'react';
import { SERIES, texOf } from '@/data/jetons';
import { reducedFx } from '@/lib/settings';
import { openPulls } from '../eco/openPulls';
import s from './Fall.module.css';

// Accueil : on est en chute libre. Le jeton de la série choisie tombe sans fin au centre (il reste au milieu,
// c'est le monde qui défile vers le haut), avec une traînée floue. Autour, une pluie de jetons de la série
// à différentes profondeurs (les lointains petits et flous, les proches grands et flous, le milieu net).

type Drop = { t: number; x: number; y: number; z: number; spin: number; rot: number };
type Streak = { x: number; y: number; z: number; len: number };

// Pluie de fond (canvas plein écran derrière l'accueil)
export function FallRain({ serie }: { serie: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    const list = SERIES[serie] ?? [];
    // les jetons rares tombent moins souvent
    const weights = list.map((j) => 1 / Math.sqrt(j.odds));
    const total = weights.reduce((a, b) => a + b, 0) || 1;
    // Chaque jeton est pré-dessiné une fois, déjà flou et avec sa traînée, à 4 niveaux de flou :
    // à chaque image on ne fait plus que des copies (le flou en direct faisait ramer les PC).
    const S = 96,
      LEVELS = [2, 5, 9, 14];
    type Sprite = { cv: HTMLCanvasElement; ox: number; oy: number };
    const sprites: (Sprite[] | null)[] = list.map(() => null);
    const hasFilter = 'filter' in (document.createElement('canvas').getContext('2d') ?? {});
    const bake = (im: HTMLImageElement): Sprite[] =>
      LEVELS.map((b) => {
        const pad = Math.ceil(b * 2.5);
        const c = document.createElement('canvas');
        c.width = S + pad * 2;
        c.height = Math.round(S * 1.9) + pad * 2;
        const g = c.getContext('2d');
        if (g) {
          g.imageSmoothingEnabled = false;
          if (hasFilter) g.filter = `blur(${b}px)`;
          // traînée sous le jeton (le monde monte, donc ce qu'il laisse derrière est en bas)
          for (let k = 5; k >= 0; k--) {
            g.globalAlpha = k ? 0.32 / k : 1;
            g.drawImage(im, pad, pad + k * S * 0.15, S, S);
          }
        }
        return { cv: c, ox: pad + S / 2, oy: pad + S / 2 };
      });
    list.forEach((j, i) => {
      const im = new Image();
      im.onload = () => (sprites[i] = bake(im));
      im.src = texOf(j);
    });
    // trait de vitesse pré-dessiné (un dégradé), juste étiré à chaque image
    const streakImg = document.createElement('canvas');
    streakImg.width = 2;
    streakImg.height = 128;
    const sg = streakImg.getContext('2d');
    if (sg) {
      const g = sg.createLinearGradient(0, 0, 0, 128);
      g.addColorStop(0, 'rgba(196,181,253,0)');
      g.addColorStop(1, 'rgba(196,181,253,1)');
      sg.fillStyle = g;
      sg.fillRect(0, 0, 2, 128);
    }
    const pick = () => {
      let r = Math.random() * total;
      for (let i = 0; i < weights.length; i++) if ((r -= weights[i] ?? 0) <= 0) return i;
      return 0;
    };
    let W = 0,
      H = 0;
    const resize = () => {
      // pleine résolution inutile pour un fond flou : 1 pixel du canvas = 1 pixel CSS
      W = window.innerWidth;
      H = window.innerHeight;
      cv.width = W;
      cv.height = H;
      ctx.imageSmoothingEnabled = true;
    };
    resize();
    const N = W < 700 ? 14 : 24;
    const drops: Drop[] = Array.from({ length: N }, () => ({
      t: pick(),
      x: Math.random(),
      y: Math.random(),
      z: Math.random(),
      spin: Math.random() * 6.28,
      rot: 0,
    }));
    const streaks: Streak[] = Array.from({ length: W < 700 ? 12 : 22 }, () => ({
      x: Math.random(),
      y: Math.random(),
      z: Math.random(),
      len: 40 + Math.random() * 160,
    }));
    drops.sort((a, b) => a.z - b.z); // du plus loin au plus proche (l'ordre ne change jamais)
    // pointeur : léger décalage de perspective (les proches bougent plus)
    let px = 0,
      tx = 0;
    const onMove = (e: PointerEvent) => {
      tx = e.clientX / W - 0.5;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('resize', resize);

    let time = 0;
    const draw = (dt: number) => {
      time += dt;
      px += (tx - px) * Math.min(1, dt * 3);
      ctx.clearRect(0, 0, W, H);
      for (const st of streaks) {
        st.y -= dt * (1.4 + st.z * 2.2);
        if (st.y < -0.3) {
          st.y = 1.1;
          st.x = Math.random();
        }
        ctx.globalAlpha = 0.05 + st.z * 0.16;
        ctx.drawImage(streakImg, st.x * W - px * 40 * st.z, st.y * H, 1 + st.z, st.len);
      }
      for (const d of drops) {
        const sp = sprites[d.t];
        d.y -= dt * (0.1 + d.z * 0.6);
        if (d.y < -0.3) {
          d.y = 1.2;
          d.x = Math.random();
          d.t = pick();
        }
        if (!sp) continue;
        // profondeur de champ : très flou loin et tout près, un peu flou au milieu
        const lv = d.z < 0.3 ? 3 : d.z < 0.55 ? 1 : d.z < 0.8 ? 0 : 2;
        const spr = sp[lv];
        if (!spr) continue;
        const k = (16 + d.z * d.z * 110) / S;
        // petit balancement de côté pendant la chute
        const x = d.x * W - px * 60 * d.z + Math.sin(time * 1.3 + d.spin) * 6 * d.z,
          y = d.y * H;
        ctx.globalAlpha = 0.16 + d.z * 0.5;
        ctx.drawImage(spr.cv, x - spr.ox * k, y - spr.oy * k, spr.cv.width * k, spr.cv.height * k);
      }
      ctx.globalAlpha = 1;
    };

    let raf = 0,
      last = 0;
    const loop = (now: number) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      draw(dt);
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (raf || document.hidden) return;
      if (reducedFx() || matchMedia('(prefers-reduced-motion: reduce)').matches) {
        // une seule image fixe quand les effets sont allégés
        [300, 1200].forEach((ms) => setTimeout(() => draw(0), ms)); // après le chargement des images
        return;
      }
      last = 0;
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', onVis);
    start();
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('resize', resize);
    };
  }, [serie]);

  return <canvas ref={ref} className={s.rain} aria-hidden />;
}

// Le jeton du centre, en chute libre. Changer de série : l'ancien file vers le bas, le nouveau tombe à sa place.
// id="coin" : le moteur d'ouverture part de sa position pour la transition.
export function FallCoin({ img, label }: { img: string; label: string }) {
  const [shown, setShown] = useState(img);
  const [leaving, setLeaving] = useState<string | null>(null);
  const tiltRef = useRef<HTMLDivElement>(null);

  // nouvelle série : on garde l'ancienne image le temps qu'elle file vers le bas
  if (img !== shown) {
    setLeaving(shown);
    setShown(img);
  }
  useEffect(() => {
    if (!leaving) return;
    const id = setTimeout(() => setLeaving(null), 700);
    return () => clearTimeout(id);
  }, [leaving]);

  const move = (e: React.PointerEvent) => {
    const el = tiltRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--rx', `${((0.5 - (e.clientY - r.top) / r.height) * 30).toFixed(1)}deg`);
    el.style.setProperty('--ry', `${(((e.clientX - r.left) / r.width - 0.5) * 30).toFixed(1)}deg`);
  };
  const leave = () => {
    tiltRef.current?.style.setProperty('--rx', '0deg');
    tiltRef.current?.style.setProperty('--ry', '0deg');
  };
  const open = () => void openPulls(1);

  return (
    <div className={s.fall}>
      <div className={s.beam} aria-hidden />
      {leaving ? (
        <div className={`${s.body} ${s.out}`} aria-hidden>
          <img className="px" src={leaving} alt="" />
        </div>
      ) : null}
      <div key={shown} className={`${s.body} ${s.in}`}>
        {/* traînée de chute : copies étirées et floues au-dessus du jeton */}
        <div className={s.trail} aria-hidden>
          {[1, 2, 3].map((k) => (
            <img key={k} src={shown} alt="" style={{ '--k': k } as React.CSSProperties} />
          ))}
        </div>
        <div
          id="coin"
          className={s.coin}
          role="button"
          tabIndex={0}
          aria-label={`${label} · ouvrir un tirage`}
          onClick={open}
          onPointerMove={move}
          onPointerLeave={leave}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              open();
            }
          }}
        >
          <div ref={tiltRef} className={s.tilt}>
            <div className={s.tumble}>
              <img className="px" src={shown} alt="" width={260} height={260} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
