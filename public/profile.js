// Profil : bannière, photo (Discord ou un jeton), bio, stats et vitrine de 5 jetons. Modifiable pour son propre profil.

const N_JETONS = () => SERIES.Takoras.length;
async function getProfile(pseudo) { const { data } = await sb.rpc('profile_public', { p_pseudo: pseudo }); return data; }

// Enregistre une partie du profil (le reste est repris tel quel)
async function updateMyProfile(part) {
  const p = await getProfile(ACC.pseudo); if (!p) return false;
  const body = { p_avatar: p.avatar, p_banner: p.banner, p_bio: p.bio, p_showcase: p.showcase.map(s => s.id), ...Object.fromEntries(Object.entries(part).map(([k, v]) => ['p_' + k, v])) };
  const { error } = await sb.rpc('update_profile', body);
  if (error) { toast(errText(error), true); return false; }
  if (part.avatar) { ACC.avatar = part.avatar; renderAccBtn(); }
  return true;
}
async function addToShowcase(id) {
  const p = await getProfile(ACC.pseudo);
  const ids = p.showcase.map(s => s.id);
  if (ids.includes(id)) return toast(t('already_showcase'));
  if (ids.length >= 5) return toast(t('showcase_full'), true);
  if (await updateMyProfile({ showcase: [...ids, id] })) toast(t('showcase_added'));
}

async function renderProfile(pseudo) {
  const page = $('page-profile');
  if (!pseudo) { page.innerHTML = `<div class="page-empty"><p class="muted">${t('acc_need')}</p><button class="btn primary" onclick="openAccount('login')">${t('login')}</button></div>`; return; }
  page.innerHTML = '<p class="muted">…</p>';
  const p = await getProfile(pseudo);
  if (!p) { page.innerHTML = `<div class="page-empty"><p class="muted">${t('profile_404')}</p></div>`; return; }
  const mine = ACC.pseudo && p.pseudo === ACC.pseudo;
  const best = p.best ? SERIES.Takoras.filter(j => j.odds === p.best)[0] : null;
  page.innerHTML = `
    <div class="prof">
      <div class="prof-banner" id="prof-banner"></div>
      <div class="prof-head">
        <div class="prof-pp">${avatarHTML(p, 96)}</div>
        <div class="prof-id"><h2>${esc(p.pseudo)}</h2><p class="muted">${p.bio ? esc(p.bio) : mine ? t('bio_empty_me') : ''}</p></div>
        ${mine ? `<button class="btn ghost" id="prof-edit">✏️ ${t('edit_profile')}</button>` : ''}
      </div>
      <div class="prof-stats">
        <div><b>${fmt(p.pulls)}</b><span>${t('st_pulls')}</span></div>
        <div><b>${best ? esc(jn(best.name)) : '—'}</b><span>${t('st_best')}${p.best ? ' · 1/' + fmt(p.best) : ''}</span></div>
        <div><b>${p.collection}/${N_JETONS()}</b><span>${t('st_collec')}</span></div>
        <div><b>${fmt(p.owned)}</b><span>${t('st_owned')}</span></div>
      </div>
      <h3 class="prof-h">${t('showcase')}</h3>
      <div class="showcase">${Array.from({ length: 5 }, (_, i) => {
        const s = p.showcase[i];
        if (!s) return `<div class="sc empty">${mine ? '+' : ''}</div>`;
        const j = jetonOf(s.jeton);
        return `<div class="sc" data-n="${esc(s.jeton)}" style="--g:${hexRGB(j.glow)}"><img src="${texOf(j)}" alt=""><b>${esc(jn(s.jeton))}</b><small>1/${fmt(s.odds)}</small></div>`;
      }).join('')}</div>
      <p class="muted small">${t('joined', { d: new Date(p.joined).toLocaleDateString(LOCALE()) })}</p>
    </div>`;
  $('prof-banner').appendChild(bannerCanvas(p.banner));
  page.querySelectorAll('.sc[data-n]').forEach(el => el.addEventListener('click', () => openJeton(el.dataset.n)));
  page.querySelectorAll('.sc.empty').forEach(el => mine && el.addEventListener('click', () => { location.hash = '#inventaire'; toast(t('showcase_hint')); }));
  if (mine) $('prof-edit').addEventListener('click', () => editProfile(p));
}

// Fenêtre de modification : bannière, photo, bio, vitrine
async function editProfile(p) {
  await loadInventory();
  const kinds = [...new Map(INV.rows.map(r => [r.jeton, r])).values()].sort((a, b) => b.odds - a.odds);
  const st = { avatar: p.avatar, banner: p.banner, bio: p.bio, showcase: p.showcase.map(s => s.id) };
  const card = $('jm-card');
  jm.style.setProperty('--g', '139, 92, 246');
  card.onclick = null;
  const draw = () => {
    card.innerHTML = `
      <button class="set-close jm-close" aria-label="${t('close')}">✕</button>
      <div class="pe">
        <h2>${t('edit_profile')}</h2>
        <h4>${t('pe_banner')}</h4>
        <div class="pe-banners">${Object.keys(BANNERS).map(b => `<button class="pe-b${b === st.banner ? ' on' : ''}${p.banners.includes(b) ? '' : ' lock'}" data-b="${b}" title="${t('bn_' + b)}"></button>`).join('')}</div>
        <h4>${t('pe_pp')}</h4>
        <div class="pe-pps">
          <button class="pe-pp${st.avatar === 'discord' ? ' on' : ''}" data-pp="discord">${p.discord_avatar ? `<img src="${p.discord_avatar}" alt="">` : 'Discord'}</button>
          ${kinds.map(r => `<button class="pe-pp${st.avatar === r.jeton ? ' on' : ''}" data-pp="${esc(r.jeton)}" title="${esc(jn(r.jeton))}"><img src="${texOf(jetonOf(r.jeton))}" alt=""></button>`).join('')}
        </div>
        <h4>${t('pe_bio')} <small class="muted" id="pe-count">${st.bio.length}/120</small></h4>
        <textarea class="adm-in pe-bio" id="pe-bio" maxlength="120" rows="2">${esc(st.bio)}</textarea>
        <h4>${t('showcase')} <small class="muted">${st.showcase.length}/5</small></h4>
        <div class="pe-show">${INV.rows.slice(0, 120).map(r => `<button class="pe-s${st.showcase.includes(r.id) ? ' on' : ''}" data-s="${r.id}" title="${esc(jn(r.jeton))} · 1/${fmt(r.odds)}"><img src="${texOf(jetonOf(r.jeton))}" alt=""></button>`).join('') || `<p class="muted">${t('inv_empty')}</p>`}</div>
        <div class="jm-actions"><button class="btn primary" id="pe-save">${t('save')}</button><button class="btn ghost jm-close">${t('cancel')}</button></div>
      </div>`;
    card.querySelectorAll('.pe-b').forEach(b => b.appendChild(bannerCanvas(b.dataset.b)));
  };
  draw();
  jm.classList.add('on');
  card.oninput = e => { if (e.target.id === 'pe-bio') { st.bio = e.target.value; $('pe-count').textContent = st.bio.length + '/120'; } };
  card.onclick = async e => {
    const b = e.target.closest('[data-b]'), pp = e.target.closest('[data-pp]'), s = e.target.closest('[data-s]');
    if (b) { if (!p.banners.includes(b.dataset.b)) return toast(t('banner_locked'), true); st.banner = b.dataset.b; return draw(); }
    if (pp) { st.avatar = pp.dataset.pp; return draw(); }
    if (s) {
      const id = +s.dataset.s, i = st.showcase.indexOf(id);
      if (i >= 0) st.showcase.splice(i, 1); else if (st.showcase.length < 5) st.showcase.push(id); else return toast(t('showcase_full'), true);
      return draw();
    }
    if (e.target.closest('#pe-save')) {
      const { error } = await sb.rpc('update_profile', { p_avatar: st.avatar, p_banner: st.banner, p_bio: st.bio.trim(), p_showcase: st.showcase });
      if (error) return toast(errText(error), true);
      jm.classList.remove('on'); sfx.upgrade(); toast(t('profile_saved'));
      ACC.avatar = st.avatar; renderAccBtn(); renderProfile(ACC.pseudo);
    }
  };
}
