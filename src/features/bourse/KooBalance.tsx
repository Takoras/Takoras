import { NavLink } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { bourseApi } from '@/api';
import { useT } from '@/i18n/useT';
import { useAuth } from '@/lib/auth';
import { locale, useSettings } from '@/lib/settings';
import { Tween } from '@/ui/Tween';

// Solde de la Bourse, à côté des pièces du jeu : c'est une monnaie à part
export function KooBalance({ className }: { className?: string }) {
  const t = useT();
  const lang = useSettings((x) => x.lang);
  const uid = useAuth((x) => x.user?.id);
  const q = useQuery({
    queryKey: ['bourse', uid],
    enabled: !!uid,
    queryFn: async () => (await bourseApi.state()) as { me?: { koo: number } },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  if (!q.data?.me) return null; // Bourse pas encore débloquée
  return (
    <NavLink to="/bourse" className={className}>
      <img className="px" src="/img/koo.png" alt={t('ui.bs_koo')} width={20} height={20} />
      <Tween value={q.data.me.koo} ms={900} pow={5} format={(n) => Math.round(n).toLocaleString(locale(lang))} />
    </NavLink>
  );
}
