import type { CSSProperties, ReactNode } from 'react';
import s from './CardStack.module.css';

// Pile de 3 cartes penchées en escalier (reprise fidèle de « Display Cards » de 21st.dev) :
// les cartes du fond sont grises et voilées, au survol elles reprennent leurs couleurs et montent de la pile.
export type StackCard = {
  icon: ReactNode;
  title: ReactNode;
  description: ReactNode;
  date: ReactNode;
  /** couleur du titre et de la pastille de l'icône */
  color?: string;
};

export function CardStack({ cards, className }: { cards: StackCard[]; className?: string }) {
  return (
    <div className={`${s.stack} ${className ?? ''}`}>
      {cards.slice(0, 3).map((c, i) => (
        <div
          key={i}
          className={`${s.card} ${s[`c${i}`]} ${i < cards.length - 1 ? s.dim : ''}`}
          style={{ '--c': c.color ?? 'var(--al-num)' } as CSSProperties}
        >
          <div>
            <span className={s.icon}>{c.icon}</span>
            <p className={s.title}>{c.title}</p>
          </div>
          <p className={s.desc}>{c.description}</p>
          <p className={s.date}>{c.date}</p>
        </div>
      ))}
    </div>
  );
}
