import { useSettings, type Fx, type Speed } from '@/lib/settings';
import { useT } from '@/i18n/useT';
import type { Lang } from '@/i18n';
import { Modal } from '@/ui/Modal';
import { Button } from '@/ui/Button';
import { openTuto } from '@/features/beta/Beta';
import { Segmented } from '@/ui/Segmented';
import { openUI, useUI } from './ui-store';
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
              ['full', t('ui.fx_full')],
              ['reduced', t('ui.fx_reduced')],
            ]}
          />
          <small className="muted">{t('ui.fx_hint')}</small>
        </div>
        <div className={s.row}>
          <Button
            size="sm"
            onClick={() => {
              openUI('settings', false);
              openTuto();
            }}
          >
            {t('ui.tuto_again')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
