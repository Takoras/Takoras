import { useEffect, useState } from 'react';
import { SERIES, VARIANTS } from '@/data/jetons';
import { sfx } from '@/engines/sound.js';
import { useJn } from '@/lib/names';
import { locale, useSettings } from '@/lib/settings';
import { useT } from '@/i18n/useT';
import s from './Beta.module.css';

// Tirages de test (chance, jeton et variante forcés) : réglages des prochains pulls, pour testeurs et admins.
// Le serveur ne les applique que si le compte y a droit.
const LUCKS = [1, 2, 5, 10, 25, 100, 500];
type Dbg = { luck: number; force: string; variant?: string };
export function TestPulls() {
  const t = useT();
  const jn = useJn();
  const lang = useSettings((x) => x.lang);
  const fmt = (n: number) => n.toLocaleString(locale(lang));
  const jetons = SERIES.Takoras ?? [];
  const [dbg, setDbg] = useState<Dbg | null>(null);
  useEffect(() => {
    void import('@/engines/opening.js').then((m) => setDbg({ ...(m.debug as Dbg) }));
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
      <div className={s.row}>
        <span className={s.lbl}>{t('ui.ts_force')}</span>
        <select value={dbg.force} onChange={(e) => setDebug({ force: e.target.value })} aria-label={t('ui.ts_force')}>
          <option value="">{t('ui.random')}</option>
          {jetons.map((j) => (
            <option key={j.name} value={j.name}>
              {jn(j.name)} · 1/{fmt(j.odds)}
            </option>
          ))}
        </select>
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
