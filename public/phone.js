// Téléphone : le site s'affiche comme sur PC (mêmes fenêtres), juste réduit à la taille de l'écran.
// On rend la page sur 1280 px de large et le navigateur la réduit ; la classe « phone » sert au message « tourne ton téléphone ».
(function () {
  var coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
  var small = Math.min(screen.width, screen.height) < 600;
  if (!coarse || !small) return;
  document.documentElement.classList.add('phone');
  var m = document.querySelector('meta[name="viewport"]');
  if (m) m.setAttribute('content', 'width=1280, viewport-fit=cover');
})();

// Téléphone tourné : au premier toucher, plein écran + écran bloqué en paysage (le navigateur exige un geste du joueur)
(function () {
  if (!document.documentElement.classList.contains('phone')) return;
  function go() {
    var d = document.documentElement;
    var landscape = Math.abs(window.orientation || 0) === 90 || (screen.orientation && /landscape/.test(screen.orientation.type));
    if (!landscape || document.fullscreenElement) return;
    var p = d.requestFullscreen ? d.requestFullscreen({ navigationUI: 'hide' }) : null;
    Promise.resolve(p)
      .then(function () {
        if (screen.orientation && screen.orientation.lock) return screen.orientation.lock('landscape');
      })
      .catch(function () {});
  }
  document.addEventListener('pointerup', go, { passive: true });
})();
