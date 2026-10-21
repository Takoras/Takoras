import { Link } from 'react-router';
import { useT } from '@/i18n/useT';

export default function NotFound() {
  const t = useT();
  return (
    <section style={{ display: 'grid', gap: 'var(--s-3)', padding: 'var(--s-10) 0' }}>
      <h1>404</h1>
      <p className="muted">{t('app.not_found')}</p>
      <Link to="/">{t('app.go_home')}</Link>
    </section>
  );
}
