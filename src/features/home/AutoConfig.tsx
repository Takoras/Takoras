import { VARIANTS, type Variant } from '@/data/jetons';
import { locale, useSettings } from '@/lib/settings';
import { useT } from '@/i18n/useT';
import s from './Home.module.css';

// Réglages de « Tout ouvrir d'un coup » : sur quoi l'ouverture auto s'arrête (rareté minimum, variantes)
const MINS = [100, 500, 1000, 5000, 25000, 100000, 0]; // 0 = jamais
export function AutoConfig() {
  const t = useT();
  const st = useSettings();
  const toggle = (v: Variant) =>
    st.set({ autoVars: st.autoVars.includes(v) ? st.autoVars.filter((x) => x !== v) : [...st.autoVars, v] });
  return (
    <section className={s.panel} aria-labelledby="ac-t">
      <h2 id="ac-t" className={s.panelT}>
        {t('ui.ac_title')}
      </h2>
      <fieldset className={s.chips}>
        <legend>{t('ui.ac_min')}</legend>
        {MINS.map((m) => (
          <button key={m} type="button" aria-pressed={st.autoMin === m} onClick={() => st.set({ autoMin: m })}>
            {m ? `1/${m.toLocaleString(locale(st.lang))}` : t('ui.ac_never')}
          </button>
        ))}
      </fieldset>
      <fieldset className={s.chips}>
        <legend>{t('ui.ac_vars')}</legend>
        {(Object.keys(VARIANTS) as Variant[]).map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={st.autoVars.includes(v)}
            className={s[`v_${v}`]}
            onClick={() => toggle(v)}
          >
            {t(`ui.v_${v}`)} <small>1/{VARIANTS[v].odds}</small>
          </button>
        ))}
      </fieldset>
    </section>
  );
}
