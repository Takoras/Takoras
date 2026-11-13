// Duel : combat de jetons au tour par tour, sur un plateau (prototype, contre l'IA, sans serveur).
// 3 jetons chacun : un actif devant, deux en réserve. À son tour, une seule action :
//   attaquer · utiliser son pouvoir (il se charge d'un cran à chaque tour où le jeton est devant) · changer de jeton.
// PV = poids du jeton, attaque = sa puissance (stats du Ring, mutation comprise). Chaque jeton garde SON pouvoir.
// Tout est déterministe (pas de hasard dans les règles) : plus simple à équilibrer et sans bug de physique.
import { ringStats } from '@/data/kit';

export type Side = 0 | 1;
export type Unit = {
  uid: number;
  name: string;
  serie: string;
  variant: string;
  hp: number;
  max: number;
  atk: number;
  charge: number;
  usesLeft?: number;
  // effets sur ce jeton (en nombre de tours)
  jelly?: number;
  shield?: boolean;
  mirror?: boolean;
  dodge?: boolean;
  frozen?: number;
  weak?: number;
  held?: number;
  nova?: boolean;
};
export type Team = { units: Unit[]; active: number; thorns?: number; sealed?: number };
export type Ev =
  | { k: 'hit'; uid: number; n: number; from?: number }
  | { k: 'heal'; uid: number; n: number }
  | { k: 'block'; uid: number; what: 'dodge' | 'shield' | 'mirror' }
  | { k: 'power'; uid: number }
  | { k: 'attack'; uid: number }
  | { k: 'swap'; side: Side }
  | { k: 'ko'; uid: number }
  | { k: 'skip'; uid: number }
  | { k: 'status'; uid: number; s: string };
export type State = {
  teams: [Team, Team];
  turn: Side;
  n: number;
  /** un camp doit choisir qui remplace son jeton K.O. */
  need: Side | null;
  /** après le remplacement : à qui la main (le camp en cours s'il n'a pas encore joué) */
  resume?: Side;
  winner: Side | null;
  log: Ev[];
};
export type Action =
  | { t: 'attack' }
  | { t: 'power'; target?: number }
  | { t: 'switch'; to: number }
  | { t: 'send'; to: number };

// ---------- pouvoirs ----------
// cost : crans de charge nécessaires · uses : fois par match (sinon illimité) · target : il faut viser un jeton adverse
export type PowerDef = { id: string; cost: number; uses?: number; target?: 'any' | 'bench' };
export const POWERS: Record<string, PowerDef> = {
  Mobu: { id: 'jelly', cost: 2 },
  Pikko: { id: 'pinball', cost: 2 },
  Rouillé: { id: 'rampart', cost: 2 },
  Givre: { id: 'freeze', cost: 2 },
  Soléo: { id: 'nova', cost: 3 },
  Azura: { id: 'surf', cost: 2 },
  Carmin: { id: 'ora', cost: 2 },
  Vyolis: { id: 'blink', cost: 3 },
  Lumis: { id: 'mirror', cost: 3 },
  Nyx: { id: 'shade', cost: 2 },
  Astra: { id: 'starfall', cost: 2, target: 'any' },
  Kraïos: { id: 'grab', cost: 2, uses: 1, target: 'bench' },
  Koi: { id: 'current', cost: 1 },
  Néphéris: { id: 'ring', cost: 2 },
  Zénith: { id: 'beam', cost: 2, uses: 1 },
  Oblivion: { id: 'rift', cost: 3 },
  Takoras: { id: 'devour', cost: 3 },
  Mousse: { id: 'moss', cost: 2 },
  Ronce: { id: 'thorns', cost: 2 },
  Coton: { id: 'cloud', cost: 2 },
};
export const powerOf = (name: string): PowerDef => POWERS[name] ?? { id: 'strong', cost: 2 };

// ---------- création ----------
export type Pick = { name: string; serie?: string; variant?: string; lvl?: number };
let UID = 0;
export function makeUnit(p: Pick): Unit {
  const st = ringStats(p.name, p.lvl ?? 1, p.variant ?? '');
  const max = Math.round(60 + st.mass * 40);
  const pw = powerOf(p.name);
  return {
    uid: ++UID,
    name: p.name,
    serie: p.serie ?? 'Takoras',
    variant: p.variant ?? '',
    hp: max,
    max,
    atk: Math.round(st.power / 50),
    charge: 1,
    ...(pw.uses ? { usesLeft: pw.uses } : {}),
  };
}
export function newDuel(a: Pick[], b: Pick[], first: Side = 0): State {
  return {
    teams: [
      { units: a.map(makeUnit), active: 0 },
      { units: b.map(makeUnit), active: 0 },
    ],
    turn: first,
    n: 1,
    need: null,
    winner: null,
    log: [],
  };
}

// ---------- lecture ----------
const other = (s: Side): Side => (s ? 0 : 1);
export const activeOf = (st: State, s: Side) => st.teams[s].units[st.teams[s].active] as Unit;
export const benchOf = (st: State, s: Side) =>
  st.teams[s].units.map((u, i) => ({ u, i })).filter(({ i }) => i !== st.teams[s].active);
export const aliveBench = (st: State, s: Side) => benchOf(st, s).filter(({ u }) => u.hp > 0);
export function canPower(st: State, s: Side) {
  const u = activeOf(st, s);
  const pw = powerOf(u.name);
  if (st.teams[s].sealed) return false;
  if (u.usesLeft === 0) return false;
  if (u.nova) return false;
  if (pw.target === 'bench' && !aliveBench(st, other(s)).length) return false;
  return u.charge >= pw.cost;
}
export const canSwitch = (st: State, s: Side) => !activeOf(st, s).held && aliveBench(st, s).length > 0;
/** dégâts d'une attaque simple (pour l'afficher sur le bouton) */
export const attackDmg = (u: Unit, mult = 1) => Math.max(1, Math.round(u.atk * mult * (u.weak ? 0.6 : 1)));

// ---------- jouer ----------
const clone = (st: State): State => JSON.parse(JSON.stringify(st)) as State;
function findUnit(st: State, uid: number): [Side, Unit] | null {
  for (const s of [0, 1] as Side[]) {
    const u = st.teams[s].units.find((x) => x.uid === uid);
    if (u) return [s, u];
  }
  return null;
}
function hurt(st: State, u: Unit, n: number, from?: number) {
  if (u.hp <= 0 || n <= 0) return;
  const d = Math.min(u.hp, Math.round(n));
  u.hp -= d;
  st.log.push({ k: 'hit', uid: u.uid, n: d, from });
  if (u.hp <= 0) st.log.push({ k: 'ko', uid: u.uid });
}
// une frappe de A sur T : protections (esquive, rempart, miroir, gélatine) sauf si `pierce`
function strike(st: State, A: Unit, T: Unit, mult: number, pierce = false) {
  if (T.hp <= 0) return;
  const base = attackDmg(A, mult);
  if (!pierce) {
    if (T.dodge) {
      T.dodge = false;
      st.log.push({ k: 'block', uid: T.uid, what: 'dodge' });
      return;
    }
    if (T.mirror) {
      T.mirror = false;
      st.log.push({ k: 'block', uid: T.uid, what: 'mirror' });
      hurt(st, A, base * 1.5, T.uid);
      return;
    }
    if (T.shield) {
      T.shield = false;
      st.log.push({ k: 'block', uid: T.uid, what: 'shield' });
      hurt(st, A, base * 0.6, T.uid);
      return;
    }
    if (T.jelly) {
      const d = Math.round(base * 0.6);
      hurt(st, T, d, A.uid);
      hurt(st, A, d * 0.6, T.uid);
      return;
    }
  }
  hurt(st, T, base, A.uid);
}
const thorns = (st: State, s: Side, A: Unit) => {
  if (st.teams[s].thorns) hurt(st, A, 14);
};

function applyPower(st: State, s: Side, target?: number) {
  const me = st.teams[s],
    foe = st.teams[other(s)];
  const A = activeOf(st, s),
    T = activeOf(st, other(s));
  const pw = powerOf(A.name);
  A.charge = 0;
  if (A.usesLeft) A.usesLeft--;
  st.log.push({ k: 'power', uid: A.uid });
  const foes = foe.units.filter((u) => u.hp > 0);
  switch (pw.id) {
    case 'jelly':
      strike(st, A, T, 0.8);
      A.jelly = 2;
      break;
    case 'pinball': {
      // trois rebonds : l'actif, puis la réserve, puis l'actif
      const order = [T, ...aliveBench(st, other(s)).map((x) => x.u), T];
      order.slice(0, 3).forEach((u) => strike(st, A, u, 0.45));
      break;
    }
    case 'rampart':
      A.shield = true;
      break;
    case 'freeze':
      strike(st, A, T, 0.8);
      T.frozen = 1;
      st.log.push({ k: 'status', uid: T.uid, s: 'frozen' });
      break;
    case 'nova':
      A.nova = true;
      break;
    case 'surf':
      foes.forEach((u) => strike(st, A, u, 0.6));
      break;
    case 'ora':
      strike(st, A, T, 1.7);
      break;
    case 'blink':
      strike(st, A, T, 1);
      A.dodge = true;
      break;
    case 'mirror':
      A.mirror = true;
      break;
    case 'shade':
      strike(st, A, T, 1.3, true);
      break;
    case 'starfall': {
      const u = foe.units.find((x) => x.uid === target && x.hp > 0) ?? T;
      strike(st, A, u, 1.4);
      break;
    }
    case 'grab': {
      const i = foe.units.findIndex((x) => x.uid === target && x.hp > 0);
      const j = i >= 0 && i !== foe.active ? i : (aliveBench(st, other(s))[0]?.i ?? foe.active);
      foe.active = j;
      const u = foe.units[j] as Unit;
      u.held = 2;
      st.log.push({ k: 'swap', side: other(s) });
      strike(st, A, u, 1.4);
      break;
    }
    case 'current': {
      strike(st, A, T, 1);
      // repart en réserve : le jeton le plus en forme prend sa place
      const b = aliveBench(st, s).sort((x, y) => y.u.hp - x.u.hp)[0];
      if (b && A.hp > 0) {
        me.active = b.i;
        st.log.push({ k: 'swap', side: s });
      }
      break;
    }
    case 'ring':
      strike(st, A, T, 0.8);
      foe.sealed = 2;
      break;
    case 'beam':
      strike(st, A, T, 2.6);
      break;
    case 'rift':
      foes.forEach((u) => strike(st, A, u, 0.5));
      T.charge = Math.max(0, T.charge - 1);
      break;
    case 'devour': {
      const d = Math.max(20, Math.round(T.hp * 0.4));
      hurt(st, T, d, A.uid);
      const h = Math.min(A.max - A.hp, d);
      A.hp += h;
      if (h) st.log.push({ k: 'heal', uid: A.uid, n: h });
      break;
    }
    case 'moss':
      strike(st, A, T, 0.9);
      T.weak = 2;
      break;
    case 'thorns':
      strike(st, A, T, 0.7);
      foe.thorns = 3;
      break;
    case 'cloud': {
      // nuage : soigne toute l'équipe encore debout
      me.units
        .filter((x) => x.hp > 0)
        .forEach((u) => {
          const h = Math.min(u.max - u.hp, 30);
          u.hp += h;
          if (h) st.log.push({ k: 'heal', uid: u.uid, n: h });
        });
      break;
    }
    default:
      strike(st, A, T, 1.4);
  }
  thorns(st, s, A);
}

// fin d'action : K.O., remplacement, victoire, puis tour suivant
function settle(st: State, s: Side) {
  for (const x of [other(s), s] as Side[]) {
    const tm = st.teams[x];
    if (!tm.units.some((u) => u.hp > 0)) {
      st.winner = other(x);
      return;
    }
  }
  // jeton devant K.O. : son camp choisit qui le remplace (d'abord l'adversaire de celui qui a joué)
  for (const x of [other(s), s] as Side[]) {
    if (activeOf(st, x).hp <= 0) {
      st.need = x;
      st.resume = other(s);
      return;
    }
  }
  nextTurn(st, s);
}
function endOfTurn(st: State, s: Side) {
  const tm = st.teams[s];
  tm.units.forEach((u) => {
    if (u.weak) u.weak--;
    if (u.held) u.held--;
  });
  if (tm.thorns) tm.thorns--;
  if (tm.sealed) tm.sealed--;
}
function nextTurn(st: State, s: Side) {
  endOfTurn(st, s);
  const o = other(s);
  st.turn = o;
  st.n++;
  startTurn(st, o);
}
function startTurn(st: State, s: Side) {
  const A = activeOf(st, s);
  st.teams[s].units.forEach((u) => {
    if (u.jelly) u.jelly--;
  });
  // Soléo chargé : il explose au début de son tour
  if (A.nova) {
    A.nova = false;
    st.log.push({ k: 'power', uid: A.uid });
    const T = activeOf(st, other(s));
    strike(st, A, T, 2.2);
    aliveBench(st, other(s)).forEach(({ u }) => strike(st, A, u, 0.5));
  }
  A.charge = Math.min(powerOf(A.name).cost, A.charge + 1);
  if (A.frozen) {
    A.frozen--;
    st.log.push({ k: 'skip', uid: A.uid });
    if (!st.winner && !st.need) nextTurn(st, s);
  }
  // l'explosion a pu mettre K.O.
  if (!st.winner && !st.need && activeOf(st, other(s)).hp <= 0) {
    const o = other(s);
    if (!st.teams[o].units.some((u) => u.hp > 0)) st.winner = s;
    else {
      st.need = o;
      st.resume = s; // s n'a pas encore joué ce tour
    }
  }
}

export function legal(st: State, s: Side, a: Action) {
  if (st.winner !== null) return false;
  if (st.need !== null) return a.t === 'send' && st.need === s && aliveBench(st, s).some((x) => x.i === a.to);
  if (st.turn !== s) return false;
  if (a.t === 'attack') return true;
  if (a.t === 'power') return canPower(st, s);
  if (a.t === 'switch') return canSwitch(st, s) && aliveBench(st, s).some((x) => x.i === a.to);
  return false;
}

export function play(prev: State, s: Side, a: Action): State {
  if (!legal(prev, s, a)) return prev;
  const st = clone(prev);
  st.log = [];
  if (a.t === 'send') {
    st.teams[s].active = a.to;
    st.log.push({ k: 'swap', side: s });
    st.need = null;
    // le camp qui doit encore remplacer (double K.O.), sinon on reprend : c'est au tour de l'autre
    const o = other(s);
    if (activeOf(st, o).hp <= 0 && aliveBench(st, o).length) {
      st.need = o;
      return st;
    }
    // la main passe à l'autre, sauf si le camp en cours n'a pas encore joué (K.O. au début de son tour)
    const r = st.resume ?? other(st.turn);
    st.resume = undefined;
    if (r !== st.turn) nextTurn(st, st.turn);
    return st;
  }
  const A = activeOf(st, s);
  if (a.t === 'attack') {
    st.log.push({ k: 'attack', uid: A.uid });
    strike(st, A, activeOf(st, other(s)), 1);
    thorns(st, s, A);
  } else if (a.t === 'power') applyPower(st, s, a.target);
  else if (a.t === 'switch') {
    st.teams[s].active = a.to;
    st.log.push({ k: 'swap', side: s });
  }
  settle(st, s);
  return st;
}

// ---------- IA ----------
// simple et lisible : pouvoir s'il est prêt (et utile), changer si le jeton devant va tomber et qu'un autre est en
// meilleure forme, sinon attaquer. Remplaçant : le plus en forme.
export function aiMove(st: State, s: Side): Action {
  if (st.need === s) {
    const b = aliveBench(st, s).sort((x, y) => y.u.hp - x.u.hp)[0];
    return { t: 'send', to: b?.i ?? 0 };
  }
  const A = activeOf(st, s),
    T = activeOf(st, other(s));
  const pw = powerOf(A.name);
  if (canPower(st, s)) {
    const heal = pw.id === 'cloud' && !st.teams[s].units.some((u) => u.hp > 0 && u.hp < u.max - 20);
    if (!heal) {
      if (pw.target === 'any') {
        const low = st.teams[other(s)].units.filter((u) => u.hp > 0).sort((x, y) => x.hp - y.hp)[0];
        return { t: 'power', target: low?.uid };
      }
      if (pw.target === 'bench') {
        const low = aliveBench(st, other(s)).sort((x, y) => x.u.hp - y.u.hp)[0];
        return { t: 'power', target: low?.u.uid };
      }
      return { t: 'power' };
    }
  }
  if (A.hp <= attackDmg(T) && canSwitch(st, s)) {
    const b = aliveBench(st, s).sort((x, y) => y.u.hp - x.u.hp)[0];
    if (b && b.u.hp > A.hp * 2) return { t: 'switch', to: b.i };
  }
  return { t: 'attack' };
}

export const unitById = (st: State, uid: number) => findUnit(st, uid)?.[1];
