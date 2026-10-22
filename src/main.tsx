import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { qc } from './lib/queryClient';
import { RouterProvider } from 'react-router';
import { router } from './app/router';
import { redirectLegacyHash } from './app/legacyHash';
import { AccountModal } from './app/AccountModal';
import { SettingsModal } from './app/SettingsModal';
import { InfoGate } from './features/info/InfoGate';
import { ToastHost } from './ui/toast';
import { ConfirmHost } from './ui/confirm';
import { initAuth } from './lib/auth';
import { reducedFx, useSettings, WEBKIT_ONLY } from './lib/settings';
import { configureSound, installSoundListeners } from './engines/sound';
import { host } from './engines/env';
import { loadEn } from './i18n';
import { watchUpdates } from './lib/updates';
import { confirm } from './ui/confirm';
import './styles/global.css';
import './styles/art.css';

// Anciens liens #… → nouvelle adresse, avant le premier affichage
const legacy = redirectLegacyHash();
if (legacy) history.replaceState(null, '', legacy);

// Langue, effets allégés et son branchés sur les réglages
const applySettings = () => {
  const st = useSettings.getState();
  document.documentElement.lang = st.lang;
  if (st.lang === 'en') void loadEn();
  document.documentElement.classList.toggle('reduce-fx', reducedFx(st.fx));
  document.documentElement.classList.toggle('no-svgfx', WEBKIT_ONLY);
};
applySettings();
useSettings.subscribe(applySettings);
configureSound({ volume: () => useSettings.getState().volume, reduced: () => reducedFx() });
installSoundListeners();
initAuth();
watchUpdates(); // nouvelle version en ligne → la page se recharge toute seule
host.ask = (text) => confirm(text, { danger: true });

const root = document.getElementById('root');
if (!root) throw new Error('#root introuvable');
// Joueur en anglais : on attend le dictionnaire avant d'afficher (pas d'éclair de français)
const ready = useSettings.getState().lang === 'en' ? loadEn() : Promise.resolve();
void ready.finally(() =>
  createRoot(root).render(
    <StrictMode>
      <QueryClientProvider client={qc}>
        <RouterProvider router={router} />
        <AccountModal />
        <SettingsModal />
        <InfoGate />
        <ConfirmHost />
        <ToastHost />
      </QueryClientProvider>
    </StrictMode>,
  ),
);
