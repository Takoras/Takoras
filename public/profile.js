// Profil : bannière (à acheter), photo (bientôt des photos à choisir), bio, stats et vitrine de 5 jetons.
// Sur ton propre profil : modifier la bio et la bannière, choisir la vitrine, et en bas ta zone privée (compte Discord, déconnexion).

const N_JETONS = () => SERIES.Takoras.length;
async function getProfile(pseudo) { const { data } = await sb.rpc('profile_public', { p_pseudo: pseudo }); return data; }
let PROF = null; // profil affiché

async function saveProfile(part) {
  const p = PROF;
  const body = { p_avatar: p.avatar, p_banner: p.banner, p_bio: p.bio, p_showcase: p.showcase.map(s => (s ? s.id : null)), ...part };
  const { error } = await sb.rpc('update_profile', body);
  if (error) { toast(errText(error), true); return false; }
  return true;
}

async function renderProfile(pseudo) {
  const page = $('page-profile');
  if (!pseudo) { page.innerHTML = `<div class="page-empty"><p class="muted">${t('acc_need')}</p><button class="btn primary" onclick="openAccount('login')">${t('login')}</button></div>`; return; }
  const same = PROF && PROF.pseudo === pseudo && page.querySelector('.prof');
  if (!same) page.innerHTML = '<p class="muted">…</p>'; // seulement au premier affichage : sinon on garde l'ancien jusqu'au nouveau
  const p = await getProfile(pseudo);
  PROF = p;
  if (!p) { page.innerHTML = `<div class="page-empty"><p class="muted">${t('profile_404')}</p></div>`; return; }
  const mine = ACC.pseudo && p.pseudo === ACC.pseudo;
  const bp = p.best_pull, best = bp ? jetonOf(bp.jeton) : null; // meilleur tirage en comptant la variante (1/400 Doré = 1/8 000)
  page.innerHTML = `
    <div class="prof">
      <div class="prof-banner${p.banner ? '' : ' none'}" id="prof-banner">${p.banner ? '' : mine ? `<span class="muted">${t('no_banner')}</span>` : ''}</div>
      <div class="prof-head">
        <div class="prof-pp">${avatarHTML(p, 104)}</div>
        <div class="prof-id"><h2>${esc(p.pseudo)} <small class="prof-num">#${String(p.num).padStart(6, '0')}</small>${p.streak > 0 ? ` <span class="prof-streak" title="${t('streak_ok', { n: p.streak })}">🔥 ${p.streak}</span>` : ''}</h2><p class="muted">${p.bio ? esc(p.bio) : mine ? t('bio_empty_me') : ''}</p></div>
        ${mine ? `<button class="btn ghost" id="prof-edit">✏️ ${t('edit_profile')}</button>` : '<div class="prof-fr" id="prof-fr"></div>'}
      </div>
      <div class="prof-stats">
        <div><b>${fmt(p.pulls)}</b><span>${t('st_pulls')}</span></div>
        <div><b>${best ? jnH(best.name) + vTag(bp.variant) : '—'}</b><span>${t('st_best')}${bp ? ' · 1/' + fmt(bp.eff) : ''}</span></div>
        <div><b>${p.collection}/${N_JETONS()}</b><span>${t('st_collec')}</span></div>
        <div><b>${fmt(p.owned)}</b><span>${t('st_owned')}</span></div>
      </div>
      <h3 class="prof-h">${t('showcase')} ${mine ? `<small class="muted">${t('showcase_click')}</small>` : ''}</h3>
      <div class="showcase">${Array.from({ length: 5 }, (_, i) => {
        const s = p.showcase[i];
        if (!s) return `<div class="sc empty${mine ? ' can' : ''}" data-slot="${i}" data-key="${i}:e">${mine ? '+' : ''}</div>`;
        const j = jetonOf(s.jeton);
        return `<div class="sc" data-slot="${i}" data-key="${i}:${s.id}" data-n="${esc(s.jeton)}" data-v="${s.variant || ''}" style="--g:${hexRGB(j.glow)}">${s.variant ? `<span class="sc-v">${vTag(s.variant)}</span>` : ''}<img class="${vCls(s.variant)}" src="${texOf(j)}" alt=""><b>${jnH(s.jeton)}</b><small>1/${fmt(s.odds)}</small></div>`;
      }).join('')}</div>
      <h3 class="prof-h">📖 ${t('bestiary')} <small class="muted" id="pc-count"></small></h3>
      <div class="pc-grid" id="pc-grid"></div>
      ${p.beta ? `<div class="beta-thanks"><span>🧪</span><div><b>${t('beta_tester')}</b><small>${t('beta_thanks')}</small></div></div>` : ''}
      <p class="muted small">${t('joined', { d: new Date(p.joined).toLocaleDateString(LOCALE()) })}${(p.wins || p.losses) ? ' · ' + t('battles_rec', { w: p.wins || 0, l: p.losses || 0 }) : ''}</p>
      ${mine ? `
      <div class="prof-private">
        <h3 class="prof-h">🔒 ${t('private_zone')} <small class="muted">${t('private_hint')}</small></h3>
        <div class="pv-row"><span>${t('pv_login')}</span><b>${p.provider === 'discord' ? 'Discord' : esc(p.provider || '—')}</b></div>
        <div class="pv-row"><span>${t('pv_email')}</span><b>${esc(p.email || '—')}</b></div>
        <div class="pv-row"><span>${t('settings')}</span><button class="btn ghost sm" id="pv-settings">${t('open')}</button></div>
        <button class="btn ghost" id="pv-logout">${t('logout')}</button>
      </div>` : ''}
    </div>`;
  if (p.banner) $('prof-banner').appendChild(bannerCanvas(p.banner));
  drawProfileCollection(p.pseudo);
  page.querySelectorAll('.sc').forEach(el => el.addEventListener('click', () => {
    if (mine) return pickShowcase(+el.dataset.slot);
    if (el.dataset.n) openJeton(el.dataset.n, '', el.dataset.v);
  }));
  if (!mine) friendButton(p.pseudo, $('prof-fr'));
  if (mine) {
    $('prof-edit').addEventListener('click', () => editProfile());
    $('pv-settings').addEventListener('click', () => $('open-settings').click());
    $('pv-logout').addEventListener('click', async () => { await sb.auth.signOut(); location.hash = ''; });
  }
}

// Fenêtre « choisir un jeton pour la vitrine » : tous tes jetons, recherche et tri, simple
async function pickShowcase(slot) {
  await loadInventory();
  const cur = PROF.showcase[slot];
  const st = { q: '', sort: 'rarity' };
  const card = $('jm-card');
  jm.style.setProperty('--g', '139, 92, 246');
  card.onclick = card.oninput = null;
  const draw = () => {
    const used = new Set(PROF.showcase.filter(Boolean).map(s => s.id));
    let l = INV.groups.filter(x => jn(x.name).toLowerCase().includes(st.q));
    l.sort(st.sort === 'name' ? (a, b) => jn(a.name).localeCompare(jn(b.name)) : (a, b) => b.odds - a.odds);
    card.querySelector('.pk-list').innerHTML = l.map(x => {
      const j = jetonOf(x.name), id = x.ids.find(i => !used.has(i));
      return `<button class="pk${id ? '' : ' off'}" data-id="${id || ''}" style="--g:${hexRGB(j.glow)}"><img class="${vCls(x.variant)}" src="${texOf(j)}" alt=""><b>${jnH(x.name)}${vTag(x.variant)}</b><small>1/${fmt(x.odds)}${x.ids.length > 1 ? ' · ×' + x.ids.length : ''}</small></button>`;
    }).join('') || `<p class="muted">${t('inv_empty')}</p>`;
  };
  card.innerHTML = `
    <button class="set-close jm-close" aria-label="${t('close')}">✕</button>
    <div class="pk-wrap">
      <h2>${t('pick_title', { n: slot + 1 })}</h2>
      <div class="pk-tools"><input class="mpx-in" id="pk-q" placeholder="${t('search')}"><select class="mpx-in" id="pk-sort"><option value="rarity">${t('sort_rarity')}</option><option value="name">${t('sort_name')}</option></select></div>
      <div class="pk-list"></div>
      ${cur ? `<button class="btn ghost" id="pk-remove">${t('pick_remove')}</button>` : ''}
    </div>`;
  draw();
  jm.classList.add('on');
  card.oninput = e => { if (e.target.id === 'pk-q') { st.q = e.target.value.trim().toLowerCase(); draw(); } };
  card.onchange = e => { if (e.target.id === 'pk-sort') { st.sort = e.target.value; draw(); } };
  card.onclick = async e => {
    const b = e.target.closest('.pk'), rm = e.target.closest('#pk-remove');
    if (!b && !rm) return;
    if (b && !b.dataset.id) return toast(t('already_showcase'));
    // 5 cases fixes : le jeton va exactement dans la case choisie
    const ids = Array.from({ length: 5 }, (_, i) => (PROF.showcase[i] ? PROF.showcase[i].id : null));
    ids[slot] = rm ? null : +b.dataset.id;
    if (await saveProfile({ p_showcase: ids })) {
      jm.classList.remove('on'); sfx.click();
      const snap = moSnap($('page-profile'), '.sc');
      await renderProfile(ACC.pseudo);
      moPlay(snap, $('page-profile'), '.sc', { dissolve: true });
    }
  };
}

// Modifier le profil : bio, et bannière parmi celles achetées. Les photos de profil arrivent bientôt.
function editProfile() {
  const p = PROF, st = { banner: p.banner, bio: p.bio, pseudo: p.pseudo, avatar: p.avatar || 'default' };
  const canRename = p.pseudo_free || !p.pseudo_next;
  const card = $('jm-card');
  jm.style.setProperty('--g', '139, 92, 246');
  card.onclick = card.oninput = card.onchange = null;
  const draw = () => {
    card.innerHTML = `
      <button class="set-close jm-close" aria-label="${t('close')}">✕</button>
      <div class="pe">
        <h2>${t('edit_profile')}</h2>
        <h4>${t('acc_pseudo')} <small class="muted">${p.pseudo_free ? t('pseudo_free') : canRename ? t('pseudo_month') : t('pseudo_next', { d: new Date(p.pseudo_next).toLocaleDateString(LOCALE()) })}</small></h4>
        <input class="mpx-in pe-pseudo" id="pe-pseudo" maxlength="16" value="${esc(st.pseudo)}" ${canRename ? '' : 'disabled'} autocomplete="off">
        <h4>${t('pe_bio')} <small class="muted" id="pe-count">${st.bio.length}/120</small></h4>
        <textarea class="mpx-in pe-bio" id="pe-bio" maxlength="120" rows="2">${esc(st.bio)}</textarea>
        <h4>${t('pe_banner')}</h4>
        ${(p.banners || []).length ? `<div class="pe-banners"><button class="pe-b none${!st.banner ? ' on' : ''}" data-b="">${t('none')}</button>${p.banners.map(b => `<button class="pe-b${b === st.banner ? ' on' : ''}" data-b="${b}" title="${bannerName(b)}"></button>`).join('')}</div>`
          : `<p class="muted small">${t('no_banner_owned')}</p>`}
        <h4>${t('pe_pp')}</h4>
        <div class="pe-pps">${['default', ...FREE_PP, ...Object.keys(AVATARS).filter(a => !FREE_PP.includes(a))].map(a => {
          const owned = a === 'default' || FREE_PP.includes(a) || (p.avatars || []).includes(a);
          return `<button class="pe-pp${st.avatar === a ? ' on' : ''}${owned ? '' : ' locked'}" data-pp="${a}" title="${owned ? '' : t('pp_shop')}">${a === 'default' ? `<span>${esc((p.pseudo || '?')[0].toUpperCase())}</span>` : `<img src="${AVATARS[a]}" alt="">`}${owned ? '' : '<i>🔒</i>'}</button>`;
        }).join('')}</div>
        <div class="jm-actions"><button class="btn primary" id="pe-save">${t('save')}</button><button class="btn ghost jm-close">${t('cancel')}</button></div>
      </div>`;
    card.querySelectorAll('.pe-b[data-b]:not(.none)').forEach(b => b.appendChild(bannerCanvas(b.dataset.b)));
  };
  draw();
  jm.classList.add('on');
  card.oninput = e => { if (e.target.id === 'pe-pseudo') st.pseudo = e.target.value.trim(); if (e.target.id === 'pe-bio') { st.bio = e.target.value; $('pe-count').textContent = st.bio.length + '/120'; } };
  card.onclick = async e => {
    const b = e.target.closest('[data-b]');
    if (b) { st.banner = b.dataset.b || null; return draw(); }
    const pp = e.target.closest('.pe-pp');
    if (pp) {
      if (pp.classList.contains('locked')) { jm.classList.remove('on'); location.hash = '#boutique'; return toast(t('pp_shop')); }
      st.avatar = pp.dataset.pp; sfx.click(); return draw();
    }
    if (e.target.closest('#pe-save')) {
      // nouveau pseudo : on confirme (il ne pourra plus changer avant 30 jours)
      let name = ACC.pseudo;
      if (canRename && st.pseudo !== p.pseudo) {
        if (!await ask(t(p.pseudo_free ? 'pseudo_confirm_free' : 'pseudo_confirm', { n: st.pseudo }))) return;
        const { error } = await sb.rpc('change_pseudo', { p: st.pseudo });
        if (error) { sfx.deny(); return toast(errText(error), true); }
        name = ACC.pseudo = st.pseudo; renderAccBtn();
      }
      if (await saveProfile({ p_banner: st.banner, p_bio: st.bio.trim(), p_avatar: st.avatar })) {
        ACC.avatar = st.avatar; renderAccBtn();
        jm.classList.remove('on'); sfx.upgrade(); toast(t('profile_saved'));
        if (name !== p.pseudo) location.hash = '#profil/' + encodeURIComponent(name); else renderProfile(name);
      }
    }
  };
}

// Collection d'un joueur sur son profil : tous les jetons du jeu, ceux qu'il a déjà eus en couleur (+ ses variantes)
async function drawProfileCollection(pseudo) {
  const { data } = await sb.rpc('collection_of', { p_pseudo: pseudo });
  const grid = $('pc-grid'); if (!grid || PROF?.pseudo !== pseudo) return;
  const got = new Map();
  (data || []).forEach(r => { const c = got.get(r.jeton) || { total: 0, vars: new Set() }; c.total += +r.total; if (r.variant) c.vars.add(r.variant); got.set(r.jeton, c); });
  const all = [...SERIES.Takoras].sort((a, b) => a.odds - b.odds);
  $('pc-count').textContent = `${all.filter(j => got.has(j.name)).length}/${all.length}`;
  grid.innerHTML = all.map(j => {
    const c = got.get(j.name);
    return `<button class="pc${c ? '' : ' unk'}" data-n="${esc(j.name)}" style="--g:${hexRGB(j.glow)}" title="${esc(jn(j.name))} · 1/${fmt(j.odds)}">
      <img class="${c ? '' : 'sil'}" src="${texOf(j)}" alt=""><small>1/${fmt(j.odds)}</small>
      <span class="bc-vars">${Object.keys(VARIANTS).map(v => `<i class="v-dot ${v}${c && c.vars.has(v) ? ' on' : ''}"></i>`).join('')}</span></button>`;
  }).join('');
  grid.onclick = e => { const b = e.target.closest('.pc'); if (!b) return; sfx.click(); openJeton(b.dataset.n, '', '', b.classList.contains('unk')); };
}
