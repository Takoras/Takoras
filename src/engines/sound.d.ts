// Types du moteur de son (src/engines/sound.js, porté de l'ancien site).
type Snd = () => void;
export const sfx: {
  audio(): { ctx: AudioContext; out: AudioNode; ok: boolean };
  setMuted(m: boolean): void;
  setVolume(v: number): void;
  readonly muted: boolean;
  click: Snd; hover: Snd; whoosh: Snd; whooshOut: Snd; corrupt: Snd; evaporate: Snd; spawn: Snd;
  tick(v?: number): void; hold: Snd; heartbeat: Snd; reveal(odds: number): void; impact: Snd;
  riser(dur?: number): void; next: Snd; regen: Snd; upgrade: Snd; announce: Snd; message: Snd;
  combo(n: number): void; deny: Snd;
};
export function configureSound(o: { volume?: () => number; reduced?: () => boolean }): void;
export function installSoundListeners(): void;
