import { NavLink } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { bourseApi } from '@/api';
import { useT } from '@/i18n/useT';
import { useAuth } from '@/lib/auth';
import { locale, useSettings } from '@/lib/settings';
import { Tween } from '@/ui/Tween';
import s from './KooBalance.module.css';

type Me = { koo: number; value: number; paid: number };

// Solde du Market à côté des pièces : les pièces qu'on peut dépenser (acheter fait baisser ce chiffre), le détail au survol
export function KooBalance({ className }: { className?: string }) {
  const t = useT();
  const lang = useSettings((x) => x.lang);
  const uid = useAuth((x) => x.user?.id);
  const q = useQuery({
    queryKey: ['bourse', uid],
    enabled: !!uid,
    queryFn: async () => (await bourseApi.state()) as { me?: Me },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const me = q.data?.me;
  if (!me) return null; // Market pas encore débloqué
  const n = (v: number) => Math.round(v).toLocaleString(locale(lang));
  const rows: [string, number][] = [
    [t('ui.bs_avail'), me.koo],
    [t('ui.bs_in_shares'), Math.max(0, me.value - me.koo)],
    [t('ui.bs_total'), me.value],
  ];
  return (
    <span className={s.wrap}>
      <NavLink to="/market" className={className} data-koo-target>
        <img className="px" src="/img/market-coin.png" alt={t('ui.bs_koo')} width={20} height={20} />
        <Tween value={me.koo} ms={900} pow={5} format={n} />
      </NavLink>
      <dl className={s.panel}>
        {rows.map(([label, v]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{n(v)}</dd>
          </div>
        ))}
      </dl>
    </span>
  );
}
