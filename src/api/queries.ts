import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { ecoApi } from './index';

// État du joueur renvoyé par eco_state (source de vérité : le serveur)
export type Me = {
  coins: number;
  stock: number;
  max: number;
  admin: boolean;
  pseudo: string | null;
  banned: boolean;
  beta: boolean;
  tester: boolean;
  [k: string]: unknown;
};

export function useMe() {
  const uid = useAuth((s) => s.user?.id);
  return useQuery({
    queryKey: ['me', uid],
    queryFn: async () => (await ecoApi.state()) as unknown as Me,
    enabled: !!uid,
    staleTime: 15_000,
  });
}
