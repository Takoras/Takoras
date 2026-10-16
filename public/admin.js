// Panel admin grand format, réservé aux comptes admin (le serveur vérifie à chaque action).
// Onglets : Joueurs (tableau + fiche détaillée avec actions), Global (stats, dons à tous, reset), Tests (luck, jeton forcé, effets).

let admSel = null, admRows = [], admSort = { k: 'created_at', d: -1 };
const admMsg = (text, err = false) => { const m = $('adm-msg'); m.textContent = text; m.classList.toggle('err', err); clearTimeout(admMsg.t); admMsg.t = setTimeout(() => { m.textContent = ''; }, 4000); };
const ago2 = d => new Date(d).toLocaleDateString(LOCALE());

function renderAdminBtn() {
  $('open-admin').hidden = !ACC.isAdmin;
  if (!ACC.isAdmin) $('debug').hidden = true;
}

function admTab(name) {
  document.querySelectorAll('#ad-tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === name));
  document.querySelectorAll('.ad-tab').forEach(t2 => { t2.hidden = t2.dataset.tab !== name; });
  if (name === 'global') admStats();
  if (name === 'tests') renderDebug();
  if (name === 'shop') adsLoad();
  if (name === 'ann') adaLoad();
}
$('ad-tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) admTab(b.dataset.tab); });

// ---------- Joueurs : tableau triable
async function admLoad() {
  const { data, error } = await sb.rpc('admin_players', { q: $('adm-search').value.trim() });
  if (error) return admMsg('Erreur : ' + error.message, true);
  admRows = data;
  admDrawTable();
}
function admDrawTable() {
  const cols = [['pseudo', 'Pseudo'], ['coins', 'Pièces'], ['stock', 'Pulls'], ['pulls', 'Tirages'], ['best_odds', 'Meilleur'], ['created_at', 'Inscrit']];
  const rows = [...admRows].sort((a, b) => { const x = a[admSort.k] ?? 0, y = b[admSort.k] ?? 0; return (x > y ? 1 : x < y ? -1 : 0) * admSort.d; });
  $('adm-list').innerHTML = `<table><thead><tr>${cols.map(([k, l]) => `<th data-k="${k}">${l}${admSort.k === k ? (admSort.d > 0 ? ' ▲' : ' ▼') : ''}</th>`).join('')}</tr></thead><tbody>${
    rows.map(p => `<tr data-id="${p.id}" class="${admSel === p.id ? 'on' : ''}"><td><b>${esc(p.pseudo || '(sans pseudo)')}</b>${p.banned ? ' ⛔' : ''}</td><td>${fmt(p.coins)}</td><td>${p.stock}/${p.stock_max}</td><td>${fmt(p.pulls)}</td><td>${p.best_odds ? '1/' + fmt(p.best_odds) : '—'}</td><td>${ago2(p.created_at)}</td></tr>`).join('')
  }</tbody></table>${rows.length ? '' : '<p class="muted center">Aucun joueur</p>'}`;
}
$('adm-list').addEventListener('click', e => {
  const th = e.target.closest('th');
  if (th) { admSort = { k: th.dataset.k, d: admSort.k === th.dataset.k ? -admSort.d : -1 }; return admDrawTable(); }
  const tr = e.target.closest('tr[data-id]');
  if (tr) { admSel = tr.dataset.id; admDrawTable(); admDetail(); }
});
let admT;
$('adm-search').addEventListener('input', () => { clearTimeout(admT); admT = setTimeout(admLoad, 250); });

// ---------- Fiche d'un joueur
const ITEMS = [['potion1', '🧪 Potion ×1,3 (5)'], ['potion2', '🧪 Potion ×2 (3)'], ['potion3', '🧪 Potion ×5 (1)'], ['potion10', '🧪 Potion ×10'], ['potion25', '🧪 Potion ×25'], ['potion50', '🧪 Potion ×50'], ['potion100', '🧪 Potion ×100'], ['instant', '⚡ Recharge éclair'], ['hourglass', '⏳ Sablier 1 h'],
  ...Object.keys(BANNER_IMG).map(b => ['b_' + b, '🎨 Bannière ' + bannerName(b)])];
async function admDetail() {
  const box = $('adm-detail');
  const { data: p, error } = await sb.rpc('admin_player', { target: admSel });
  if (error) return admMsg(error.message, true);
  const fast = p.fast_until && Date.parse(p.fast_until) > Date.now();
  box.innerHTML = `
    <div class="ad-card">
      <div class="ad-banner" id="ad-banner"></div>
      <div class="ad-who"><div><h3>${esc(p.pseudo || '(sans pseudo)')} ${p.is_admin ? '<span class="tier t-r_myth">admin</span>' : ''}</h3><small class="muted">${esc(p.email || '')} · inscrit le ${ago2(p.created_at)}</small></div>
        <a class="btn ghost sm" href="#profil/${encodeURIComponent(p.pseudo || '')}">Voir le profil</a></div>
      <div class="ad-mini">
        <div><b>${money(p.coins)}</b><span>pièces</span></div>
        <div><b>${p.stock}/${p.stock_max}</b><span>pulls</span></div>
        <div><b>${(p.potions || []).length ? '×' + (+p.luck).toFixed(1) + ' · ' + p.potions.map(x => '×' + x.m + '(' + x.n + ')').join(' ') : '—'}</b><span>potions</span></div>
        <div><b>${fast ? new Date(p.fast_until).toLocaleTimeString(LOCALE(), { hour: '2-digit', minute: '2-digit' }) : '—'}</b><span>sablier jusqu'à</span></div>
      </div>
    </div>
    <div class="ad-box"><h4>Pièces et pulls <small class="muted">(nombre négatif pour retirer)</small></h4>
      <div class="adm-row"><input class="adm-in" id="adm-coins" type="number" placeholder="Pièces"><input class="adm-in" id="adm-pulls" type="number" placeholder="Pulls"><button id="adm-give">Donner</button></div>
      <div class="adm-quick"><button data-c="1000">+1 000</button><button data-c="10000">+10 000</button><button data-c="100000">+100 000</button><button data-p="5">+5 pulls</button><button data-p="10">+10 pulls</button></div>
    </div>
    <div class="ad-box"><h4>Donner un jeton</h4>
      <div class="ad-jetons">${SERIES.Takoras.map(j => `<button data-j="${esc(j.name)}" title="${esc(jn(j.name))} · 1/${fmt(j.odds)}" style="--g:${hexRGB(j.glow)}"><img src="${texOf(j)}" alt=""><small>${esc(jn(j.name))}</small></button>`).join('')}</div>
    </div>
    <div class="ad-box"><h4>Donner un objet</h4><div class="adm-quick">${ITEMS.map(([id, l]) => `<button data-it="${id}">${l}</button>`).join('')}</div></div>
    <div class="ad-box mod"><h4>Modération ${p.banned ? '<span class="ad-banned">⛔ banni</span>' : ''}</h4>
      <div class="adm-row"><input class="adm-in" id="adm-newpseudo" placeholder="Nouveau pseudo" value="${esc(p.pseudo || '')}" maxlength="16"><button id="adm-rename">Renommer</button></div>
      <div class="adm-quick">
        ${p.is_admin ? '' : `<button class="${p.banned ? '' : 'red'}" id="adm-ban">${p.banned ? '✅ Débannir' : '⛔ Bannir'}</button>`}
        <button id="adm-clear-sc">🧹 Vider vitrine + bio</button>
        <button id="adm-msgs">💬 Voir ses messages</button>
      </div>
      <div id="adm-msgs-box"></div>
    </div>
    <div class="ad-box"><h4>Collection <small class="muted">(🔒 verrouillés · 📌 en vitrine)</small></h4><div class="ad-coll" id="adm-coll"><p class="muted">…</p></div></div>
    <div class="ad-box"><h4>Objets</h4>
      <div class="ad-items">${ITEMS.filter(([id]) => !id.startsWith('b_')).map(([id, l]) => { const q = (p.items.find(x => x.item === id) || {}).qty || 0; return `<label>${l}<input class="adm-in" type="number" min="0" data-q="${id}" value="${q}"></label>`; }).join('')}</div>
      <div class="adm-quick"><button id="adm-items-save">Enregistrer les quantités</button><button class="red" id="adm-items-clear">Vider tous ses objets</button></div>
    </div>
    <div>
      <div class="ad-box"><h4>Derniers tirages</h4><div class="ad-recent">${p.recent.map(r => `<div><span>${esc(jn(r.jeton))} <small class="muted">1/${fmt(r.odds)}</small></span><small class="muted">${new Date(r.at).toLocaleString(LOCALE(), { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}${r.sold ? ' · vendu' : ''}</small></div>`).join('') || '<p class="muted">Aucun</p>'}</div></div>
    </div>
    <button class="adm-danger" id="adm-reset">Remettre ${esc(p.pseudo || 'ce joueur')} à zéro</button>`;
  $('ad-banner').appendChild(bannerCanvas(p.banner));
  admSelP = p;
  admColl();
}

// Collection du joueur, regroupée par jeton : retirer, verrouiller / déverrouiller
let admInv = [];
async function admColl() {
  const { data, error } = await sb.rpc('admin_inventory', { target: admSel });
  if (error) return admMsg(error.message, true);
  admInv = data;
  const g = {};
  data.forEach(x => { (g[x.jeton] ||= { jeton: x.jeton, odds: x.odds, all: [], locked: 0, sc: 0 }); g[x.jeton].all.push(x); if (x.locked) g[x.jeton].locked++; if (x.showcased) g[x.jeton].sc++; });
  const list = Object.values(g).sort((a, b) => b.odds - a.odds);
  $('adm-coll').innerHTML = list.map(x => `<div class="ad-cr" data-g="${esc(x.jeton)}"><img src="${texOf(jetonOf(x.jeton))}" alt=""><span><b>${esc(jn(x.jeton))}</b> <small class="muted">1/${fmt(x.odds)}</small></span>
    <span class="ad-cn">×${x.all.length}${x.locked ? ` · 🔒${x.locked}` : ''}${x.sc ? ` · 📌${x.sc}` : ''}</span>
    <button data-op="rm1" title="Retirer 1">−1</button><button data-op="rmall" class="red" title="Tout retirer">Tout retirer</button>
    <button data-op="${x.locked === x.all.length ? 'unlock' : 'lock'}">${x.locked === x.all.length ? '🔓' : '🔒'}</button></div>`).join('') || '<p class="muted">Aucun jeton</p>';
}
async function admCollOp(name, op) {
  const all = admInv.filter(x => x.jeton === name);
  let error;
  if (op === 'rm1' || op === 'rmall') {
    const pick = op === 'rm1' ? [[...all].sort((a, b) => (a.locked + a.showcased) - (b.locked + b.showcased))[0]] : all;
    if (op === 'rmall' && !confirm(`Retirer les ${all.length} ${jn(name)} de ${admSelP.pseudo} ?`)) return;
    ({ error } = await sb.rpc('admin_remove_pulls', { target: admSel, ids: pick.map(x => x.id) }));
  } else ({ error } = await sb.rpc('admin_lock_pulls', { target: admSel, ids: all.map(x => x.id), p_locked: op === 'lock' }));
  if (error) return admMsg(error.message, true);
  admMsg(`${jn(name)} : ${op === 'rm1' ? '1 retiré' : op === 'rmall' ? 'tout retiré' : op === 'lock' ? 'verrouillé' : 'déverrouillé'}`);
  admAfter();
}

// Messages privés d'un joueur (modération), avec suppression
async function admMsgs() {
  const { data, error } = await sb.rpc('admin_messages', { target: admSel });
  if (error) return admMsg(error.message, true);
  $('adm-msgs-box').innerHTML = `<div class="ad-msgs">${data.map(m => `<div class="ad-mm"><small class="muted">${new Date(m.created_at).toLocaleString(LOCALE(), { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</small>
    <b>${esc(m.from_pseudo || '?')} → ${esc(m.to_pseudo || '?')}</b><p>${esc(m.body)}</p><button data-delmsg="${m.id}" title="Supprimer">🗑</button></div>`).join('') || '<p class="muted">Aucun message</p>'}</div>`;
}
let admSelP = null;

async function admGive(c, pl) {
  const { error } = await sb.rpc('admin_give', { target: admSel, p_coins: c, p_pulls: pl });
  if (error) return admMsg(error.message, true);
  admMsg(`${admSelP.pseudo} : ${c ? (c > 0 ? '+' : '') + fmt(c) + ' pièces ' : ''}${pl ? (pl > 0 ? '+' : '') + pl + ' pulls' : ''}`);
  admAfter();
}
async function admAfter() { await Promise.all([admLoad(), admDetail()]); ecoSync(); if (ACC.user) loadAccount(ACC.user); }

$('adm-detail').addEventListener('click', async e => {
  const q = e.target.closest('[data-c],[data-p]');
  if (q) return admGive(+q.dataset.c || 0, +q.dataset.p || 0);
  if (e.target.closest('#adm-give')) {
    const c = Math.trunc(+$('adm-coins').value || 0), pl = Math.trunc(+$('adm-pulls').value || 0);
    if (!c && !pl) return admMsg('Mets un nombre de pièces ou de pulls', true);
    return admGive(c, pl);
  }
  const j = e.target.closest('[data-j]');
  if (j) {
    const { error } = await sb.rpc('admin_give_jeton', { target: admSel, p_jeton: j.dataset.j });
    if (error) return admMsg(error.message, true);
    admMsg(`${jn(j.dataset.j)} donné à ${admSelP.pseudo}`); return admAfter();
  }
  const it = e.target.closest('[data-it]');
  if (it) {
    const { error } = await sb.rpc('admin_give_item', { target: admSel, p_item: it.dataset.it });
    if (error) return admMsg(errText(error), true);
    admMsg(`${it.textContent} donné à ${admSelP.pseudo}`); return admAfter();
  }
  const cr = e.target.closest('.ad-cr [data-op]');
  if (cr) return admCollOp(cr.closest('.ad-cr').dataset.g, cr.dataset.op);
  if (e.target.closest('#adm-rename')) {
    const v = $('adm-newpseudo').value.trim();
    const { error } = await sb.rpc('admin_set_pseudo', { target: admSel, p: v });
    if (error) return admMsg(errText(error), true);
    admMsg(`Renommé en ${v}`); return admAfter();
  }
  if (e.target.closest('#adm-ban')) {
    const ban = !admSelP.banned;
    if (ban && !confirm(`Bannir ${admSelP.pseudo} ? Il ne pourra plus ouvrir, acheter, vendre ni écrire.`)) return;
    const { error } = await sb.rpc('admin_ban', { target: admSel, p_ban: ban });
    if (error) return admMsg(error.message, true);
    admMsg(`${admSelP.pseudo} ${ban ? 'banni' : 'débanni'}`); return admAfter();
  }
  if (e.target.closest('#adm-clear-sc')) {
    if (!confirm(`Vider la vitrine et la bio de ${admSelP.pseudo} ?`)) return;
    const { error } = await sb.rpc('admin_clear_showcase', { target: admSel });
    if (error) return admMsg(error.message, true);
    admMsg('Vitrine et bio vidées'); return admAfter();
  }
  if (e.target.closest('#adm-msgs')) return admMsgs();
  const dm = e.target.closest('[data-delmsg]');
  if (dm) {
    const { error } = await sb.rpc('admin_delete_message', { p_id: +dm.dataset.delmsg });
    if (error) return admMsg(error.message, true);
    dm.closest('.ad-mm').remove(); return admMsg('Message supprimé');
  }
  const clear = e.target.closest('#adm-items-clear');
  if (clear || e.target.closest('#adm-items-save')) {
    if (clear && !confirm(`Vider tous les objets de ${admSelP.pseudo} ?`)) return;
    const qs = [...document.querySelectorAll('[data-q]')].map(i => [i.dataset.q, clear ? 0 : Math.max(0, Math.trunc(+i.value || 0))]);
    for (const [it, q] of qs) { const { error } = await sb.rpc('admin_set_items', { target: admSel, p_item: it, p_qty: q }); if (error) return admMsg(error.message, true); }
    admMsg(clear ? 'Objets vidés' : 'Objets enregistrés'); return admAfter();
  }
  if (e.target.closest('#adm-reset')) {
    if (!confirm(`Remettre ${admSelP.pseudo} à zéro ? (tirages, pièces, stock, effets effacés)`)) return;
    const { error } = await sb.rpc('admin_reset', { target: admSel });
    if (error) return admMsg(error.message, true);
    admMsg(`${admSelP.pseudo} remis à zéro`); return admAfter();
  }
});

// ---------- Global
async function admStats() {
  const { data: s } = await sb.rpc('admin_stats');
  if (!s) return;
  $('adm-stats').innerHTML = [['Joueurs', fmt(s.players)], ['Tirages aujourd’hui', fmt(s.pulls_today)], ['Tirages au total', fmt(s.pulls_total)],
    ['Pièces en circulation', money(s.coins_total)], ['Meilleur tirage du jour', s.best_today ? '1/' + fmt(s.best_today) : '—']]
    .map(([l, v]) => `<div><b>${v}</b><span>${l}</span></div>`).join('');
}
$('adm-give-all').addEventListener('click', async () => {
  const c = Math.trunc(+$('adm-all-coins').value || 0), p = Math.trunc(+$('adm-all-pulls').value || 0);
  if (!c && !p) return admMsg('Mets un nombre de pièces ou de pulls', true);
  if (!confirm(`Donner ${c} pièces et ${p} pulls à TOUS les joueurs ?`)) return;
  const { data, error } = await sb.rpc('admin_give', { target: null, p_coins: c, p_pulls: p });
  if (error) return admMsg(error.message, true);
  admMsg(`Donné à ${data} joueurs`); admStats(); ecoSync();
});
$('adm-reset-all').addEventListener('click', async () => {
  if (prompt('Tape RESET pour remettre TOUS les joueurs à zéro :') !== 'RESET') return admMsg('Annulé');
  const { data, error } = await sb.rpc('admin_reset', { target: null });
  if (error) return admMsg(error.message, true);
  admMsg(`${data} joueurs remis à zéro`); admStats(); ecoSync(); if (ACC.user) loadAccount(ACC.user);
});

// ---------- Boutique : prix, stock de la période, en vente ou non, nouveau stock
let adsTimer;
async function adsLoad() {
  const [{ data, error }, { data: sh }] = await Promise.all([sb.rpc('admin_shop'), sb.rpc('shop_today')]);
  if (error) return admMsg(error.message, true);
  const name = it => itemText(it)[0];
  $('ads-list').innerHTML = `<table><thead><tr><th></th><th>Objet</th><th>Prix</th><th>Stock (cette période)</th><th>Vendus</th><th>En vente</th><th></th></tr></thead><tbody>${
    data.map(it => `<tr data-it="${it.id}" class="${it.active ? '' : 'off'}"><td class="ads-ic">${itemIcon(it)}</td><td><b>${esc(name(it))}</b><br><small class="muted">${it.id}</small></td>
      <td><input class="adm-in" type="number" min="0" data-f="price" value="${it.price}"></td>
      <td><input class="adm-in" type="number" min="0" data-f="stock" value="${it.stock}"></td>
      <td>${it.sold}</td>
      <td><label class="ads-sw"><input type="checkbox" data-f="active" ${it.active ? 'checked' : ''}><span></span></label></td>
      <td><button class="btn primary sm" data-save>OK</button></td></tr>`).join('')}</tbody></table>`;
  const end = Date.now() + (sh?.reset_in || 0) * 1000;
  clearInterval(adsTimer);
  const tick = () => { const el = $('ads-reset'); if (!el || $('debug').hidden) return clearInterval(adsTimer); el.textContent = hms(Math.max(0, Math.round((end - Date.now()) / 1000))); };
  tick(); adsTimer = setInterval(tick, 1000);
}
$('ads-list').addEventListener('click', async e => {
  const b = e.target.closest('[data-save]'); if (!b) return;
  const tr = b.closest('tr'), v = f => tr.querySelector(`[data-f="${f}"]`);
  const { error } = await sb.rpc('admin_shop_set', { p_item: tr.dataset.it, p_price: Math.max(0, Math.trunc(+v('price').value)), p_active: v('active').checked, p_stock: Math.max(0, Math.trunc(+v('stock').value)) });
  if (error) return admMsg(error.message, true);
  admMsg(`${tr.dataset.it} mis à jour`); adsLoad(); if (!$('page-shop').hidden) renderShop();
});
$('ads-reroll').addEventListener('click', async () => {
  if (!confirm('Tirer un nouveau stock maintenant ? (les achats de la période sont remis à zéro pour tout le monde)')) return;
  const { error } = await sb.rpc('admin_shop_reroll');
  if (error) return admMsg(error.message, true);
  admMsg('Nouveau stock tiré'); adsLoad(); if (!$('page-shop').hidden) renderShop();
});

// ---------- Annonces : écrire à tout le site (plein écran, bandeau), voir et supprimer les anciennes
async function adaLoad() {
  const { data } = await sb.from('announcements').select('*').order('id', { ascending: false }).limit(50);
  $('ada-list').innerHTML = (data || []).map(a => `<div class="ad-mm"><small class="muted">${new Date(a.created_at).toLocaleString(LOCALE(), { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} · ${a.fullscreen ? 'plein écran' : ''}${a.fullscreen && a.banner ? ' + ' : ''}${a.banner ? 'bandeau' : ''}</small><p>${esc(a.body)}</p><button data-delann="${a.id}" title="Supprimer">🗑</button></div>`).join('') || '<p class="muted">Aucune annonce</p>';
}
$('ada-body').addEventListener('input', () => { $('ada-count').textContent = $('ada-body').value.length + '/500'; });
$('ada-send').addEventListener('click', async () => {
  const body = $('ada-body').value.trim(), full = $('ada-full').checked, banner = $('ada-banner').checked;
  if (!body) return admMsg('Écris un message', true);
  if (!full && !banner) return admMsg('Choisis plein écran et/ou bandeau', true);
  const { error } = await sb.rpc('admin_announce', { p_body: body, p_fullscreen: full, p_banner: banner });
  if (error) return admMsg(error.message, true);
  $('ada-body').value = ''; $('ada-count').textContent = '0/500';
  admMsg('Annonce envoyée à tout le monde 📢'); adaLoad();
});
$('ada-list').addEventListener('click', async e => {
  const b = e.target.closest('[data-delann]'); if (!b) return;
  if (!confirm('Supprimer cette annonce ?')) return;
  const { error } = await sb.rpc('admin_delete_announcement', { p_id: +b.dataset.delann });
  if (error) return admMsg(error.message, true);
  admMsg('Annonce supprimée'); adaLoad();
});

// Ouvrir / fermer le panel (bouclier ou « debug ») : on recharge toujours la liste et les stats
function toggleAdmin() {
  $('debug').hidden = !$('debug').hidden;
  if ($('debug').hidden) return;
  admLoad(); admStats(); renderDebug();
  if (admSel) admDetail();
}
$('open-admin').addEventListener('click', toggleAdmin);

renderAdminBtn();

// Affiche la bonne page au chargement (#inventaire, #boutique, #profil/…)
route();
