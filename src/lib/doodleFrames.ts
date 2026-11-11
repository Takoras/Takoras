import { reducedFx, WEBKIT_ONLY } from '@/lib/settings';

// Doodle « précalculé » : au lieu d'appliquer un filtre SVG en direct sur chaque image (le navigateur le recalculait
// pixel par pixel à chaque pas, pour chaque jeton : c'est ce qui faisait ramer l'inventaire), on dessine UNE fois les
// 3 images déformées de chaque jeton (à sa taille d'écran), puis on passe de l'une à l'autre toutes les 0,3 s.
// Toutes les images changent au même moment, et seules celles visibles à l'écran sont mises à jour.
// Les variantes (Doré, Céleste, Ombre) gardent leur effet CSS ; Safari garde son petit tremblement.

const STEP = 300; // ms entre deux images (comme l'ancienne animation : 0,9 s pour 3 images)
const NOISE = [3, 17, 41]; // mêmes graines que les filtres #dd0..#dd2
const ns = 'http://www.w3.org/2000/svg';

// une seule planche (les 3 dessins l'un sous l'autre) : on la fait glisser, l'image n'est jamais remplacée
// (changer d'image forçait parfois le navigateur à la redécoder : le sprite disparaissait une image, d'où des flashs)
type Frames = { content: string; h: number; w: number };
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

async function render(
  img: HTMLImageElement,
  bw: number,
  bh: number,
  fit: string,
  small: boolean,
  dpr: number,
): Promise<Frames | null> {
  if (!img.complete) await img.decode().catch(() => undefined);
  const nw = img.naturalWidth,
    nh = img.naturalHeight;
  if (!nw || !nh) return null;
  // chaque dessin a exactement la taille de la case à l'écran (en pixels réels), l'image y est placée
  // comme le ferait le CSS (contain, cover ou fill)
  const cw = Math.max(8, Math.round(bw * dpr)),
    ch = Math.max(8, Math.round(bh * dpr));
  // image qui remplit toute la case (photo de profil…) : on la dessine un peu plus grande que la case, sinon la
  // déformation va chercher des pixels hors de l'image et le fond noir apparaît sur les bords
  const full = fit === 'cover' || fit === 'fill';
  const m = full ? Math.ceil((small ? 1.4 : 3) * dpr) : 0;
  const ow = cw + m * 2,
    oh = ch + m * 2;
  let dw = ow,
    dh = oh;
  if (fit === 'contain' || fit === 'cover' || fit === 'scale-down') {
    const k = (fit === 'cover' ? Math.max : Math.min)(ow / nw, oh / nh);
    dw = nw * k;
    dh = nh * k;
  }
  const src = document.createElement('canvas');
  src.width = ow;
  src.height = oh;
  const sx = src.getContext('2d');
  if (!sx) return null;
  sx.imageSmoothingEnabled = false; // pixel art : agrandi sans flou, comme à l'écran
  sx.drawImage(img, (ow - dw) / 2, (oh - dh) / 2, dw, dh);
  const sheet = document.createElement('canvas');
  sheet.width = cw;
  sheet.height = ch * NOISE.length;
  const x = sheet.getContext('2d');
  if (!x) return null;
  NOISE.forEach((seed, i) => {
    // chaque dessin reste dans sa propre bande de la planche
    x.save();
    x.beginPath();
    x.rect(0, i * ch, cw, ch);
    x.clip();
    x.filter = `url(#${filterId(seed, small, dpr)})`;
    x.drawImage(src, -m, i * ch - m);
    x.restore();
  });
  const blob = await new Promise<Blob | null>((ok) => sheet.toBlob(ok));
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  // décodée à l'avance et gardée en mémoire : jamais d'image vide à l'affichage
  const keep = new Image();
  keep.src = url;
  await keep.decode().catch(() => undefined);
  kept.push(keep);
  return { content: `image-set(url("${url}") ${cw / bw}x)`, h: bh, w: bw };
}
const kept: HTMLImageElement[] = [];

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

const redo = new WeakMap<HTMLImageElement, number>();
const banned = new WeakSet<HTMLImageElement>();
const eligible = (img: HTMLImageElement) =>
  !banned.has(img) &&
  img.classList.contains('px') &&
  !img.classList.contains('still') &&
  !img.matches('.v-gold, .v-celeste, .v-ombre') &&
  !img.src.startsWith('blob:') &&
  // GIF animé : une copie fixe le figerait sur sa 1re image ; il garde le doodle CSS (et son animation)
  !/\.gif(\?|$)/i.test(img.src);

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
      // taille de la case dans la page (sans les agrandissements CSS), et zoom de la page
      const bw = img.clientWidth,
        bh = img.clientHeight;
      if (bw < 4 || bh < 4) continue;
      const zoom = (img as HTMLImageElement & { currentCSSZoom?: number }).currentCSSZoom ?? 1;
      const small = bw * zoom <= 52 || !!img.closest('.mini, .small');
      // l'image peut être agrandie en CSS (dessins 80×80) : on dessine à la taille vraiment affichée
      const sc = parseFloat(getComputedStyle(img).scale) || 1;
      const dpr = Math.min(4, (devicePixelRatio || 1) * zoom * sc);
      const fit = getComputedStyle(img).objectFit;
      const key = `${img.currentSrc || img.src}|${bw}x${bh}|${fit}|${small ? 1 : 0}|${dpr.toFixed(2)}`;
      let p = cache.get(key);
      if (!p) {
        p = render(img, bw, bh, fit, small, dpr).catch(() => null);
        cache.set(key, p);
      }
      const frames = await p;
      if (!frames || !img.isConnected || img.clientWidth !== bw || img.clientHeight !== bh) continue;
      live.set(img, { key, frames });
      show(img, frames);
      img.classList.add('dd-on');
      // laisse respirer la page entre deux jetons
      await new Promise((ok) => setTimeout(ok, 0));
    }
  } finally {
    working = false;
  }
}

let tick = 0;
const show = (img: HTMLImageElement, f: Frames) => {
  img.style.setProperty('content', f.content);
  img.style.setProperty('object-fit', 'none');
  img.style.setProperty('object-position', `0 ${-tick * f.h}px`);
  // la planche est 3 fois plus haute que l'image : on impose les proportions d'UN dessin, sinon une image dont la
  // hauteur s'adapte toute seule triplait de hauteur (puis était recalculée, en boucle : zoom / dézoom et flashs)
  img.style.setProperty('aspect-ratio', `${f.w} / ${f.h}`);
};
const clear = (img: HTMLImageElement) => {
  ['content', 'object-fit', 'object-position', 'aspect-ratio'].forEach((k) => img.style.removeProperty(k));
  img.classList.remove('dd-on');
};
function step() {
  // effets allégés ou patate : on rend les images normales
  if (reducedFx()) {
    for (const img of live.keys()) clear(img);
    live.clear();
    return;
  }
  tick = (tick + 1) % 3;
  for (const [img, st] of live) {
    if (!img.isConnected) {
      live.delete(img);
      continue;
    }
    // l'image a changé (autre jeton, autre taille, variante…) : on la recalcule
    const src = img.currentSrc || img.src;
    const size = `|${img.clientWidth}x${img.clientHeight}|`;
    if (!st.key.startsWith(src + '|') || !st.key.includes(size) || !eligible(img)) {
      live.delete(img);
      clear(img);
      // garde-fou : une image recalculée trop souvent (sa taille bouge sans arrêt) garde le doodle simple
      const n = (redo.get(img) ?? 0) + 1;
      redo.set(img, n);
      if (n > 3) banned.add(img);
      if (eligible(img)) queue.add(img);
      continue;
    }
    if (img.classList.contains('dd-off')) continue; // hors de l'écran : rien à faire
    img.style.setProperty('object-position', `0 ${-tick * st.frames.h}px`);
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
    if (document.visibilityState === 'visible') step();
  }, STEP);
  void pump();
  return () => {
    clearInterval(id);
    mo.disconnect();
    io.disconnect();
  };
}
