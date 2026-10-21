import { QueryClient } from '@tanstack/react-query';

// Cache des données serveur, partagé par React et par les moteurs portés (qui y lisent l'état du joueur)
export const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } });
