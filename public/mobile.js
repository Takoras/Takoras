// Téléphone : barre d'onglets en bas (Accueil, Inventaire, Boutique, Amis, Plus) + menu « Plus ».
// Les boutons du menu réutilisent ceux de la barre du haut (paramètres, son, annonces, admin) : rien n'est dupliqué.

(function () {
  const ico = {
    home: '<path d="M3 11 12 3l9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
    inv: '<rect x="4" y="7" width="16" height="13" rx="3"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/><path d="M4 12h16"/>',
    shop: '<path d="M4 9h16l-1.5 11h-13z"/><path d="M8 9a4 4 0 0 1 8 0"/>',
    friends: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17.5" cy="9" r="2.5"/><path d="M17 14.5a5 5 0 0 1 4.5 5"/>',
    more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
    board: '<path d="M8 21V11M16 21V7M12 21V3M4 21v-6M20 21v-9"/>',
    combat: '<path d="m14.5 17.5 6-6V4h-7.5l-6 6"/><path d="m13 19 6-6M3 21l5-5M9.5 14.5l-4 4"/>',
    profile: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
    sound: '<path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    flask: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/><path d="M7.5 15h9"/>',
    idea: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
    scroll: '<path d="M8 3h11v15a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-2h11v2a3 3 0 0 0 3 3"/><path d="M8 3a3 3 0 0 0-3 3v10M11 8h5M11 12h5"/>',
  };
  const svg = k => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ico[k]}</svg>`;

  const bar = document.createElement('nav');
  bar.className = 'tabbar'; bar.id = 'tabbar';
  bar.innerHTML = [['home', '#', 'nav_home'], ['inv', '#inventaire', 'nav_inv'], ['shop', '#boutique', 'nav_shop'], ['friends', '#amis', 'nav_friends']]
    .map(([k, h, l]) => `<a href="${h}" data-page="${k}">${svg(k)}<span data-i18n="${l}">${t(l)}</span>${k === 'friends' ? '<i class="nbadge" id="tb-fr" hidden></i>' : ''}</a>`).join('')
    + `<button id="tb-more" data-page="more">${svg('more')}<span data-i18n="more">${t('more')}</span><i class="nbadge" id="tb-more-b" hidden></i></button>`;
  document.body.appendChild(bar);

  const sheet = document.createElement('div');
  sheet.className = 'sheet'; sheet.id = 'more-sheet'; sheet.hidden = true;
  document.body.appendChild(sheet);
  const tile = (id, k, label, extra = '') => `<button class="sh-tile" data-go="${id}">${svg(k)}<span>${label}</span>${extra}</button>`;
  function drawSheet() {
    const admin = !$('open-admin').hidden, bellN = $('bell-badge').hidden ? '' : `<i class="nbadge">${$('bell-badge').textContent}</i>`;
    sheet.innerHTML = `<div class="sh-card"><div class="sh-grab"></div>
      <div class="sh-grid">
        ${tile('board', 'board', t('nav_board'))}
        ${ACC.user ? tile('profile', 'profile', t('my_profile')) : ''}
        ${admin ? tile('combat', 'combat', t('nav_combat')) : ''}
        ${ACC.tester ? tile('tester', 'flask', t('tester_menu')) : ''}
        ${tile('feedback', 'idea', t('fb_btn'))}
        ${tile('patch', 'scroll', t('pn_title'))}
        ${tile('notifs', 'bell', t('ann_hist'), bellN)}
        ${tile('settings', 'gear', t('settings'))}
        ${tile('mute', 'sound', sfx.muted ? t('unmute') : t('mute'))}
        ${admin ? tile('admin', 'shield', 'Admin') : ''}
      </div></div>`;
  }
  const open = () => { drawSheet(); sheet.hidden = false; requestAnimationFrame(() => sheet.classList.add('on')); sfx.click(); };
  const close = () => { sheet.classList.remove('on'); setTimeout(() => { sheet.hidden = true; }, 280); };
  $('tb-more').addEventListener('click', () => (sheet.hidden ? open() : close()));
  sheet.addEventListener('click', e => {
    const b = e.target.closest('[data-go]');
    if (!b) { if (!e.target.closest('.sh-card')) close(); return; }
    const go = b.dataset.go;
    close();
    if (go === 'board') location.hash = '#classement';
    if (go === 'profile') location.hash = '#profil';
    if (go === 'combat') location.hash = '#combat';
    if (go === 'notifs') $('open-notifs').click();
    if (go === 'tester') openTester();
    if (go === 'patch') openPatchnotes();
    if (go === 'feedback') openFeedback();
    if (go === 'settings') $('open-settings').click();
    if (go === 'mute') $('mute').click();
    if (go === 'admin') $('open-admin').click();
  });

  // Pastilles : on recopie celles de la barre du haut (amis, annonces)
  const mirror = (from, to) => {
    const sync = () => { const a = $(from), b = $(to); b.hidden = a.hidden; b.textContent = a.textContent; };
    new MutationObserver(sync).observe($(from), { attributes: true, childList: true, characterData: true, subtree: true });
    sync();
  };
  mirror('fr-badge', 'tb-fr');
  mirror('bell-badge', 'tb-more-b');
  dispatchEvent(new Event('resize')); // allume le bon onglet tout de suite
})();
