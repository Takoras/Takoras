import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { RCFG } from '@/engines/ring-config.js';
import { sfx } from '@/engines/sound.js';
import { glowVars, jetonOf, texOf, vImg, vOdds, colorOf, type Variant } from '@/data/jetons';
import { powerInfo } from '@/data/kit';
import { reducedFx, useSettings } from '@/lib/settings';
import { Button } from '@/ui/Button';
import { PixelBg } from '@/ui/PixelBg';
import { useDeck } from '../combat/team';
import {
  activeOf,
  aiMove,
  attackDmg,
  canPower,
  canSwitch,
  newDuel,
  play,
  powerOf,
  unitById,
  type Action,
  type Ev,
  type Side,
  type State,
  type Unit,
} from './rules';
import { duelText, fill } from './text';
import s from './Duel.module.css';

// Duel (prototype) : plateau au tour par tour contre l'IA. En haut l'adversaire (sa réserve, puis son jeton devant),
// en bas toi (ton jeton devant, puis ta réserve) et tes trois actions. Chaque coup se voit : le jeton s'élance,
// celui touché tremble et perd ses PV avec un chiffre qui s'envole.
const NAMES = [...Object.keys(RCFG.TOKENS), 'Coton'];
const randomTeam = () =>
  [...NAMES]
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map((name) => ({ name }));

// minuteries des animations en cours (une seule partie à l'écran à la fois)
const TIMERS = new Set<number>();
const clearTimers = () => {
  TIMERS.forEach(clearTimeout);
  TIMERS.clear();
};

type Fx = Record<number, { k: number; hit?: number; heal?: number; block?: string; lunge?: boolean; ko?: boolean }>;
type Mode = null | 'switch' | 'aim';

export default function Duel() {
  const lang = useSettings((x) => x.lang);
  const T = duelText(lang);
  const deck = useDeck();
  const mine = useMemo(() => {
    const d = (deck.data ?? [])
      .filter((m): m is NonNullable<typeof m> => !!m)
      .map((m) => ({ name: m.name, serie: m.serie, variant: m.variant }));
    return d.length === 3 ? d : null;
  }, [deck.data]);
  const fresh = () => newDuel(mine ?? randomTeam(), randomTeam(), 0);
  const [st, setSt] = useState<State>(fresh);
  const [fx, setFx] = useState<Fx>({});
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<Mode>(null);
  const [line, setLine] = useState('');
  // l'équipe du joueur arrive après le premier affichage : nouvelle partie avec elle (si rien n'a encore été joué)
  const [started, setStarted] = useState(false);
  const teamKey = mine ? mine.map((m) => `${m.name}:${m.variant}`).join('|') : '';
  const [seenKey, setSeenKey] = useState('');
  if (teamKey !== seenKey) {
    setSeenKey(teamKey);
    if (mine && !started) setSt(newDuel(mine, randomTeam(), 0));
  }
  useEffect(() => clearTimers, []);

  const nameOf = (uid: number, state: State) => unitById(state, uid)?.name ?? '';
  const pwName = (name: string) => {
    const id = powerOf(name).id;
    return T.n[id] ?? powerInfo(name, lang).name;
  };
  // joue une action, puis montre ses effets un par un
  const run = (side: Side, a: Action) => {
    const next = play(st, side, a);
    if (next === st) return;
    setStarted(true);
    setMode(null);
    setBusy(true);
    const evs = next.log;
    const step = reducedFx() ? 0 : 420;
    let t = 0;
    const at = (ms: number, f: () => void) => {
      const id = window.setTimeout(() => {
        TIMERS.delete(id);
        f();
      }, ms);
      TIMERS.add(id);
    };
    // le texte du coup
    const first = evs.find((e) => e.k === 'attack' || e.k === 'power' || e.k === 'swap' || e.k === 'skip');
    if (first) setLine(lineOf(first, next, side));
    // on affiche l'état d'avant pendant l'élan, puis le nouvel état arrive avec les coups
    evs.forEach((e: Ev) => {
      if (e.k === 'attack' || e.k === 'power') {
        at(t, () => {
          setFx((f) => ({ ...f, [e.uid]: { k: Math.random(), lunge: true } }));
          if (e.k === 'power') sfx.upgrade();
          else sfx.click();
        });
        t += step * 0.6;
      } else if (e.k === 'hit' || e.k === 'heal' || e.k === 'block' || e.k === 'ko') {
        at(t, () => {
          setSt(next);
          setFx((f) => ({
            ...f,
            [e.uid]: {
              k: Math.random(),
              ...(e.k === 'hit' ? { hit: e.n } : {}),
              ...(e.k === 'heal' ? { heal: e.n } : {}),
              ...(e.k === 'block' ? { block: e.what } : {}),
              ...(e.k === 'ko' ? { ko: true } : {}),
            },
          }));
          if (e.k === 'hit') sfx.deny?.();
        });
        t += step * (e.k === 'ko' ? 1.2 : 0.7);
      }
    });
    at(t, () => {
      setSt(next);
      setBusy(false);
    });
  };
  const lineOf = (e: Ev, state: State, side: Side) => {
    if (e.k === 'attack') return fill(T.attacks, { a: nameOf(e.uid, state) });
    if (e.k === 'power') return fill(T.uses_pw, { a: nameOf(e.uid, state), p: pwName(nameOf(e.uid, state)) });
    if (e.k === 'skip') return fill(T.skip, { a: nameOf(e.uid, state) });
    if (e.k === 'swap') return fill(T.swaps, { a: activeOf(state, e.side ?? side).name });
    return '';
  };

  // l'IA joue quand c'est son tour (ou qu'elle doit remplacer un jeton)
  useEffect(() => {
    if (busy || st.winner !== null) return;
    const side: Side | null = st.need === 1 ? 1 : st.need === null && st.turn === 1 ? 1 : null;
    if (side === null) return;
    const id = window.setTimeout(() => run(1, aiMove(st, 1)), reducedFx() ? 0 : 650);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st, busy]);

  const me = activeOf(st, 0),
    foe = activeOf(st, 1);
  const myTurn = !busy && st.winner === null && st.need === null && st.turn === 0;
  const mustSend = !busy && st.need === 0;
  const pw = powerOf(me.name);
  const ready = canPower(st, 0);
  const onPower = () => {
    if (!myTurn || !ready) return;
    if (pw.target) setMode('aim');
    else run(0, { t: 'power' });
  };
  const status = mustSend ? T.send : mode === 'aim' ? T.aim : mode === 'switch' ? T.pickSwap : busy ? line : st.turn === 0 ? T.you : T.foe;

  const card = (u: Unit, side: Side, big: boolean, onClick?: () => void) => {
    const j = jetonOf(u.name, u.serie);
    const f = fx[u.uid];
    const pct = Math.max(0, (u.hp / u.max) * 100);
    const stats = [
      u.frozen && T.st_frozen,
      u.weak && T.st_weak,
      u.held && T.st_held,
      u.shield && T.st_shield,
      u.mirror && T.st_mirror,
      u.dodge && T.st_dodge,
      u.jelly && T.st_jelly,
      u.nova && T.st_nova,
    ].filter(Boolean) as string[];
    const p = powerOf(u.name);
    const body = (
      <>
        {big ? (
          <PixelBg
            className={s.bg}
            odds={vOdds(j.odds, u.variant as Variant)}
            glow={colorOf(j, u.variant)}
            still={reducedFx()}
          />
        ) : null}
        <span className={s.art}>
          <img className={vImg(u.variant)} src={texOf(j)} alt="" />
        </span>
        <b className={s.name}>{u.name}</b>
        <span className={s.hp} aria-label={`${u.hp}/${u.max} PV`}>
          <i
            style={{ width: `${pct}%` }}
            className={pct < 25 ? s.low : pct < 55 ? s.mid : undefined}
          />
        </span>
        <small className={s.hpN}>
          {u.hp}/{u.max}
        </small>
        {big ? (
          <span className={s.pw}>
            <span className={s.pwName}>{pwName(u.name)}</span>
            <span className={s.pips} aria-hidden>
              {Array.from({ length: p.cost }, (_, i) => (
                <i key={i} className={i < u.charge ? s.on : undefined} />
              ))}
            </span>
          </span>
        ) : null}
        {stats.length ? (
          <span className={s.chips}>
            {stats.map((x) => (
              <em key={x}>{x}</em>
            ))}
          </span>
        ) : null}
        {f?.hit ? (
          <span key={f.k} className={s.float}>
            −{f.hit}
          </span>
        ) : null}
        {f?.heal ? (
          <span key={f.k} className={`${s.float} ${s.heal}`}>
            +{f.heal}
          </span>
        ) : null}
        {f?.block ? (
          <span key={f.k} className={`${s.float} ${s.block}`}>
            {T[`st_${f.block === 'shield' ? 'shield' : f.block}` as 'st_shield']}
          </span>
        ) : null}
      </>
    );
    const cls = [
      s.card,
      big ? s.big : s.small,
      side ? s.foeCard : s.meCard,
      u.hp <= 0 && s.dead,
      f?.lunge && s.lunge,
      f?.hit && s.hit,
      onClick && s.pickable,
    ]
      .filter(Boolean)
      .join(' ');
    const style = { ...glowVars(j, u.variant) } as CSSProperties;
    return onClick ? (
      <button key={`${u.uid}-${f?.k ?? 0}`} type="button" className={cls} style={style} onClick={onClick}>
        {body}
      </button>
    ) : (
      <div key={`${u.uid}-${f?.k ?? 0}`} className={cls} style={style}>
        {body}
      </div>
    );
  };
  const bench = (side: Side) =>
    st.teams[side].units.map((u, i) => {
      if (i === st.teams[side].active) return null;
      const canPick =
        side === 0
          ? u.hp > 0 && ((mode === 'switch' && myTurn) || mustSend)
          : mode === 'aim' && u.hp > 0;
      return card(
        u,
        side,
        false,
        canPick
          ? () => {
              if (side === 0) run(0, mustSend ? { t: 'send', to: i } : { t: 'switch', to: i });
              else run(0, { t: 'power', target: u.uid });
            }
          : undefined,
      );
    });

  return (
    <section className={s.page}>
      <h1 className="visually-hidden">{T.title}</h1>
      <p className={s.status} aria-live="polite">
        <span key={status}>{status}</span>
        {st.teams[1].thorns ? <em className={s.side}>{T.st_thorns}</em> : null}
        {st.teams[0].sealed ? <em className={s.side}>{T.st_sealed}</em> : null}
      </p>
      <div className={s.board}>
        <div className={`${s.team} ${s.foeTeam}`}>
          <small className={s.who}>{T.bot}</small>
          <div className={s.front}>
            {card(
              foe,
              1,
              true,
              mode === 'aim' && pw.target === 'any' ? () => run(0, { t: 'power', target: foe.uid }) : undefined,
            )}
          </div>
          <div className={s.row}>{bench(1)}</div>
        </div>
        <div className={`${s.team} ${s.meTeam}`}>
          <small className={`${s.who} ${s.whoMe}`}>{T.me}</small>
          <div className={s.front}>{card(me, 0, true)}</div>
          <div className={s.row}>{bench(0)}</div>
        </div>
      </div>

      <div className={s.actions}>
        {mode ? (
          <Button onClick={() => setMode(null)}>{T.cancel}</Button>
        ) : (
          <>
            <Button variant="primary" disabled={!myTurn} onClick={() => run(0, { t: 'attack' })}>
              {T.attack} <small className={s.dmg}>−{attackDmg(me)}</small>
            </Button>
            <Button disabled={!myTurn || !ready} onClick={onPower} title={T.d[pw.id]}>
              {pwName(me.name)}
              {me.usesLeft !== undefined ? <small className={s.dmg}>{fill(T.uses, { n: me.usesLeft })}</small> : null}
            </Button>
            <Button disabled={!myTurn || !canSwitch(st, 0)} onClick={() => setMode('switch')}>
              {T.switch}
            </Button>
          </>
        )}
      </div>
      <p className={s.desc}>{T.d[pw.id]}</p>

      {st.winner !== null && !busy ? (
        <div className={s.end}>
          <div className={s.endBox}>
            <h2 className={st.winner === 0 ? s.winT : s.loseT}>{st.winner === 0 ? T.win : T.lose}</h2>
            <Button
              variant="primary"
              onClick={() => {
                clearTimers();
                setStarted(false);
                setFx({});
                setLine('');
                setSt(fresh());
              }}
            >
              {T.again}
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
