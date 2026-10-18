// Retours des joueurs pendant la bêta : un bouton bien visible « Donner un avis » (bug, idée, ajout, autre),
// et une petite popup « le site est en bêta » la première fois qu'on se connecte. Les admins les lisent dans le panel.

const FB_KINDS = [['bug', '🐞'], ['idea', '💡'], ['add', '✨'], ['other', '💬']];

// Bouton flottant (en bas à gauche, la bulle de chat est à droite)
const fbBtn = document.createElement('button');
fbBtn.className = 'fb-btn'; fbBtn.id = 'fb-btn';
fbBtn.innerHTML = `<span class="fb-ico">💡</span><span class="fb-txt">${t('fb_btn')}</span>`;
document.body.appendChild(fbBtn);
fbBtn.addEventListener('click', () => { sfx.click(); openFeedback(); });

function openFeedback(kind = 'idea') {
  if (!ACC.user) return openAccount('login');
  const st = { kind };
  const o = document.createElement('div');
  o.className = 'askbox fb-box';
  const draw = () => {
    o.innerHTML = `<div class="ask-card fb-card">
      <button class="fb-x" aria-label="${t('close')}">✕</button>
      <h3>${t('fb_title')}</h3>
      <p class="muted small">${t('fb_sub')}</p>
      <div class="fb-kinds">${FB_KINDS.map(([k, i]) => `<button class="fb-k${st.kind === k ? ' on' : ''}" data-k="${k}"><span>${i}</span>${t('fb_' + k)}</button>`).join('')}</div>
      <textarea class="mpx-in fb-text" id="fb-text" maxlength="1500" rows="5" placeholder="${t('fb_ph_' + st.kind)}">${esc(st.text || '')}</textarea>
      <div class="fb-foot"><small class="muted" id="fb-count">${(st.text || '').length}/1500</small><button class="btn primary" id="fb-send">${t('fb_send')}</button></div>
    </div>`;
    const ta = o.querySelector('#fb-text');
    ta.oninput = () => { st.text = ta.value; o.querySelector('#fb-count').textContent = ta.value.length + '/1500'; };
    setTimeout(() => ta.focus(), 50);
  };
  draw();
  document.body.appendChild(o);
  requestAnimationFrame(() => o.classList.add('on'));
  const close = () => { o.classList.remove('on'); setTimeout(() => o.remove(), 200); };
  o.addEventListener('click', async e => {
    if (e.target === o || e.target.closest('.fb-x')) return close();
    const k = e.target.closest('[data-k]');
    if (k) { st.kind = k.dataset.k; sfx.click(); return draw(); }
    if (e.target.closest('#fb-send')) {
      const body = (st.text || '').trim();
      if (body.length < 5) { sfx.deny(); return toast(t('fb_short'), true); }
      const b = e.target.closest('#fb-send'); b.disabled = true;
      const device = `${innerWidth}×${innerHeight} · ${navigator.userAgent.match(/(Firefox|Edg|OPR|Chrome|Safari)\/[\d.]+/)?.[0] || ''}${/Mobi/.test(navigator.userAgent) ? ' · mobile' : ''}`;
      const { error } = await sb.rpc('send_feedback', { p_kind: st.kind, p_body: body, p_page: location.hash || '#accueil', p_device: device });
      if (error) { b.disabled = false; sfx.deny(); return toast(errText(error), true); }
      sfx.upgrade(); toast('💜 ' + t('fb_thanks'));
      close();
    }
  });
}

// (La popup « site en bêta » a été retirée : la bêta est indiquée à côté du logo, et les nouveautés arrivent par les patch notes.)
window.betaWelcome = () => {};
