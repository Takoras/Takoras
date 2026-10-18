// Bêta : la puce « bêta » à côté du logo (clic = patch notes), le menu des bêta testeurs (se donner de quoi tout tester),
// et les patch notes (page + popup quand il y en a une nouvelle).

const BETA = { open: false, notes: [] };

// ---------- Bêta ouverte ? (réglage du site)
async function loadBetaState() {
  const { data } = await sb.from('site_settings').select('v').eq('k', 'beta').maybeSingle();
  BETA.open = data?.v === 'on';
  $('beta-chip').hidden = !BETA.open;
}
$('beta-chip').addEventListener('click', () => { sfx.click(); openPatchnotes(); });

// =====================================================================
// Menu bêta testeur
// =====================================================================
const navBtn = document.createElement('button');
navBtn.className = 'mute tester-btn'; navBtn.id = 'open-tester'; navBtn.hidden = true; navBtn.title = t('tester_menu');
navBtn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/><path d="M7.5 15h9"/></svg>';
$('open-settings').before(navBtn);
navBtn.addEventListener('click', () => { sfx.click(); openTester(); });
function renderTesterBtn() { navBtn.hidden = !ACC.user || !ACC.tester; }

const TEST = { jeton: 'Mobu', variant: '', qty: 1, item: 'potion1', iqty: 1 };
async function openTester() {
  if (!ACC.tester) return;
  const { data: shop } = await sb.from('shop_items').select('id, kind, price, data').eq('active', true);
  const items = (shop || []).sort((a, b) => a.kind.localeCompare(b.kind) || a.price - b.price);
  const o = document.createElement('div');
  o.className = 'askbox tester-box';
  const lucks = [1, 2, 5, 10, 25, 100, 500];
  const draw = () => {
    o.innerHTML = `<div class="ask-card tester-card">
      <button class="fb-x" aria-label="${t('close')}">✕</button>
      <h3>🧪 ${t('tester_menu')}</h3>
      <p class="muted small">${t('tester_sub')}</p>
      <div class="ts-sec"><h4>🎟️ ${t('pulls')}</h4><div class="ts-row">${[5, 10, 50, 100].map(n => `<button data-pulls="${n}">+${n}</button>`).join('')}</div></div>
      <div class="ts-sec"><h4>🪙 ${t('ts_coins')}</h4><div class="ts-row">${[10000, 100000, 1000000, 10000000].map(n => `<button data-coins="${n}">+${fmt(n)}</button>`).join('')}</div></div>
      <div class="ts-sec"><h4>🎁 ${t('items')}</h4><div class="ts-row">
        <select class="mpx-in" id="ts-item">${items.map(it => `<option value="${it.id}"${it.id === TEST.item ? ' selected' : ''}>${esc(itemText(it)[0])}</option>`).join('')}</select>
        <input class="mpx-in ts-qty" id="ts-iqty" type="number" min="1" max="100" value="${TEST.iqty}"><button class="primary" data-give-item>${t('ts_give')}</button></div></div>
      <div class="ts-sec"><h4>🪙 ${t('ts_tokens')}</h4><div class="ts-row">
        <select class="mpx-in" id="ts-jeton">${SERIES.Takoras.map(j => `<option value="${esc(j.name)}"${j.name === TEST.jeton ? ' selected' : ''}>${esc(jn(j.name))} · 1/${fmt(j.odds)}</option>`).join('')}</select>
        <select class="mpx-in" id="ts-var"><option value="">${t('v_none')}</option>${Object.keys(VARIANTS).map(v => `<option value="${v}"${v === TEST.variant ? ' selected' : ''}>${t('v_' + v)}</option>`).join('')}</select>
        <input class="mpx-in ts-qty" id="ts-qty" type="number" min="1" max="50" value="${TEST.qty}"><button class="primary" data-give-jeton>${t('ts_give')}</button></div></div>
      <div class="ts-sec"><h4>🎲 ${t('ts_pulls_test')}</h4><p class="muted small">${t('ts_pulls_hint')}</p>
        <div class="ts-row"><span class="ts-lbl">${t('luck')}</span>${lucks.map(l => `<button class="${(debug.luck || 1) === l ? 'on' : ''}" data-luck="${l}">×${l}</button>`).join('')}</div>
        <div class="ts-row"><span class="ts-lbl">${t('ts_force')}</span><select class="mpx-in" id="ts-force"><option value="">${t('random')}</option>${SERIES.Takoras.map(j => `<option value="${esc(j.name)}"${j.name === debug.force ? ' selected' : ''}>${esc(jn(j.name))} · 1/${fmt(j.odds)}</option>`).join('')}</select>
          <select class="mpx-in" id="ts-fvar"><option value="">${t('random')}</option><option value="none"${debug.variant === 'none' ? ' selected' : ''}>${t('v_none')}</option>${Object.keys(VARIANTS).map(v => `<option value="${v}"${v === debug.variant ? ' selected' : ''}>${t('v_' + v)}</option>`).join('')}</select></div>
      </div>
    </div>`;
  };
  draw();
  document.body.appendChild(o);
  requestAnimationFrame(() => o.classList.add('on'));
  const close = () => { o.classList.remove('on'); setTimeout(() => o.remove(), 200); };
  const give = async (args, label) => {
    const { data, error } = await sb.rpc('beta_give', args);
    if (error) { sfx.deny(); return toast(errText(error), true); }
    applyState(data); sfx.upgrade(); toast('🧪 ' + label);
    if (!$('page-inv').hidden && typeof renderInventory === 'function') renderInventory();
  };
  o.addEventListener('change', e => {
    if (e.target.id === 'ts-item') TEST.item = e.target.value;
    if (e.target.id === 'ts-jeton') TEST.jeton = e.target.value;
    if (e.target.id === 'ts-var') TEST.variant = e.target.value;
    if (e.target.id === 'ts-qty') TEST.qty = Math.max(1, Math.min(50, +e.target.value || 1));
    if (e.target.id === 'ts-iqty') TEST.iqty = Math.max(1, Math.min(100, +e.target.value || 1));
    if (e.target.id === 'ts-force') debug.force = e.target.value;
    if (e.target.id === 'ts-fvar') debug.variant = e.target.value;
  });
  o.addEventListener('click', async e => {
    if (e.target === o || e.target.closest('.fb-x')) return close();
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.pulls) return give({ p_pulls: +b.dataset.pulls }, `+${b.dataset.pulls} ${t('pulls_word')}`);
    if (b.dataset.coins) return give({ p_coins: +b.dataset.coins }, `+${fmt(+b.dataset.coins)} ${t('ts_coins').toLowerCase()}`);
    if ('giveItem' in b.dataset) return give({ p_item: TEST.item, p_qty: TEST.iqty }, `${TEST.iqty}× ${$('ts-item').selectedOptions[0].text}`);
    if ('giveJeton' in b.dataset) return give({ p_jeton: TEST.jeton, p_variant: TEST.variant || null, p_qty: TEST.qty }, `${TEST.qty}× ${jn(TEST.jeton)}${TEST.variant ? ' ' + t('v_' + TEST.variant) : ''}`);
    if (b.dataset.luck) { debug.luck = +b.dataset.luck; sfx.click(); draw(); }
  });
}

// =====================================================================
// Patch notes
// =====================================================================
const PN_ICO = { new: ['✅', 'pn_new'], change: ['🔄', 'pn_change'], fix: ['🔧', 'pn_fix'], removed: ['❌', 'pn_removed'] };
// Version anglaise si le joueur a mis le site en anglais (et qu'elle existe)
const pnTitle = n => (SETTINGS.lang === 'en' && n.title_en) || n.title;
const pnLines = n => ['new', 'change', 'fix', 'removed'].map(k => {
  const l = ((SETTINGS.lang === 'en' && n.lines_en?.length ? n.lines_en : n.lines) || []).filter(x => x.t === k);
  return l.length ? `<div class="pn-group pn-${k}"><h5>${PN_ICO[k][0]} ${t(PN_ICO[k][1])}</h5><ul>${l.map(x => `<li>${esc(x.x)}</li>`).join('')}</ul></div>` : '';
}).join('');
async function loadPatchnotes() {
  const { data } = await sb.from('patchnotes').select('*').order('id', { ascending: false }).limit(50);
  BETA.notes = data || [];
}
// Toutes les patch notes (clic sur « bêta », menu Plus)
async function openPatchnotes() {
  if (!BETA.notes.length) await loadPatchnotes();
  const card = $('jm-card');
  jm.style.setProperty('--g', '139, 92, 246');
  card.onclick = card.oninput = card.onchange = null;
  card.innerHTML = `<button class="set-close jm-close" aria-label="${t('close')}">✕</button>
    <div class="pn-page"><h2>📜 ${t('pn_title')}</h2>
      ${BETA.notes.map((n, i) => `<article class="pn${i === 0 ? ' latest' : ''}"><div class="pn-head"><b>${esc(pnTitle(n))}</b><small class="muted">${new Date(n.created_at).toLocaleDateString(LOCALE(), { day: 'numeric', month: 'long', year: 'numeric' })}</small></div>${pnLines(n)}</article>`).join('') || `<p class="muted">${t('pn_none')}</p>`}
    </div>`;
  jm.classList.add('on');
  markPatchSeen();
}
const markPatchSeen = () => { try { localStorage.setItem('takoras-pn-seen', String(BETA.notes[0]?.id || 0)); } catch {} };
// Popup quand il y a une nouvelle patch note depuis ta dernière visite
async function patchPopup() {
  await loadPatchnotes();
  const last = BETA.notes[0]; if (!last) return;
  let seen = 0; try { seen = +localStorage.getItem('takoras-pn-seen') || 0; } catch {}
  if (last.id <= seen) return;
  setTimeout(function show() {
    if (document.documentElement.classList.contains('lock') || document.querySelector('.askbox') || jm.classList.contains('on')) return setTimeout(show, 3000); // on attend un moment calme
    const o = document.createElement('div');
    o.className = 'askbox pn-box';
    o.innerHTML = `<div class="ask-card pn-card">
      <div class="pn-pop-tag">✨ ${t('pn_newtag')}</div>
      <h3>${esc(pnTitle(last))}</h3>
      <div class="pn-pop-body">${pnLines(last)}</div>
      <div class="ask-btns"><button class="btn ghost" data-a="all">📜 ${t('pn_all')}</button><button class="btn primary" data-a="ok">${t('pn_ok')}</button></div>
    </div>`;
    document.body.appendChild(o);
    requestAnimationFrame(() => o.classList.add('on'));
    sfx.announce?.();
    markPatchSeen();
    o.addEventListener('click', e => {
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (!a && e.target !== o) return;
      o.classList.remove('on'); setTimeout(() => o.remove(), 200);
      if (a === 'all') openPatchnotes();
    });
  }, 1500);
}

loadBetaState();
patchPopup();
