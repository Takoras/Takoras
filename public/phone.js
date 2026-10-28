// Téléphone : le site s'affiche comme sur PC (mêmes fenêtres), juste réduit à la taille de l'écran.
// On rend la page sur 1440 px de large et on fixe nous-mêmes le zoom (largeur de l'écran / 1440) :
// en passant en plein écran, le navigateur recalculait le zoom tout seul et la page devenait énorme.
// La classe « phone » sert au message « tourne ton téléphone ».
(function () {
  var coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
  var small = Math.min(screen.width, screen.height) < 600;
  if (!coarse || !small) return;
  var W = 1440;
  var d = document.documentElement;
  d.classList.add('phone');
  var m = document.querySelector('meta[name="viewport"]');
  function fit() {
    if (!m) return;
    var land = matchMedia('(orientation: landscape)').matches;
    var side = land ? Math.max(screen.width, screen.height) : Math.min(screen.width, screen.height);
    var z = (side / W).toFixed(4);
    var c = 'width=' + W + ', initial-scale=' + z + ', minimum-scale=' + z + ', maximum-scale=' + z + ', user-scalable=no, viewport-fit=cover';
    // même texte qu'avant = le navigateur ne recalcule rien : on change d'abord, puis on remet (force le recalcul)
    m.setAttribute('content', 'width=' + (W + 1) + ', user-scalable=no');
    requestAnimationFrame(function () {
      m.setAttribute('content', c);
    });
  }
  fit();
  addEventListener('orientationchange', function () {
    setTimeout(fit, 200);
  });
  document.addEventListener('fullscreenchange', function () {
    setTimeout(fit, 100);
  });

  // au premier toucher (le navigateur exige un geste) : plein écran, et l'écran reste en paysage
  function go() {
    if (document.fullscreenElement || !d.requestFullscreen) return;
    if (!matchMedia('(orientation: landscape)').matches) return;
    Promise.resolve(d.requestFullscreen({ navigationUI: 'hide' }))
      .then(function () {
        fit();
        if (screen.orientation && screen.orientation.lock) return screen.orientation.lock('landscape');
      })
      .catch(function () {});
  }
  document.addEventListener('pointerup', go, { passive: true });
})();
