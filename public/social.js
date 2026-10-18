// Annonces de l'admin (plein écran en direct, bandeau en haut, historique avec les annonces ratées)
// + amis (demandes à accepter) et chat privé en direct, fenêtre en bas à droite.

const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const timeOf = d => new Date(d).toLocaleTimeString(LOCALE(), { hour: '2-digit', minute: '2-digit' });
const dateOf = d => new Date(d).toLocaleString(LOCALE(), { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

// =====================================================================
// Annonces
// =====================================================================
const ANN = { list: [], seen: lsGet('takoras-ann-seen', null), closed: lsGet('takoras-ann-closed', 0) };

async function loadAnnouncements() {
  const { data } = await sb.from('announcements').select('*').order('id', { ascending: false }).limit(30);
  ANN.list = data || [];
  const top = ANN.list[0]?.id || 0;
  // Premier passage sur le site : on ne montre que les annonces des 3 derniers jours
  if (ANN.seen === null) ANN.seen = (ANN.list.find(a => Date.now() - Date.parse(a.created_at) > 3 * 864e5)?.id) || 0;
  const missed = ANN.list.filter(a => a.id > ANN.seen);
  renderAnnBar(); renderBell();
  if (missed.length) showAnnFull(missed[0], missed.slice(1));
  else ANN.seen = top, lsSet('takoras-ann-seen', top);
}

// Bandeau en haut du site : la dernière annonce « bandeau », jusqu'à ce qu'on la ferme
function renderAnnBar() {
  const a = ANN.list.find(x => x.banner), bar = $('ann-bar');
  if (!a || a.id <= ANN.closed) { bar.hidden = true; return; }
  bar.hidden = false;
  bar.innerHTML = `<div class="wrap ann-in"><span class="ann-ico">📢</span><p>${esc(a.body)}</p><small class="muted">${a.author ? esc(a.author) + ' · ' : ''}${dateOf(a.created_at)}</small><button class="ann-x" aria-label="${t('close')}">✕</button></div>`;
  bar.querySelector('.ann-x').onclick = () => { ANN.closed = a.id; lsSet('takoras-ann-closed', a.id); sfx.click(); bar.classList.add('out'); setTimeout(() => { bar.classList.remove('out'); renderAnnBar(); }, 250); };
}

// Cloche : nombre d'annonces pas encore lues
function renderBell() {
  const n = ANN.list.filter(a => a.id > ANN.seen).length, b = $('bell-badge');
  b.hidden = !n; b.textContent = n > 9 ? '9+' : n;
}
function markAnnSeen() {
  ANN.seen = Math.max(ANN.seen || 0, ANN.list[0]?.id || 0);
  lsSet('takoras-ann-seen', ANN.seen); renderBell();
}

// Message en plein écran, avec son. « more » = les autres annonces ratées pendant l'absence
function showAnnFull(a, more = []) {
  const o = $('ann-full');
  o.innerHTML = `
    <div class="annf-card">
      <div class="annf-tag">📢 ${t('ann_title')}</div>
      <p class="annf-body">${esc(a.body)}</p>
      <small class="muted">${a.author ? esc(a.author) + ' · ' : ''}${dateOf(a.created_at)}</small>
      ${more.length ? `<div class="annf-more"><b>${t('ann_missed', { n: more.length })}</b>${more.slice(0, 5).map(m => `<div><p>${esc(m.body)}</p><small class="muted">${dateOf(m.created_at)}</small></div>`).join('')}</div>` : ''}
      <button class="btn primary" id="annf-ok">${t('ann_ok')}</button>
    </div>`;
  o.hidden = false;
  requestAnimationFrame(() => o.classList.add('on'));
  sfx.announce();
  $('annf-ok').onclick = () => { sfx.click(); o.classList.remove('on'); setTimeout(() => { o.hidden = true; }, 300); markAnnSeen(); };
}

// Historique (bouton cloche)
function openAnnHistory() {
  const card = $('jm-card');
  jm.style.setProperty('--g', '249, 115, 22');
  card.onclick = card.oninput = card.onchange = null;
  card.innerHTML = `
    <button class="set-close jm-close" aria-label="${t('close')}">✕</button>
    <div class="ann-hist">
      <h2>📢 ${t('ann_hist')}</h2>
      ${ANN.list.map(a => `<div class="ah${a.id > ANN.seen ? ' new' : ''}"><p>${esc(a.body)}</p><small class="muted">${a.author ? esc(a.author) + ' · ' : ''}${dateOf(a.created_at)}${a.id > ANN.seen ? ` · <b>${t('new')}</b>` : ''}</small></div>`).join('') || `<p class="muted">${t('ann_none')}</p>`}
    </div>`;
  jm.classList.add('on');
  markAnnSeen();
}
$('open-notifs').addEventListener('click', () => { sfx.click(); openAnnHistory(); });

// En direct : nouvelle annonce = plein écran + bandeau ; annonce supprimée = elle disparaît
sb.channel('annonces')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements' }, ({ new: a }) => {
    ANN.list.unshift(a);
    renderAnnBar(); renderBell();
    if (a.fullscreen) showAnnFull(a);
    else { sfx.message(); toast('📢 ' + esc(a.body)); }
  })
  .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'announcements' }, ({ old }) => {
    ANN.list = ANN.list.filter(x => x.id !== old.id); renderAnnBar(); renderBell();
  })
  .subscribe();
loadAnnouncements();

// Prix changé par l'admin (seulement pour la boutique actuelle) : notif chez tout le monde, clic = boutique
sb.channel('prix')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'price_changes' }, async ({ new: c }) => {
    const { data } = await sb.rpc('shop_today');
    const it = data?.items?.find(x => x.id === c.item);
    if (!$('page-shop').hidden) renderShop();
    if (!it) return;
    sfx.message();
    const down = c.new_price < c.old_price, n = document.createElement('button');
    n.className = 'chat-notif price-notif' + (down ? ' down' : ' up');
    n.innerHTML = `<div class="pn-ic">${itemIcon(it)}</div><div><b>💰 ${t(down ? 'price_down' : 'price_up')}</b><p>${esc(itemText(it)[0])} : <s>${fmt(c.old_price)}</s> → <b>${money(c.new_price)}</b></p></div>`;
    n.onclick = () => { n.remove(); location.hash = '#boutique'; };
    $('chat-notifs').appendChild(n);
    setTimeout(() => n.classList.add('out'), 7000);
    setTimeout(() => n.remove(), 7400);
  })
  .subscribe();

// =====================================================================
// Amis et chat
// =====================================================================
const FR = { list: [], open: null, msgs: [], chan: null, me: null, dock: false, min: false };
const friendOf = id => FR.list.find(f => f.id === id);

async function loadFriends() {
  if (!ACC.user) { FR.list = []; renderFriendBadges(); return; }
  const { data } = await sb.rpc('my_friends');
  FR.list = data || [];
  renderFriendBadges();
  if (!$('page-friends').hidden) drawFriends();
  if (FR.dock && !FR.open) drawDock();
}

// Pastilles : demandes reçues + messages non lus (onglet Amis et bulle du chat)
function renderFriendBadges() {
  const req = FR.list.filter(f => f.incoming).length, unread = FR.list.reduce((s, f) => s + (+f.unread || 0), 0);
  const nb = $('fr-badge'); nb.hidden = !(req + unread); nb.textContent = req + unread > 9 ? '9+' : req + unread;
  const fab = $('chat-fab'); fab.hidden = !ACC.user || !FR.list.some(f => f.status === 'accepted');
  const cb = $('chat-fab-badge'); cb.hidden = !unread; cb.textContent = unread > 9 ? '9+' : unread;
}

// ---------- Page « Amis »
async function renderFriends() {
  const page = $('page-friends');
  if (!ACC.user) { page.innerHTML = `<div class="page-empty"><h2>${t('nav_friends')}</h2><p class="muted">${t('fr_need')}</p><button class="btn primary" onclick="openAccount('login')">${t('login')}</button></div>`; return; }
  if (!page.querySelector('.fr-page')) page.innerHTML = `
    <div class="fr-page">
      <div class="page-head"><div><div class="eyebrow">${t('nav_friends')}</div><h2 class="page-title">${t('fr_title')}</h2></div></div>
      <form class="fr-add" id="fr-add"><input class="mpx-in" id="fr-pseudo" placeholder="${t('fr_add_ph')}" maxlength="16" autocomplete="off"><button class="btn primary">➕ ${t('fr_add')}</button></form>
      <div id="fr-body"></div>
    </div>`;
  await loadFriends();
  drawFriends();
  $('fr-add').onsubmit = async e => {
    e.preventDefault();
    const v = $('fr-pseudo').value.trim(); if (!v) return;
    await friendRequest(v);
    $('fr-pseudo').value = '';
  };
}
function drawFriends() {
  const body = $('fr-body'); if (!body) return;
  const inc = FR.list.filter(f => f.incoming), out = FR.list.filter(f => f.status === 'pending' && !f.incoming), ok = FR.list.filter(f => f.status === 'accepted');
  const row = (f, actions) => `<div class="fr" data-id="${f.id}">${avatarHTML(f, 46)}<div class="fr-who"><a class="plink" href="#profil/${encodeURIComponent(f.pseudo)}">${esc(f.pseudo)}</a><small class="muted">${f.status === 'accepted' ? (f.last_at ? t('fr_last', { d: dateOf(f.last_at) }) : t('fr_no_msg')) : f.incoming ? t('fr_wants') : t('fr_sent')}</small></div>${+f.unread ? `<i class="nbadge">${f.unread}</i>` : ''}<div class="fr-act">${actions}</div></div>`;
  body.innerHTML = `
    ${inc.length ? `<h3 class="shop-h">📨 ${t('fr_requests')} <small class="muted">${inc.length}</small></h3><div class="fr-list">${inc.map(f => row(f, `<button class="btn primary sm" data-acc="${f.id}">✓ ${t('fr_accept')}</button><button class="btn ghost sm" data-ref="${f.id}">✕</button>`)).join('')}</div>` : ''}
    <h3 class="shop-h">👥 ${t('fr_list')} <small class="muted">${ok.length}</small></h3>
    <div class="fr-list">${ok.map(f => row(f, `${ACC.isAdmin ? `<button class="btn ghost sm" data-duel="${f.id}" title="${t('fr_duel')}">⚔️</button>` : ''}<button class="btn primary sm" data-chat="${f.id}">💬 ${t('fr_chat')}</button><button class="btn ghost sm" data-rm="${f.id}" title="${t('fr_remove')}">✕</button>`)).join('') || `<p class="muted fr-empty">${t('fr_empty')}</p>`}</div>
    ${out.length ? `<h3 class="shop-h">⏳ ${t('fr_pending')} <small class="muted">${out.length}</small></h3><div class="fr-list">${out.map(f => row(f, `<button class="btn ghost sm" data-ref="${f.id}">${t('cancel')}</button>`)).join('')}</div>` : ''}`;
}
$('page-friends').addEventListener('click', async e => {
  const b = e.target.closest('[data-acc],[data-ref],[data-rm],[data-chat],[data-duel]'); if (!b) return;
  if (b.dataset.duel) return duelInvite(b.dataset.duel);
  if (b.dataset.chat) return openChat(b.dataset.chat);
  if (b.dataset.acc) await friendRespond(b.dataset.acc, true);
  if (b.dataset.ref) await friendRespond(b.dataset.ref, false);
  if (b.dataset.rm) {
    const f = friendOf(b.dataset.rm);
    if (!await ask(t('fr_remove_q', { n: f?.pseudo || '' }))) return;
    await sb.rpc('friend_remove', { p_other: b.dataset.rm });
    if (FR.open === b.dataset.rm) closeChat();
    loadFriends();
  }
});

async function friendRequest(pseudo) {
  const { data, error } = await sb.rpc('friend_request', { p_pseudo: pseudo });
  if (error) { sfx.deny(); toast(errText(error), true); return null; }
  sfx.upgrade();
  toast(t('fr_res_' + data, { n: esc(pseudo) }));
  loadFriends();
  return data;
}
async function friendRespond(id, yes) {
  const { error } = await sb.rpc('friend_respond', { p_other: id, p_accept: yes });
  if (error) return toast(errText(error), true);
  if (yes) { sfx.upgrade(); toast(t('fr_now', { n: esc(friendOf(id)?.pseudo || '') })); } else sfx.click();
  loadFriends();
}

// Bouton sur le profil d'un autre joueur : ajouter / demande envoyée / accepter / message
async function friendButton(pseudo, box) {
  if (!ACC.user || !ACC.pseudo || pseudo === ACC.pseudo) return;
  const { data: s } = await sb.rpc('friend_status', { p_pseudo: pseudo });
  if (!s) return;
  const st = s.status === 'accepted' ? 'chat' : s.incoming ? 'accept' : s.status === 'pending' ? 'sent' : 'add';
  box.innerHTML = {
    add: `<button class="btn primary" data-f="add">➕ ${t('fr_add')}</button>`,
    sent: `<button class="btn ghost" disabled>⏳ ${t('fr_sent')}</button>`,
    accept: `<button class="btn primary" data-f="accept">✓ ${t('fr_accept')}</button>`,
    chat: `${ACC.isAdmin ? `<button class="btn ghost" data-f="duel">⚔️ ${t('fr_duel')}</button>` : ''}<button class="btn primary" data-f="chat">💬 ${t('fr_chat')}</button>`,
  }[st];
  box.onclick = async e => {
    const b = e.target.closest('[data-f]'); if (!b) return;
    b.disabled = true;
    if (b.dataset.f === 'add') await friendRequest(pseudo);
    if (b.dataset.f === 'accept') await friendRespond(s.id, true);
    if (b.dataset.f === 'chat') { await loadFriends(); return openChat(s.id); }
    if (b.dataset.f === 'duel') { b.disabled = false; return duelInvite(s.id); }
    friendButton(pseudo, box);
  };
}

// ---------- Fenêtre de chat (en bas à droite)
function drawDock() {
  const d = $('chat-dock');
  d.hidden = !FR.dock;
  if (!FR.dock) return;
  d.classList.toggle('min', FR.min);
  const f = FR.open && friendOf(FR.open);
  if (!f) {
    // liste des amis pour choisir à qui écrire
    const ok = FR.list.filter(x => x.status === 'accepted');
    d.innerHTML = `<div class="cd-head"><b>💬 ${t('fr_chats')}</b><button class="cd-x" data-x aria-label="${t('close')}">✕</button></div>
      <div class="cd-pick">${ok.map(x => `<button class="cd-f" data-chat="${x.id}">${avatarHTML(x, 34)}<span>${esc(x.pseudo)}</span>${+x.unread ? `<i class="nbadge">${x.unread}</i>` : ''}</button>`).join('') || `<p class="muted">${t('fr_empty')}</p>`}</div>`;
    return;
  }
  d.innerHTML = `
    <div class="cd-head">
      <button class="cd-back" data-back aria-label="${t('back')}">‹</button>
      ${avatarHTML(f, 30)}<a class="plink" href="#profil/${encodeURIComponent(f.pseudo)}">${esc(f.pseudo)}</a>
      <button class="cd-x" data-min aria-label="—">${FR.min ? '▢' : '–'}</button><button class="cd-x" data-x aria-label="${t('close')}">✕</button>
    </div>
    <div class="cd-msgs" id="cd-msgs"></div>
    <form class="cd-form" id="cd-form"><input id="cd-in" maxlength="500" placeholder="${t('fr_write', { n: esc(f.pseudo) })}" autocomplete="off"><button aria-label="${t('send')}">➤</button></form>`;
  drawMsgs();
  $('cd-form').onsubmit = sendMsg;
  if (!FR.min) $('cd-in').focus({ preventScroll: true });
}
function drawMsgs() {
  const box = $('cd-msgs'); if (!box) return;
  let last = '';
  box.innerHTML = FR.msgs.map(m => {
    const day = new Date(m.created_at).toLocaleDateString(LOCALE());
    const sep = day !== last ? `<div class="cd-day">${day}</div>` : ''; last = day;
    return `${sep}<div class="cd-m${m.mine ? ' me' : ''}"><p>${esc(m.body)}</p><small>${timeOf(m.created_at)}</small></div>`;
  }).join('') || `<p class="muted cd-empty">${t('fr_first')}</p>`;
  box.scrollTop = box.scrollHeight;
}
async function openChat(id) {
  FR.dock = true; FR.min = false; FR.open = id; FR.msgs = [];
  drawDock();
  const { data } = await sb.rpc('my_conversation', { p_other: id });
  if (FR.open !== id) return;
  FR.msgs = data || [];
  drawMsgs();
  if (friendOf(id)?.unread > 0) { await sb.rpc('mark_read', { p_other: id }); loadFriends(); }
}
function closeChat() { FR.dock = false; FR.open = null; drawDock(); }
async function sendMsg(e) {
  e.preventDefault();
  const inp = $('cd-in'), body = inp.value.trim();
  if (!body) return;
  inp.value = '';
  const { data, error } = await sb.rpc('send_message', { p_to: FR.open, p_body: body });
  if (error) { inp.value = body; sfx.deny(); return toast(errText(error), true); }
  if (!FR.msgs.some(m => m.id === data)) FR.msgs.push({ id: data, mine: true, body, created_at: new Date().toISOString() });
  drawMsgs();
}
$('chat-dock').addEventListener('click', e => {
  const c = e.target.closest('[data-chat]'); if (c) return openChat(c.dataset.chat);
  if (e.target.closest('[data-back]')) { FR.open = null; return drawDock(); }
  if (e.target.closest('[data-min]')) { FR.min = !FR.min; return drawDock(); }
  if (e.target.closest('[data-x]')) return closeChat();
  if (FR.min && e.target.closest('.cd-head')) { FR.min = false; drawDock(); }
});
$('chat-fab').addEventListener('click', () => { sfx.click(); if (FR.dock) return closeChat(); FR.dock = true; FR.open = null; drawDock(); });

// Petite notif quand un ami écrit et que sa fenêtre n'est pas ouverte (clic = ouvrir le chat)
function notifyMsg(f, body) {
  sfx.message();
  const n = document.createElement('button');
  n.className = 'chat-notif';
  n.innerHTML = `${avatarHTML(f, 36)}<div><b>${esc(f.pseudo)}</b><p>${esc(body.length > 80 ? body.slice(0, 80) + '…' : body)}</p></div>`;
  n.onclick = () => { n.remove(); openChat(f.id); };
  $('chat-notifs').appendChild(n);
  setTimeout(() => n.classList.add('out'), 5200);
  setTimeout(() => n.remove(), 5600);
}

// ---------- Temps réel : messages et demandes d'amis (le serveur n'envoie que ce qui nous concerne)
function startSocial() {
  const id = ACC.user?.id || null;
  if (id === FR.me && (FR.chan || !id)) return loadFriends(); // même compte : on rafraîchit juste la liste
  FR.me = id;
  if (FR.chan) { sb.removeChannel(FR.chan); FR.chan = null; }
  FR.list = []; FR.open = null; FR.dock = false; drawDock();
  if (!ACC.user) { renderFriendBadges(); return; }
  const me = ACC.user.id;
  FR.chan = sb.channel('social-' + me)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async ({ new: m }) => {
      const other = m.sender === me ? m.receiver : m.sender;
      if (FR.open === other && !FR.msgs.some(x => x.id === m.id)) {
        FR.msgs.push({ id: m.id, mine: m.sender === me, body: m.body, created_at: m.created_at });
        drawMsgs();
        if (m.sender !== me) { if (!FR.min && document.visibilityState === 'visible') sb.rpc('mark_read', { p_other: other }); else sfx.message(); }
        return;
      }
      if (m.sender === me) return;
      await loadFriends();
      const f = friendOf(other);
      if (f) notifyMsg(f, m.body);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, async ({ eventType, new: f }) => {
      const before = new Set(FR.list.filter(x => x.status === 'accepted').map(x => x.id));
      await loadFriends();
      if (eventType === 'INSERT' && f.requested_by !== me) {
        const x = friendOf(f.requested_by);
        if (x) { sfx.message(); toast('📨 ' + t('fr_got', { n: esc(x.pseudo) })); }
      }
      if (eventType === 'UPDATE' && f.status === 'accepted' && f.requested_by === me) {
        const x = FR.list.find(y => y.status === 'accepted' && !before.has(y.id));
        if (x) { sfx.upgrade(); toast('🤝 ' + t('fr_now', { n: esc(x.pseudo) })); }
      }
    })
    .subscribe();
  loadFriends();
  if (typeof duelSub === 'function') duelSub(); // défis de combat en direct
}
if (ACC.user) startSocial();
