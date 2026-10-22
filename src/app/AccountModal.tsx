import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { accountApi, errorText } from '@/api';
import { useMe } from '@/api/queries';
import { PSEUDO_RE, signInDiscord, useAuth } from '@/lib/auth';
import { useSettings } from '@/lib/settings';
import { useT } from '@/i18n/useT';
import { Button } from '@/ui/Button';
import { Modal } from '@/ui/Modal';
import { toast } from '@/ui/toast';
import { openUI, useUI } from './ui-store';
import s from './AccountModal.module.css';

// Connexion (Discord) puis choix du pseudo, obligatoire : la fenêtre ne se ferme pas tant qu'il n'est pas choisi.
export function AccountModal() {
  const t = useT();
  const lang = useSettings((x) => x.lang);
  const user = useAuth((x) => x.user);
  const me = useMe();
  const open = useUI((x) => x.account);
  const needPseudo = !!user && me.isSuccess && !me.data.pseudo;
  const qc = useQueryClient();
  const [pseudo, setPseudo] = useState('');
  const [busy, setBusy] = useState(false);
  const valid = PSEUDO_RE.test(pseudo);

  if (needPseudo) {
    return (
      <Modal open locked onClose={() => undefined} title={t('ui.acc_choose_pseudo')}>
        <p className="muted">{t('ui.acc_choose_pseudo_p')}</p>
        <form
          className={s.form}
          onSubmit={async (e) => {
            e.preventDefault();
            if (!valid) return toast(t('ui.err_pseudo'), true);
            setBusy(true);
            try {
              await accountApi.setPseudo(pseudo);
              await qc.invalidateQueries({ queryKey: ['me'] });
            } catch (err) {
              toast(errorText(err, lang), true);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className={s.label} htmlFor="pseudo">
            {t('ui.acc_pseudo')}
          </label>
          <input
            id="pseudo"
            className={s.input}
            value={pseudo}
            maxLength={16}
            autoComplete="nickname"
            onChange={(e) => setPseudo(e.target.value.trim())}
            aria-describedby="pseudo-hint"
          />
          <small id="pseudo-hint" className="muted">
            {t('ui.acc_pseudo_hint')}
          </small>
          <Button type="submit" variant="primary" block loading={busy} disabled={!valid}>
            {t('ui.confirm_ok')}
          </Button>
        </form>
      </Modal>
    );
  }

  return (
    <Modal open={open && !user} onClose={() => openUI('account', false)} title={t('ui.login')}>
      <p className="muted">{t('ui.acc_oauth_p')}</p>
      <Button
        className={s.discord}
        block
        size="lg"
        onClick={async () => {
          const { error } = await signInDiscord();
          if (error) toast(t('app.login_error'), true);
        }}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden fill="currentColor">
          <path d="M20.3 4.4A19.6 19.6 0 0 0 15.4 3l-.6 1.3a18 18 0 0 0-5.6 0L8.6 3a19.6 19.6 0 0 0-4.9 1.4C.6 9 0 13.5.3 18a19.8 19.8 0 0 0 6 3l1.3-2.1a12.8 12.8 0 0 1-2-1l.5-.4a14 14 0 0 0 11.8 0l.5.4c-.6.4-1.3.7-2 1l1.3 2.1a19.7 19.7 0 0 0 6-3c.4-5.2-.7-9.6-3.4-13.6zM8.7 15.3c-1.2 0-2.1-1-2.1-2.3s.9-2.3 2.1-2.3 2.2 1 2.1 2.3c0 1.2-.9 2.3-2.1 2.3zm6.6 0c-1.2 0-2.1-1-2.1-2.3s.9-2.3 2.1-2.3 2.2 1 2.1 2.3c0 1.2-.9 2.3-2.1 2.3z" />
        </svg>
        {t('ui.acc_with', { p: 'Discord' })}
      </Button>
    </Modal>
  );
}
