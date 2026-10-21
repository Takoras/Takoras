import s from './Segmented.module.css';

// Choix exclusif (vitesse, langue, période…). Groupe de boutons radio accessible.
export function Segmented<V extends string>({ value, options, onChange, label }: {
  value: V;
  options: readonly (readonly [V, string])[];
  onChange: (v: V) => void;
  label: string;
}) {
  return (
    <div className={s.seg} role="radiogroup" aria-label={label}>
      {options.map(([v, l]) => (
        <button key={v} type="button" role="radio" aria-checked={v === value} className={v === value ? s.on : undefined} onClick={() => onChange(v)}>
          {l}
        </button>
      ))}
    </div>
  );
}
