import { PULLS } from '@/engines/env';
import { SerieName } from '@/ui/SerieName';
import { TEMPLATE } from '@/data/jetons';
import { useT } from '@/i18n/useT';
import s from './Home.module.css';

// Choix du tirage à ouvrir (une série par tirage). Les prochaines séries arriveront ici.
export function PullPicker({ value, onChange }: { value: number; onChange: (i: number) => void }) {
  const t = useT();
  return (
    <section className={s.panel} aria-labelledby="pp-t" data-tour="pick">
      <h2 id="pp-t" className={s.panelT}>
        {t('ui.pulls')}
      </h2>
      <div className={s.picker}>
        {PULLS.map((p, i) => (
          <button key={p.name} type="button" aria-pressed={i === value} onClick={() => onChange(i)}>
            <img className="px" src={p.img} alt="" width={36} height={36} />
            <SerieName name={p.name} h="1.5em" />
          </button>
        ))}
        <button type="button" disabled className={s.soon}>
          <img className="px" src={TEMPLATE} alt="" width={36} height={36} />
          {t('arena.serieSoon')}
        </button>
      </div>
    </section>
  );
}
