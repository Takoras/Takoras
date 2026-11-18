import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { reducedFx } from '@/lib/settings';
import s from './Roll.module.css';

const LINES = 30; // trois tours de 0 à 9 : le rouleau part toujours vers l'avant, comme une machine à sous
const REEL = Array.from({ length: LINES }, (_, i) => i % 10);

function Digit({ n, order }: { n: number; order: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const last = useRef(n);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || last.current === n) return;
    const box = el.getBoundingClientRect();
    const y =
      new DOMMatrix(getComputedStyle(el).transform).m42 +
      (parseFloat(getComputedStyle(el).translate.split(' ')[1] ?? '0') || 0);
    const from = box.height ? (y / box.height) * 100 : (-(10 + last.current) * 100) / LINES;
    last.current = n;
    el.getAnimations().forEach((a) => a.cancel());
    el.style.translate = `0 ${(-(10 + n) * 100) / LINES}%`;
    el.animate([{ translate: `0 ${from}%` }, { translate: `0 ${(-(20 + n) * 100) / LINES}%` }], {
      duration: 420 + order * 70,
      easing: 'cubic-bezier(.16,.84,.24,1)',
    });
  }, [n, order]);
  return (
    <span className={s.cell}>
      <span ref={ref} className={s.reel} style={{ translate: `0 ${(-(10 + n) * 100) / LINES}%` }}>
        {REEL.map((d, i) => (
          <i key={i}>{d}</i>
        ))}
      </span>
    </span>
  );
}

// Un nombre (déjà mis en forme) dont chaque chiffre tourne jusqu'à sa nouvelle valeur
export function Roll({ text, className }: { text: string; className?: string }) {
  if (reducedFx()) return <span className={className}>{text}</span>;
  const chars = [...text];
  return (
    <span className={`${s.roll} ${className ?? ''}`}>
      <span className={s.sr}>{text}</span>
      <span aria-hidden className={s.row}>
        {chars.map((c, i) => {
          const fromEnd = chars.length - i;
          return /\d/.test(c) ? (
            <Digit key={`d${fromEnd}`} n={Number(c)} order={i} />
          ) : (
            <span key={`c${fromEnd}`}>{c}</span>
          );
        })}
      </span>
    </span>
  );
}

// Un texte qui fond vers le suivant au lieu de changer d'un coup
export function Fade({ text, className }: { text: string; className?: string }) {
  const [st, setSt] = useState({ cur: text, old: null as string | null, n: 0 });
  if (st.cur !== text) setSt({ cur: text, old: reducedFx() ? null : st.cur, n: st.n + 1 });
  useEffect(() => {
    if (st.old === null) return;
    const id = setTimeout(() => setSt((x) => (x.n === st.n ? { ...x, old: null } : x)), 200);
    return () => clearTimeout(id);
  }, [st.n, st.old]);
  return (
    <span className={`${s.fade} ${className ?? ''}`}>
      {st.old !== null ? (
        <span key={`o${st.n}`} aria-hidden className={s.out}>
          {st.old}
        </span>
      ) : null}
      <span key={`c${st.n}`} className={st.n ? s.in : ''}>
        {st.cur}
      </span>
    </span>
  );
}
