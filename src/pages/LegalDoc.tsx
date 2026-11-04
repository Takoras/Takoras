import { useSettings } from '@/lib/settings';
import s from './Privacy.module.css';

// Une page de texte légal (FR / EN) : titre, date, intro, puis des sections numérotées.
export type Doc = { title: string; updated: string; intro: string; blocks: [string, string[]][] };

export function LegalDoc({ fr, en }: { fr: Doc; en: Doc }) {
  const lang = useSettings((x) => x.lang);
  const d = lang === 'en' ? en : fr;
  return (
    <article className={s.page}>
      <h1>{d.title}</h1>
      <p className={s.updated}>{d.updated}</p>
      <p>{d.intro}</p>
      {d.blocks.map(([h, ps]) => (
        <section key={h}>
          <h2>{h}</h2>
          {ps.map((p) => (
            <p key={p.slice(0, 32)}>{p}</p>
          ))}
        </section>
      ))}
    </article>
  );
}
