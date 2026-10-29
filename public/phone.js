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
      // certains navigateurs ignorent la largeur de rendu en plein écran (tout devient énorme) : on réessaie,
      // et seulement si ça reste énorme, on en ressort
      setTimeout(function () {
        if (!document.fullscreenElement) return;
        W = 0;
        fit();
        setTimeout(function () {
          if (document.fullscreenElement && innerWidth > innerHeight && innerWidth < 1000) {
            noFs = true;
            document.exitFullscreen().catch(function () {});
            hint();
          }
        }, 900);
      }, 400);
    }, 150);
  });

  // au premier toucher (le navigateur exige un geste) : plein écran, et l'écran reste en paysage
  var noFs = false;
  var standalone =
    (window.matchMedia && matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches) ||
    navigator.standalone === true;
  // pas de plein écran possible ici (iPhone, ou navigateur qui le refuse) : on explique comment l'avoir, une seule fois
  function hint() {
    if (standalone) return;
    try {
      if (localStorage.getItem('takoras-fs-hint')) return;
      localStorage.setItem('takoras-fs-hint', '1');
    } catch (e) {
      return;
    }
    var ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
    var b = document.createElement('div');
    b.className = 'fs-hint';
    b.setAttribute('role', 'status');
    b.textContent = ios
      ? 'Plein écran : touche Partager puis « Sur l’écran d’accueil », et ouvre Takoras depuis l’icône.'
      : 'Plein écran : menu ⋮ du navigateur puis « Ajouter à l’écran d’accueil », et ouvre Takoras depuis l’icône.';
    b.style.cssText =
      'position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:9999;max-width:90vw;padding:12px 18px;border-radius:14px;background:#2a1d4a;color:#fff;font:600 15px/1.35 system-ui,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.5);text-align:center';
    b.onclick = function () {
      b.remove();
    };
    document.body.appendChild(b);
    setTimeout(function () {
      b.remove();
    }, 9000);
  }
  function go() {
    if (standalone || noFs || document.fullscreenElement) return;
    if (innerWidth <= innerHeight) return;
    if (!d.requestFullscreen) return hint();
    Promise.resolve(d.requestFullscreen({ navigationUI: 'hide' }))
      .then(function () {
        if (screen.orientation && screen.orientation.lock) return screen.orientation.lock('landscape');
      })
      .catch(function () {
        hint();
      });
  }
  document.addEventListener('pointerup', go, { passive: true });
})();
