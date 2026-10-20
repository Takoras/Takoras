// Tuto de première visite : quelques écrans qui expliquent tout le site (pulls, rareté, variantes, inventaire, boutique,
// quêtes, amis…). S'affiche une seule fois, et se revoit depuis le menu Plus / les paramètres.

const TUTO_KEY = 'takoras-tuto-done';
const TUTO = {
  fr: [
    ['img/jetons/takoras.png', 'Bienvenue sur Takoras !', 'Un jeu de collection de jetons en pixel art. Ouvre des pulls, découvre des jetons de plus en plus rares, et complète ta collection.'],
    ['⏳', 'Tes pulls', 'Tu gagnes <b>1 pull toutes les 3 minutes</b>, même quand tu n’es pas là. Ton stock se remplit tout seul : reviens l’ouvrir. Tu peux agrandir ton stock et accélérer la recharge avec des pièces, sur l’accueil.'],
    ['img/jetons/serie-takoras/lumis.png', 'La rareté', 'Chaque jeton a sa rareté : <b>Mobu sort 1 fois sur 2</b>, <b>Takoras 1 fois sur 1 000 000</b>. Pendant l’ouverture, touche le jeton : le compteur monte… plus il monte, plus c’est rare ! À partir de 1/1 000, chaque jeton a sa cinématique.'],
    ['✨', 'Les variantes', 'En plus, n’importe quel jeton peut sortir <b>Doré</b> (1/20), <b>Céleste</b> (1/200) ou <b>Ombre</b> (1/500). Elles valent bien plus cher à la revente.'],
    ['⏩', 'Ouvrir vite', '« <b>Tout ouvrir d’un coup</b> » ouvre tes pulls à toute vitesse et s’arrête tout seul sur les beaux tirages (réglable sous les pulls). « Retour au menu » remet les pulls pas ouverts dans ton stock.'],
    ['📖', 'Ton inventaire', 'Le <b>Bestiaire</b> montre tous les jetons du jeu : ceux que tu as en couleur, les autres en silhouette. C’est là que tu <b>vends</b> tes doublons contre des pièces. L’onglet <b>Objets</b> garde tes potions et sabliers.'],
    ['🧪', 'La boutique', 'Avec tes pièces : <b>potions de chance</b> (pour tirer plus rare), sabliers (recharge plus rapide), photos de profil… Le stock change toutes les 5 h. En bas : les <b>codes promo</b>.'],
    ['🎁', 'Chaque jour', 'Récupère ton <b>bonus du jour</b> (il augmente si tu reviens plusieurs jours de suite) et fais tes <b>3 quêtes</b> pour gagner pièces et objets.'],
    ['👥', 'Tes amis', 'Ajoute tes amis avec leur pseudo, discute avec eux, et montre ta collection sur ton <b>profil</b>. Le bandeau <b>En direct</b> montre les beaux tirages de tout le monde.'],
    ['💡', 'C’est parti !', 'Le site est en bêta : un bug, une idée ? Le bouton « <b>Donner un avis</b> » est là pour ça (menu Plus sur téléphone). Bonne chance pour ton premier Takoras !'],
  ],
  en: [
    ['img/jetons/takoras.png', 'Welcome to Takoras!', 'A pixel-art token collecting game. Open pulls, discover rarer and rarer tokens, and complete your collection.'],
    ['⏳', 'Your pulls', 'You get <b>1 pull every 3 minutes</b>, even when you’re away. Your stock fills up by itself: come back to open it. You can grow your stock and speed up the recharge with coins, on the home page.'],
    ['img/jetons/serie-takoras/lumis.png', 'Rarity', 'Every token has a rarity: <b>Mobu drops 1 in 2</b>, <b>Takoras 1 in 1,000,000</b>. While opening, tap the token: the counter goes up… the higher it goes, the rarer it is! From 1/1,000, every token has its own cinematic.'],
    ['✨', 'Variants', 'On top of that, any token can drop <b>Golden</b> (1/20), <b>Celestial</b> (1/200) or <b>Shadow</b> (1/500). They sell for much more.'],
    ['⏩', 'Open fast', '“<b>Open all at once</b>” opens your pulls at full speed and stops by itself on good pulls (settings below the pulls). “Back to menu” puts unopened pulls back in your stock.'],
    ['📖', 'Your inventory', 'The <b>Bestiary</b> shows every token in the game: the ones you own in color, the others as silhouettes. That’s where you <b>sell</b> duplicates for coins. The <b>Items</b> tab keeps your potions and hourglasses.'],
    ['🧪', 'The shop', 'With your coins: <b>luck potions</b> (to pull rarer), hourglasses (faster recharge), profile pictures… The stock changes every 5 h. At the bottom: <b>promo codes</b>.'],
    ['🎁', 'Every day', 'Claim your <b>daily bonus</b> (it grows if you come back several days in a row) and do your <b>3 quests</b> to earn coins and items.'],
    ['👥', 'Your friends', 'Add friends by their username, chat with them, and show off your collection on your <b>profile</b>. The <b>Live</b> ribbon shows everyone’s good pulls.'],
    ['💡', 'Let’s go!', 'The site is in beta: a bug, an idea? The “<b>Give feedback</b>” button is there for that (More menu on phone). Good luck with your first Takoras!'],
  ],
};

function openTuto() {
  document.querySelectorAll('.tuto-box').forEach(x => x.remove());
  const steps = TUTO[SETTINGS.lang] || TUTO.fr;
  let i = 0;
  const o = document.createElement('div');
  o.className = 'askbox tuto-box';
  const draw = (dir = 0) => {
    const [ico, title, text] = steps[i], last = i === steps.length - 1;
    o.innerHTML = `<div class="ask-card tuto-card">
      <button class="fb-x" data-skip aria-label="${t('close')}">✕</button>
      <div class="tuto-ico">${ico.startsWith('img/') ? `<img src="${ico}" alt="">` : `<span>${ico}</span>`}</div>
      <h3>${title}</h3>
      <p>${text}</p>
      <div class="tuto-dots">${steps.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>
      <div class="ask-btns">
        ${i ? `<button class="btn ghost" data-prev>‹ ${t('tuto_prev')}</button>` : `<button class="btn ghost" data-skip>${t('tuto_skip')}</button>`}
        <button class="btn primary" data-next>${last ? t('tuto_go') : t('tuto_next') + ' ›'}</button>
      </div>
    </div>`;
    if (dir && !reducedFx()) o.querySelector('.tuto-card').animate([{ opacity: .3, transform: `translateX(${dir * 26}px)` }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.2, .9, .3, 1)' });
  };
  const close = () => { try { localStorage.setItem(TUTO_KEY, '1'); } catch {} o.classList.remove('on'); setTimeout(() => o.remove(), 200); };
  draw();
  document.body.appendChild(o);
  requestAnimationFrame(() => o.classList.add('on'));
  o.addEventListener('click', e => {
    if (e.target.closest('[data-skip]')) return close();
    if (e.target.closest('[data-prev]')) { i--; sfx.click(); return draw(-1); }
    if (e.target.closest('[data-next]')) { if (i === steps.length - 1) { sfx.upgrade(); return close(); } i++; sfx.click(); return draw(1); }
  });
  // glisser à gauche / à droite sur téléphone
  let x0 = null;
  o.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
  o.addEventListener('touchend', e => {
    if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null;
    if (dx < -50 && i < steps.length - 1) { i++; draw(1); } else if (dx > 50 && i > 0) { i--; draw(-1); }
  });
}

// Première visite : on l'affiche une fois que l'écran de chargement est parti
(function () {
  let done = false; try { done = localStorage.getItem(TUTO_KEY) === '1'; } catch {}
  if (done) return;
  // les anciens joueurs (déjà un historique ou des réglages) ne le voient pas d'office
  try { if (localStorage.getItem('takoras-pn-seen') || localStorage.getItem('takoras-hist')) { localStorage.setItem(TUTO_KEY, '1'); return; } } catch {}
  addEventListener('load', () => setTimeout(function show() {
    if (document.getElementById('loader') || document.querySelector('.askbox') || document.documentElement.classList.contains('lock')) return setTimeout(show, 800);
    openTuto();
  }, 1200));
})();
