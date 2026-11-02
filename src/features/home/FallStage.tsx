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
    const imgs = list.map((j) => {
      const im = new Image();
      im.src = texOf(j);
      return im;
    });
    const pick = () => {
      let r = Math.random() * total;
      for (let i = 0; i < weights.length; i++) if ((r -= weights[i] ?? 0) <= 0) return i;
      return 0;
    };
    let W = 0,
      H = 0,
      dpr = 1;
    const resize = () => {
      dpr = Math.min(1.5, window.devicePixelRatio || 1);
      W = window.innerWidth;
      H = window.innerHeight;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
    };
    resize();
    const N = W < 700 ? 18 : 30;
    const drops: Drop[] = Array.from({ length: N }, () => ({
      t: pick(),
      x: Math.random(),
      y: Math.random(),
      z: Math.random(),
      spin: (Math.random() - 0.5) * 1.2,
      rot: Math.random() * 6.28,
    }));
    const streaks: Streak[] = Array.from({ length: W < 700 ? 16 : 28 }, () => ({
      x: Math.random(),
      y: Math.random(),
      z: Math.random(),
      len: 40 + Math.random() * 160,
    }));
    // pointeur : léger décalage de perspective (les proches bougent plus)
    let px = 0,
      tx = 0;
    const onMove = (e: PointerEvent) => {
      tx = e.clientX / W - 0.5;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('resize', resize);

    const hasFilter = 'filter' in ctx;
    const draw = (dt: number) => {
      px += (tx - px) * Math.min(1, dt * 3);
      ctx.clearRect(0, 0, W, H);
      // traits de vitesse
      for (const st of streaks) {
        st.y -= dt * (1.4 + st.z * 2.2);
        if (st.y < -0.3) {
          st.y = 1.1;
          st.x = Math.random();
        }
        const x = st.x * W - px * 40 * st.z,
          y = st.y * H;
        const g = ctx.createLinearGradient(x, y, x, y + st.len);
        g.addColorStop(0, 'rgba(196,181,253,0)');
        g.addColorStop(1, `rgba(196,181,253,${0.05 + st.z * 0.18})`);
        ctx.fillStyle = g;
        ctx.fillRect(x, y, 1 + st.z, st.len);
      }
      // jetons, du plus loin au plus proche
      drops.sort((a, b) => a.z - b.z);
      for (const d of drops) {
        const im = imgs[d.t];
        if (!im?.complete || !im.naturalWidth) continue;
        const size = 16 + d.z * d.z * 110;
        d.y -= dt * (0.12 + d.z * 0.75);
        d.rot += dt * d.spin;
        if (d.y < -0.25) {
          d.y = 1.15;
          d.x = Math.random();
          d.t = pick();
        }
        const x = d.x * W - px * 60 * d.z,
          y = d.y * H;
        // profondeur de champ : flou loin et tout près, net au milieu
        const blur = d.z < 0.3 ? (0.3 - d.z) * 12 : d.z > 0.82 ? (d.z - 0.82) * 40 : 0;
        const a = 0.18 + d.z * 0.55;
        if (hasFilter) ctx.filter = blur > 0.4 ? `blur(${blur.toFixed(1)}px)` : 'none';
        // traînée : copies de plus en plus pâles au-dessus (on monte, donc la traînée est en bas)
        for (let k = 3; k >= 0; k--) {
          ctx.globalAlpha = k ? (a * 0.22) / k : a;
          ctx.save();
          ctx.translate(x, y + k * size * 0.22);
          ctx.rotate(d.rot);
          ctx.drawImage(im, -size / 2, -size / 2, size, size);
          ctx.restore();
        }
      }
      ctx.globalAlpha = 1;
      if (hasFilter) ctx.filter = 'none';
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
        setTimeout(() => draw(0), 300);
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
          {[1, 2, 3, 4].map((k) => (
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
      <svg width="0" height="0" className={s.defs} aria-hidden>
        <filter id="fall-vblur" x="-20%" y="-60%" width="140%" height="220%">
          <feGaussianBlur stdDeviation="0 10" />
        </filter>
      </svg>
    </div>
  );
}
