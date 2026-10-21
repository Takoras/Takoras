import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { qc } from './lib/queryClient';
import { RouterProvider } from 'react-router';
import { router } from './app/router';
import { redirectLegacyHash } from './app/legacyHash';
import { AccountModal } from './app/AccountModal';
import { SettingsModal } from './app/SettingsModal';
import { InfoModal } from './features/info/InfoModal';
import { ToastHost } from './ui/toast';
import { ConfirmHost } from './ui/confirm';
import { initAuth } from './lib/auth';
import { reducedFx, useSettings } from './lib/settings';
import { configureSound, installSoundListeners } from './engines/sound';
import './styles/global.css';

// Anciens liens #… → nouvelle adresse, avant le premier affichage
const legacy = redirectLegacyHash();
if (legacy) history.replaceState(null, '', legacy);

// Langue, effets allégés et son branchés sur les réglages
const applySettings = () => {
  const st = useSettings.getState();
  document.documentElement.lang = st.lang;
  document.documentElement.classList.toggle('reduce-fx', reducedFx(st.fx));
};
applySettings();
useSettings.subscribe(applySettings);
configureSound({ volume: () => useSettings.getState().volume, reduced: () => reducedFx() });
installSoundListeners();
initAuth();

const root = document.getElementById('root');
if (!root) throw new Error('#root introuvable');
createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
      <AccountModal />
      <SettingsModal />
      <InfoModal />
      <ConfirmHost />
      <ToastHost />
    </QueryClientProvider>
  </StrictMode>,
);
