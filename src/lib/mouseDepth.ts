import { reducedFx } from '@/lib/settings';

// Profondeur à la souris (comme l'accueil) pour tout le site : la position du pointeur, de -0,5 à 0,5 par rapport au
// centre de l'écran, lissée, écrite dans --mpx / --mpy sur <html>. Les pages s'en servent en CSS (translate) pour faire
// glisser leurs blocs d'un tout petit peu, chacun à sa profondeur. Rien ne tourne quand la souris ne bouge pas.
export function installMouseDepth() {
  if (matchMedia('(pointer: coarse)').matches) return () => undefined; // téléphone : pas de souris
  const root = document.documentElement;
  let tx = 0,
    ty = 0,
    x = 0,
    y = 0,
    raf = 0;
  const step = () => {
    x += (tx - x) * 0.08;
    y += (ty - y) * 0.08;
    root.style.setProperty('--mpx', x.toFixed(4));
    root.style.setProperty('--mpy', y.toFixed(4));
    raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.0005 ? requestAnimationFrame(step) : 0;
  };
  const move = (e: PointerEvent) => {
    if (reducedFx() || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    tx = e.clientX / innerWidth - 0.5;
    ty = e.clientY / innerHeight - 0.5;
    if (!raf) raf = requestAnimationFrame(step);
  };
  const leave = () => {
    tx = ty = 0;
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
