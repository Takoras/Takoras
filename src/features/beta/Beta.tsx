/* eslint-disable react-refresh/only-export-components -- les fonctions d'ouverture vivent à côté de leurs fenêtres */
import { lazy, Suspense, useEffect, useRef } from 'react';
import { sfx } from '@/engines/sound.js';
import { useT } from '@/i18n/useT';
import { lsGet, lsSet } from '../social/social';
import { openFeedback, PN_KEY, TUTO_KEY, useBeta, useBetaOpen, usePatchnotes } from './store';
import s from './Beta.module.css';

// Bêta : patch notes (fenêtre + popup des nouveautés), menu des testeurs choisis par l'admin,
// bouton « Donner un avis », et tuto de première visite. Mêmes clés de stockage que l'ancien site.
export { openFeedback, openPatchnotes, openTester, openTuto, useBetaOpen } from './store';
export { TestPulls } from './TestPulls';
const BetaWindow = lazy(() => import('./BetaWindows'));

export function BetaLayer() {
  const win = useBeta((x) => x.win);
  const notes = usePatchnotes();
  const calm = useRef(0);
  // Première visite : le tuto. Sinon : la popup de la dernière patch note si elle est nouvelle.
  useEffect(() => {
    if (!notes.data || calm.current) return;
    calm.current = 1;
    const last = notes.data[0];
    let done = lsGet<string | number | null>(TUTO_KEY, null);
    // les anciens joueurs (historique ou patch note déjà vue) ne voient pas le tuto d'office
    if (done === null && (lsGet(PN_KEY, null) !== null || lsGet('takoras-hist', null) !== null)) {
      lsSet(TUTO_KEY, 1);
      done = 1;
    }
    const t = setTimeout(() => {
      if (useBeta.getState().win || document.querySelector('dialog[open]')) return;
      if (String(done) !== '1') return useBeta.setState({ win: 'tuto' });
      if (last && last.id > Number(lsGet(PN_KEY, 0))) {
        sfx.announce();
        useBeta.setState({ win: 'pop' });
      }
    }, 1500);
    return () => clearTimeout(t);
  }, [notes.data]);
  return (
    <>
      <FeedbackFab />
      {win ? (
        <Suspense fallback={null}>
          <BetaWindow win={win} />
        </Suspense>
      ) : null}
    </>
  );
}

// Puce « bêta » à côté du logo, seulement quand la bêta est ouverte
export function BetaChip() {
  const t = useT();
  const open = useBetaOpen();
  if (!open.data) return null;
  // simple étiquette : plus de menu bêta
  return <span className={s.chip}>{t('app.beta')}</span>;
}

// Bouton flottant en bas à gauche (sur téléphone, il est dans le menu Plus)
function FeedbackFab() {
  const t = useT();
  return (
    <button
      type="button"
      className={s.fab}
      onClick={() => {
        sfx.click();
        openFeedback();
      }}
    >
      <span aria-hidden></span>
      <span className={s.fabTxt}>{t('ui.fb_btn')}</span>
    </button>
  );
}
