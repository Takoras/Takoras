import { useRef } from 'react';
import { openPulls } from '../eco/openPulls';
import s from './Home.module.css';

// Jeton du pull, en grand : il penche vers le pointeur avec un reflet. id="coin" : le moteur d'ouverture
// part de sa position pour la transition, et le cache pendant l'ouverture.
export function HeroCoin({ img, label }: { img: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect(),
      x = (e.clientX - r.left) / r.width,
      y = (e.clientY - r.top) / r.height;
    el.style.setProperty('--rx', `${((0.5 - y) * 28).toFixed(1)}deg`);
    el.style.setProperty('--ry', `${((x - 0.5) * 28).toFixed(1)}deg`);
    el.style.setProperty('--mx', `${(x * 100).toFixed(0)}%`);
    el.style.setProperty('--my', `${(y * 100).toFixed(0)}%`);
    el.style.setProperty('--gl', '1');
  };
  const leave = () => {
    const el = ref.current;
    if (!el) return;
    ['--rx', '--ry'].forEach((k) => el.style.setProperty(k, '0deg'));
    el.style.setProperty('--gl', '0');
  };
  return (
    <div className={s.coinWrap}>
      <div className={s.orbit} aria-hidden />
      <div className={s.motes} aria-hidden>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <i key={i} />
        ))}
      </div>
      {/* toucher le jeton = ouvrir un tirage (comme le bouton « Ouvrir 1 ») */}
      <div
        id="coin"
        ref={ref}
        className={s.coin}
        onPointerMove={move}
        onPointerLeave={leave}
        role="button"
        tabIndex={0}
        aria-label={`${label} · ouvrir un tirage`}
        onClick={() => void openPulls(1)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            void openPulls(1);
          }
        }}
      >
        <div className={s.tilt}>
          <img className="px" src={img} alt="" width={220} height={220} />
          <i className={s.glare} style={{ maskImage: `url(${img})`, WebkitMaskImage: `url(${img})` }} aria-hidden />
        </div>
      </div>
    </div>
  );
}
