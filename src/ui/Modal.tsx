import { useEffect, useRef, type ReactNode } from 'react';
import { sfx } from '@/engines/sound.js';
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
  noX,
  bare,
  fading,
  morph,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  locked?: boolean;
  wide?: boolean;
  /** pas de croix : on ferme en touchant à côté (ou Échap) */
  noX?: boolean;
  /** pas de cadre : le contenu dessine sa propre carte (fiche jeton qui se déplie) */
  bare?: boolean;
  /** le fond s'efface (la fenêtre va se fermer) */
  fading?: boolean;
  /** pas d'entrée par défaut : la fenêtre sort d'un bouton (ui/morph.ts) */
  morph?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const t = useT();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      sfx.open();
    }
    if (!open && d.open) {
      d.close();
      sfx.close();
    }
  }, [open]);
  return (
    // Clic sur le fond = fermer ; au clavier, Échap fait la même chose (onCancel natif du <dialog>).
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={ref}
      className={[s.dialog, wide && s.wide, bare && s.noRise, morph && s.morph, fading && s.fading]
        .filter(Boolean)
        .join(' ')}
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
        <div className={bare ? s.bare : s.card}>
          {title ? <h2 className={s.title}>{title}</h2> : null}
          {locked || noX ? null : (
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
