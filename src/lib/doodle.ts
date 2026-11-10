// Le doodle (filtres SVG #dd0..#dd2 dans index.html) ne s'appliquait parfois pas du tout au chargement d'une page
// (une fois sur deux, réglé par un rechargement). On « relance » les filtres : on remplace le bloc SVG par sa copie
// (le navigateur les relit) et on redémarre les animations des images pixel art.
export function kickDoodle() {
  const svg = (document.getElementById('dd0') as SVGElement | null)?.ownerSVGElement;
  if (svg) svg.replaceWith(svg.cloneNode(true));
  const h = document.documentElement;
  // on coupe et on relance les animations dans le même instant (forcer le calcul entre les deux suffit à les redémarrer)
  h.classList.add('dd-kick');
  void document.body.offsetWidth;
  h.classList.remove('dd-kick');
}

// en revenant sur l'onglet (le navigateur a pu mettre la page en veille) : on relance aussi
if (typeof document !== 'undefined')
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') setTimeout(kickDoodle, 100);
  });

// Le doodle ne tourne que sur les images VISIBLES à l'écran : une image hors de l'écran (plus bas dans la page, au bout
// d'une piste qui défile…) met son animation en pause. Chaque pas du doodle redessine l'image avec un filtre SVG,
// c'est ce qui coûte le plus cher à la carte graphique ; en pause, l'image ne coûte plus rien.
export function installDoodleVisibility() {
  if (typeof IntersectionObserver === 'undefined') return () => undefined;
  const io = new IntersectionObserver(
    (es) => es.forEach((e) => e.target.classList.toggle('dd-off', !e.isIntersecting)),
    { rootMargin: '80px' },
  );
  const seen = new WeakSet<Element>();
  const scan = (root: ParentNode) =>
    root.querySelectorAll('img.px').forEach((img) => {
      if (seen.has(img)) return;
      seen.add(img);
      io.observe(img);
    });
  scan(document);
  let pending = 0;
  const mo = new MutationObserver(() => {
    if (pending) return;
    pending = requestAnimationFrame(() => {
      pending = 0;
      scan(document);
    });
  });
  mo.observe(document.body, { childList: true, subtree: true });
  return () => {
    mo.disconnect();
    io.disconnect();
  };
}

// Le doodle coûtait cher parce que chaque filtre recalculait un bruit (feTurbulence) pixel par pixel, pour CHAQUE image,
// à chaque pas de l'animation. On calcule ce bruit UNE fois au démarrage (une petite tuile de 128 px qui se raccorde
// sans couture), puis les filtres la répètent (feImage + feTile) : même rendu, presque plus aucun calcul.
const TILE = 128;
export function optimizeDoodleFilters() {
  if (typeof document === 'undefined') return;
  const ns = 'http://www.w3.org/2000/svg';
  const jobs = [...document.querySelectorAll<SVGFilterElement>('filter[id^="dd"], filter[id^="ds"]')].map(async (f) => {
    const tu = f.querySelector('feTurbulence');
    const dm = f.querySelector('feDisplacementMap');
    if (!tu || !dm) return;
    const attrs = ['type', 'baseFrequency', 'numOctaves', 'seed']
      .map((a) => (tu.getAttribute(a) != null ? `${a}="${tu.getAttribute(a)}"` : ''))
      .join(' ');
    const svg = `<svg xmlns="${ns}" width="${TILE}" height="${TILE}"><filter id="n" x="0" y="0" width="100%" height="100%" filterUnits="userSpaceOnUse"><feTurbulence ${attrs} stitchTiles="stitch"/></filter><rect width="${TILE}" height="${TILE}" filter="url(#n)"/></svg>`;
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    await img.decode();
    const cv = document.createElement('canvas');
    cv.width = cv.height = TILE;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img, 0, 0);
    const url = cv.toDataURL('image/png');
    // le bloc SVG a pu être remplacé entre-temps (kickDoodle le recopie) : on modifie le filtre actuellement en place
    const live = document.getElementById(f.id);
    const tu2 = live?.querySelector('feTurbulence');
    const dm2 = live?.querySelector('feDisplacementMap');
    if (!tu2 || !dm2) return;
    const fe = document.createElementNS(ns, 'feImage');
    fe.setAttribute('href', url);
    fe.setAttribute('x', '0');
    fe.setAttribute('y', '0');
    fe.setAttribute('width', String(TILE));
    fe.setAttribute('height', String(TILE));
    fe.setAttribute('preserveAspectRatio', 'none');
    fe.setAttribute('result', 'nt');
    const tile = document.createElementNS(ns, 'feTile');
    tile.setAttribute('in', 'nt');
    tile.setAttribute('result', 'noise');
    tu2.replaceWith(fe, tile);
    dm2.setAttribute('in2', 'noise');
  });
  void Promise.all(jobs)
    .then(() => kickDoodle())
    .catch(() => undefined); // en cas de souci, les filtres d'origine restent en place
}
