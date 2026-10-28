// Téléphone : le site s'affiche exactement comme sur PC (même mise en page), juste réduit à l'écran.
// On choisit la largeur de rendu pour que la hauteur visible fasse toujours ~640 px (comme un petit écran de PC) :
// largeur = 640 × (largeur / hauteur de l'écran visible). Recalculé quand la taille change (plein écran, barre du navigateur).
// La classe « phone » sert au message « tourne ton téléphone ».
(function () {
  var coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
  var small = Math.min(screen.width, screen.height) < 600;
  if (!coarse || !small) return;
  var H = 640;
  var d = document.documentElement;
  d.classList.add('phone');
  var m = document.querySelector('meta[name="viewport"]');
  var W = 0;
  function fit() {
    if (!m || !innerHeight) return;
    var land = innerWidth > innerHeight;
    // debout : on garde une page large (de toute façon on demande de tourner le téléphone)
    var w = land ? Math.round((H * innerWidth) / innerHeight) : 1280;
    w = Math.max(1100, Math.min(2200, w));
    if (Math.abs(w - W) < 24) return; // pas de petits changements en boucle
    W = w;
    m.setAttribute('content', 'width=' + W + ', user-scalable=no, viewport-fit=cover');
  }
  fit();
  addEventListener('resize', fit);
  addEventListener('orientationchange', function () {
    setTimeout(fit, 250);
  });
  document.addEventListener('fullscreenchange', function () {
    setTimeout(fit, 150);
  });

  // au premier toucher (le navigateur exige un geste) : plein écran, et l'écran reste en paysage
  function go() {
    if (document.fullscreenElement || !d.requestFullscreen) return;
    if (innerWidth <= innerHeight) return;
    Promise.resolve(d.requestFullscreen({ navigationUI: 'hide' }))
      .then(function () {
        if (screen.orientation && screen.orientation.lock) return screen.orientation.lock('landscape');
      })
      .catch(function () {});
  }
  document.addEventListener('pointerup', go, { passive: true });
})();
