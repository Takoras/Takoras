import { useState } from 'react';
import { SERIES, texOf } from '@/data/jetons';
import { sfx } from '@/engines/sound.js';
import { useJn } from '@/lib/names';
import { locale, useSettings } from '@/lib/settings';
import { SerieName } from '@/ui/SerieName';
import s from './Beta.module.css';

// Choix d'un jeton pour les testeurs : onglets des séries, puis la grille de tous les jetons de la série
// (sprite, nom, rareté). « value » vaut "" quand on laisse le hasard (si allowRandom).
export function JetonPicker({
  serie,
  onSerie,
  value,
  onChange,
  randomLabel,
}: {
  serie: string;
  onSerie: (s: string) => void;
  value: string;
  onChange: (name: string) => void;
  randomLabel?: string;
}) {
  const jn = useJn();
  const lang = useSettings((x) => x.lang);
  const fmt = (n: number) => n.toLocaleString(locale(lang));
  const series = Object.keys(SERIES);
  const list = [...(SERIES[serie] ?? [])].sort((a, b) => a.odds - b.odds);
  return (
    <div className={s.jp}>
      <div className={s.jpTabs} role="tablist">
        {series.map((name) => (
          <button
            key={name}
            type="button"
            role="tab"
            aria-selected={name === serie}
            className={s.jpTab}
            onClick={() => {
              sfx.click();
              onSerie(name);
            }}
          >
            <SerieName name={name} h="1.4em" />
          </button>
        ))}
      </div>
      <div className={s.jpGrid}>
        {randomLabel ? (
          <button type="button" className={s.jpCell} aria-pressed={value === ''} onClick={() => onChange('')}>
            <img className="px" src="/img/jetons/mystere.png" alt="" width={48} height={48} />
            <b>{randomLabel}</b>
          </button>
        ) : null}
        {list.map((j) => (
          <button
            key={j.name}
            type="button"
            className={s.jpCell}
            aria-pressed={value === j.name}
            onClick={() => {
              sfx.click();
              onChange(j.name);
            }}
          >
            <img className="px" src={texOf(j)} alt="" width={48} height={48} loading="lazy" />
            <b>{jn(j.name)}</b>
            <small>1/{fmt(j.odds)}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

// le jeton choisi est-il dans cette série ?
export const serieOfJeton = (name: string) =>
  Object.keys(SERIES).find((k) => (SERIES[k] ?? []).some((j) => j.name === name)) ?? 'Takoras';

export function usePickerSerie(initial: string) {
  return useState(initial ? serieOfJeton(initial) : 'Takoras');
}
