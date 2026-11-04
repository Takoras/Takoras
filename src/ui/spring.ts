// Ressort simple (masse 1) piloté par requestAnimationFrame, pour remplacer framer-motion :
// la valeur suit sa cible avec la raideur et l'amortissement donnés, et appelle onFrame à chaque image.
export type Spring = {
  set: (target: number) => void;
  jump: (v: number) => void;
  stop: () => void;
  value: () => number;
};

export function spring(onFrame: (v: number) => void, { stiffness = 300, damping = 30, from = 0 } = {}): Spring {
  let x = from,
    v = 0,
    target = from,
    raf = 0,
    last = 0;
  const step = (now: number) => {
    // pas fixes de 1/240 s : stable même quand une image prend du retard
    let dt = Math.min(0.064, (now - last) / 1000);
    last = now;
    while (dt > 0) {
      const h = Math.min(dt, 1 / 240);
      v += (-stiffness * (x - target) - damping * v) * h;
      x += v * h;
      dt -= h;
    }
    if (Math.abs(v) < 0.001 && Math.abs(x - target) < 0.001) {
      x = target;
      v = 0;
      raf = 0;
      onFrame(x);
      return;
    }
    onFrame(x);
    raf = requestAnimationFrame(step);
  };
  return {
    set(t) {
      target = t;
      if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(step);
      }
    },
    jump(val) {
      x = target = val;
      v = 0;
      onFrame(x);
    },
    stop() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    },
    value: () => x,
  };
}
