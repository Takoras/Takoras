// Taille du site selon l'écran.
// - PC : le site est conçu pour ~1440 px de large ; sur un grand écran il grossit (1920 px → ×1,33, comme un zoom 133 %),
//   jamais plus petit que la taille normale. Échelle posée sur <html> en --z, appliquée à #root (global.css).
// - Téléphone à l'horizontale : même mise en page que sur PC, réduite. La largeur de rendu est choisie pour que
//   la hauteur visible fasse ~640 px (largeur = 640 × largeur/hauteur de l'écran), recalculée quand la taille change.
//   La classe « phone » sert au message « tourne ton téléphone » et au plein écran au premier toucher.
(function () {
  var d = document.documentElement;
  var coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
  var phone = coarse && Math.min(screen.width, screen.height) < 600;

  if (!phone) {
    var last = 0;
    var fitPc = function () {
      var z = Math.round(Math.min(1.6, Math.max(1, innerWidth / 1440)) * 1000) / 1000;
      if (z === last) return;
      last = z;
      d.style.setProperty('--z', String(z));
      d.style.setProperty('--zg', String(z)); // échelle générale (le contenu de chaque page a en plus son propre zoom)
    };
    fitPc();
    addEventListener('resize', fitPc);
    return;
  }

  d.classList.add('phone');
  var H = 640;
  var m = document.querySelector('meta[name="viewport"]');
  var W = 0;
  function fit() {
    if (!m || !innerHeight) return;
    var land = innerWidth > innerHeight;
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
    setTimeout(function () {
      W = 0;
      fit();
      // certains navigateurs ignorent la largeur de rendu en plein écran (tout devient énorme) : on en ressort
      setTimeout(function () {
        if (document.fullscreenElement && innerWidth > innerHeight && innerWidth < 1000) {
          noFs = true;
          document.exitFullscreen().catch(function () {});
        }
      }, 400);
    }, 150);
  });

  // au premier toucher (le navigateur exige un geste) : plein écran, et l'écran reste en paysage
  var noFs = false;
  function go() {
    if (noFs || document.fullscreenElement || !d.requestFullscreen) return;
    if (innerWidth <= innerHeight) return;
    Promise.resolve(d.requestFullscreen({ navigationUI: 'hide' }))
      .then(function () {
        if (screen.orientation && screen.orientation.lock) return screen.orientation.lock('landscape');
      })
      .catch(function () {});
  }
  document.addEventListener('pointerup', go, { passive: true });
})();
