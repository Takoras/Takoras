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
