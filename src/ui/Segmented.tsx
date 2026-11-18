import { useLayoutEffect, useRef } from 'react';
import s from './Segmented.module.css';

// Choix exclusif (vitesse, langue, période…). Groupe de boutons radio accessible ; une pastille glisse vers le choix actif.
export function Segmented<V extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: V;
  options: readonly (readonly [V, string])[];
  onChange: (v: V) => void;
  label: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const thumb = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const el = box.current,
      th = thumb.current;
    if (!el || !th) return;
    const place = () => {
      const b = el.querySelector<HTMLElement>('[aria-checked="true"]');
      if (!b) return;
      th.style.width = `${b.offsetWidth}px`;
      th.style.height = `${b.offsetHeight}px`;
      th.style.transform = `translate(${b.offsetLeft}px, ${b.offsetTop}px)`;
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(el);
    return () => ro.disconnect();
  }, [value]);
  return (
    <div ref={box} className={s.seg} role="radiogroup" aria-label={label}>
      <i ref={thumb} className={s.thumb} aria-hidden />
      {options.map(([v, l]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={v === value}
          className={v === value ? s.on : undefined}
          onClick={() => onChange(v)}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
