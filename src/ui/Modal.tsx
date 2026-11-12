import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { sfx } from '@/engines/sound.js';
import { useT } from '@/i18n/useT';
import { reducedFx } from '@/lib/settings';
import { spring, type Spring } from './spring';
import s from './Modal.module.css';

// Fenêtre modale sur <dialog> natif : le focus reste dedans, Échap ferme, le fond est inerte.
// `locked` : impossible de fermer (ex. choix du pseudo obligatoire).
// Toutes les fenêtres s'ouvrent comme la fiche d'un jeton : la carte se déplie depuis son centre avec un petit
// rebond (ressort 520 / 24), le contenu arrive juste après ; en la fermant (croix, à côté, Échap) elle rétrécit un
// peu en s'effaçant complètement, puis se ferme.
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
  xl,
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
  /** très large (choix de l'équipe : toute une série de jetons) */
  xl?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const u = useRef<Spring | null>(null);
  const [folding, setFolding] = useState(false);
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
  // dépli : avant la première image (pas de flash de la carte entière)
  useLayoutEffect(() => {
    const el = card.current;
    if (!open || bare || !el) return;
    const paint = (v: number) => {
      const k = Math.max(0, v);
      el.style.clipPath = `inset(${((1 - k) * 42).toFixed(2)}% ${((1 - k) * 38).toFixed(2)}% round 12px)`;
      el.style.transform = `scale(${(0.9 + 0.1 * v).toFixed(4)})`;
      el.style.opacity = String(Math.min(1, k * 1.8));
    };
    if (reducedFx()) return;
    paint(0);
    const sp = spring(paint, { stiffness: 520, damping: 24 });
    sp.set(1);
    u.current = sp;
    return () => {
      sp.stop();
      el.style.clipPath = '';
      el.style.transform = '';
      el.style.opacity = '';
    };
  }, [open, bare]);
  // fermeture : la carte rétrécit un peu en s'effaçant jusqu'au bout, PUIS la fenêtre se ferme (avant, un ressort
  // coupé en route la faisait disparaître alors qu'on la voyait encore)
  const shut = () => {
    if (locked || folding) return;
    const el = card.current;
    if (bare || !el || reducedFx()) return onClose();
    setFolding(true);
    u.current?.stop();
    const done = () => {
      setFolding(false);
      onClose();
    };
    const a = el.animate(
      [
        { opacity: 1, transform: 'scale(1)', clipPath: 'inset(0% 0% round 12px)' },
        { opacity: 0, transform: 'scale(.94) translateY(8px)', clipPath: 'inset(4% 3% round 12px)' },
      ],
      { duration: 230, easing: 'cubic-bezier(.45,0,.75,.35)', fill: 'forwards' },
    );
    a.finished.then(done, done);
  };
  return (
    // Clic sur le fond = fermer ; au clavier, Échap fait la même chose (onCancel natif du <dialog>).
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={ref}
      className={[s.dialog, wide && s.wide, bare && s.noRise, xl && s.xl, (fading || folding) && s.fading]
        .filter(Boolean)
        .join(' ')}
      aria-label={typeof title === 'string' ? title : undefined}
      onCancel={(e) => {
        e.preventDefault();
        shut();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) shut();
      }}
    >
      {open ? (
        <div ref={card} className={bare ? s.bare : `${s.card} ${folding ? s.out : ''}`}>
          {title ? <h2 className={s.title}>{title}</h2> : null}
          {locked || noX ? null : (
            <button type="button" className={s.close} onClick={shut} aria-label={t('ui.close')}>
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
