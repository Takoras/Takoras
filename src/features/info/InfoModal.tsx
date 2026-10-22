/* eslint-disable react-refresh/only-export-components -- la fonction d'ouverture vit à côté de la modale */
import { useState } from 'react';
import { create } from 'zustand';
import { useMe } from '@/api/queries';
import { jetonOf, sellValue, texOf, tierKey, VARIANTS, type Variant } from '@/data/jetons';
import { dec } from '@/data/items';
import { pct, realOdds } from '@/data/odds';
import { fr } from '@/i18n/fr';
import { en } from '@/i18n/en';
import { useJn } from '@/lib/names';
import { locale, useSettings } from '@/lib/settings';
import { Modal } from '@/ui/Modal';
import { VTag } from '@/ui/VTag';
import s from './InfoModal.module.css';

// « Probas & infos » : vraies probabilités selon la chance, variantes, règles du jeu
export const useInfo = create<{ open: boolean }>(() => ({ open: false }));
export const openInfo = () => useInfo.setState({ open: true });

export function InfoModal() {
  const open = useInfo((x) => x.open);
  const lang = useSettings((x) => x.lang);
  const jn = useJn();
  const me = useMe();
  const mine = Number(me.data?.luck ?? 1);
  const [luck, setLuck] = useState<number | null>(null);
  const L = luck ?? mine;
  const T = (lang === 'en' ? en : fr).info;
  const n = (v: number) => v.toLocaleString(locale(lang));
  const choices = [...new Set([1, 1.3, 2, 5, 10, 25, 100, 500, Number(mine.toFixed(2))])].sort((a, b) => a - b);
  return (
    <Modal open={open} onClose={() => useInfo.setState({ open: false })} title={T.title} wide>
      <div className={s.luck} role="group" aria-label={T.luck}>
        <span className="muted">{T.luck}</span>
        {choices.map((c) => (
          <button key={c} type="button" aria-pressed={c === L} onClick={() => setLuck(c)}>
            ×{dec(c, lang)}
            {c === Number(mine.toFixed(2)) && mine > 1 ? ` · ${T.yours}` : ''}
          </button>
        ))}
      </div>
      <div className={s.table}>
        <table>
          <thead>
            <tr>
              {T.th.map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {realOdds(L).map(({ j, p }) => (
              <tr key={j.name}>
                <td>
                  <img className="px" src={texOf(j)} alt="" width={24} height={24} />
                  <span className={tierKey(j.odds).replace('r_', 'r-')}>{jn(j.name)}</span>
                </td>
                <td>1/{n(j.odds)}</td>
                <td>
                  <b>{pct(p, lang)}</b>
                </td>
                <td className="muted">{T.one_in.replace('{n}', n(Math.max(1, Math.round(1 / p))))}</td>
                <td>{n(sellValue(j.odds))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3 className={s.h3}>{T.vtitle}</h3>
      <p className="muted">{T.vintro}</p>
      <div className={s.table}>
        <table>
          <thead>
            <tr>
              {T.vth.map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(Object.keys(VARIANTS) as Variant[]).map((v) => (
              <tr key={v}>
                <td>
                  <VTag v={v} />
                </td>
                <td>
                  <b>1/{n(VARIANTS[v].odds)}</b>
                </td>
                <td>×{VARIANTS[v].mult}</td>
                <td>
                  <img className={`px v-${v}`} src={texOf(jetonOf('Pikko'))} alt="" width={28} height={28} />{' '}
                  <span className="muted">{T.vdesc[v]}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3 className={s.h3}>{T.how}</h3>
      <div className={s.rules}>
        {T.rules.map(([h, p]) => (
          <div key={h}>
            <b>{h}</b>
            <p className="muted">{p}</p>
          </div>
        ))}
      </div>
    </Modal>
  );
}
