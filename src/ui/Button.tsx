import type { ButtonHTMLAttributes } from 'react';
import s from './Button.module.css';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger' | 'gold';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  block?: boolean;
};

// Bouton du site. Primary = l'action principale de l'écran (une seule par écran), avec l'ombre « arcade »
// qui s'enfonce au clic. Ghost = actions secondaires. Danger = actions destructives. Gold = dépenser des pièces.
export function Button({
  variant = 'ghost',
  size = 'md',
  loading,
  block,
  className,
  disabled,
  children,
  ...rest
}: Props) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={[s.btn, s[variant], s[size], block && s.block, className].filter(Boolean).join(' ')}
      data-variant={variant}
    >
      {loading ? <span className={s.spin} aria-hidden /> : null}
      <span className={s.label}>{children}</span>
    </button>
  );
}
