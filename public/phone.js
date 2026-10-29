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
  // Sur téléphone, une petite carte propose d'installer Takoras (raccourci sur l'écran d'accueil : plein écran, en paysage).
  // Android : le bouton « Installer » ouvre directement l'installation. iPhone : Apple ne le permet pas à un site,
  // le bouton montre alors les 2 étapes (Partager → Sur l'écran d'accueil).
  var installEvt = null;
  addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    installEvt = e;
  });
  function gate() {
    if (standalone) return;
    try {
      if (sessionStorage.getItem('takoras-gate-skip')) return;
    } catch (e) {}
    var ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var g = document.createElement('div');
    g.id = 'gate';
    g.setAttribute('role', 'dialog');
    g.setAttribute('aria-label', 'Installer Takoras');
    g.innerHTML =
      '<img src="/img/logo.png" alt="">' +
      '<div><b>Installe l’appli Takoras</b><small>Plus fluide et mieux optimisée, en plein écran. Gratuit, 2 secondes.</small></div>' +
      '<button id="gate-install">Installer</button>' +
      '<button id="gate-x" aria-label="Plus tard">✕</button>' +
      '<p id="gate-steps" hidden>' +
      (ios
        ? 'Touche <b>Partager</b> (le carré avec une flèche) puis <b>« Sur l’écran d’accueil »</b>.'
        : 'Ouvre le menu <b>⋮</b> du navigateur puis <b>« Installer l’application »</b>.') +
      '</p>';
    var css = document.createElement('style');
    css.textContent =
      '#gate{position:fixed;left:50%;bottom:3vmin;transform:translateX(-50%);z-index:10000;display:grid;grid-template-columns:auto 1fr auto auto;align-items:center;gap:2.2vmin;' +
      'width:min(92vw,120vmin);padding:2.2vmin 2.6vmin;border-radius:3vmin;background:#1b1530;border:.4vmin solid #3b2a5c;box-shadow:0 2vmin 6vmin rgba(0,0,0,.55);' +
      'color:#f2f2f5;font-family:system-ui,-apple-system,sans-serif;animation:gateIn .5s cubic-bezier(.2,1.2,.4,1) both}' +
      '@keyframes gateIn{from{opacity:0;transform:translate(-50%,4vmin)}}' +
      '#gate img{width:9vmin;height:9vmin;image-rendering:pixelated;border-radius:2vmin}' +
      '#gate div{display:grid;gap:.6vmin;text-align:left}#gate b{font-size:3.6vmin}#gate small{font-size:2.6vmin;color:#b9b4cf}' +
      '#gate-install{font:inherit;font-size:3.4vmin;font-weight:800;padding:1.6vmin 4.4vmin;border:0;border-radius:2vmin;background:#7d48d9;color:#fff;box-shadow:0 .8vmin 0 #4c1d95}' +
      '#gate-x{font:inherit;font-size:3vmin;width:7vmin;height:7vmin;border:0;border-radius:50%;background:rgba(255,255,255,.08);color:#b9b4cf}' +
      '#gate p{grid-column:1/-1;margin:0;font-size:3vmin;color:#f2f2f5;text-align:center}';
    document.head.appendChild(css);
    document.body.appendChild(g);
    document.getElementById('gate-install').onclick = function () {
      if (installEvt) {
        installEvt.prompt();
        installEvt.userChoice.then(function (r) {
          if (r && r.outcome === 'accepted') g.querySelector('small').textContent = 'C’est installé ! Ouvre Takoras depuis son icône.';
        });
        return;
      }
      document.getElementById('gate-steps').hidden = false; // iPhone (ou navigateur sans bouton) : les 2 étapes
    };
    document.getElementById('gate-x').onclick = function () {
      try {
        sessionStorage.setItem('takoras-gate-skip', '1');
      } catch (er) {}
      g.remove();
    };
  }
  if (document.body) gate();
  else document.addEventListener('DOMContentLoaded', gate);
  function go() {
    if (standalone || noFs || document.fullscreenElement) return;
    if (innerWidth <= innerHeight) return;
    if (!d.requestFullscreen) return;
    Promise.resolve(d.requestFullscreen({ navigationUI: 'hide' }))
      .then(function () {
        if (screen.orientation && screen.orientation.lock) return screen.orientation.lock('landscape');
      })
      .catch(function () {});
  }
  document.addEventListener('pointerup', go, { passive: true });
})();
