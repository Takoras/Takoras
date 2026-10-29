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
  // Sur téléphone, Takoras se joue depuis son raccourci (écran d'accueil) : plein écran, en paysage, sans barre.
  // Dans le navigateur, un écran explique comment l'installer (bouton « Installer » quand le navigateur le permet).
  var installEvt = null;
  addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    installEvt = e;
    var b = document.getElementById('gate-install');
    if (b) b.hidden = false;
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
      '<img src="/img/logo-takoras.png?v=2" alt="Takoras">' +
      '<h1>Installe Takoras sur ton téléphone</h1>' +
      '<p>Takoras se joue depuis son icône : en plein écran, en paysage, sans la barre du navigateur.</p>' +
      '<button id="gate-install" hidden>Installer</button>' +
      '<ol>' +
      (ios
        ? '<li>Touche <b>Partager</b> (le carré avec une flèche)</li><li>Choisis <b>« Sur l’écran d’accueil »</b></li>'
        : '<li>Ouvre le menu <b>⋮</b> du navigateur</li><li>Choisis <b>« Installer l’application »</b> ou <b>« Ajouter à l’écran d’accueil »</b></li>') +
      '<li>Ouvre <b>Takoras</b> depuis l’icône sur ton écran d’accueil</li></ol>' +
      '<a href="#" id="gate-skip">Continuer dans le navigateur</a>';
    var css = document.createElement('style');
    css.textContent =
      '#gate{position:fixed;inset:0;z-index:10000;display:grid;place-content:center;justify-items:center;gap:2.4vmin;padding:4vmin;text-align:center;' +
      'background:radial-gradient(circle at 50% 35%,#1d3fae55,transparent 60%),#0d0d12;color:#f2f2f5;font-family:system-ui,-apple-system,sans-serif}' +
      '#gate img{height:16vmin;width:auto;image-rendering:pixelated;filter:drop-shadow(0 0 3vmin #3cc8ea66)}' +
      '#gate h1{margin:0;font-size:6.5vmin;line-height:1.1}#gate p{margin:0;max-width:70ch;font-size:3.6vmin;color:#b9b4cf}' +
      '#gate ol{margin:0;padding:0;list-style:none;counter-reset:s;display:grid;gap:1.6vmin;font-size:3.8vmin;text-align:left}' +
      '#gate li{counter-increment:s;display:flex;gap:2vmin;align-items:center}#gate li::before{content:counter(s);display:grid;place-items:center;' +
      'flex:none;width:6vmin;height:6vmin;border-radius:50%;background:#7d48d9;font-weight:800}' +
      '#gate button{font:inherit;font-size:4.6vmin;font-weight:800;padding:2vmin 7vmin;border:0;border-radius:2vmin;background:#7d48d9;color:#fff;box-shadow:0 1vmin 0 #4c1d95}' +
      '#gate a{font-size:2.8vmin;color:#8f8aa8}';
    document.head.appendChild(css);
    document.body.appendChild(g);
    var inst = document.getElementById('gate-install');
    if (installEvt) inst.hidden = false;
    inst.onclick = function () {
      if (!installEvt) return;
      installEvt.prompt();
      installEvt.userChoice.then(function (r) {
        if (r && r.outcome === 'accepted') {
          inst.hidden = true;
          g.querySelector('p').textContent = 'C’est installé ! Ouvre Takoras depuis l’icône sur ton écran d’accueil.';
        }
      });
    };
    document.getElementById('gate-skip').onclick = function (e) {
      e.preventDefault();
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
