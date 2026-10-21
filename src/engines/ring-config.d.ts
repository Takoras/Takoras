// Types de RCFG (valeurs d'équilibrage du Ring). Les valeurs sont dans ring-config.js.
export type TokenKit = { mass: number; power: number; r: number; pw: string; cd: number; p: Record<string, number> };
export const RCFG: {
  RING_R: number; TURNS: number; AIM_S: number; START_Y: number; START_X: number[]; SUDDEN_Y: number;
  DT: number; FRICTION: number; DRAG: number; RESTITUTION: number; STOP_SPEED: number; MAX_SIM_S: number; QUANT: number; MIN_FORCE: number;
  BIG_HIT: number; SLOWMO: number; SLOWMO_S: number;
  LEVEL_MAX: number; LEVEL_BONUS: number; LEVEL_COST: number[]; MUTATION: Record<string, number>;
  BUDGET: Record<string, number>; BUDGET_MAX: number;
  ELO: { start: number; kNew: number; k: number; newGames: number };
  RANKS: { k: string; min: number; ico: string }[];
  AI: Record<string, { shoots: boolean; aimErr?: number; forceErr?: number; tries?: number }>;
  TOKENS: Record<string, TokenKit>;
  DEFAULT_TOKEN: TokenKit;
  STAT_MAX: { mass: number; power: number; r: number };
};
