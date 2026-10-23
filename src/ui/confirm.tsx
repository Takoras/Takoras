/* eslint-disable react-refresh/only-export-components -- la fonction d'appel vit à côté de son affichage */
import { useState } from 'react';
import { create } from 'zustand';
import { useT } from '@/i18n/useT';
import { Button } from './Button';
import { Modal } from './Modal';
import s from './Confirm.module.css';

// Confirmation maison (remplace confirm() natif) : `await confirm('Vendre ?', { danger: true })`.
// `typed` : il faut taper ce mot pour valider (actions très destructives).
type Ask = { text: string; ok?: string; danger?: boolean; typed?: string; resolve: (v: boolean) => void };
const useAsk = create<{ ask: Ask | null }>(() => ({ ask: null }));
export function confirm(text: string, o: { ok?: string; danger?: boolean; typed?: string } = {}) {
  return new Promise<boolean>((resolve) => useAsk.setState({ ask: { text, ...o, resolve } }));
}
export function ConfirmHost() {
  const ask = useAsk((st) => st.ask);
  const t = useT();
  const [typed, setTyped] = useState('');
  const done = (v: boolean) => {
    ask?.resolve(v);
    setTyped('');
    useAsk.setState({ ask: null });
  };
  const blocked = !!ask?.typed && typed.trim() !== ask.typed;
  return (
    <Modal open={!!ask} onClose={() => done(false)}>
      <p className={s.text}>{ask?.text}</p>
      {ask?.typed ? (
        <input
          className={s.input}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={ask.typed}
          aria-label={ask.typed}
        />
      ) : null}
      <div className={s.row}>
        <Button onClick={() => done(false)}>{t('ui.cancel')}</Button>
        <Button variant={ask?.danger ? 'danger' : 'primary'} disabled={blocked} onClick={() => done(true)}>
          {ask?.ok ?? t('ui.confirm_ok')}
        </Button>
      </div>
    </Modal>
  );
}
