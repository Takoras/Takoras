import { useEffect, useState } from 'react';
import { VARIANTS } from '@/data/jetons';
import { JetonPicker, serieOfJeton } from './JetonPicker';
import { sfx } from '@/engines/sound.js';
import { useT } from '@/i18n/useT';
import s from './Beta.module.css';

// Tirages de test (chance, jeton et variante forcés) : réglages des prochains pulls, pour testeurs et admins.
// Le serveur ne les applique que si le compte y a droit.
const LUCKS = [1, 2, 5, 10, 25, 100, 500];
type Dbg = { luck: number; force: string; variant?: string };
export function TestPulls() {
  const t = useT();
  const [serie, setSerie] = useState('Takoras');
  const [dbg, setDbg] = useState<Dbg | null>(null);
  useEffect(() => {
    void import('@/engines/opening.js').then((m) => {
      const d = { ...(m.debug as Dbg) };
      setDbg(d);
      if (d.force) setSerie(serieOfJeton(d.force));
    });
  }, []);
  const setDebug = (p: Partial<Dbg>) =>
    void import('@/engines/opening.js').then((m) => {
      Object.assign(m.debug, p);
      setDbg({ ...(m.debug as Dbg) });
    });
  if (!dbg) return null;
  return (
    <>
      <div className={s.row} role="radiogroup" aria-label={t('ui.luck')}>
        <span className={s.lbl}>{t('ui.luck')}</span>
        {LUCKS.map((l) => (
          <button
            key={l}
            type="button"
            role="radio"
            aria-checked={(dbg.luck || 1) === l}
            className={s.pill}
            onClick={() => {
              sfx.click();
              setDebug({ luck: l });
            }}
          >
            ×{l}
          </button>
        ))}
      </div>
      {/* jeton forcé : il sort au prochain tirage de SA série (choisir la série en haut de l'accueil) */}
      <span className={s.lbl}>{t('ui.ts_force')}</span>
      <JetonPicker
        serie={serie}
        onSerie={setSerie}
        value={dbg.force}
        onChange={(force) => setDebug({ force })}
        randomLabel={t('ui.random')}
      />
      <div className={s.row}>
        <select
          value={dbg.variant ?? ''}
          onChange={(e) => setDebug({ variant: e.target.value })}
          aria-label={t('ui.v_none')}
        >
          <option value="">{t('ui.random')}</option>
          <option value="none">{t('ui.v_none')}</option>
          {Object.keys(VARIANTS).map((v) => (
            <option key={v} value={v}>
              {t(`ui.v_${v as 'gold'}`)}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
