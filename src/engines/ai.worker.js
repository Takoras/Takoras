// L'IA du Ring réfléchit ici, dans un fil à part : l'animation du jeu n'est jamais bloquée pendant qu'elle calcule.
import { RG } from './ring-engine.js';

self.onmessage = (e) => {
  const { id, st, side, level } = e.data;
  self.postMessage({ id, shot: RG.aiShot(st, side, level) });
};
