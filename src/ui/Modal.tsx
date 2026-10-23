import { useEffect, useRef, type ReactNode } from 'react';
import { useT } from '@/i18n/useT';
import s from './Modal.module.css';

// Fenêtre modale sur <dialog> natif : le focus reste dedans, Échap ferme, le fond est inerte.
// `locked` : impossible de fermer (ex. choix du pseudo obligatoire).
export function Modal({
  open,
  onClose,
  title,
  children,
  locked,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  locked?: boolean;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const t = useT();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    // Clic sur le fond = fermer ; au clavier, Échap fait la même chose (onCancel natif du <dialog>).
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={ref}
      className={[s.dialog, wide && s.wide].filter(Boolean).join(' ')}
      aria-label={typeof title === 'string' ? title : undefined}
      onCancel={(e) => {
        e.preventDefault();
        if (!locked) onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !locked) onClose();
      }}
    >
      {open ? (
        <div className={s.card}>
          {title ? <h2 className={s.title}>{title}</h2> : null}
          {locked ? null : (
            <button type="button" className={s.close} onClick={onClose} aria-label={t('ui.close')}>
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          )}
          {children}
        </div>
      ) : null}
    </dialog>
  );
}
