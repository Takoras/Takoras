// Panel admin grand format, réservé aux comptes admin (le serveur vérifie à chaque action).
// Onglets : Joueurs (tableau + fiche détaillée avec actions), Global (stats, dons à tous, reset), Tests (luck, jeton forcé, effets).

let admSel = null, admRows = [], admSort = { k: 'created_at', d: -1 };
const admMsg = (text, err = false) => { const m = $('mpx-msg'); m.textContent = text; m.classList.toggle('err', err); clearTimeout(admMsg.t); admMsg.t = setTimeout(() => { m.textContent = ''; }, 4000); };
const ago2 = d => new Date(d).toLocaleDateString(LOCALE());

function renderAdminBtn() {
  $('open-admin').hidden = !ACC.isAdmin;
  $('nav-combat').hidden = !ACC.isAdmin; // onglet Combat : admins seulement pour l'instant (on le refait)
  document.documentElement.classList.toggle('is-admin', !!ACC.isAdmin);
  if (!ACC.isAdmin) $('debug').hidden = true;
}

function admTab(name) {
  document.querySelectorAll('#mp-tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === name));
  document.querySelectorAll('.mp-tab').forEach(t2 => { t2.hidden = t2.dataset.tab !== name; });
  if (name === 'global') admStats();
  if (name === 'tests') renderDebug();
  if (name === 'shop') adsLoad();
  if (name === 'ann') adaLoad();
  if (name === 'codes') adcLoad();
  if (name === 'fb') mpfbLoad();
  if (name === 'pn') mppnLoad();
  if (name === 'global') mpBetaDraw();
}
$('mp-tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) admTab(b.dataset.tab); });

// ---------- Joueurs : tableau triable
async function admLoad() {
  const { data, error } = await sb.rpc('admin_players', { q: $('mpx-search').value.trim() });
  if (error) return admMsg('Erreur : ' + error.message, true);
  admRows = data;
  admDrawTable();
}
function admDrawTable() {
  const cols = [['pseudo', 'Pseudo'], ['coins', 'Pièces'], ['stock', 'Pulls'], ['pulls', 'Tirages'], ['best_odds', 'Meilleur'], ['created_at', 'Inscrit']];
  const rows = [...admRows].sort((a, b) => { const x = a[admSort.k] ?? 0, y = b[admSort.k] ?? 0; return (x > y ? 1 : x < y ? -1 : 0) * admSort.d; });
  $('mpx-list').innerHTML = `<table><thead><tr>${cols.map(([k, l]) => `<th data-k="${k}">${l}${admSort.k === k ? (admSort.d > 0 ? ' ▲' : ' ▼') : ''}</th>`).join('')}</tr></thead><tbody>${
    rows.map(p => `<tr data-id="${p.id}" class="${admSel === p.id ? 'on' : ''}"><td><b>${esc(p.pseudo || '(sans pseudo)')}</b>${p.banned ? ' ⛔' : ''}</td><td>${fmt(p.coins)}</td><td>${p.stock}/${p.stock_max}</td><td>${fmt(p.pulls)}</td><td>${p.best_odds ? '1/' + fmt(p.best_odds) : '—'}</td><td>${ago2(p.created_at)}</td></tr>`).join('')
  }</tbody></table>${rows.length ? '' : '<p class="muted center">Aucun joueur</p>'}`;
}
$('mpx-list').addEventListener('click', e => {
  const th = e.target.closest('th');
  if (th) { admSort = { k: th.dataset.k, d: admSort.k === th.dataset.k ? -admSort.d : -1 }; return admDrawTable(); }
  const tr = e.target.closest('tr[data-id]');
  if (tr) { admSel = tr.dataset.id; admDrawTable(); admDetail(); }
});
let admT;
$('mpx-search').addEventListener('input', () => { clearTimeout(admT); admT = setTimeout(admLoad, 250); });

// ---------- Fiche d'un joueur
const ITEMS = [['potion1', '🧪 Potion ×1,3 (5)'], ['potion2', '🧪 Potion ×2 (3)'], ['potion3', '🧪 Potion ×5 (1)'], ['potion10', '🧪 Potion ×10'], ['potion25', '🧪 Potion ×25'], ['potion50', '🧪 Potion ×50'], ['potion100', '🧪 Potion ×100'], ['instant', '⚡ Recharge éclair'], ['hourglass', '⏳ Sablier 1 h'], ['a_etoile', '✨ Photo animée Étoile'],
  ...Object.keys(BANNER_IMG).map(b => ['b_' + b, '🎨 Bannière ' + bannerName(b)])];
async function admDetail() {
  const box = $('mpx-detail');
  const { data: p, error } = await sb.rpc('admin_player', { target: admSel });
  if (error) return admMsg(error.message, true);
  const fast = p.fast_until && Date.parse(p.fast_until) > Date.now();
  box.innerHTML = `
    <div class="mp-card">
      <div class="mp-banner" id="mp-banner"></div>
      <div class="mp-who"><div><h3>${esc(p.pseudo || '(sans pseudo)')} ${p.is_admin ? '<span class="tier t-r_myth">admin</span>' : ''}</h3><small class="muted">${esc(p.email || '')} · inscrit le ${ago2(p.created_at)}</small></div>
        <a class="btn ghost sm" href="#profil/${encodeURIComponent(p.pseudo || '')}">Voir le profil</a></div>
      <div class="mp-mini">
        <div><b>${money(p.coins)}</b><span>pièces</span></div>
        <div><b>${p.stock}/${p.stock_max}</b><span>pulls</span></div>
        <div><b>${(p.potions || []).length ? '×' + (+p.luck).toFixed(1) + ' · ' + p.potions.map(x => '×' + x.m + '(' + x.n + ')').join(' ') : '—'}</b><span>potions</span></div>
        <div><b>${fast ? new Date(p.fast_until).toLocaleTimeString(LOCALE(), { hour: '2-digit', minute: '2-digit' }) : '—'}</b><span>sablier jusqu'à</span></div>
      </div>
    </div>
    <div class="mp-box"><h4>Pièces et pulls <small class="muted">(nombre négatif pour retirer)</small></h4>
      <div class="mpx-row"><input class="mpx-in" id="mpx-coins" type="number" placeholder="Pièces"><input class="mpx-in" id="mpx-pulls" type="number" placeholder="Pulls"><button id="mpx-give">Donner</button></div>
      <div class="mpx-quick"><button data-c="1000">+1 000</button><button data-c="10000">+10 000</button><button data-c="100000">+100 000</button><button data-p="5">+5 pulls</button><button data-p="10">+10 pulls</button></div>
    </div>
    <div class="mp-box"><h4>Donner un jeton</h4>
      <div class="mp-jetons">${SERIES.Takoras.map(j => `<button data-j="${esc(j.name)}" title="${jnH(j.name)} · 1/${fmt(j.odds)}" style="--g:${hexRGB(j.glow)}"><img src="${texOf(j)}" alt=""><small>${jnH(j.name)}</small></button>`).join('')}</div>
    </div>
    <div class="mp-box"><h4>Donner un objet</h4><div class="mpx-quick">${ITEMS.map(([id, l]) => `<button data-it="${id}">${l}</button>`).join('')}</div></div>
    <div class="mp-box mod"><h4>Modération ${p.banned ? '<span class="mp-banned">⛔ banni</span>' : ''}</h4>
      <div class="mpx-row"><input class="mpx-in" id="mpx-newpseudo" placeholder="Nouveau pseudo" value="${esc(p.pseudo || '')}" maxlength="16"><button id="mpx-rename">Renommer</button></div>
      <div class="mpx-quick">
        ${p.is_admin ? '' : `<button class="${p.banned ? '' : 'red'}" id="mpx-ban">${p.banned ? '✅ Débannir' : '⛔ Bannir'}</button>`}
        <button id="mpx-clear-sc">🧹 Vider vitrine + bio</button>
        <button id="mpx-msgs">💬 Voir ses messages</button>
      </div>
      <div id="mpx-msgs-box"></div>
    </div>
    <div class="mp-box"><h4>Collection <small class="muted">(🔒 verrouillés · 📌 en vitrine)</small></h4><div class="mp-coll" id="mpx-coll"><p class="muted">…</p></div></div>
    <div class="mp-box"><h4>Objets</h4>
      <div class="mp-items">${ITEMS.filter(([id]) => !id.startsWith('b_')).map(([id, l]) => { const q = (p.items.find(x => x.item === id) || {}).qty || 0; return `<label>${l}<input class="mpx-in" type="number" min="0" data-q="${id}" value="${q}"></label>`; }).join('')}</div>
      <div class="mpx-quick"><button id="mpx-items-save">Enregistrer les quantités</button><button class="red" id="mpx-items-clear">Vider tous ses objets</button></div>
    </div>
    <div>
      <div class="mp-box"><h4>Derniers tirages</h4><div class="mp-recent">${p.recent.map(r => `<div><span>${jnH(r.jeton)} <small class="muted">1/${fmt(r.odds)}</small></span><small class="muted">${new Date(r.at).toLocaleString(LOCALE(), { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}${r.sold ? ' · vendu' : ''}</small></div>`).join('') || '<p class="muted">Aucun</p>'}</div></div>
    </div>
    <button class="mpx-danger" id="mpx-reset">Remettre ${esc(p.pseudo || 'ce joueur')} à zéro</button>`;
  admSelP = p;
  if (p.banner) $('mp-banner').appendChild(bannerCanvas(p.banner)); // pas de bannière = fond vide (sinon ça plantait)
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
  $('mpx-coll').innerHTML = list.map(x => `<div class="mp-cr" data-g="${esc(x.jeton)}"><img src="${texOf(jetonOf(x.jeton))}" alt=""><span><b>${jnH(x.jeton)}</b> <small class="muted">1/${fmt(x.odds)}</small></span>
    <span class="mp-cn">×${x.all.length}${x.locked ? ` · 🔒${x.locked}` : ''}${x.sc ? ` · 📌${x.sc}` : ''}</span>
    <button data-op="rm1" title="Retirer 1">−1</button><button data-op="rmall" class="red" title="Tout retirer">Tout retirer</button>
    <button data-op="${x.locked === x.all.length ? 'unlock' : 'lock'}">${x.locked === x.all.length ? '🔓' : '🔒'}</button></div>`).join('') || '<p class="muted">Aucun jeton</p>';
}
async function admCollOp(name, op) {
  const all = admInv.filter(x => x.jeton === name);
  let error;
  if (op === 'rm1' || op === 'rmall') {
    const pick = op === 'rm1' ? [[...all].sort((a, b) => (a.locked + a.showcased) - (b.locked + b.showcased))[0]] : all;
    if (op === 'rmall' && !await ask(`Retirer les ${all.length} ${jn(name)} de ${admSelP.pseudo} ?`, { danger: true })) return;
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
  $('mpx-msgs-box').innerHTML = `<div class="mp-msgs">${data.map(m => `<div class="mp-mm"><small class="muted">${new Date(m.created_at).toLocaleString(LOCALE(), { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</small>
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

$('mpx-detail').addEventListener('click', async e => {
  const q = e.target.closest('[data-c],[data-p]');
  if (q) return admGive(+q.dataset.c || 0, +q.dataset.p || 0);
  if (e.target.closest('#mpx-give')) {
    const c = Math.trunc(+$('mpx-coins').value || 0), pl = Math.trunc(+$('mpx-pulls').value || 0);
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
  const cr = e.target.closest('.mp-cr [data-op]');
  if (cr) return admCollOp(cr.closest('.mp-cr').dataset.g, cr.dataset.op);
  if (e.target.closest('#mpx-rename')) {
    const v = $('mpx-newpseudo').value.trim();
    const { error } = await sb.rpc('admin_set_pseudo', { target: admSel, p: v });
    if (error) return admMsg(errText(error), true);
    admMsg(`Renommé en ${v}`); return admAfter();
  }
  if (e.target.closest('#mpx-ban')) {
    const ban = !admSelP.banned;
    if (ban && !await ask(`Bannir ${admSelP.pseudo} ? Il ne pourra plus ouvrir, acheter, vendre ni écrire.`, { danger: true })) return;
    const { error } = await sb.rpc('admin_ban', { target: admSel, p_ban: ban });
    if (error) return admMsg(error.message, true);
    admMsg(`${admSelP.pseudo} ${ban ? 'banni' : 'débanni'}`); return admAfter();
  }
  if (e.target.closest('#mpx-clear-sc')) {
    if (!await ask(`Vider la vitrine et la bio de ${admSelP.pseudo} ?`)) return;
    const { error } = await sb.rpc('admin_clear_showcase', { target: admSel });
    if (error) return admMsg(error.message, true);
    admMsg('Vitrine et bio vidées'); return admAfter();
  }
  if (e.target.closest('#mpx-msgs')) return admMsgs();
  const dm = e.target.closest('[data-delmsg]');
  if (dm) {
    const { error } = await sb.rpc('admin_delete_message', { p_id: +dm.dataset.delmsg });
    if (error) return admMsg(error.message, true);
    dm.closest('.mp-mm').remove(); return admMsg('Message supprimé');
  }
  const clear = e.target.closest('#mpx-items-clear');
  if (clear || e.target.closest('#mpx-items-save')) {
    if (clear && !await ask(`Vider tous les objets de ${admSelP.pseudo} ?`, { danger: true })) return;
    const qs = [...document.querySelectorAll('[data-q]')].map(i => [i.dataset.q, clear ? 0 : Math.max(0, Math.trunc(+i.value || 0))]);
    for (const [it, q] of qs) { const { error } = await sb.rpc('admin_set_items', { target: admSel, p_item: it, p_qty: q }); if (error) return admMsg(error.message, true); }
    admMsg(clear ? 'Objets vidés' : 'Objets enregistrés'); return admAfter();
  }
  if (e.target.closest('#mpx-reset')) {
    if (!await ask(`Remettre ${admSelP.pseudo} à zéro ? (tirages, pièces, stock, effets effacés)`, { danger: true })) return;
    const { error } = await sb.rpc('admin_reset', { target: admSel });
    if (error) return admMsg(error.message, true);
    admMsg(`${admSelP.pseudo} remis à zéro`); return admAfter();
  }
});

// ---------- Global
async function admStats() {
  const { data: s } = await sb.rpc('admin_stats');
  if (!s) return;
  $('mpx-stats').innerHTML = [['Joueurs', fmt(s.players)], ['Tirages aujourd’hui', fmt(s.pulls_today)], ['Tirages au total', fmt(s.pulls_total)],
    ['Pièces en circulation', money(s.coins_total)], ['Meilleur tirage du jour', s.best_today ? '1/' + fmt(s.best_today) : '—']]
    .map(([l, v]) => `<div><b>${v}</b><span>${l}</span></div>`).join('');
}
$('mpx-give-all').addEventListener('click', async () => {
  const c = Math.trunc(+$('mpx-all-coins').value || 0), p = Math.trunc(+$('mpx-all-pulls').value || 0);
  if (!c && !p) return admMsg('Mets un nombre de pièces ou de pulls', true);
  if (!await ask(`Donner ${c} pièces et ${p} pulls à TOUS les joueurs ?`)) return;
  const { data, error } = await sb.rpc('admin_give', { target: null, p_coins: c, p_pulls: p });
  if (error) return admMsg(error.message, true);
  admMsg(`Donné à ${data} joueurs`); admStats(); ecoSync();
});
$('mpx-reset-all').addEventListener('click', async () => {
  if (!await ask('Remettre TOUS les joueurs à zéro ? Tape RESET pour confirmer.', { typed: 'RESET', danger: true })) return admMsg('Annulé');
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
  $('mpshop-list').innerHTML = `<table><thead><tr><th></th><th>Objet</th><th>Prix</th><th>Stock (cette période)</th><th>Vendus</th><th>En vente</th><th></th></tr></thead><tbody>${
    data.map(it => `<tr data-it="${it.id}" class="${it.active ? '' : 'off'}"><td class="mpshop-ic">${itemIcon(it)}</td><td><b>${esc(name(it))}</b><br><small class="muted">${it.id}</small></td>
      <td><input class="mpx-in" type="number" min="0" data-f="price" value="${it.price}"><br><small class="muted">normal : ${fmt(it.base_price)}${it.price !== it.base_price ? ' · <b class="mpshop-tmp">modifié</b>' : ''}</small></td>
      <td><input class="mpx-in" type="number" min="0" data-f="stock" value="${it.stock}"></td>
      <td>${it.sold}</td>
      <td><label class="mpshop-sw"><input type="checkbox" data-f="active" ${it.active ? 'checked' : ''}><span></span></label></td>
      <td><button class="btn primary sm" data-save>OK</button></td></tr>`).join('')}</tbody></table>`;
  const end = Date.now() + (sh?.reset_in || 0) * 1000;
  clearInterval(adsTimer);
  const tick = () => { const el = $('mpshop-reset'); if (!el || $('debug').hidden) return clearInterval(adsTimer); el.textContent = hms(Math.max(0, Math.round((end - Date.now()) / 1000))); };
  tick(); adsTimer = setInterval(tick, 1000);
}
$('mpshop-list').addEventListener('click', async e => {
  const b = e.target.closest('[data-save]'); if (!b) return;
  const tr = b.closest('tr'), v = f => tr.querySelector(`[data-f="${f}"]`);
  const { error } = await sb.rpc('admin_shop_set', { p_item: tr.dataset.it, p_price: Math.max(0, Math.trunc(+v('price').value)), p_active: v('active').checked, p_stock: Math.max(0, Math.trunc(+v('stock').value)) });
  if (error) return admMsg(error.message, true);
  admMsg(`${tr.dataset.it} mis à jour`); adsLoad(); if (!$('page-shop').hidden) renderShop();
});
$('mpshop-reroll').addEventListener('click', async () => {
  if (!await ask('Tirer un nouveau stock maintenant ? (les achats de la période sont remis à zéro pour tout le monde)')) return;
  const { error } = await sb.rpc('admin_shop_reroll');
  if (error) return admMsg(error.message, true);
  admMsg('Nouveau stock tiré'); adsLoad(); if (!$('page-shop').hidden) renderShop();
});

// ---------- Annonces : écrire à tout le site (plein écran, bandeau), voir et supprimer les anciennes
async function adaLoad() {
  const { data } = await sb.from('announcements').select('*').order('id', { ascending: false }).limit(50);
  $('mpann-list').innerHTML = (data || []).map(a => `<div class="mp-mm"><small class="muted">${new Date(a.created_at).toLocaleString(LOCALE(), { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} · ${a.fullscreen ? 'plein écran' : ''}${a.fullscreen && a.banner ? ' + ' : ''}${a.banner ? 'bandeau' : ''}</small><p>${esc(a.body)}</p><button data-delann="${a.id}" title="Supprimer">🗑</button></div>`).join('') || '<p class="muted">Aucune annonce</p>';
}
$('mpann-body').addEventListener('input', () => { $('mpann-count').textContent = $('mpann-body').value.length + '/500'; });
$('mpann-send').addEventListener('click', async () => {
  const body = $('mpann-body').value.trim(), full = $('mpann-full').checked, banner = $('mpann-banner').checked;
  if (!body) return admMsg('Écris un message', true);
  if (!full && !banner) return admMsg('Choisis plein écran et/ou bandeau', true);
  const { error } = await sb.rpc('admin_announce', { p_body: body, p_fullscreen: full, p_banner: banner });
  if (error) return admMsg(error.message, true);
  $('mpann-body').value = ''; $('mpann-count').textContent = '0/500';
  admMsg('Annonce envoyée à tout le monde 📢'); adaLoad();
});
$('mpann-list').addEventListener('click', async e => {
  const b = e.target.closest('[data-delann]'); if (!b) return;
  if (!await ask('Supprimer cette annonce ?', { danger: true })) return;
  const { error } = await sb.rpc('admin_delete_announcement', { p_id: +b.dataset.delann });
  if (error) return admMsg(error.message, true);
  admMsg('Annonce supprimée'); adaLoad();
});

// ---------- Codes promo : créer, modifier, activer / désactiver, supprimer
const ADC = { items: [], list: [] };
const adcName = id => (ITEMS.find(([k]) => k === id) || [id, id])[1];
function adcDrawItems() {
  $('mpcode-items').innerHTML = ADC.items.map((x, i) => `<span class="mpcode-it">${adcName(x.item)} ×${x.qty}<button data-rmit="${i}">✕</button></span>`).join('') || '<p class="muted small">Aucun objet</p>';
}
function adcForm(c = null) {
  $('mpcode-title').textContent = c ? `Modifier ${c.code}` : 'Nouveau code';
  $('mpcode-code').value = c?.code || ''; $('mpcode-code').disabled = !!c;
  $('mpcode-coins').value = c?.coins || ''; $('mpcode-pulls').value = c?.pulls || ''; $('mpcode-max').value = c?.max_uses || '';
  $('mpcode-exp').value = c?.expires_at ? new Date(Date.parse(c.expires_at) - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '';
  ADC.items = c ? [...c.items] : [];
  adcDrawItems();
}
async function adcLoad() {
  $('mpcode-item').innerHTML = ITEMS.map(([id, l]) => `<option value="${id}">${l}</option>`).join('');
  const { data, error } = await sb.rpc('admin_codes');
  if (error) return admMsg(error.message, true);
  ADC.list = data || [];
  const now = Date.now();
  $('mpcode-list').innerHTML = ADC.list.length ? `<table><thead><tr><th>Code</th><th>Récompense</th><th>Utilisé</th><th>Expire</th><th>Actif</th><th></th></tr></thead><tbody>${ADC.list.map(c => {
    const gone = (c.expires_at && Date.parse(c.expires_at) < now) || (c.max_uses && c.uses >= c.max_uses);
    const rew = [c.coins ? fmt(c.coins) + ' 🪙' : '', c.pulls ? c.pulls + ' pulls' : '', ...c.items.map(x => adcName(x.item) + (x.qty > 1 ? ' ×' + x.qty : ''))].filter(Boolean).join(' · ') || '—';
    return `<tr class="${!c.active || gone ? 'off' : ''}"><td><b class="mpcode-code">${esc(c.code)}</b></td><td>${rew}</td><td>${c.uses}${c.max_uses ? '/' + c.max_uses : ''}</td>
      <td>${c.expires_at ? new Date(c.expires_at).toLocaleString(LOCALE(), { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) + (gone && c.expires_at && Date.parse(c.expires_at) < now ? ' (expiré)' : '') : '—'}</td>
      <td><label class="mpshop-sw"><input type="checkbox" data-act="${esc(c.code)}" ${c.active ? 'checked' : ''}></label></td>
      <td class="mpcode-btns"><button data-copy="${esc(c.code)}" title="Copier">📋</button><button data-edit="${esc(c.code)}" title="Modifier">✏️</button><button data-del="${esc(c.code)}" title="Supprimer">🗑</button></td></tr>`;
  }).join('')}</tbody></table>` : '<p class="muted center">Aucun code pour l’instant</p>';
}
$('mpcode-rand').addEventListener('click', () => { $('mpcode-code').value = Array.from({ length: 8 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join(''); });
$('mpcode-add').addEventListener('click', () => {
  const item = $('mpcode-item').value, qty = Math.max(1, Math.trunc(+$('mpcode-qty').value || 1));
  const ex = ADC.items.find(x => x.item === item);
  if (ex) ex.qty += qty; else ADC.items.push({ item, qty });
  adcDrawItems();
});
$('mpcode-items').addEventListener('click', e => { const b = e.target.closest('[data-rmit]'); if (b) { ADC.items.splice(+b.dataset.rmit, 1); adcDrawItems(); } });
$('mpcode-reset').addEventListener('click', () => adcForm());
$('mpcode-save').addEventListener('click', async () => {
  const code = $('mpcode-code').value.trim().toUpperCase(), coins = Math.trunc(+$('mpcode-coins').value || 0), pulls = Math.trunc(+$('mpcode-pulls').value || 0);
  if (!coins && !pulls && !ADC.items.length) return admMsg('Mets au moins une récompense', true);
  const exp = $('mpcode-exp').value ? new Date($('mpcode-exp').value).toISOString() : null;
  const { error } = await sb.rpc('admin_code_save', { p_code: code, p_coins: coins, p_pulls: pulls, p_items: ADC.items, p_max: Math.trunc(+$('mpcode-max').value || 0), p_expires: exp });
  if (error) return admMsg(errText(error) === t('err_generic') ? error.message : errText(error), true);
  admMsg(`Code ${code} enregistré`); adcForm(); adcLoad();
});
$('mpcode-list').addEventListener('click', async e => {
  const cp = e.target.closest('[data-copy]');
  if (cp) { try { await navigator.clipboard.writeText(cp.dataset.copy); admMsg('Code copié'); } catch { admMsg(cp.dataset.copy); } return; }
  const ed2 = e.target.closest('[data-edit]');
  if (ed2) return adcForm(ADC.list.find(c => c.code === ed2.dataset.edit));
  const del = e.target.closest('[data-del]');
  if (del) {
    if (!await ask(`Supprimer le code ${del.dataset.del} ?`, { danger: true })) return;
    const { error } = await sb.rpc('admin_code_delete', { p_code: del.dataset.del });
    if (error) return admMsg(error.message, true);
    admMsg('Code supprimé'); adcLoad();
  }
});
$('mpcode-list').addEventListener('change', async e => {
  const a = e.target.closest('[data-act]'); if (!a) return;
  const { error } = await sb.rpc('admin_code_toggle', { p_code: a.dataset.act, p_active: a.checked });
  if (error) return admMsg(error.message, true);
  admMsg(`${a.dataset.act} ${a.checked ? 'activé' : 'désactivé'}`); adcLoad();
});
adcForm();

// ---------- Retours des joueurs (bêta) : bugs, idées, ajouts… marquer vu / fait, supprimer
const MPFB = { list: [], filter: 'new' };
const FB_ICO = { bug: '🐞', idea: '💡', add: '✨', other: '💬' };
async function mpfbLoad() {
  const { data, error } = await sb.rpc('admin_feedback');
  if (error) return admMsg(error.message, true);
  MPFB.list = data || [];
  const n = MPFB.list.filter(f => f.status === 'new').length;
  $('mpfb-badge').hidden = !n; $('mpfb-badge').textContent = n;
  mpfbDraw();
}
function mpfbDraw() {
  const F = [['new', '🆕 Nouveaux'], ['all', 'Tous'], ['bug', '🐞 Bugs'], ['idea', '💡 Idées'], ['add', '✨ Ajouts'], ['other', '💬 Autres'], ['done', '✅ Faits']];
  $('mpfb-filter').innerHTML = F.map(([k, l]) => `<button class="chip${MPFB.filter === k ? ' on' : ''}" data-f="${k}">${l} <small class="muted">${MPFB.list.filter(f => mpfbMatch(f, k)).length}</small></button>`).join('');
  const l = MPFB.list.filter(f => mpfbMatch(f, MPFB.filter));
  $('mpfb-list').innerHTML = l.map(f => `<div class="mpfb ${f.status}" data-id="${f.id}">
      <div class="mpfb-head"><span class="mpfb-kind k-${f.kind}">${FB_ICO[f.kind]} ${{ bug: 'Bug', idea: 'Idée', add: 'Ajout', other: 'Autre' }[f.kind]}</span>
        <b>${esc(f.pseudo || '?')}</b><small class="muted">${new Date(f.created_at).toLocaleString(LOCALE(), { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} · ${esc(f.page || '')}</small>
        <span class="mpfb-st">${f.status === 'new' ? '🆕' : f.status === 'seen' ? '👀 vu' : '✅ fait'}</span></div>
      <p>${esc(f.body)}</p>
      ${f.device ? `<small class="muted">${esc(f.device)}</small>` : ''}
      <div class="mpx-quick">${f.status !== 'seen' ? '<button data-s="seen">👀 Vu</button>' : ''}${f.status !== 'done' ? '<button data-s="done">✅ Fait</button>' : '<button data-s="new">↩︎ Rouvrir</button>'}<button class="red" data-s="delete">🗑 Supprimer</button></div>
    </div>`).join('') || '<p class="muted center">Aucun retour ici</p>';
}
const mpfbMatch = (f, k) => k === 'all' ? true : k === 'new' ? f.status === 'new' : k === 'done' ? f.status === 'done' : f.kind === k && f.status !== 'done';
$('mpfb-filter').addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (b) { MPFB.filter = b.dataset.f; mpfbDraw(); } });
$('mpfb-list').addEventListener('click', async e => {
  const b = e.target.closest('[data-s]'); if (!b) return;
  const id = +b.closest('.mpfb').dataset.id, s = b.dataset.s;
  if (s === 'delete' && !await ask('Supprimer ce retour ?', { danger: true })) return;
  const { error } = await sb.rpc('admin_feedback_set', { p_id: id, p_status: s });
  if (error) return admMsg(error.message, true);
  mpfbLoad();
});

// ---------- Bêta : ouverte / fermée
async function mpBetaDraw() {
  const { data } = await sb.from('site_settings').select('v').eq('k', 'beta').maybeSingle();
  const on = data?.v === 'on';
  $('mp-beta-toggle').textContent = on ? '✅ Bêta ouverte — la fermer' : '⛔ Bêta fermée — la rouvrir';
  $('mp-beta-toggle').dataset.on = on ? '1' : '';
}
$('mp-beta-toggle').addEventListener('click', async () => {
  const on = !!$('mp-beta-toggle').dataset.on;
  if (on && !await ask('Fermer la bêta ? Les nouveaux comptes ne seront plus bêta testeurs et le menu testeur disparaît (le badge β reste).', { danger: true })) return;
  const { error } = await sb.rpc('admin_set_beta', { p_on: !on });
  if (error) return admMsg(error.message, true);
  admMsg(on ? 'Bêta fermée' : 'Bêta rouverte'); mpBetaDraw(); if (typeof loadBetaState === 'function') loadBetaState(); ecoSync();
});

// ---------- Patch notes : écrire (une ligne par changement, + ~ ! -), modifier, supprimer
const PN_MARK = { '+': 'new', '~': 'change', '!': 'fix', '-': 'removed' }, PN_BACK = { new: '+', change: '~', fix: '!', removed: '-' };
let mppnEdit = null, mppnList = [];
async function mppnLoad() {
  const { data } = await sb.from('patchnotes').select('*').order('id', { ascending: false });
  mppnList = data || [];
  $('mppn-list').innerHTML = mppnList.map(n => `<div class="mp-mm"><small class="muted">${new Date(n.created_at).toLocaleDateString(LOCALE())} · ${(n.lines || []).length} lignes</small><p><b>${esc(n.title)}</b></p>
    <div class="mpx-quick"><button data-pedit="${n.id}">✏️ Modifier</button><button class="red" data-pdel="${n.id}">🗑</button></div></div>`).join('') || '<p class="muted">Aucune</p>';
}
function mppnForm(n = null) {
  mppnEdit = n?.id || null;
  $('mppn-title').textContent = n ? 'Modifier la patch note' : 'Nouvelle patch note';
  $('mppn-name').value = n?.title || '';
  $('mppn-lines').value = n ? (n.lines || []).map(l => `${PN_BACK[l.t] || '+'} ${l.x}`).join('\n') : '';
  $('mppn-name-en').value = n?.title_en || '';
  $('mppn-lines-en').value = n ? (n.lines_en || []).map(l => `${PN_BACK[l.t] || '+'} ${l.x}`).join('\n') : '';
}
const pnParse = v => v.split('\n').map(l => l.trim()).filter(Boolean).map(l => ({ t: PN_MARK[l[0]] || 'new', x: (PN_MARK[l[0]] ? l.slice(1) : l).trim() })).filter(l => l.x);
$('mppn-reset').addEventListener('click', () => mppnForm());
$('mppn-save').addEventListener('click', async () => {
  const title = $('mppn-name').value.trim();
  const lines = pnParse($('mppn-lines').value), titleEn = $('mppn-name-en').value.trim(), linesEn = pnParse($('mppn-lines-en').value);
  if (!title || !lines.length) return admMsg('Mets un titre et au moins une ligne', true);
  if (!titleEn || !linesEn.length) return admMsg('Mets aussi la version anglaise (titre + lignes)', true);
  const { error } = await sb.rpc('admin_patchnote_save', { p_id: mppnEdit, p_title: title, p_lines: lines, p_title_en: titleEn, p_lines_en: linesEn });
  if (error) return admMsg(error.message, true);
  admMsg(mppnEdit ? 'Patch note modifiée' : 'Patch note publiée 📢 (popup chez les joueurs à leur prochaine visite)');
  mppnForm(); mppnLoad(); if (typeof loadPatchnotes === 'function') loadPatchnotes();
});
$('mppn-list').addEventListener('click', async e => {
  const ed2 = e.target.closest('[data-pedit]'); if (ed2) return mppnForm(mppnList.find(n => n.id === +ed2.dataset.pedit));
  const d = e.target.closest('[data-pdel]');
  if (d && await ask('Supprimer cette patch note ?', { danger: true })) {
    const { error } = await sb.rpc('admin_patchnote_delete', { p_id: +d.dataset.pdel });
    if (error) return admMsg(error.message, true);
    admMsg('Patch note supprimée'); mppnLoad();
  }
});

// Ouvrir / fermer le panel (bouclier ou « debug ») : on recharge toujours la liste et les stats
function toggleAdmin() {
  $('debug').hidden = !$('debug').hidden;
  if ($('debug').hidden) return;
  admLoad(); admStats(); renderDebug(); mpfbLoad();
  if (admSel) admDetail();
}
$('open-admin').addEventListener('click', toggleAdmin);

renderAdminBtn();

// Affiche la bonne page au chargement (#inventaire, #boutique, #profil/…)
route();
