import { create } from 'zustand';

// Fenêtre de chat (en bas à droite) : quelle conversation est ouverte. L'affichage est dans ChatDock.
export const useChat = create<{ open: string | null; dock: boolean; min: boolean }>(() => ({
  open: null,
  dock: false,
  min: false,
}));
export const openChat = (id: string | null = null) => useChat.setState({ open: id, dock: true, min: false });
export const closeChat = () => useChat.setState({ open: null, dock: false });
