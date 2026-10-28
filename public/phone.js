// Téléphone : le site s'affiche comme sur PC (mêmes fenêtres), juste réduit à la taille de l'écran.
// On rend la page sur 1440 px de large et le navigateur la réduit ; la classe « phone » sert au message « tourne ton téléphone ».
(function () {
  var coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
  var small = Math.min(screen.width, screen.height) < 600;
  if (!coarse || !small) return;
  document.documentElement.classList.add('phone');
  var m = document.querySelector('meta[name="viewport"]');
  if (m) m.setAttribute('content', 'width=1440, user-scalable=no, viewport-fit=cover'); // 1440 : un peu dézoomé ; pas de pincer (le site ne bouge plus)
})();

