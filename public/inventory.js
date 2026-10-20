// Deux pages :
//  - Inventaire (#inventaire) : tes objets (potions, sabliers, recharges), à utiliser quand tu veux.
//  - Bestiaire (#bestiaire) : tous les jetons d'une collection (série), ceux que tu as en couleur avec leur nombre,
//    les autres en silhouette. C'est aussi là qu'on sélectionne, vend et verrouille ses jetons.
//    Un onglet par collection (Takoras aujourd'hui, d'autres plus tard), et un onglet par variante.

// serie : collection affichée · vtab : '' = normaux, sinon gold / celeste / ombre · own : seulement ceux que j'ai
const INV = { groups: [], sel: new Map(), selecting: false, tier: 'all', sort: 'rarity', q: '', vtab: '', serie: 'Takoras', own: false };
const VKEYS = Object.keys(VARIANTS);
const serieOf = r => r.serie || 'Takoras';
const gKey = (serie, name, v) => serie + '|' + name + '|' + (v || '');
// Les collections qui existent (celles qui ont des jetons)
const seriesList = () => Object.keys(SERIES).filter(s => SERIES[s]?.length);

// Les deux onglets du menu Inventaire
const invTabs = on => `<div class="seg inv-tabs"><a href="#inventaire" class="${on === 'tok' ? 'on' : ''}">📖 ${t('bestiary')}</a><a href="#inventaire/objets" class="${on === 'items' ? 'on' : ''}">🎒 ${t('items')}</a></div>`;

// Le serveur renvoie l'inventaire déjà regroupé (un seul JSON) : plus de limite de 1000 jetons
async function loadInventory() {
  const { data, error } = await sb.rpc('my_inventory_groups');
  if (error) return false;
  const g = {};
  (data || []).forEach(r => {
    // une carte par jeton ET par variante (un Mobu Doré est rangé à part du Mobu normal)
    const key = gKey(serieOf(r), r.jeton, r.variant);
    g[key] = { key, serie: serieOf(r), name: r.jeton, variant: r.variant || '', odds: r.odds, ids: r.ids, free: r.free || [], // en vitrine ou dans le deck = protégé de la vente
      shown: +r.shown, deck: +r.deck, last: Date.parse(r.last), luck: +r.best_luck || 0 };
  });
  INV.groups = Object.values(g);
  for (const [k, n] of INV.sel) { const x = g[k]; if (!x || !x.free.length) INV.sel.delete(k); else INV.sel.set(k, Math.min(n, x.free.length)); }
  return true;
}

// Ce que le joueur a déjà eu (même vendu), par collection + jeton : { total, owned, vars: { '' : n, gold: n… } }
let COLL = new Map();
async function loadCollection() {
  const { data } = await sb.rpc('my_collection');
  COLL = new Map();
  (data || []).forEach(r => {
    const k = serieOf(r) + '|' + r.jeton, c = COLL.get(k) || { total: 0, owned: 0, vars: {} };
    c.total += +r.total; c.owned += +r.owned; c.vars[r.variant || ''] = (c.vars[r.variant || ''] || 0) + +r.total;
    COLL.set(k, c);
  });
}

function selTotals() {
  let n = 0, v = 0;
  for (const [k, q] of INV.sel) { const x = INV.groups.find(g => g.key === k); if (!x) continue; n += q; v += q * sellValue(x.odds, x.variant); }
  return { n, v };
}

// =====================================================================
// Inventaire : les objets
// =====================================================================
async function renderInventory() {
  const page = $('page-inv');
  if (!ACC.user) { page.innerHTML = `<div class="page-empty"><h2>${t('nav_inv')}</h2><p class="muted">${t('acc_need')}</p><button class="btn primary" onclick="openAccount('login')">${t('login')}</button></div>`; return; }
  if (!page.dataset.ready) {
    page.dataset.ready = 1;
    page.innerHTML = `
      <div class="page-head"><div><div class="eyebrow">${t('nav_inv')}</div><h2 class="page-title">${t('inv_items_title')}</h2><p class="muted">${t('inv_items_sub')}</p></div></div>
      ${invTabs('items')}
      <div class="inv-items" id="inv-items"></div>`;
    $('inv-items').addEventListener('click', async e => {
      const card = e.target.closest('.it-card'); if (!card) return;
      const inp = card.querySelector('[data-n]');
      const st = e.target.closest('[data-d]');
      if (st) { inp.value = Math.max(1, Math.min(+inp.max, (+inp.value || 1) + +st.dataset.d)); return sfx.click(); }
      const b = e.target.closest('[data-use], [data-useall]'); if (!b) return;
      const item = b.dataset.use || b.dataset.useall, qty = b.dataset.useall ? +b.dataset.q : Math.max(1, +(inp?.value) || 1);
      card.querySelectorAll('button').forEach(x => { x.disabled = true; });
      const { data, error } = await sb.rpc('use_items', { p_item: item, p_qty: qty });
      if (error) { sfx.deny(); toast(errText(error), true); } else { applyState(data.state); sfx.upgrade(); toast(data.used > 1 ? t('items_used', { n: data.used }) : t('item_used')); }
      drawItems();
    });
  }
  await drawItems();
}

// Objets (potions, sablier, recharge) : achetés en boutique, utilisés ici quand tu veux
async function drawItems() {
  const box = $('inv-items'); if (!box) return;
  const { data } = await sb.rpc('my_items');
  const snap = moSnap(box, '.it-card');
  box.innerHTML = (data || []).length ? `<div class="items-row">${data.map(it => {
    const [name, desc] = itemText({ id: it.item, kind: it.kind, data: it.data });
    // la quantité est une pastille dans le coin (avant, un « ×100 » long faisait passer le nom à la ligne)
    return `<div class="it-card" data-key="${it.item}" data-sig="${it.qty}"><span class="it-qty">×${it.qty}</span><div class="si-icon">${(ICONS[it.item] || ICONS.instant)()}</div><b>${name}</b><p class="muted">${desc}</p>
      <div class="it-use">${it.qty > 1 ? `<div class="it-step"><button data-d="-1" aria-label="−">−</button><input type="number" min="1" max="${it.qty}" value="1" data-n><button data-d="1" aria-label="+">+</button></div>` : ''}
        <button class="btn primary sm" data-use="${it.item}">${t('use')}</button>${it.qty > 1 ? `<button class="btn ghost sm" data-useall="${it.item}" data-q="${it.qty}">${t('use_all')}</button>` : ''}</div></div>`;
  }).join('')}</div>`
    : `<div class="page-empty"><p class="muted">${t('inv_items_empty')}</p><a class="btn primary" href="#boutique">${t('nav_shop')}</a></div>`;
  moPlay(snap, box, '.it-card', { dissolve: true });
}

// =====================================================================
// Bestiaire : tous les jetons, et la vente
// =====================================================================
async function renderBestiary() {
  const page = $('page-bestiary');
  if (!ACC.user) { page.innerHTML = `<div class="page-empty"><h2>${t('bestiary')}</h2><p class="muted">${t('acc_need')}</p><button class="btn primary" onclick="openAccount('login')">${t('login')}</button></div>`; return; }
  if (!seriesList().includes(INV.serie)) INV.serie = seriesList()[0];
  if (!page.dataset.ready) {
    page.dataset.ready = 1;
    page.innerHTML = `
      <div class="page-head">
        <div><div class="eyebrow">${t('nav_inv')}</div><h2 class="page-title">${t('bst_title')}</h2><p class="muted" id="inv-sum"></p></div>
        <button class="btn ghost" id="inv-mode">${t('inv_select')}</button>
      </div>
      ${invTabs('tok')}
      <div class="seg inv-tabs" id="bst-series"></div>
      <div class="bst-head" id="bst-head"></div>
      <div class="inv-vtabs" id="inv-vtabs"></div>
      <div class="inv-tools">
        <div class="chips" id="inv-tiers">${['all', 'r_common', 'r_rare', 'r_epic', 'r_legend', 'r_myth'].map(k => `<button class="chip" data-t="${k}">${t(k === 'all' ? 'all' : k)}</button>`).join('')}<button class="chip" id="bst-own">✓ ${t('bst_owned_only')}</button></div>
        <div class="inv-right">
          <input class="mpx-in inv-search" id="inv-q" placeholder="${t('search')}">
          <select class="mpx-in" id="inv-sort">${['rarity', 'count', 'recent', 'name'].map(k => `<option value="${k}">${t('sort_' + k)}</option>`).join('')}</select>
        </div>
      </div>
      <div class="inv-grid bst-grid2" id="inv-grid"></div>
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
    $('inv-tiers').addEventListener('click', e => {
      const b = e.target.closest('.chip'); if (!b) return;
      if (b.id === 'bst-own') INV.own = !INV.own; else INV.tier = b.dataset.t;
      drawInventory();
    });
    $('inv-q').addEventListener('input', e => { INV.q = e.target.value.trim().toLowerCase(); drawInventory(); });
    $('inv-sort').addEventListener('change', e => { INV.sort = e.target.value; drawInventory(); });
    $('inv-mode').addEventListener('click', () => { INV.selecting = !INV.selecting; if (!INV.selecting) INV.sel.clear(); else INV.own = true; drawInventory(); });
    $('inv-grid').addEventListener('click', onCardClick);
    $('bst-series').addEventListener('click', e => { const b = e.target.closest('[data-s]'); if (!b || b.dataset.s === INV.serie) return; INV.serie = b.dataset.s; INV.sel.clear(); sfx.click(); drawInventory(); });
    $('inv-vtabs').addEventListener('click', e => { const b = e.target.closest('[data-vt]'); if (!b || b.dataset.vt === INV.vtab) return; INV.vtab = b.dataset.vt; INV.sel.clear(); sfx.click(); drawInventory(); });
    $('sell-bar').addEventListener('click', onBarClick);
  }
  $('inv-grid').innerHTML = `<p class="muted">…</p>`;
  const [ok] = await Promise.all([loadInventory(), loadCollection(), loadLevels()]);
  if (!ok) return;
  drawInventory();
}

// Les cartes visibles : tous les jetons de la collection, pour l'onglet de variante choisi
function visibleCards() {
  const list = (SERIES[INV.serie] || []).map(j => {
    const g = INV.groups.find(x => x.key === gKey(INV.serie, j.name, INV.vtab));
    const c = COLL.get(INV.serie + '|' + j.name);
    return { j, g, seen: !!(c && c.vars[INV.vtab]), total: c?.vars[INV.vtab] || 0 };
  }).filter(x => (INV.tier === 'all' || tierKey(x.j.odds) === INV.tier) && (!INV.own || x.g) && jn(x.j.name).toLowerCase().includes(INV.q));
  const cnt = x => x.g?.ids.length || 0, vo = x => vOdds(x.j.odds, INV.vtab);
  const by = { rarity: (a, b) => vo(a) - vo(b), count: (a, b) => cnt(b) - cnt(a) || a.j.odds - b.j.odds, name: (a, b) => jn(a.j.name).localeCompare(jn(b.j.name)), recent: (a, b) => (b.g?.last || 0) - (a.g?.last || 0) };
  return list.sort(by[INV.sort]);
}

// mode 'sell' : les jetons partis se dissolvent en pixels
function drawInventory(mode = '') {
  if (!$('inv-grid') || !$('bst-series')) return;
  const snap = moSnap($('inv-grid'), '.ic');
  const gs = INV.groups.filter(x => x.serie === INV.serie);
  const all = SERIES[INV.serie] || [];
  const value = gs.reduce((s, x) => s + x.ids.length * sellValue(x.odds, x.variant), 0);
  $('inv-sum').innerHTML = `${t('inv_count', { n: fmt(gs.reduce((s, x) => s + x.ids.length, 0)), k: gs.length })} · ${t('inv_value')} ${money(value)}`;
  // Onglets des collections (un seul pour l'instant : Takoras)
  const ser = seriesList();
  $('bst-series').hidden = ser.length < 2;
  $('bst-series').innerHTML = ser.map(s => `<button data-s="${esc(s)}" class="${s === INV.serie ? 'on' : ''}">${esc(s)}</button>`).join('');
  // Progression de la collection
  const found = all.filter(j => COLL.has(INV.serie + '|' + j.name)).length;
  const vFound = all.reduce((s, j) => s + VKEYS.filter(v => COLL.get(INV.serie + '|' + j.name)?.vars[v]).length, 0), vAll = all.length * VKEYS.length;
  $('bst-head').innerHTML = `
    <div><b>${found}/${all.length}</b><span>${t('bst_found')}</span><div class="bst-bar"><i style="width:${found / (all.length || 1) * 100}%"></i></div></div>
    <div><b>${vFound}/${vAll}</b><span>${t('bst_variants')}</span><div class="bst-bar v"><i style="width:${vFound / (vAll || 1) * 100}%"></i></div></div>`;
  document.querySelectorAll('#inv-tiers .chip[data-t]').forEach(b => b.classList.toggle('on', b.dataset.t === INV.tier));
  $('bst-own').classList.toggle('on', INV.own);
  // Onglets Normaux / Doré / Céleste / Ombre, avec le nombre de jetons possédés dans chacun
  const cnt = v => gs.filter(x => x.variant === v).reduce((s, x) => s + x.ids.length, 0);
  $('inv-vtabs').innerHTML = [['', t('v_none')], ...VKEYS.map(v => [v, t('v_' + v)])].map(([v, l]) =>
    `<button class="ivt${v ? ' v-' + v : ''}${INV.vtab === v ? ' on' : ''}" data-vt="${v}">${v ? `<i class="v-dot on ${v}"></i>` : ''}${l}<small>${cnt(v)}</small></button>`).join('');
  $('inv-mode').textContent = INV.selecting ? t('inv_done') : t('inv_select');
  $('inv-mode').classList.toggle('primary', INV.selecting);
  const list = visibleCards();
  $('inv-grid').innerHTML = list.length ? list.map(({ j, g: x, seen }) => {
    const v = INV.vtab, n = x?.ids.length || 0;
    const num = all.indexOf(j) + 1;
    if (!x) // pas (ou plus) dans ton sac : déjà vu = couleur passée, jamais eu = silhouette
      return `<div class="ic ${seen ? 'gone' : 'unk'}" data-n="${esc(j.name)}" data-key="${esc(gKey(INV.serie, j.name, v))}" data-sig="0" style="--g:${hexRGB(j.glow)}">
        <span class="bc-num">#${String(num).padStart(2, '0')}</span>
        <img class="${seen ? vCls(v) : 'sil'}" src="${texOf(j)}" alt="">
        <b>${jnH(j.name)}</b>
        <small><span class="t-${tierKey(j.odds)}">1/${fmt(vOdds(j.odds, v))}</span>${seen ? ' · ×0' : ''}</small>
      </div>`;
    const q = INV.sel.get(x.key) || 0, locked = !x.free.length, s = statsOf(j.name, j.odds, INV.vtab);
    return `<div class="ic${q ? ' sel' : ''}${locked ? ' locked' : ''}" data-n="${esc(j.name)}" data-key="${esc(x.key)}" data-sig="${n}|${locked}|${x.deck || 0}|${x.shown}" style="--g:${hexRGB(j.glow)}">
      <span class="bc-num">#${String(num).padStart(2, '0')}</span>
      <span class="ic-n">×${n}</span>
      ${x.deck ? `<span class="ic-lock" title="${t('in_deck')}">⚔️</span>` : x.shown ? `<span class="ic-lock" title="${t('in_showcase')}">📌</span>` : locked ? '<span class="ic-lock" title="🔒">🔒</span>' : ''}
      <img class="${vCls(v)}" src="${texOf(j)}" alt="">
      <b>${jnH(j.name)}</b>
      <small><span class="t-${tierKey(j.odds)}">1/${fmt(vOdds(j.odds, v))}</span> · ⚡${fmt(s.power)}</small>
      ${INV.selecting && x.free.length ? `<div class="ic-step"><button data-d="-1">−</button><span>${q}/${x.free.length}</span><button data-d="1">+</button></div>` : ''}
    </div>`;
  }).join('') : `<div class="page-empty"><p class="muted">${t(INV.own ? 'inv_empty' : 'bst_none')}</p><a class="btn primary" href="#">${t('nav_home')}</a></div>`;
  const { n, v } = selTotals();
  $('sell-bar').classList.toggle('on', INV.selecting);
  $('sb-n').textContent = t('sel_n', { n });
  $('sb-v').innerHTML = n ? ` · +${money(v)}` : '';
  $('sb-sell').disabled = !n;
  moPlay(snap, $('inv-grid'), '.ic', { dissolve: mode === 'sell' });
}

function onCardClick(e) {
  const card = e.target.closest('.ic'); if (!card) return;
  const x = INV.groups.find(g => g.key === card.dataset.key);
  const c = COLL.get(INV.serie + '|' + card.dataset.n);
  sfx.click();
  // Pas dans le sac : fiche du bestiaire (variantes trouvées, ou silhouette)
  if (!x) {
    if (INV.selecting) return;
    if (!c) return openJeton(card.dataset.n, `<p class="muted bst-unk">🔒 ${t('bst_unknown')}</p>`, '', true);
    return openJeton(card.dataset.n, `<p class="muted">${t('bst_got', { n: c.total })} · ${t('inv_have', { n: 0 })}</p>${bstVars(c)}${combatInfoHTML(card.dataset.n, 0)}`, INV.vtab);
  }
  const step = e.target.closest('[data-d]');
  if (INV.selecting) {
    if (!x.free.length) return toast(t('inv_locked'), true);
    const cur = INV.sel.get(x.key) || 0;
    const next = step ? Math.max(0, Math.min(x.free.length, cur + +step.dataset.d)) : (cur ? 0 : x.free.length);
    next ? INV.sel.set(x.key, next) : INV.sel.delete(x.key);
    return drawInventory();
  }
  // Hors sélection : aperçu du jeton avec ses actions
  const allLocked = !x.free.length;
  openJeton(x.name, `
    <p class="muted">${t('inv_have', { n: x.ids.length })}${x.shown ? ' · 📌 ' + t('shown_n', { n: x.shown }) : ''}${c ? ' · ' + t('bst_got', { n: c.total }) : ''}${x.luck > 1 ? ` · 🍀 ${t('best_luck', { l: fmtLuck(x.luck) })}` : ''}</p>
    ${c ? bstVars(c) : ''}
    ${combatInfoHTML(x.name, INV.groups.filter(g => g.name === x.name).reduce((s, g) => s + g.ids.length, 0))}
    <div class="jm-actions">
      ${x.free.length ? `<button class="btn primary" data-a="sell1">${t('sell_one')} · +${money(sellValue(x.odds, x.variant))}</button>` : ''}
      ${x.free.length > 1 ? `<button class="btn ghost" data-a="selldupes">${t('sell_dupes', { n: x.ids.length - 1 })}</button>` : ''}
      <button class="btn ghost" data-a="lock">${allLocked ? '🔓 ' + t('unlock') : '🔒 ' + t('lock')}</button>
    </div>`, x.variant);
  $('jm-card').onclick = async ev => {
    const up = ev.target.closest('[data-lvlup]');
    if (up) { up.disabled = true; if (await levelUp(up.dataset.lvlup)) { jm.classList.remove('on'); await Promise.all([loadInventory(), loadCollection()]); drawInventory('sell'); } else up.disabled = false; return; }
    const a = ev.target.closest('[data-a]')?.dataset.a; if (!a) return;
    if (a === 'sell1') await sellIds([x.free[0]]);
    if (a === 'selldupes') await sellIds(x.free.slice(0, x.ids.length - 1));
    if (a === 'lock') { await sb.rpc('lock_pulls', { ids: x.ids, p_locked: !allLocked }); toast(allLocked ? t('unlocked') : t('locked_ok')); }
    jm.classList.remove('on');
    if (!$('page-bestiary').hidden) { await Promise.all([loadInventory(), loadCollection()]); drawInventory(a === 'lock' ? '' : 'sell'); }
  };
}
// Variantes déjà trouvées pour ce jeton
const bstVars = c => `<div class="bst-vlist">${VKEYS.map(v => `<span class="${c.vars[v] ? 'on' : ''}">${c.vars[v] ? vTag(v) : `<i class="v-dot ${v}"></i> ${t('v_' + v)} · 1/${fmt(VARIANTS[v].odds)}`}</span>`).join('')}</div>`;

async function onBarClick(e) {
  const q = e.target.closest('[data-q]')?.dataset.q;
  if (q) {
    INV.sel.clear();
    if (q !== 'none') visibleCards().forEach(({ g: x }) => {
      if (!x) return;
      const n = q === 'all' ? x.free.length : q === 'dupes' ? Math.min(x.free.length, x.ids.length - 1) : x.odds < 60 ? x.free.length : 0;
      if (n > 0) INV.sel.set(x.key, n);
    });
    sfx.click();
    return drawInventory();
  }
  if (e.target.closest('#sb-sell')) {
    const { n } = selTotals();
    if (!n) return;
    const ids = [];
    for (const [k, q] of INV.sel) ids.push(...INV.groups.find(g => g.key === k).free.slice(0, q));
    await sellIds(ids);
    INV.sel.clear(); INV.selecting = false;
    await Promise.all([loadInventory(), loadCollection()]); drawInventory('sell');
  }
}

// Vente : pas de confirmation, sauf si ça contient un jeton rare (1/1000 et plus)
async function sellIds(ids) {
  const set = new Set(ids), rows = INV.groups.flatMap(x => x.ids.filter(id => set.has(id)).map(() => x));
  if (rows.some(x => vOdds(x.odds, x.variant) >= 1000) && !await ask(t('sell_rare_confirm', { n: rows.length, v: fmt(rows.reduce((s, x) => s + sellValue(x.odds, x.variant), 0)) }))) return;
  const { data, error } = await sb.rpc('sell_pulls', { ids });
  if (error) return toast(errText(error), true);
  applyState(data.state);
  sfx.upgrade();
  toast(t('sold', { n: data.sold }) + ` · +${money(data.coins)}`);
}
