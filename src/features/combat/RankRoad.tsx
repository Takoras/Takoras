import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { RCFG } from '@/engines/ring-config.js';
import { sfx } from '@/engines/sound.js';
import { useT } from '@/i18n/useT';
import { locale, reducedFx, useSettings } from '@/lib/settings';
import { RankBadge, useRankName } from './Ranked';
import { rankOf, ROAD } from './rankedApi';
import s from './RankRoad.module.css';

// Route des rangs façon carte au trésor (reprise de « Location Map » + « Display Cards ») :
// quand elle arrive à l'écran, le chemin se trace de Bois à Takoras, les étapes apparaissent une à une,
// la partie déjà faite s'allume en or jusqu'à ton Elo et l'épingle « Toi » tombe sur ton rang en rebondissant.
// Chaque étape penche vers la souris ; la toucher déplie sa fiche (ses divisions, leur Elo, où tu en es).
const TIERS = RCFG.RANKS.map((r) => ({ k: r.k, col: r.col, steps: ROAD.filter((x) => x.k === r.k) }));
const N = TIERS.length;
const START = 1000; // tout le monde commence à 1000 (Bois 1)
const H = 300; // hauteur de la carte
const PAD = 70; // marge gauche / droite du chemin

// les étapes montent et descendent en vague
const pts = (w: number) =>
  TIERS.map((_, i) => ({ x: PAD + (i * (w - 2 * PAD)) / (N - 1), y: i % 2 ? H * 0.34 : H * 0.62 }));
// courbe douce qui passe par toutes les étapes (Catmull-Rom → Bézier)
function curve(p: { x: number; y: number }[]) {
  const at = (i: number) => p[Math.min(Math.max(i, 0), p.length - 1)] ?? { x: 0, y: 0 };
  let d = `M${at(0).x},${at(0).y}`;
  for (let i = 0; i < p.length - 1; i++) {
    const [a, b, c, e] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    d += ` C${b.x + (c.x - a.x) / 6},${b.y + (c.y - a.y) / 6} ${c.x - (e.x - b.x) / 6},${c.y - (e.y - b.y) / 6} ${c.x},${c.y}`;
  }
  return d;
}

export function RankRoad({ elo }: { elo: number }) {
  const t = useT();
  const name = useRankName();
  const lang = useSettings((x) => x.lang);
  const fmt = (n: number) => n.toLocaleString(locale(lang));
  const cur = rankOf(elo);
  const here = TIERS.findIndex((x) => x.k === cur.k);
  // avancée dans le rang actuel (0 → 1), pour allumer le chemin jusqu'à ton Elo exact
  const lo = Math.max(TIERS[here]?.steps[0]?.min ?? 0, START);
  const hi = TIERS[here + 1]?.steps[0]?.min ?? lo;
  const frac = hi > lo ? Math.min(1, Math.max(0, (elo - lo) / (hi - lo))) : 0;
  const prog = Math.min(1, (here + frac) / (N - 1));

  const box = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(1000);
  const [seen, setSeen] = useState(reducedFx);
  const [open, setOpen] = useState<number | null>(null);

  // largeur réelle (le chemin est recalculé, jamais étiré) ; au moins 820 px : sur téléphone la carte défile
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(820, Math.round(e?.contentRect.width ?? 1000))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // le chemin se trace quand la carte arrive à l'écran
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    if (reducedFx()) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  // téléphone : la carte défile jusqu'à ton rang
  useEffect(() => {
    const sc = scroller.current;
    if (sc && sc.scrollWidth > sc.clientWidth) sc.scrollLeft = Math.max(0, (pts(w)[here]?.x ?? 0) - sc.clientWidth / 2);
  }, [w, here]);
  // fermer la fiche : clic ailleurs ou Échap
  useEffect(() => {
    if (open === null) return;
    const out = (e: globalThis.PointerEvent) => {
      if (!(e.target as Element).closest(`.${s.stop}, .${s.card}`)) setOpen(null);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null);
    document.addEventListener('pointerdown', out);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', out);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const P = pts(w);
  const d = curve(P);

  // l'étape penche en 3D vers la souris (±10°), revient droite en partant
  const tilt = (e: PointerEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--ry', `${((e.clientX - r.left) / r.width - 0.5) * 20}deg`);
    e.currentTarget.style.setProperty('--rx', `${(0.5 - (e.clientY - r.top) / r.height) * 20}deg`);
  };
  const untilt = (e: PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.style.setProperty('--ry', '0deg');
    e.currentTarget.style.setProperty('--rx', '0deg');
  };

  const o = open !== null ? TIERS[open] : null;
  const op = open !== null ? P[open] : null;
  return (
    <section className={s.road} aria-labelledby="road-t">
      <header className={s.head}>
        <h2 id="road-t">{t('arena.road')}</h2>
      </header>
      <div ref={scroller} className={s.scroll}>
        <div
          ref={box}
          className={`${s.map} ${seen ? s.seen : ''}`}
          style={{ '--w': `${w}px`, '--h': `${H}px`, '--prog': prog } as CSSProperties}
        >
          <svg className={s.svg} viewBox={`0 0 ${w} ${H}`} width={w} height={H} aria-hidden>
            <defs>
              <linearGradient id="road-gold" x1="0" x2="1">
                <stop offset="0" stopColor={TIERS[0]?.col} />
                <stop offset="1" stopColor={TIERS[here]?.col} />
              </linearGradient>
            </defs>
            {/* le chemin entier (pointillés pixel), puis la partie faite qui s'allume */}
            <path className={s.trail} d={d} pathLength={1} />
            <path className={s.dots} d={d} />
            <path className={s.done} d={d} pathLength={1} stroke="url(#road-gold)" />
          </svg>

          {TIERS.map((x, i) => {
            const p = P[i] ?? { x: 0, y: 0 };
            const first = x.steps[0] ?? cur;
            const state = i < here ? s.passed : i === here ? s.here : s.locked;
            return (
              <button
                key={x.k}
                type="button"
                className={`${s.stop} ${state}`}
                style={{ left: p.x, top: p.y, '--rc': x.col, '--i': i } as CSSProperties}
                aria-current={i === here ? 'step' : undefined}
                aria-expanded={open === i}
                onPointerMove={tilt}
                onPointerLeave={untilt}
                onClick={() => {
                  sfx.click();
                  setOpen(open === i ? null : i);
                }}
              >
                <span className={s.badge}>
                  <RankBadge r={i === here ? cur : first} size={i === here ? 84 : 62} />
                </span>
                <b>{i === here ? name(cur) : t(`arena.r_${x.k}` as 'arena.r_wood')}</b>
                <small>{first.min > 0 ? `${fmt(first.min)}+` : `< ${fmt(TIERS[1]?.steps[0]?.min ?? 0)}`}</small>
              </button>
            );
          })}

          {/* l'épingle « Toi » tombe sur ton rang */}
          {P[here] ? (
            <span className={s.pin} style={{ left: P[here].x, top: P[here].y } as CSSProperties} aria-hidden>
              {t('arena.you')}
            </span>
          ) : null}

          {/* fiche du rang touché : elle se déplie depuis l'étape */}
          {o && op ? (
            <div
              key={o.k}
              className={s.card}
              style={
                {
                  left: Math.min(Math.max(op.x, 150), w - 150),
                  top: Math.min(
                    Math.max(op.y - (24 + o.steps.length * 52) / 2, 10),
                    H - 10 - (24 + o.steps.length * 52),
                  ),
                  '--rc': o.col,
                  '--ox': `${op.x - Math.min(Math.max(op.x, 150), w - 150) + 140}px`,
                } as CSSProperties
              }
              role="dialog"
              aria-label={t(`arena.r_${o.k}` as 'arena.r_wood')}
            >
              <ol>
                {o.steps.map((r, k) => {
                  const st = r.idx < cur.idx ? s.sDone : r.idx === cur.idx ? s.sNow : '';
                  return (
                    <li key={r.idx} className={st} style={{ '--k': k } as CSSProperties}>
                      <RankBadge r={r} size={40} />
                      <b>{name(r)}</b>
                      <small>
                        {r.min > 0 ? `${fmt(r.min)}+` : `< ${fmt(r.max ?? 0)}`}
                        {r.idx === cur.idx ? ` · ${t('arena.you')}` : ''}
                      </small>
                    </li>
                  );
                })}
              </ol>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
