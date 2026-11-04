import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { spring } from './spring';
import s from './ExpandCard.module.css';

// Carte qui penche en 3D vers la souris et se déplie au clic (reprise fidèle de « Location Map » de 21st.dev,
// sans framer-motion) : au lieu d'un plan de ville, elle dessine une page d'album — les lignes se tracent,
// les vignettes apparaissent une à une et la plus rare tombe au centre comme l'épingle.
export function ExpandCard({
  icon,
  badge,
  title,
  detail,
  sprites,
  star,
  color = '#34d399',
  label,
}: {
  icon: ReactNode;
  badge: ReactNode;
  title: ReactNode;
  /** ligne qui apparaît sous le titre une fois la carte ouverte */
  detail: ReactNode;
  /** jusqu'à 6 petites vignettes posées sur le plan */
  sprites: string[];
  /** la vignette qui tombe au centre */
  star: string;
  color?: string;
  label: string;
}) {
  const [hover, setHover] = useState(false);
  const [open, setOpen] = useState(false);
  // chaque ouverture remonte le plan : les tracés repartent de zéro ; à la fermeture il s'efface en fondu
  const [runs, setRuns] = useState(0);
  const wrap = useRef<HTMLButtonElement>(null);
  const tilt = useRef<HTMLDivElement>(null);
  const rx = useRef<ReturnType<typeof spring> | null>(null);
  const ry = useRef<ReturnType<typeof spring> | null>(null);
  const size = useRef<ReturnType<typeof spring> | null>(null);

  // ressorts : inclinaison (raideur 300, amortissement 30) et taille (400, 35), comme l'original
  useEffect(() => {
    const el = tilt.current;
    if (!el) return;
    let a = 0,
      b = 0;
    const paint = () => (el.style.transform = `rotateX(${a}deg) rotateY(${b}deg)`);
    rx.current = spring((v) => ((a = v), paint()), { stiffness: 300, damping: 30 });
    ry.current = spring((v) => ((b = v), paint()), { stiffness: 300, damping: 30 });
    size.current = spring(
      (v) => {
        el.style.setProperty('--w', `${240 + 120 * v}px`);
        el.style.setProperty('--h', `${140 + 140 * v}px`);
      },
      { stiffness: 400, damping: 35 },
    );
    return () => {
      rx.current?.stop();
      ry.current?.stop();
      size.current?.stop();
    };
  }, []);

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) size.current?.jump(open ? 1 : 0);
    else size.current?.set(open ? 1 : 0);
  }, [open]);

  const move = (e: React.PointerEvent) => {
    const r = wrap.current?.getBoundingClientRect();
    if (!r || e.pointerType !== 'mouse') return;
    const mx = Math.max(-50, Math.min(50, e.clientX - (r.left + r.width / 2)));
    const my = Math.max(-50, Math.min(50, e.clientY - (r.top + r.height / 2)));
    rx.current?.set((-my / 50) * 8);
    ry.current?.set((mx / 50) * 8);
  };
  const leave = () => {
    rx.current?.set(0);
    ry.current?.set(0);
    setHover(false);
  };

  return (
    <button
      ref={wrap}
      type="button"
      className={`${s.wrap} ${hover ? s.hover : ''} ${open ? s.open : ''}`}
      style={{ '--c': color } as CSSProperties}
      aria-expanded={open}
      aria-label={label}
      onPointerMove={move}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={leave}
      onClick={() => {
        if (!open) setRuns((n) => n + 1);
        setOpen(!open);
      }}
    >
      <div ref={tilt} className={s.card}>
        <div className={s.wash} />

        {/* le plan : remonté à chaque ouverture (tracés repartis de zéro), en fondu à l'ouverture et à la fermeture */}
        {runs ? (
          <div key={runs} className={s.map} aria-hidden>
            <svg className={s.roads} preserveAspectRatio="none">
              <line
                x1="0%"
                y1="35%"
                x2="100%"
                y2="35%"
                pathLength={1}
                className={s.main}
                style={{ '--d': '0.2s' } as CSSProperties}
              />
              <line
                x1="0%"
                y1="65%"
                x2="100%"
                y2="65%"
                pathLength={1}
                className={s.main}
                style={{ '--d': '0.3s' } as CSSProperties}
              />
              <line
                x1="30%"
                y1="0%"
                x2="30%"
                y2="100%"
                pathLength={1}
                className={s.mid}
                style={{ '--d': '0.4s' } as CSSProperties}
              />
              <line
                x1="70%"
                y1="0%"
                x2="70%"
                y2="100%"
                pathLength={1}
                className={s.mid}
                style={{ '--d': '0.5s' } as CSSProperties}
              />
              {[20, 50, 80].map((y, i) => (
                <line
                  key={`h${y}`}
                  x1="0%"
                  y1={`${y}%`}
                  x2="100%"
                  y2={`${y}%`}
                  pathLength={1}
                  className={s.thin}
                  style={{ '--d': `${0.6 + i * 0.1}s` } as CSSProperties}
                />
              ))}
              {[15, 45, 55, 85].map((x, i) => (
                <line
                  key={`v${x}`}
                  x1={`${x}%`}
                  y1="0%"
                  x2={`${x}%`}
                  y2="100%"
                  pathLength={1}
                  className={s.thin}
                  style={{ '--d': `${0.7 + i * 0.1}s` } as CSSProperties}
                />
              ))}
            </svg>
            {sprites.slice(0, 6).map((src, i) => (
              <span key={src} className={`${s.lot} ${s[`l${i}`]}`}>
                <img className="px" src={src} alt="" draggable={false} />
              </span>
            ))}
            <span className={s.pin}>
              <img className="px" src={star} alt="" draggable={false} />
            </span>
            <div className={s.fade} />
          </div>
        ) : null}

        {/* quadrillage discret, seulement fermée */}
        <div className={s.grid} />

        <div className={s.content}>
          <div className={s.top}>
            <span className={s.icon}>{icon}</span>
            <span className={s.badge}>
              <i />
              {badge}
            </span>
          </div>
          <div className={s.bottom}>
            <span className={s.title}>{title}</span>
            <span className={s.detail}>
              <span>{detail}</span>
            </span>
            <span className={s.line} />
          </div>
        </div>
      </div>
    </button>
  );
}
