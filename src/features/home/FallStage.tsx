import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { MYSTERE, SERIES, texOf, texScale } from '@/data/jetons';
import { cKey, useInventory } from '../inventory/inv';
import { reducedFx, useSettings } from '@/lib/settings';
import { translate } from '@/i18n';
import { serieTheme } from '@/engines/env';
import { openPulls } from '../eco/openPulls';
import s from './Fall.module.css';

// Accueil : on est en chute libre. Le jeton de la série choisie tombe sans fin au centre (il reste au milieu,
// c'est le monde qui défile vers le haut), avec une traînée floue. Autour, une pluie de jetons de la série
// à différentes profondeurs (les lointains petits et flous, les proches grands et flous, le milieu net).

type Drop = { t: number; x: number; y: number; z: number; spin: number; rot: number; known: boolean };
type Streak = { x: number; y: number; z: number; len: number };

// Pluie de fond (canvas plein écran derrière l'accueil). Changer de série : le nouveau fond (ses jetons, ses
// couleurs) apparaît en fondu par-dessus l'ancien, qui s'efface en même temps (pas de coupure).
export function FallRain({ serie }: { serie: string }) {
  const [layers, setLayers] = useState([{ serie, k: 0, out: false }]);
  const [cur, setCur] = useState(serie);
  if (cur !== serie) {
    setCur(serie);
    setLayers((l) => [...l.map((x) => ({ ...x, out: true })), { serie, k: (l[l.length - 1]?.k ?? 0) + 1, out: false }]);
  }
  useEffect(() => {
    if (!layers.some((x) => x.out)) return;
    const id = setTimeout(() => setLayers((l) => l.filter((x) => !x.out)), 950);
    return () => clearTimeout(id);
  }, [layers]);
  return (
    <>
      {layers.map((x) => (
        <RainLayer key={x.k} serie={x.serie} out={x.out} />
      ))}
    </>
  );
}

function RainLayer({ serie, out }: { serie: string; out: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  // pas de spoil : seuls les jetons que le joueur a déjà eus tombent tels quels, les autres tombent en « ? »
  const inv = useInventory();
  const known = useRef<Set<string>>(new Set());
  useEffect(() => {
    const coll = inv.data?.coll;
    known.current = new Set(
      (SERIES[serie] ?? []).filter((j) => (coll?.get(cKey(serie, j.name))?.total ?? 0) > 0).map((j) => j.name),
    );
  }, [inv.data, serie]);
  // couche déjà effacée (changement de série) : pas de copie qui s'efface à son retrait
  const gone = useRef(out);
  useEffect(() => {
    gone.current = out;
  }, [out]);

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
    const bake = (im: HTMLImageElement, ts: number): Sprite[] =>
      LEVELS.map((b) => {
        // dessin 80×80 : l'image est plus grande que le jeton (le vide autour), le corps garde sa taille
        const pad = Math.ceil(b * 2.5) + Math.ceil((S * (ts - 1)) / 2);
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
            const e = (S * (ts - 1)) / 2;
            g.drawImage(im, pad - e, pad - e + k * S * 0.15, S * ts, S * ts);
          }
        }
        return { cv: c, ox: pad + S / 2, oy: pad + S / 2 };
      });
    list.forEach((j, i) => {
      const im = new Image();
      im.onload = () => (sprites[i] = bake(im, texScale(j)));
      im.src = texOf(j);
    });
    // le jeton mystère (pour ceux pas encore découverts)
    let mystery: Sprite[] | null = null;
    const mim = new Image();
    mim.onload = () => (mystery = bake(mim, 1));
    mim.src = MYSTERE;
    const isKnown = (t: number) => known.current.has(list[t]?.name ?? '');
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
    // demi-résolution : le fond est flou, ça ne se voit pas et ça fait 4 fois moins de pixels à dessiner
    let buildAmbient = () => {};
    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      cv.width = Math.ceil(W / 2);
      cv.height = Math.ceil(H / 2);
      ctx.setTransform(0.5, 0, 0, 0.5, 0, 0);
      ctx.imageSmoothingEnabled = true;
      buildAmbient();
    };
    resize();
    const N = W < 700 ? 14 : 24;
    const drops: Drop[] = Array.from({ length: N }, () => ({
      t: pick(),
      known: false,
      x: Math.random(),
      y: Math.random(),
      z: Math.random(),
      spin: Math.random() * 6.28,
      rot: 0,
    }));
    const streaks: Streak[] = Array.from({ length: W < 700 ? 8 : 14 }, () => ({
      x: Math.random(),
      y: Math.random(),
      z: Math.random(),
      len: 40 + Math.random() * 160,
    }));
    drops.sort((a, b) => a.z - b.z);
    drops.forEach((d) => (d.known = isKnown(d.t))); // inventaire déjà chargé : les jetons connus tombent tout de suite // du plus loin au plus proche (l'ordre ne change jamais)
    // nappes de couleur qui dérivent (lumière d'ambiance) : un dégradé pré-dessiné, juste déplacé
    const blobImg = document.createElement('canvas');
    blobImg.width = blobImg.height = 256;
    const bg = blobImg.getContext('2d');
    if (bg) {
      const g = bg.createRadialGradient(128, 128, 0, 128, 128, 128);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      bg.fillStyle = g;
      bg.fillRect(0, 0, 256, 256);
    }
    const tint = (c: string) => {
      const k = document.createElement('canvas');
      k.width = k.height = 256;
      const g = k.getContext('2d');
      if (g) {
        g.drawImage(blobImg, 0, 0);
        g.globalCompositeOperation = 'source-in';
        g.fillStyle = c;
        g.fillRect(0, 0, 256, 256);
      }
      return k;
    };
    const th = serieTheme(serie),
      rgb = (s: string) => `rgb(${s.split(' ').join(',')})`;
    const blobs = [
      { img: tint(rgb(th.alt)), x: 0.2, y: 0.3, r: 0.55, sp: 0.07, ph: 0 },
      { img: tint(rgb(th.main)), x: 0.8, y: 0.5, r: 0.6, sp: 0.05, ph: 2 },
      { img: tint(rgb(th.hi)), x: 0.5, y: 0.8, r: 0.4, sp: 0.09, ph: 4 },
    ];
    // les nappes sont dessinées UNE fois (à la taille de l'écran, un peu plus grand pour dériver sans bord) ;
    // à chaque image, on ne fait plus qu'une copie de cette image (avant : 3 grands dessins additifs par image)
    const ambient = document.createElement('canvas');
    buildAmbient = () => {
      ambient.width = Math.ceil((W * 1.1) / 2);
      ambient.height = Math.ceil((H * 1.1) / 2);
      const a = ambient.getContext('2d');
      if (!a) return;
      a.setTransform(0.5, 0, 0, 0.5, 0, 0);
      a.globalCompositeOperation = 'lighter';
      a.globalAlpha = 0.16;
      for (const b of blobs) {
        const r = Math.max(W, H) * b.r;
        a.drawImage(b.img, b.x * W * 1.1 - r, b.y * H * 1.1 - r, r * 2, r * 2);
      }
    };
    buildAmbient();
    // poussière : de tout petits points qui montent vite (ça donne la vitesse de chute)
    const dust = Array.from({ length: W < 700 ? 22 : 40 }, () => ({
      x: Math.random(),
      y: Math.random(),
      z: Math.random(),
    }));
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
      // nappes de couleur : une seule copie, qui dérive doucement
      ctx.globalAlpha = 1;
      ctx.drawImage(
        ambient,
        -W * 0.05 + Math.sin(time * 0.06) * W * 0.04 - px * 20,
        -H * 0.05 + Math.cos(time * 0.05) * H * 0.03,
        W * 1.1,
        H * 1.1,
      );
      ctx.fillStyle = '#8eaaff';
      for (const p of dust) {
        p.y -= dt * (0.5 + p.z * 1.6);
        if (p.y < -0.02) {
          p.y = 1.02;
          p.x = Math.random();
        }
        ctx.globalAlpha = 0.15 + p.z * 0.45;
        const sz = 1 + p.z * 2.5;
        ctx.fillRect(p.x * W - px * 30 * p.z, p.y * H, sz, sz * (2 + p.z * 4));
      }
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
        const sp = d.known ? sprites[d.t] : mystery;
        d.y -= dt * (0.1 + d.z * 0.6);
        if (d.y < -0.3) {
          d.y = 1.2;
          d.x = Math.random();
          d.t = pick();
          d.known = isKnown(d.t); // décidé à l'apparition : un jeton ne change jamais d'image en tombant
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
      // (le voile sombre du milieu est un masque CSS fixe sur le canvas : plus rien à peindre ici)
    };

    // le fond s'arrête à la bande « En direct » ([data-rain-end]) : en dessous, fond uni.
    // On coupe le canvas en fondu à cet endroit, et on arrête de dessiner quand on est descendu plus bas.
    let cut = H;
    const measure = () => {
      const end = document.querySelector('[data-rain-end]');
      const r = end?.getBoundingClientRect();
      cut = r ? r.top + r.height / 2 : H;
      cv.style.setProperty('--cut', `${Math.round(cut)}px`);
    };
    const onScroll = () => {
      measure();
      if (cut <= 0) stop();
      else start();
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    let raf = 0,
      last = 0;
    // 30 images par seconde suffisent pour un fond flou : deux fois moins de travail
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (last && now - last < 31) return;
      const dt = last ? Math.min(0.08, (now - last) / 1000) : 1 / 30;
      last = now;
      draw(dt);
    };
    function start() {
      measure();
      if (raf || document.hidden || cut <= 0) return;
      if (reducedFx() || matchMedia('(prefers-reduced-motion: reduce)').matches) {
        // une seule image fixe quand les effets sont allégés
        [300, 1200].forEach((ms) => setTimeout(() => draw(0), ms)); // après le chargement des images
        return;
      }
      last = 0;
      raf = requestAnimationFrame(loop);
    }
    function stop() {
      cancelAnimationFrame(raf);
      raf = 0;
    }
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', onVis);
    start();
    return () => {
      stop();
      // on quitte l'accueil : une copie du dernier dessin s'efface en douceur (le fond ne disparaît pas d'un coup)
      if (!gone.current && !reducedFx() && cv.width) {
        const ghost = cv.cloneNode() as HTMLCanvasElement;
        ghost.getContext('2d')?.drawImage(cv, 0, 0);
        ghost.className = `${s.rain} ${s.rainOut}`;
        ghost.style.setProperty('--cut', cv.style.getPropertyValue('--cut'));
        document.body.appendChild(ghost);
        setTimeout(() => ghost.remove(), 950);
      }
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', onScroll);
    };
  }, [serie]);

  // hors du zoom du site (#root) : le canvas couvre vraiment toute la largeur de la fenêtre
  return createPortal(
    <canvas ref={ref} className={`${s.rain} ${out ? s.rainOut : s.rainIn}`} aria-hidden />,
    document.body,
  );
}

// Le jeton du centre, en chute libre. Changer de série : l'ancien file vers le bas, le nouveau tombe à sa place.
// id="coin" : le moteur d'ouverture part de sa position pour la transition.
export function FallCoin({
  img,
  label,
  serie = 'Takoras',
  disabled = false,
}: {
  img: string;
  label: string;
  serie?: string;
  disabled?: boolean;
}) {
  // Les jetons affichés : le jeton actuel, et l'ancien pendant qu'il tombe. L'ancien GARDE le même élément
  // (même clé) : on lui ajoute juste la classe « out », donc son tremblement continue sans s'arrêter ni rétrécir.
  const [items, setItems] = useState([{ src: img, k: 0, out: false }]);
  const tiltRef = useRef<HTMLDivElement>(null);
  const cur = items.find((x) => !x.out);
  if (cur && cur.src !== img) {
    const k = Math.max(...items.map((x) => x.k)) + 1;
    setItems([...items.map((x) => ({ ...x, out: true })), { src: img, k, out: false }]);
  }
  const hasOut = items.some((x) => x.out);
  useEffect(() => {
    if (!hasOut) return;
    const id = setTimeout(() => setItems((xs) => xs.filter((x) => !x.out)), 750);
    return () => clearTimeout(id);
  }, [hasOut, items.length]);

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
  const open = () => {
    if (!disabled) void openPulls(1, serie); // série pas ouvrable pour ce joueur : le jeton ne lance rien
  };

  const th = serieTheme(serie);
  return (
    <div className={s.fall} style={{ '--beam': `rgb(${th.hi})` } as CSSProperties}>
      <div className={s.beam} aria-hidden />
      {items.map((it) => (
        <div key={it.k} className={`${s.body} ${it.out ? s.out : s.in}`} aria-hidden={it.out || undefined}>
          <div
            id={it.out ? undefined : 'coin'}
            className={s.coin}
            role={it.out ? undefined : 'button'}
            tabIndex={it.out ? -1 : 0}
            aria-label={it.out ? undefined : `${label} · ${translate(useSettings.getState().lang, 'ui.open_pull_a')}`}
            onClick={it.out ? undefined : open}
            onPointerMove={it.out ? undefined : move}
            onPointerLeave={it.out ? undefined : leave}
            onKeyDown={(e) => {
              if (!it.out && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                open();
              }
            }}
          >
            <div ref={it.out ? undefined : tiltRef} className={s.tilt}>
              <div className={s.tumble}>
                <img className="px" src={it.src} alt="" width={260} height={260} />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
