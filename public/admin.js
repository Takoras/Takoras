// Panel admin : réservé aux comptes admin (vérifié par le serveur à chaque action).
// Joueurs : chercher, donner des pièces / pulls / un jeton, remettre à zéro. Tout le monde : idem pour tous. Tests : luck, jeton forcé, effets.

let admSel = null;
const admMsg = (text, err = false) => { const m = $('adm-msg'); m.textContent = text; m.classList.toggle('err', err); };

function renderAdminBtn() {
  $('open-admin').hidden = !ACC.isAdmin;
  if (!ACC.isAdmin) $('debug').hidden = true;
}

async function admLoad() {
  const { data, error } = await sb.rpc('admin_players', { q: $('adm-search').value.trim() });
  if (error) return admMsg('Erreur : ' + error.message, true);
  $('adm-list').innerHTML = data.length ? data.map(p =>
    `<button class="adm-p${admSel?.id === p.id ? ' on' : ''}" data-id="${p.id}" data-pseudo="${p.pseudo}">
      <b>${p.pseudo}</b><span>${fmt(p.coins)} ◆</span>
      <small>${p.stock}/${p.stock_max} pulls · ${p.pulls} tirages${p.best_odds ? ' · meilleur 1/' + fmt(p.best_odds) : ''}</small>
    </button>`).join('') : '<p class="empty">Aucun joueur</p>';
}

$('open-admin').addEventListener('click', () => { $('debug').hidden = !$('debug').hidden; if (!$('debug').hidden) { renderDebug(); admLoad(); } });
let admT;
$('adm-search').addEventListener('input', () => { clearTimeout(admT); admT = setTimeout(admLoad, 250); });
$('adm-list').addEventListener('click', e => {
  const b = e.target.closest('.adm-p'); if (!b) return;
  admSel = { id: b.dataset.id, pseudo: b.dataset.pseudo };
  $('adm-sel').hidden = false;
  $('adm-sel-name').textContent = admSel.pseudo;
  $('adm-jeton').innerHTML = SERIES.Takoras.map(j => `<option value="${j.name}">${jn(j.name)}</option>`).join('');
  admLoad();
});

// Après une action : on rafraîchit la liste, et notre propre affichage si on s'est servi soi-même
async function after(text) { admMsg(text); await admLoad(); ecoSync(); if (typeof loadAccount === 'function') loadAccount(ACC.user); }
const num = id => Math.trunc(+$(id).value || 0);

$('adm-give').addEventListener('click', async () => {
  if (!admSel) return;
  const c = num('adm-coins'), p = num('adm-pulls');
  if (!c && !p) return admMsg('Mets un nombre de ◆ ou de pulls', true);
  const { error } = await sb.rpc('admin_give', { target: admSel.id, p_coins: c, p_pulls: p });
  error ? admMsg(error.message, true) : after(`${admSel.pseudo} : ${c ? (c > 0 ? '+' : '') + fmt(c) + ' ◆ ' : ''}${p ? (p > 0 ? '+' : '') + p + ' pulls' : ''}`);
});
$('adm-give-jeton').addEventListener('click', async () => {
  if (!admSel) return;
  const j = $('adm-jeton').value;
  const { error } = await sb.rpc('admin_give_jeton', { target: admSel.id, p_jeton: j });
  error ? admMsg(error.message, true) : after(`${j} donné à ${admSel.pseudo}`);
});
$('adm-reset').addEventListener('click', async () => {
  if (!admSel || !confirm(`Remettre ${admSel.pseudo} à zéro ? (tirages, pièces et stock effacés)`)) return;
  const { error } = await sb.rpc('admin_reset', { target: admSel.id });
  error ? admMsg(error.message, true) : after(`${admSel.pseudo} remis à zéro`);
});
$('adm-give-all').addEventListener('click', async () => {
  const c = num('adm-all-coins'), p = num('adm-all-pulls');
  if (!c && !p) return admMsg('Mets un nombre de ◆ ou de pulls', true);
  if (!confirm(`Donner ${c} ◆ et ${p} pulls à TOUS les joueurs ?`)) return;
  const { data, error } = await sb.rpc('admin_give', { target: null, p_coins: c, p_pulls: p });
  error ? admMsg(error.message, true) : after(`Donné à ${data} joueurs`);
});
$('adm-reset-all').addEventListener('click', async () => {
  if (prompt('Tape RESET pour remettre TOUS les joueurs à zéro (tirages, pièces, stock) :') !== 'RESET') return admMsg('Annulé');
  const { data, error } = await sb.rpc('admin_reset', { target: null });
  error ? admMsg(error.message, true) : after(`${data} joueurs remis à zéro`);
});

renderAdminBtn();
