import { useNavigate } from 'react-router';
import { useT } from '@/i18n/useT';
import { Button } from '@/ui/Button';
import s from './NotFound.module.css';

// Page introuvable : le jeton mystère du jeu (comme une case encore vide), le message, le retour à l'accueil
export default function NotFound() {
  const t = useT();
  const go = useNavigate();
  return (
    <section className={s.page}>
      <img className={`px ${s.coin}`} src="/img/tokens/mystery.png" alt="" />
      <h1>404</h1>
      <p className="muted">{t('app.not_found')}</p>
      <Button variant="primary" onClick={() => void go('/')}>
        {t('app.go_home')}
      </Button>
    </section>
  );
}
