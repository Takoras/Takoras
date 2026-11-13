import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { RCFG } from '@/engines/ring-config.js';
import { sfx } from '@/engines/sound.js';
import { glowVars, jetonOf, texOf, vImg } from '@/data/jetons';
import { powerInfo } from '@/data/kit';
import { reducedFx, useSettings } from '@/lib/settings';
import { Button } from '@/ui/Button';
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

// Duel (prototype) : le combat prend tout l'écran. En haut la réserve de l'ordi, puis son jeton en jeu ; au milieu
// l'espace de jeu ; puis ton jeton en jeu et ta réserve. Pour attaquer, le jeton se soulève (3D), s'abat sur l'adversaire
// en accélérant, puis revient doucement à sa place ; celui qui est touché tremble et perd ses PV.
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
const wait = (ms: number) =>
  new Promise<void>((ok) => {
    const id = window.setTimeout(() => {
      TIMERS.delete(id);
      ok();
    }, ms);
    TIMERS.add(id);
  });

// ---------- le coup : se soulever, frapper, revenir ----------
const SLAM = 1150; // durée totale
const IMPACT = 0.56; // moment du choc (fraction)
function tokenEl(uid: number) {
  return document.querySelector<HTMLElement>(`[data-uid="${uid}"] [data-lift]`);
}
function slam(from: number, to: number | null, side: Side) {
  const a = tokenEl(from);
  if (!a || reducedFx()) return;
  const sh = a.parentElement?.querySelector<HTMLElement>('[data-shadow]');
  const tilt = side === 0 ? 26 : -26;
  const r0 = a.getBoundingClientRect();
  const b = to != null ? tokenEl(to) : null;
  let dx = 0,
    dy = 0;
  if (b && to !== from) {
    const r1 = b.getBoundingClientRect();
    // on s'arrête au bord du jeton visé (il ne passe pas à travers)
    const k = 1 - Math.min(0.45, (r1.height * 0.55) / Math.max(1, Math.hypot(r1.x - r0.x, r1.y - r0.y)));
    dx = (r1.left + r1.width / 2 - (r0.left + r0.width / 2)) * k;
    dy = (r1.top + r1.height / 2 - (r0.top + r0.height / 2)) * k;
  }
  // pendant le coup, il passe au-dessus de tout (plaques, étiquette du milieu)
  const box = a.closest<HTMLElement>('[data-uid]');
  if (box) {
    box.style.zIndex = '5';
    window.setTimeout(() => box.style.removeProperty('z-index'), SLAM);
  }
  const P = 'perspective(700px)';
  const hit = to != null && to !== from;
  a.animate(
    [
      { transform: `${P} translate(0, 0) rotateX(0deg) scale(1)`, easing: 'cubic-bezier(.2,.8,.3,1)' },
      // il se soulève et se penche en arrière, comme une main qui le prend
      { transform: `${P} translate(0, ${side === 0 ? -26 : 26}px) rotateX(${tilt}deg) scale(1.22)`, offset: 0.36, easing: 'cubic-bezier(.55,0,.95,.45)' },
      // il s'abat (de plus en plus vite)
      hit
        ? { transform: `${P} translate(${dx}px, ${dy}px) rotateX(${-tilt * 0.35}deg) scale(1.02)`, offset: IMPACT, easing: 'cubic-bezier(.25,.75,.3,1)' }
        : { transform: `${P} translate(0, 0) rotateY(360deg) scale(1.1)`, offset: IMPACT, easing: 'cubic-bezier(.25,.75,.3,1)' },
      // et revient doucement à sa place
      { transform: `${P} translate(0, 0) rotateX(0deg) scale(1)` },
    ],
    { duration: SLAM },
  );
  // son ombre reste sur la table : elle s'éloigne et pâlit quand il monte, le suit quand il frappe
  sh?.animate(
    [
      { transform: 'translate(0, 0) scale(1)', opacity: 1, easing: 'cubic-bezier(.2,.8,.3,1)' },
      { transform: `translate(0, ${side === 0 ? 10 : -10}px) scale(1.25)`, opacity: 0.35, offset: 0.36, easing: 'cubic-bezier(.55,0,.95,.45)' },
      { transform: `translate(${dx}px, ${dy}px) scale(1)`, opacity: 1, offset: IMPACT, easing: 'cubic-bezier(.25,.75,.3,1)' },
      { transform: 'translate(0, 0) scale(1)', opacity: 1 },
    ],
    { duration: SLAM },
  );
}

type Fx = Record<number, { k: number; hit?: number; heal?: number; block?: string; ko?: boolean }>;
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
  const pwName = (name: string) => T.n[powerOf(name).id] ?? powerInfo(name, lang).name;
  const lineOf = (e: Ev, state: State, side: Side) => {
    if (e.k === 'attack') return fill(T.attacks, { a: nameOf(e.uid, state) });
    if (e.k === 'power') return fill(T.uses_pw, { a: nameOf(e.uid, state), p: pwName(nameOf(e.uid, state)) });
    if (e.k === 'skip') return fill(T.skip, { a: nameOf(e.uid, state) });
    if (e.k === 'swap') return fill(T.swaps, { a: activeOf(state, e.side ?? side).name });
    return '';
  };
  const show = (evs: Ev[]) =>
    setFx((f) => {
      const n = { ...f };
      evs.forEach((e) => {
        if (e.k === 'hit') n[e.uid] = { k: Math.random(), hit: e.n };
        else if (e.k === 'heal') n[e.uid] = { k: Math.random(), heal: e.n };
        else if (e.k === 'block') n[e.uid] = { k: Math.random(), block: e.what };
        else if (e.k === 'ko') n[e.uid] = { ...n[e.uid], k: n[e.uid]?.k ?? Math.random(), ko: true };
      });
      return n;
    });

  // joue une action et la montre : coup par coup (élan, choc, PV), puis la main passe
  const run = async (side: Side, a: Action) => {
    const next = play(st, side, a);
    if (next === st) return;
    setStarted(true);
    setMode(null);
    setBusy(true);
    const evs = next.log;
    const first = evs.find((e) => e.k === 'attack' || e.k === 'power' || e.k === 'swap' || e.k === 'skip');
    if (first) setLine(lineOf(first, next, side));
    const fast = reducedFx();
    // découpe en coups : chaque élan (attaque / pouvoir) avec les effets qui le suivent
    const groups: { lead?: Ev; rest: Ev[] }[] = [];
    evs.forEach((e) => {
      if (e.k === 'attack' || e.k === 'power') groups.push({ lead: e, rest: [] });
      else if (groups.length) groups[groups.length - 1]?.rest.push(e);
      else groups.push({ rest: [e] });
    });
    for (const g of groups) {
      const lead = g.lead;
      if (lead && (lead.k === 'attack' || lead.k === 'power')) {
        const tgt = g.rest.find((e) => e.k === 'hit' || e.k === 'block');
        const to = tgt && 'uid' in tgt ? tgt.uid : null;
        const who = unitById(st, lead.uid) ? (st.teams[0].units.some((u) => u.uid === lead.uid) ? 0 : 1) : side;
        if (lead.k === 'power') sfx.upgrade();
        slam(lead.uid, to === lead.uid ? null : to, who as Side);
        await wait(fast ? 0 : SLAM * IMPACT);
        sfx.click();
      }
      setSt(next);
      show(g.rest);
      await wait(fast ? 0 : lead ? SLAM * (1 - IMPACT) : 450);
    }
    setSt(next);
    setBusy(false);
  };

  // l'ordi joue quand c'est son tour (ou qu'il doit remplacer un jeton)
  useEffect(() => {
    if (busy || st.winner !== null) return;
    const side: Side | null = st.need === 1 ? 1 : st.need === null && st.turn === 1 ? 1 : null;
    if (side === null) return;
    const id = window.setTimeout(() => void run(1, aiMove(st, 1)), reducedFx() ? 0 : 700);
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
    else void run(0, { t: 'power' });
  };
  const status = mustSend
    ? T.send
    : mode === 'aim'
      ? T.aim
      : mode === 'switch'
        ? T.pickSwap
        : busy
          ? line
          : st.turn === 0
            ? T.you
            : T.foe;

  // effet au clic d'une action : le bouton fait un petit zoom avec des éclats de pixels ; pour une attaque ou un
  // pouvoir, une onde part aussi de ton jeton. Tout est instantané : ça ne retarde jamais le coup.
  const pop = (e: React.MouseEvent<HTMLElement>, wave = false) => {
    if (reducedFx()) return;
    const b = e.currentTarget;
    b.animate([{ scale: 1 }, { scale: 1.12, offset: 0.35 }, { scale: 1 }], {
      duration: 260,
      easing: 'cubic-bezier(.2,.8,.3,1)',
    });
    const r = b.getBoundingClientRect();
    const host = document.body;
    for (let i = 0; i < 10; i++) {
      const p = document.createElement('i');
      p.className = s.spark ?? '';
      const a = (i / 10) * Math.PI * 2 + Math.random() * 0.4,
        d = 26 + Math.random() * 30;
      p.style.left = `${e.clientX || r.left + r.width / 2}px`;
      p.style.top = `${e.clientY || r.top + r.height / 2}px`;
      host.appendChild(p);
      p.animate(
        [
          { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
          { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d}px)) scale(.4)`, opacity: 0 },
        ],
        { duration: 380 + Math.random() * 120, easing: 'cubic-bezier(.2,.8,.3,1)' },
      ).onfinish = () => p.remove();
    }
    if (wave) {
      const t = document.querySelector<HTMLElement>(`[data-uid="${me.uid}"] [data-lift]`);
      if (t) {
        const w = document.createElement('i');
        w.className = s.wave ?? '';
        t.appendChild(w);
        w.animate(
          [
            { transform: 'scale(.9)', opacity: 0.9 },
            { transform: 'scale(1.7)', opacity: 0 },
          ],
          { duration: 420, easing: 'cubic-bezier(.2,.8,.3,1)' },
        ).onfinish = () => w.remove();
      }
    }
  };

  // un jeton posé sur la table (avec son ombre), et ses chiffres qui s'envolent
  const token = (u: Unit, big: boolean) => {
    const j = jetonOf(u.name, u.serie);
    const f = fx[u.uid];
    return (
      <span className={`${s.tok} ${big ? s.tokBig : s.tokSmall} ${u.hp <= 0 ? s.dead : ''}`}>
        <i className={s.shadow} data-shadow aria-hidden />
        <span className={s.lift} data-lift>
          <span key={f?.hit ? f.k : 'still'} className={`${s.face} ${f?.hit ? s.hit : ''}`}>
            <img className={vImg(u.variant)} src={texOf(j)} alt="" />
          </span>
        </span>
        {f?.hit ? (
          <span key={`h${f.k}`} className={s.float}>
            −{f.hit}
          </span>
        ) : null}
        {f?.heal ? (
          <span key={`g${f.k}`} className={`${s.float} ${s.heal}`}>
            +{f.heal}
          </span>
        ) : null}
        {f?.block ? (
          <span key={`b${f.k}`} className={`${s.float} ${s.block}`}>
            {T[`st_${f.block}` as 'st_shield']}
          </span>
        ) : null}
      </span>
    );
  };
  const hpBar = (u: Unit) => {
    const pct = Math.max(0, (u.hp / u.max) * 100);
    return (
      <span className={s.hp} aria-label={`${u.hp}/${u.max} PV`}>
        <i style={{ width: `${pct}%` }} className={pct < 25 ? s.low : pct < 55 ? s.mid : undefined} />
      </span>
    );
  };
  // le jeton en jeu : grand, avec sa plaque (nom, PV, pouvoir et ses crans, effets en cours)
  const spot = (u: Unit, side: Side, onClick?: () => void, extra?: React.ReactNode) => {
    const j = jetonOf(u.name, u.serie);
    const p = powerOf(u.name);
    const effects = [
      u.frozen && T.st_frozen,
      u.weak && T.st_weak,
      u.held && T.st_held,
      u.shield && T.st_shield,
      u.mirror && T.st_mirror,
      u.dodge && T.st_dodge,
      u.jelly && T.st_jelly,
      u.nova && T.st_nova,
    ].filter(Boolean) as string[];
    const body = (
      <>
        {token(u, true)}
        <span className={s.plate}>
          <b className={s.name}>{u.name}</b>
          {hpBar(u)}
          <small className={s.hpN}>
            {u.hp}/{u.max}
          </small>
          <span className={s.pw}>
            <span className={s.pwName}>{pwName(u.name)}</span>
            <span className={s.pips} aria-hidden>
              {Array.from({ length: p.cost }, (_, i) => (
                <i key={i} className={i < u.charge ? s.on : undefined} />
              ))}
            </span>
          </span>
          {effects.length ? (
            <span className={s.chips}>
              {effects.map((x) => (
                <em key={x}>{x}</em>
              ))}
            </span>
          ) : null}
        </span>
        {extra}
      </>
    );
    const cls = `${s.spot} ${side ? s.spotFoe : s.spotMe} ${onClick ? s.pickable : ''}`;
    const style = glowVars(j, u.variant) as CSSProperties;
    return onClick ? (
      <button key={u.uid} type="button" data-uid={u.uid} className={cls} style={style} onClick={onClick}>
        {body}
      </button>
    ) : (
      <div key={u.uid} data-uid={u.uid} className={cls} style={style}>
        {body}
      </div>
    );
  };
  // la réserve : trois emplacements ; celui du jeton en jeu reste vide (creux dans la table)
  const bench = (side: Side) =>
    st.teams[side].units.map((u, i) => {
      if (i === st.teams[side].active)
        return <span key={`slot${i}`} className={`${s.slot} ${s.empty}`} aria-hidden />;
      const can =
        side === 0 ? u.hp > 0 && ((mode === 'switch' && myTurn) || mustSend) : mode === 'aim' && u.hp > 0;
      const onClick = can
        ? () => {
            if (side === 0) void run(0, mustSend ? { t: 'send', to: i } : { t: 'switch', to: i });
            else void run(0, { t: 'power', target: u.uid });
          }
        : undefined;
      const style = glowVars(jetonOf(u.name, u.serie), u.variant) as CSSProperties;
      const inner = (
        <>
          {token(u, false)}
          {hpBar(u)}
        </>
      );
      return onClick ? (
        <button
          key={u.uid}
          type="button"
          data-uid={u.uid}
          className={`${s.slot} ${s.pickable}`}
          style={style}
          onClick={onClick}
          aria-label={u.name}
        >
          {inner}
        </button>
      ) : (
        <span key={u.uid} data-uid={u.uid} className={s.slot} style={style} title={u.name}>
          {inner}
        </span>
      );
    });

  return (
    <section className={s.page}>
      <h1 className="visually-hidden">{T.title}</h1>
      <div className={s.table}>
        <div className={`${s.rim} ${s.rimFoe}`}>{bench(1)}</div>
        <div className={s.mat}>
          {spot(
            foe,
            1,
            mode === 'aim' && pw.target === 'any' ? () => void run(0, { t: 'power', target: foe.uid }) : undefined,
          )}
          <p className={s.status} aria-live="polite">
            <span key={status}>{status}</span>
            {st.teams[1].thorns ? <em className={s.side}>{T.st_thorns}</em> : null}
            {st.teams[0].sealed ? <em className={s.side}>{T.st_sealed}</em> : null}
          </p>
          {spot(me, 0, undefined, (
      <div className={s.acts}>
        {mode ? (
          <Button onClick={(e) => (pop(e), setMode(null))}>{T.cancel}</Button>
        ) : (
          <>
            <Button variant="primary" disabled={!myTurn} onClick={(e) => (pop(e, true), void run(0, { t: 'attack' }))}>
              {T.attack} <small className={s.dmg}>−{attackDmg(me)}</small>
            </Button>
            <Button disabled={!myTurn || !ready} onClick={(e) => (pop(e, true), onPower())} title={T.d[pw.id]}>
              {pwName(me.name)}
              {me.usesLeft !== undefined ? <small className={s.dmg}>{fill(T.uses, { n: me.usesLeft })}</small> : null}
            </Button>
            <Button disabled={!myTurn || !canSwitch(st, 0)} onClick={(e) => (pop(e), setMode('switch'))}>
              {T.switch}
            </Button>
          </>
        )}
      </div>
          ))}
        </div>
        <div className={`${s.rim} ${s.rimMe}`}>{bench(0)}</div>
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
