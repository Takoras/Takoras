import { useRouteError } from 'react-router';
import { useT } from '@/i18n/useT';
import { Button } from '@/ui/Button';
import { isStaleChunk, reloadOnce } from '@/lib/staleReload';

// Erreur en ouvrant une page. Cas le plus courant : le site a été mis à jour pendant que l'onglet était ouvert,
// la page demande un ancien fichier → on recharge tout seul. Sinon : un message simple et un bouton pour recharger.
export default function RouteError() {
  const err = useRouteError();
  const t = useT();
  if (isStaleChunk(err) && reloadOnce()) return null;
  return (
    <main
      style={{ display: 'grid', placeItems: 'center', minHeight: '60vh', gap: 16, textAlign: 'center', padding: 16 }}
    >
      <p>{t('ui.err_page')}</p>
      <Button onClick={() => location.reload()}>{t('ui.err_reload')}</Button>
    </main>
  );
}
