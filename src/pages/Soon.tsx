import type { Key } from '@/i18n';
import { useT } from '@/i18n/useT';
import s from './Soon.module.css';

// Page pas encore réécrite (phases 6 à 9) : on renvoie vers l'ancien site, qui fonctionne toujours.
export default function Soon({ title }: { title: string }) {
  const t = useT();
  return (
    <section className={s.box}>
      <p className="eyebrow">{title}</p>
      <h1>{t('app.soon_t')}</h1>
      <p className="muted">{t('app.soon_p')}</p>
    </section>
  );
}

export function SoonPage({ k }: { k: Key }) {
  const t = useT();
  return <Soon title={t(k)} />;
}
