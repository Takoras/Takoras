import { useSettings, type Fx, type Speed } from '@/lib/settings';
import { useT } from '@/i18n/useT';
import type { Lang } from '@/i18n';
import { Modal } from '@/ui/Modal';
import { Button } from '@/ui/Button';

import { Segmented } from '@/ui/Segmented';
import { openUI, useUI } from './ui-store';
import { useState } from 'react';
import { accountApi, errorText } from '@/api';
import { signOut, useAuth } from '@/lib/auth';
import { toast } from '@/ui/toast';
import s from './SettingsModal.module.css';

// Paramètres : vitesse des ouvertures, langue (sans recharger la page), volume, effets visuels
export function SettingsModal() {
  const t = useT();
  const open = useUI((x) => x.settings);
  const st = useSettings();
  return (
    <Modal open={open} onClose={() => openUI('settings', false)} title={t('ui.settings')}>
      <div className={s.rows}>
        <div className={s.row}>
          <b>{t('ui.set_speed')}</b>
          <Segmented<Speed>
            label={t('ui.set_speed')}
            value={st.speed}
            onChange={(speed) => st.set({ speed })}
            options={[
              ['normal', t('ui.sp_normal')],
              ['rapide', t('ui.sp_fast')],
              ['instant', t('ui.sp_instant')],
            ]}
          />
        </div>
        <div className={s.row}>
          <b>{t('ui.set_lang')}</b>
          <Segmented<Lang>
            label={t('ui.set_lang')}
            value={st.lang}
            onChange={(lang) => {
              st.set({ lang });
              document.documentElement.lang = lang;
            }}
            options={[
              ['fr', 'Français'],
              ['en', 'English'],
            ]}
          />
        </div>
        <div className={s.row}>
          <label htmlFor="vol">
            <b>{t('ui.set_volume')}</b>
          </label>
          <div className={s.vol}>
            <input
              id="vol"
              type="range"
              min={0}
              max={100}
              value={st.volume}
              onChange={(e) => st.set({ volume: Number(e.target.value) })}
            />
            <span className="muted">{st.volume} %</span>
          </div>
        </div>
        <div className={s.row}>
          <b>{t('ui.set_fx')}</b>
          <Segmented<Fx>
            label={t('ui.set_fx')}
            value={st.fx}
            onChange={(fx) => st.set({ fx })}
            options={[
              ['auto', t('ui.fx_auto')],
              ['high', t('ui.fx_high')],
              ['medium', t('ui.fx_med')],
              ['low', t('ui.fx_low')],
              ['potato', t('ui.fx_potato')],
            ]}
          />
          <small className="muted">{t('ui.fx_hint')}</small>
        </div>
        <AccountZone />
      </div>
    </Modal>
  );
}

// Mon compte : télécharger toutes ses données (RGPD) et supprimer définitivement son compte.
// La suppression demande d'écrire SUPPRIMER (DELETE en anglais) : impossible de le faire par erreur.
function AccountZone() {
  const t = useT();
  const lang = useSettings((x) => x.lang);
  const user = useAuth((x) => x.user);
  const [busy, setBusy] = useState('');
  const [asking, setAsking] = useState(false);
  const [typed, setTyped] = useState('');
  if (!user) return null;
  const word = lang === 'en' ? 'DELETE' : 'SUPPRIMER';
  const download = async () => {
    setBusy('export');
    try {
      const data = await accountApi.exportData();
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'takoras-mes-donnees.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      toast(errorText(e, lang), true);
    } finally {
      setBusy('');
    }
  };
  const remove = async () => {
    if (typed.trim().toUpperCase() !== word) return;
    setBusy('delete');
    try {
      await accountApi.deleteAccount();
      openUI('settings', false);
      await signOut();
      toast(t('ui.acc_deleted'));
    } catch (e) {
      toast(errorText(e, lang), true);
    } finally {
      setBusy('');
    }
  };
  return (
    <div className={`${s.row} ${s.account}`}>
      <b>{t('ui.acc_section')}</b>
      <Button
        size="sm"
        onClick={async () => {
          openUI('settings', false);
          await signOut();
          location.assign('/');
        }}
      >
        {t('ui.logout')}
      </Button>
      <Button size="sm" loading={busy === 'export'} onClick={() => void download()}>
        {t('ui.acc_export')}
      </Button>
      {asking ? (
        <div className={s.danger}>
          <p>{t('ui.acc_delete_confirm')}</p>
          <label>
            <span>{t('ui.acc_delete_type')}</span>
            <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={word} autoComplete="off" />
          </label>
          <div className={s.dangerBtns}>
            <Button size="sm" onClick={() => (setAsking(false), setTyped(''))}>
              {t('ui.cancel')}
            </Button>
            <Button
              size="sm"
              variant="danger"
              disabled={typed.trim().toUpperCase() !== word}
              loading={busy === 'delete'}
              onClick={() => void remove()}
            >
              {t('ui.acc_delete')}
            </Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="ghost" className={s.deleteBtn} onClick={() => setAsking(true)}>
          {t('ui.acc_delete')}
        </Button>
      )}
    </div>
  );
}
