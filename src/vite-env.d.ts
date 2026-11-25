/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_KEY?: string;
}

// Identifiant de la version construite (vite.config.ts)
declare const __BUILD_ID__: string;

// Nombre de pages en cours de chargement (src/app/router.tsx) : pendant ce temps, c'est le routeur qui recharge
interface Window {
  __routeLoading?: number;
}
