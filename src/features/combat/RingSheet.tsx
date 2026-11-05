import { useRef, useSyncExternalStore, type CSSProperties } from 'react';
import { glowVars, jetonOf, texOf, vImg, vOdds, type Variant } from '@/data/jetons';
import { host, sfx } from '@/engines/env';
import { useJn } from '@/lib/names';
import { reducedFx } from '@/lib/settings';
import { useT } from '@/i18n/useT';
import { PixelBg } from '@/ui/PixelBg';
import { TokenId, TokenStats } from '@/ui/TokenCards';
import { useSwingAll } from '@/ui/useSwing';
import js from '../inventory/JetonSheet.module.css';
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

// Comparaison : la même DA que la fiche d'un jeton (inventaire) — fond pixel, boîtes transparentes qui se balancent,
// stats en barres à la couleur du jeton, vidéo du pouvoir — mais en deux moitiés : le tien à gauche, le sien à droite.
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
  const t = useT();
  const jn = useJn();
  const root = useRef<HTMLDivElement>(null);
  useSwingAll(root, `.${js.box}`, 0.25, a.id);
  const half = (x: RingTok, who: 'me' | 'foe') => {
    const j = jetonOf(x.name);
    return (
      <div
        className={`${s.col} ${s[who]}`}
        style={{ ...glowVars(j, x.variant), '--gc': 'rgb(var(--g))', '--ga': 1 } as CSSProperties}
      >
        <PixelBg className={js.pxbg} odds={vOdds(j.odds, x.variant as Variant)} glow={j.glow} still={reducedFx()} />
        <div className={s.coinWrap}>
          <i className={js.rays} aria-hidden />
          <i className={js.aura} aria-hidden />
          <img className={`${vImg(x.variant)} ${s.coin}`} src={texOf(j)} alt="" />
        </div>
        <div className={s.boxes}>
          <TokenId
            className={`${js.id} ${js.box}`}
            serie="Takoras"
            name={jn(x.name)}
            odds={vOdds(j.odds, x.variant as Variant)}
          >
            {x.state ? (
              <ul className={js.facts}>
                <li>{x.state}</li>
              </ul>
            ) : null}
            <div className={js.demo}>
              <PowerDemo name={x.name} />
            </div>
          </TokenId>
          <div className={js.power}>
            <TokenStats className={`${js.rs} ${js.box}`} name={x.name} odds={j.odds} variant={x.variant} lvl={x.lvl} />
          </div>
        </div>
      </div>
    );
  };
  return (
    <Modal open onClose={onClose} wide noX bare>
      <div ref={root} className={`${js.sheet} ${s.cmp}`} style={{ '--u': 1 } as CSSProperties} key={a.id}>
        <button type="button" className={js.x} onClick={onClose} aria-label={t('ui.close')}>
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
            <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        </button>
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
        <div className={s.halves}>
          {half(a, 'me')}
          <b className={s.vs} aria-hidden>
            VS
          </b>
          {half(b, 'foe')}
        </div>
      </div>
    </Modal>
  );
}
