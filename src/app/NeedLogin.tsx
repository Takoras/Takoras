import { useT } from '@/i18n/useT';
import { Button } from '@/ui/Button';
import { openUI } from './ui-store';
import s from './NeedLogin.module.css';

// Page réservée aux joueurs connectés : titre, explication, bouton Connexion
export function NeedLogin({ title }: { title: string }) {
  const t = useT();
  return (
    <section className={s.empty}>
      <h1>{title}</h1>
      <p className="muted">{t('ui.acc_need')}</p>
      <Button variant="primary" onClick={() => openUI('account')}>
        {t('ui.login')}
      </Button>
    </section>
  );
}
