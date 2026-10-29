import { sfx } from '@/engines/sound.js';
/* eslint-disable react-refresh/only-export-components -- la fonction d'appel vit à côté de son affichage */
import { create } from 'zustand';
import s from './Toast.module.css';

// Petits messages en bas de l'écran (2,6 s). Le texte est TOUJOURS du texte (jamais du HTML).
type Toast = { id: number; text: string; bad: boolean };
const useToasts = create<{ list: Toast[] }>(() => ({ list: [] }));
let n = 0;
export function toast(text: string, bad = false) {
  const id = ++n;
  if (!bad) sfx.pop(); // (les erreurs ont déjà leur son « refusé »)
  useToasts.setState((st) => ({ list: [...st.list.slice(-2), { id, text, bad }] }));
  setTimeout(() => useToasts.setState((st) => ({ list: st.list.filter((x) => x.id !== id) })), 2600);
}
export function ToastHost() {
  const list = useToasts((st) => st.list);
  return (
    <div className={s.host} role="status" aria-live="polite">
      {list.map((x) => (
        <div key={x.id} className={[s.toast, x.bad && s.bad].filter(Boolean).join(' ')}>
          {x.text}
        </div>
      ))}
    </div>
  );
}
