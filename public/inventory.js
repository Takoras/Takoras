// Inventaire : tes jetons (regroupés par type), filtres, tri, sélection multiple, revente, verrouillage, aperçu.

const INV = { rows: [], groups: [], sel: new Map(), selecting: false, tier: 'all', sort: 'rarity', q: '' };

async function loadInventory() {
  const { data, error } = await sb.rpc('my_inventory');
  if (error) return false;
  INV.rows = data;
  const g = {};
  data.forEach(r => {
    const x = g[r.jeton] ||= { name: r.jeton, odds: r.odds, ids: [], free: [], shown: 0, last: 0 };
    x.ids.push(r.id); if (!r.locked && !r.showcased && !r.in_deck) x.free.push(r.id); // en vitrine ou dans le deck = protégé de la vente
    if (r.showcased) x.shown++;
    if (r.in_deck) x.deck = (x.deck || 0) + 1;
    x.last = Math.max(x.last, Date.parse(r.created_at));
  });
  INV.groups = Object.values(g);
  for (const [k, n] of INV.sel) { const x = g[k]; if (!x || !x.free.length) INV.sel.delete(k); else INV.sel.set(k, Math.min(n, x.free.length)); }
  return true;
}

function visibleGroups() {
  let l = INV.groups.filter(x => (INV.tier === 'all' || tierKey(x.odds) === INV.tier) && jn(x.name).toLowerCase().includes(INV.q));
  const by = { rarity: (a, b) => b.odds - a.odds, count: (a, b) => b.ids.length - a.ids.length || b.odds - a.odds, name: (a, b) => jn(a.name).localeCompare(jn(b.name)), recent: (a, b) => b.last - a.last };
  return l.sort(by[INV.sort]);
}

function selTotals() {
  let n = 0, v = 0, rare = false;
  for (const [k, q] of INV.sel) { const x = INV.groups.find(g => g.name === k); n += q; v += q * sellValue(x.odds); if (x.odds >= 1000) rare = true; }
  return { n, v, rare };
}

async function renderInventory() {
  const page = $('page-inv');
  if (!ACC.user) { page.innerHTML = `<div class="page-empty"><h2>${t('nav_inv')}</h2><p class="muted">${t('acc_need')}</p><button class="btn primary" onclick="openAccount('login')">${t('login')}</button></div>`; return; }
  if (!page.dataset.ready) {
    page.dataset.ready = 1;
    page.innerHTML = `
      <div class="page-head">
        <div><div class="eyebrow">${t('nav_inv')}</div><h2 class="page-title">${t('inv_title')}</h2><p class="muted" id="inv-sum"></p></div>
        <button class="btn ghost" id="inv-mode">${t('inv_select')}</button>
      </div>
      <div class="inv-tools">
        <div class="chips" id="inv-tiers">${['all', 'r_common', 'r_rare', 'r_epic', 'r_legend', 'r_myth'].map(k => `<button class="chip" data-t="${k}">${t(k === 'all' ? 'all' : k)}</button>`).join('')}</div>
        <div class="inv-right">
          <input class="mpx-in inv-search" id="inv-q" placeholder="${t('search')}">
          <select class="mpx-in" id="inv-sort">${['rarity', 'count', 'recent', 'name'].map(k => `<option value="${k}">${t('sort_' + k)}</option>`).join('')}</select>
        </div>
      </div>
      <div class="inv-items" id="inv-items"></div>
      <div class="inv-grid" id="inv-grid"></div>
      <div class="sell-bar" id="sell-bar">
        <div class="sb-left"><b id="sb-n"></b><span id="sb-v"></span></div>
        <div class="sb-btns">
          <button class="btn ghost sm" data-q="dupes">${t('sel_dupes')}</button>
          <button class="btn ghost sm" data-q="common">${t('sel_common')}</button>
          <button class="btn ghost sm" data-q="all">${t('sel_all')}</button>
          <button class="btn ghost sm" data-q="none">${t('sel_none')}</button>
          <button class="btn primary" id="sb-sell">${t('sell')}</button>
        </div>
      </div>`;
    $('inv-tiers').addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) { INV.tier = b.dataset.t; drawInventory(); } });
    $('inv-q').addEventListener('input', e => { INV.q = e.target.value.trim().toLowerCase(); drawInventory(); });
    $('inv-sort').addEventListener('change', e => { INV.sort = e.target.value; drawInventory(); });
    $('inv-mode').addEventListener('click', () => { INV.selecting = !INV.selecting; if (!INV.selecting) INV.sel.clear(); drawInventory(); });
    $('inv-grid').addEventListener('click', onCardClick);
    $('sell-bar').addEventListener('click', onBarClick);
    $('inv-items').addEventListener('click', async e => {
      const b = e.target.closest('[data-use]'); if (!b) return;
      b.disabled = true;
      const { data, error } = await sb.rpc('use_item', { p_item: b.dataset.use });
      if (error) { sfx.deny(); toast(errText(error), true); } else { applyState(data); sfx.upgrade(); toast(t('item_used')); }
      drawItems();
    });
  }
  $('inv-grid').innerHTML = `<p class="muted">…</p>`;
  if (!(await loadInventory())) return;
  drawInventory();
  drawItems();
}

// mode 'sell' : les jetons partis se dissolvent en pixels (sinon ils s'effacent simplement, ex. filtre)
function drawInventory(mode = '') {
  const snap = moSnap($('inv-grid'), '.ic');
  const total = INV.rows.length, value = INV.rows.reduce((s, r) => s + sellValue(r.odds), 0);
  $('inv-sum').innerHTML = `${t('inv_count', { n: fmt(total), k: INV.groups.length })} · ${t('inv_value')} ${money(value)}`;
  document.querySelectorAll('#inv-tiers .chip').forEach(b => b.classList.toggle('on', b.dataset.t === INV.tier));
  $('inv-mode').textContent = INV.selecting ? t('inv_done') : t('inv_select');
  $('inv-mode').classList.toggle('primary', INV.selecting);
  const list = visibleGroups();
  $('inv-grid').innerHTML = list.length ? list.map(x => {
    const j = jetonOf(x.name), q = INV.sel.get(x.name) || 0, locked = !x.free.length, s = statsOf(j.name, j.odds);
    return `<div class="ic${q ? ' sel' : ''}${locked ? ' locked' : ''}" data-n="${esc(x.name)}" data-key="${esc(x.name)}" data-sig="${x.ids.length}|${locked}|${x.deck || 0}|${x.shown}" style="--g:${hexRGB(j.glow)}">
      ${x.ids.length > 1 ? `<span class="ic-n">×${x.ids.length}</span>` : ''}
      ${x.deck ? `<span class="ic-lock" title="${t('in_deck')}">⚔️</span>` : x.shown ? `<span class="ic-lock" title="${t('in_showcase')}">📌</span>` : locked ? '<span class="ic-lock" title="🔒">🔒</span>' : ''}
      <img src="${texOf(j)}" alt="">
      <b>${jnH(x.name)}</b>
      <small><span class="t-${tierKey(x.odds)}">1/${fmt(x.odds)}</span> · ⚡${fmt(s.power)}</small>
      ${INV.selecting && x.free.length ? `<div class="ic-step"><button data-d="-1">−</button><span>${q}/${x.free.length}</span><button data-d="1">+</button></div>` : ''}
    </div>`;
  }).join('') : `<div class="page-empty"><p class="muted">${t('inv_empty')}</p><a class="btn primary" href="#">${t('nav_home')}</a></div>`;
  const { n, v } = selTotals();
  $('sell-bar').classList.toggle('on', INV.selecting);
  $('sb-n').textContent = t('sel_n', { n });
  $('sb-v').innerHTML = n ? ` · +${money(v)}` : '';
  $('sb-sell').disabled = !n;
  moPlay(snap, $('inv-grid'), '.ic', { dissolve: mode === 'sell' });
}

function onCardClick(e) {
  const card = e.target.closest('.ic'); if (!card) return;
  const x = INV.groups.find(g => g.name === card.dataset.n);
  const step = e.target.closest('[data-d]');
  if (INV.selecting) {
    if (!x.free.length) return toast(t('inv_locked'), true);
    const cur = INV.sel.get(x.name) || 0;
    const next = step ? Math.max(0, Math.min(x.free.length, cur + +step.dataset.d)) : (cur ? 0 : x.free.length);
    next ? INV.sel.set(x.name, next) : INV.sel.delete(x.name);
    sfx.click();
    return drawInventory();
  }
  // Hors sélection : aperçu du jeton avec ses actions
  const allLocked = !x.free.length;
  openJeton(x.name, `
    <p class="muted">${t('inv_have', { n: x.ids.length })}${x.shown ? ' · 📌 ' + t('shown_n', { n: x.shown }) : ''}</p>
    <div class="jm-actions">
      ${x.free.length ? `<button class="btn primary" data-a="sell1">${t('sell_one')} · +${money(sellValue(x.odds))}</button>` : ''}
      ${x.free.length > 1 ? `<button class="btn ghost" data-a="selldupes">${t('sell_dupes', { n: x.ids.length - 1 })}</button>` : ''}
      <button class="btn ghost" data-a="lock">${allLocked ? '🔓 ' + t('unlock') : '🔒 ' + t('lock')}</button>
    </div>`);
  $('jm-card').onclick = async ev => {
    const a = ev.target.closest('[data-a]')?.dataset.a; if (!a) return;
    if (a === 'sell1') await sellIds([x.free[0]]);
    if (a === 'selldupes') await sellIds(x.free.slice(0, x.ids.length - 1));
    if (a === 'lock') { await sb.rpc('lock_pulls', { ids: x.ids, p_locked: !allLocked }); toast(allLocked ? t('unlocked') : t('locked_ok')); }
    jm.classList.remove('on');
    if (!$('page-inv').hidden) { await loadInventory(); drawInventory(a === 'lock' ? '' : 'sell'); }
  };
}

async function onBarClick(e) {
  const q = e.target.closest('[data-q]')?.dataset.q;
  if (q) {
    INV.sel.clear();
    if (q !== 'none') INV.groups.forEach(x => {
      const n = q === 'all' ? x.free.length : q === 'dupes' ? Math.min(x.free.length, x.ids.length - 1) : x.odds < 60 ? x.free.length : 0;
      if (n > 0) INV.sel.set(x.name, n);
    });
    sfx.click();
    return drawInventory();
  }
  if (e.target.closest('#sb-sell')) {
    const { n } = selTotals();
    if (!n) return;
    const ids = [];
    for (const [k, q] of INV.sel) ids.push(...INV.groups.find(g => g.name === k).free.slice(0, q));
    await sellIds(ids);
    INV.sel.clear(); INV.selecting = false;
    await loadInventory(); drawInventory('sell');
  }
}

// Vente : pas de confirmation, sauf si ça contient un jeton rare (1/1000 et plus)
async function sellIds(ids) {
  const rows = INV.rows.filter(r => ids.includes(r.id));
  if (rows.some(r => r.odds >= 1000) && !await ask(t('sell_rare_confirm', { n: rows.length, v: fmt(rows.reduce((s, r) => s + sellValue(r.odds), 0)) }))) return;
  const { data, error } = await sb.rpc('sell_pulls', { ids });
  if (error) return toast(errText(error), true);
  applyState(data.state);
  sfx.upgrade();
  toast(t('sold', { n: data.sold }) + ` · +${money(data.coins)}`);
}

// Objets (potions, sablier, recharge) : achetés en boutique, utilisés ici quand tu veux
async function drawItems() {
  const { data } = await sb.rpc('my_items');
  const box = $('inv-items'); if (!box) return;
  const snap = moSnap(box, '.it-card');
  box.innerHTML = (data || []).length ? `<h3 class="prof-h">${t('items')}</h3><div class="items-row">${data.map(it => {
    const [name, desc] = itemText({ id: it.item, kind: it.kind, data: it.data });
    return `<div class="it-card" data-key="${it.item}" data-sig="${it.qty}"><div class="si-icon">${(ICONS[it.item] || ICONS.instant)()}</div><b>${name} <span class="ic-n">×${it.qty}</span></b><p class="muted">${desc}</p><button class="btn primary sm" data-use="${it.item}">${t('use')}</button></div>`;
  }).join('')}</div><h3 class="prof-h">${t('nav_inv')}</h3>` : '';
  moPlay(snap, box, '.it-card', { dissolve: true });
}
