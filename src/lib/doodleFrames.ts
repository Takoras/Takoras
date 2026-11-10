import { reducedFx, WEBKIT_ONLY } from '@/lib/settings';

// Doodle « précalculé » : au lieu d'appliquer un filtre SVG en direct sur chaque image (le navigateur le recalculait
// pixel par pixel à chaque pas, pour chaque jeton : c'est ce qui faisait ramer l'inventaire), on dessine UNE fois les
// 3 images déformées de chaque jeton (à sa taille d'écran), puis on passe de l'une à l'autre toutes les 0,3 s.
// Toutes les images changent au même moment, et seules celles visibles à l'écran sont mises à jour.
// Les variantes (Doré, Céleste, Ombre) gardent leur effet CSS ; Safari garde son petit tremblement.

const STEP = 300; // ms entre deux images (comme l'ancienne animation : 0,9 s pour 3 images)
const NOISE = [3, 17, 41]; // mêmes graines que les filtres #dd0..#dd2
const ns = 'http://www.w3.org/2000/svg';

type Frames = string[]; // 3 valeurs CSS « content »
const cache = new Map<string, Promise<Frames | null>>();
const live = new Map<HTMLImageElement, { key: string; frames: Frames }>();
let svgHost: SVGSVGElement | null = null;
const made = new Set<string>();

// filtre de déformation à l'échelle de l'écran (sur un écran Retina, le canvas a 2 pixels par pixel du site)
function filterId(seed: number, small: boolean, dpr: number) {
  const id = `ddf-${seed}-${small ? 's' : 'b'}-${dpr}`;
  if (made.has(id)) return id;
  if (!svgHost) {
    svgHost = document.createElementNS(ns, 'svg');
    svgHost.setAttribute('width', '0');
    svgHost.setAttribute('height', '0');
    svgHost.setAttribute('aria-hidden', 'true');
    svgHost.style.position = 'absolute';
    document.body.appendChild(svgHost);
  }
  const freq = (small ? 0.07 : 0.04) / dpr;
  const scale = (small ? 1.4 : 3) * dpr;
  svgHost.insertAdjacentHTML(
    'beforeend',
    `<filter id="${id}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="linearRGB"><feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="1" seed="${seed}"/><feDisplacementMap in="SourceGraphic" scale="${scale}" xChannelSelector="R" yChannelSelector="G"/></filter>`,
  );
  made.add(id);
  return id;
}

async function render(img: HTMLImageElement, w: number, small: boolean, dpr: number): Promise<Frames | null> {
  if (!img.complete) await img.decode().catch(() => undefined);
  const nw = img.naturalWidth,
    nh = img.naturalHeight;
  if (!nw || !nh) return null;
  const cw = Math.max(8, Math.round(w * dpr));
  const ch = Math.max(8, Math.round((cw * nh) / nw));
  const src = document.createElement('canvas');
  src.width = cw;
  src.height = ch;
  const sx = src.getContext('2d');
  if (!sx) return null;
  sx.imageSmoothingEnabled = false; // pixel art : agrandi sans flou, comme à l'écran
  sx.drawImage(img, 0, 0, cw, ch);
  // taille « naturelle » gardée : l'image affichée garde exactement la même place qu'avant
  const res = cw / nw;
  const out: Frames = [];
  for (const seed of NOISE) {
    const cv = document.createElement('canvas');
    cv.width = cw;
    cv.height = ch;
    const x = cv.getContext('2d');
    if (!x) return null;
    x.filter = `url(#${filterId(seed, small, dpr)})`;
    x.drawImage(src, 0, 0);
    const blob = await new Promise<Blob | null>((ok) => cv.toBlob(ok));
    if (!blob) return null;
    out.push(`image-set(url("${URL.createObjectURL(blob)}") ${res}x)`);
  }
  return out;
}

// le filtre de canvas avec url(#…) ne marche pas partout : on vérifie une fois qu'il déforme vraiment
let support: boolean | null = null;
function supported() {
  if (support !== null) return support;
  try {
    const c = document.createElement('canvas');
    const x = c.getContext('2d');
    support = !!x && 'filter' in x && !WEBKIT_ONLY;
  } catch {
    support = false;
  }
  return support;
}

const eligible = (img: HTMLImageElement) =>
  img.classList.contains('px') &&
  !img.classList.contains('still') &&
  !img.matches('.v-gold, .v-celeste, .v-ombre') &&
  !img.src.startsWith('blob:');

const queue = new Set<HTMLImageElement>();
let working = false;
async function pump() {
  if (working || reducedFx()) return; // effets allégés / patate : images fixes, rien à préparer
  working = true;
  try {
    while (queue.size) {
      const img = queue.values().next().value as HTMLImageElement;
      queue.delete(img);
      if (!img.isConnected || !eligible(img) || img.classList.contains('dd-off')) continue;
      const r = img.getBoundingClientRect();
      if (r.width < 4) continue;
      const small = r.width <= 52 || !!img.closest('.mini, .small');
      const dpr = Math.min(2, Math.round((devicePixelRatio || 1) * 2) / 2);
      // une taille par palier de 8 px : les jetons de même taille partagent leurs images
      const w = Math.ceil(r.width / 8) * 8;
      const key = `${img.currentSrc || img.src}|${w}|${small ? 1 : 0}|${dpr}`;
      let p = cache.get(key);
      if (!p) {
        p = render(img, w, small, dpr).catch(() => null);
        cache.set(key, p);
      }
      const frames = await p;
      if (!frames || !img.isConnected) continue;
      live.set(img, { key, frames });
      img.style.setProperty('content', frames[tick % 3] ?? null);
      img.classList.add('dd-on');
      // laisse respirer la page entre deux jetons
      await new Promise((ok) => setTimeout(ok, 0));
    }
  } finally {
    working = false;
  }
}

let tick = 0;
function step() {
  tick = (tick + 1) % 3;
  for (const [img, st] of live) {
    if (!img.isConnected) {
      live.delete(img);
      continue;
    }
    // l'image a changé (autre jeton, autre taille, variante…) : on la recalcule
    const src = img.currentSrc || img.src;
    if (!st.key.startsWith(src + '|') || !eligible(img)) {
      live.delete(img);
      img.style.removeProperty('content');
      img.classList.remove('dd-on');
      if (eligible(img)) queue.add(img);
      continue;
    }
    if (img.classList.contains('dd-off')) continue; // hors de l'écran : rien à faire
    img.style.setProperty('content', st.frames[tick] ?? null);
  }
  if (queue.size) void pump();
}

// branché une fois au démarrage (Layout) : surveille les images à l'écran
export function installDoodleFrames() {
  if (typeof document === 'undefined' || !supported()) return () => undefined;
  document.documentElement.classList.add('dd-js');
  const io = new IntersectionObserver(
    (es) =>
      es.forEach((e) => {
        const img = e.target as HTMLImageElement;
        if (e.isIntersecting && !live.has(img) && eligible(img)) queue.add(img);
      }),
    { rootMargin: '120px' },
  );
  const seen = new WeakSet<Element>();
  const scan = () =>
    document.querySelectorAll<HTMLImageElement>('img.px').forEach((img) => {
      if (seen.has(img)) return;
      seen.add(img);
      io.observe(img);
    });
  scan();
  let pending = 0;
  const mo = new MutationObserver(() => {
    if (pending) return;
    pending = requestAnimationFrame(() => {
      pending = 0;
      scan();
      void pump();
    });
  });
  mo.observe(document.body, { childList: true, subtree: true });
  const id = setInterval(() => {
    if (document.visibilityState === 'visible' && !reducedFx()) step();
  }, STEP);
  void pump();
  return () => {
    clearInterval(id);
    mo.disconnect();
    io.disconnect();
  };
}
