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
    rows.map(p => `<tr data-id="${p.id}" class="${admSel === p.id ? 'on' : ''}"><td><b>${esc(p.pseudo || '(sans pseudo)')}</b></td><td>${fmt(p.coins)}</td><td>${p.stock}/${p.stock_max}</td><td>${fmt(p.pulls)}</td><td>${p.best_odds ? '1/' + fmt(p.best_odds) : '—'}</td><td>${ago2(p.created_at)}</td></tr>`).join('')
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
const ITEMS = [['potion1', '🧪 Potion ×1,3 (5)'], ['potion2', '🧪 Potion ×2 (3)'], ['potion3', '🧪 Potion ×5 (1)'], ['instant', '⚡ Recharge éclair'], ['hourglass', '⏳ Sablier 1 h'],
  ...Object.keys(BANNERS).filter(b => b !== 'nuit').map(b => ['b_' + b, '🎨 Bannière ' + t('bn_' + b)])];
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
        <div><b>${p.luck_left ? '×' + p.luck_mult + ' · ' + p.luck_left : '—'}</b><span>potion</span></div>
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
    <div class="ad-2col">
      <div class="ad-box"><h4>Inventaire (${p.inventory.reduce((s, x) => s + x.n, 0)})</h4><div class="ad-inv">${p.inventory.map(x => `<span><img src="${texOf(jetonOf(x.jeton))}" alt="">${esc(jn(x.jeton))} <b>×${x.n}</b></span>`).join('') || '<p class="muted">Vide</p>'}</div></div>
      <div class="ad-box"><h4>Derniers tirages</h4><div class="ad-recent">${p.recent.map(r => `<div><span>${esc(jn(r.jeton))} <small class="muted">1/${fmt(r.odds)}</small></span><small class="muted">${new Date(r.at).toLocaleString(LOCALE(), { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}${r.sold ? ' · vendu' : ''}</small></div>`).join('') || '<p class="muted">Aucun</p>'}</div></div>
    </div>
    <button class="adm-danger" id="adm-reset">Remettre ${esc(p.pseudo || 'ce joueur')} à zéro</button>`;
  $('ad-banner').appendChild(bannerCanvas(p.banner));
  admSelP = p;
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

$('open-admin').addEventListener('click', () => {
  $('debug').hidden = !$('debug').hidden;
  if (!$('debug').hidden) { admLoad(); if (admSel) admDetail(); }
});

renderAdminBtn();

// Affiche la bonne page au chargement (#inventaire, #boutique, #profil/…)
route();
