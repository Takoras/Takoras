import { create } from 'zustand';

// Ouverture de « Probas & infos » (petit, toujours chargé ; la fenêtre arrive à la demande)
export const useInfo = create<{ open: boolean }>(() => ({ open: false }));
export const openInfo = () => useInfo.setState({ open: true });
