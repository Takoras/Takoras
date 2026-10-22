import { create } from 'zustand';

// Fenêtres ouvertes de l'interface générale
export const useUI = create<{ settings: boolean; account: boolean; more: boolean }>(() => ({
  settings: false,
  account: false,
  more: false,
}));
export const openUI = (k: 'settings' | 'account' | 'more', v = true) => useUI.setState({ [k]: v });
