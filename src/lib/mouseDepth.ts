import { calmFx } from '@/lib/settings';

// Profondeur à la souris (comme l'accueil) pour tout le site : la position du pointeur, de -0,5 à 0,5 par rapport au
// centre de l'écran, lissée, écrite dans --mpx / --mpy sur <html>. Les pages s'en servent en CSS (translate) pour faire
// glisser leurs blocs d'un tout petit peu, chacun à sa profondeur. Rien ne tourne quand la souris ne bouge pas.
// État partagé : snapMouseDepth() place tout de suite les blocs à leur position (sans glissade)
const st = { tx: 0, ty: 0, x: 0, y: 0 };
// Écrit SEULEMENT sur les éléments qui s'en servent ([data-depth] et les blocs de l'ouverture), et les variables ne
// s'héritent pas (@property dans global.css) : avant, les écrire sur <html> faisait recalculer les styles de TOUTE la
// page à chaque image où la souris bougeait (plus de 3 s de calcul pour 3 s de mouvement sur le passe).
const TARGETS = '[data-depth], #opening .op-id, #opening .op-stats, #opening .op-coin-col';
const write = () => {
  const x = st.x.toFixed(4),
    y = st.y.toFixed(4);
  document.querySelectorAll<HTMLElement>(TARGETS).forEach((el) => {
    el.style.setProperty('--mpx', x);
    el.style.setProperty('--mpy', y);
  });
};
// À l'apparition d'une page : pas de rattrapage visible (sinon tout glissait un peu en diagonale après le fondu)
export function snapMouseDepth() {
  st.x = st.tx;
  st.y = st.ty;
  write();
}
export function installMouseDepth() {
  if (matchMedia('(pointer: coarse)').matches) return () => undefined; // téléphone : pas de souris
  let raf = 0;
  const step = () => {
    st.x += (st.tx - st.x) * 0.12;
    st.y += (st.ty - st.y) * 0.12;
    write();
    raf = Math.abs(st.tx - st.x) + Math.abs(st.ty - st.y) > 0.0005 ? requestAnimationFrame(step) : 0;
  };
  const move = (e: PointerEvent) => {
    if (calmFx() || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    st.tx = e.clientX / innerWidth - 0.5;
    st.ty = e.clientY / innerHeight - 0.5;
    if (!raf) raf = requestAnimationFrame(step);
  };
  const leave = () => {
    st.tx = st.ty = 0;
    if (!raf) raf = requestAnimationFrame(step);
  };
  addEventListener('pointermove', move, { passive: true });
  document.addEventListener('pointerleave', leave);
  return () => {
    removeEventListener('pointermove', move);
    document.removeEventListener('pointerleave', leave);
    cancelAnimationFrame(raf);
  };
}
