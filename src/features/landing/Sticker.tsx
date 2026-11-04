import { useRef, type CSSProperties, type ReactNode } from 'react';
import { useSwing } from '@/ui/useSwing';
import s from './Landing.module.css';

// Une vignette collée dans l'album : elle a du poids. Quand le doigt ou la souris passe dessus,
// elle se décolle un peu et se balance sur un ressort, puis revient se poser.
export function Sticker({
  tilt,
  big,
  label,
  children,
}: {
  tilt: number;
  big?: boolean;
  label: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useSwing(ref);
  return (
    <div
      ref={ref}
      className={`${s.sticker} ${big ? s.big : ''}`}
      style={{ '--tilt': `${tilt}deg` } as CSSProperties}
      role="img"
      aria-label={label}
    >
      {children}
    </div>
  );
}
