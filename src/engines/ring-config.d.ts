// Types de RCFG (valeurs d'équilibrage du Ring). Les valeurs sont dans ring-config.js.
export type Role = 'fighter' | 'tank' | 'support';
export type TokenKit = { role?: Role; mass: number; power: number; r: number; pw: string; cd: number; p: Record<string, number> };
export const RCFG: {
  MAPS: { id: string; R: number; fric: number; walls: { x1: number; y1: number; x2: number; y2: number; w: number; k: number }[]; zones: { x: number; y: number; w: number; h: number; fric: number }[] }[];
  RING_R: number; TURNS: number; AIM_S: number; START_Y: number; START_X: number[]; SUDDEN_Y: number;
  DT: number; FRICTION: number; DRAG: number; RESTITUTION: number; STOP_SPEED: number; MAX_SIM_S: number; QUANT: number; MIN_FORCE: number;
  BIG_HIT: number; SLOWMO: number; SLOWMO_S: number;
  LEVEL_MAX: number; LEVEL_BONUS: number; LEVEL_COST: number[]; MUTATION: Record<string, number>;
  ROLES: { fighter: { power: number }; tank: { mass: number }; support: { ally: number } }; TRIO: number;
  ELO: { start: number; kNew: number; k: number; newGames: number };
  DIV: number;
  SHRINK: { step: number; min: number; maxTurns: number };
  RANKS: { k: string; min: number; col: string; divs: number }[];
  AI: Record<string, { shoots: boolean; smart?: boolean; aimErr?: number; forceErr?: number; tries?: number }>;
  TOKENS: Record<string, TokenKit>;
  DEFAULT_TOKEN: TokenKit;
  STAT_MAX: { mass: number; power: number; r: number };
};
