import { useSyncExternalStore, type CSSProperties } from 'react';
import { glowVars, jetonOf, texOf, vImg } from '@/data/jetons';
import { RCFG } from '@/engines/ring-config.js';
import { host, sfx } from '@/engines/env';
import { powerInfo } from '@/data/kit';
import { useJn } from '@/lib/names';
import { useSettings } from '@/lib/settings';
import { Modal } from '@/ui/Modal';
import { JetonModal } from '../inventory/JetonModal';
import { PowerDemo } from './PowerDemo';
import s from './RingSheet.module.css';

// Fiches des jetons pendant un match (l'arène est en JS à part : elle ouvre ces fiches par host.ringSheet).
// - un jeton seul : la fiche de sélection de jeton (vidéo du pouvoir à gauche, le jeton, stats + attaque à droite)
// - un jeton adverse : comparaison, ton jeton à gauche, le sien à droite, les stats face à face au milieu ;
//   les petits jetons en haut à gauche changent celui des tiens qui est comparé.
export type RingTok = {
  id: number;
  name: string;
  variant: string;
  lvl: number;
  alive: boolean;
  base: { mass: number; power: number; r: number };
  state: string;
};
type Sheet = { a: RingTok; b?: RingTok; mine?: RingTok[]; onClose: () => void } | null;

let cur: Sheet = null;
const subs = new Set<() => void>();
const set = (v: Sheet) => {
  cur = v;
  subs.forEach((f) => f());
};
host.ringSheet = (p) => set(p as Sheet);
const useSheet = () =>
  useSyncExternalStore(
    (f) => (subs.add(f), () => subs.delete(f)),
    () => cur,
  );

export function RingSheetHost() {
  const sh = useSheet();
  if (!sh) return null;
  const close = () => {
    sh.onClose();
    set(null);
  };
  if (!sh.b)
    return (
      <JetonModal
        name={sh.a.name}
        variant={sh.a.variant}
        demo
        found={{ [sh.a.variant]: true }}
        facts={sh.a.state ? <li>{sh.a.state}</li> : null}
        onClose={close}
      />
    );
  return <Compare a={sh.a} b={sh.b} mine={sh.mine ?? [sh.a]} onClose={close} onPick={(a) => set({ ...sh, a })} />;
}

const ROWS = [
  ['power', '/img/stats/puissance.png', (n: number) => String(Math.round(n))],
  ['mass', null, (n: number) => n.toFixed(2)],
  ['r', '/img/stats/taille.png', (n: number) => String(Math.round(n))],
] as const;

function Compare({
  a,
  b,
  mine,
  onClose,
  onPick,
}: {
  a: RingTok;
  b: RingTok;
  mine: RingTok[];
  onClose: () => void;
  onPick: (a: RingTok) => void;
}) {
  const jn = useJn();
  const lang = useSettings((x) => x.lang);
  const M = RCFG.STAT_MAX as Record<string, number>;
  const side = (x: RingTok, who: 'me' | 'foe') => {
    const j = jetonOf(x.name);
    const k = powerInfo(x.name, lang);
    return (
      <div className={`${s.side} ${s[who]}`} style={glowVars(j, x.variant) as CSSProperties}>
        <span className={s.coin}>
          <img className={vImg(x.variant)} src={texOf(j)} alt="" />
        </span>
        <b className={s.name}>{jn(x.name)}</b>
        {x.state ? <small className={s.state}>{x.state}</small> : null}
        <div className={s.video}>
          <PowerDemo name={x.name} />
        </div>
        {k.pw !== 'none' ? (
          <p className={s.pw} style={{ '--pc': k.col } as CSSProperties}>
            <b>{k.name}</b> {k.desc}
          </p>
        ) : null}
      </div>
    );
  };
  return (
    <Modal open onClose={onClose} xl>
      <div className={s.cmp}>
        {mine.length > 1 ? (
          <div className={s.pick} role="group">
            {mine.map((m) => (
              <button
                key={m.id}
                type="button"
                className={m.id === a.id ? s.on : undefined}
                aria-pressed={m.id === a.id}
                aria-label={jn(m.name)}
                onClick={() => {
                  sfx.click?.();
                  onPick(m);
                }}
              >
                <img className={vImg(m.variant)} src={texOf(jetonOf(m.name))} alt="" />
              </button>
            ))}
          </div>
        ) : null}
        <div className={s.grid} key={a.id}>
          {side(a, 'me')}
          <div className={s.stats}>
            <span className={s.vs}>VS</span>
            {ROWS.map(([k, ico, f], i) => {
              const x = a.base[k],
                y = b.base[k],
                max = M[k] ?? 1;
              const win = x > y ? 'me' : x < y ? 'foe' : '';
              return (
                <div key={k} className={s.row} style={{ '--k': i } as CSSProperties}>
                  <b className={`${s.val} ${win === 'me' ? s.win : ''}`}>{f(x)}</b>
                  <span className={`${s.bar} ${s.barMe}`}>
                    <i style={{ width: `${Math.min(100, (x / max) * 100)}%` }} />
                  </span>
                  <span className={s.ico} aria-hidden>
                    {ico ? (
                      <img className="px" src={ico} alt="" />
                    ) : (
                      <svg viewBox="0 0 16 16" width="22" height="22" fill="currentColor">
                        <path d="M6 2h4v2h2l2 10H2L4 4h2z" shape-rendering="crispEdges" />
                      </svg>
                    )}
                  </span>
                  <span className={`${s.bar} ${s.barFoe}`}>
                    <i style={{ width: `${Math.min(100, (y / max) * 100)}%` }} />
                  </span>
                  <b className={`${s.val} ${win === 'foe' ? s.win : ''}`}>{f(y)}</b>
                </div>
              );
            })}
          </div>
          {side(b, 'foe')}
        </div>
      </div>
    </Modal>
  );
}
