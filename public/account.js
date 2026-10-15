// Comptes joueurs (Supabase) : connexion avec Discord ou Google (pas de mail à envoyer, pas de spam), puis choix du pseudo.
// Connecté : tes tirages sont enregistrés en ligne (historique, En direct, classement).
// Sans compte : tout reste dans le navigateur comme avant.
// Clé publique seulement (publishable) : les droits sont gérés par la base (RLS).

const SB_URL = 'https://joyskjoofihwhycyreyn.supabase.co';
const SB_KEY = 'sb_publishable_mhoYRADm77D4idg3eekXRA_HCjIsK7k';
const sb = window.supabase ? window.supabase.createClient(SB_URL, SB_KEY) : null;

const ACC = { user: null, pseudo: null, hist: [] };
const PSEUDO_RE = /^[A-Za-z0-9_.\-]{3,16}$/;

// Sans compte : on peut regarder le site mais pas ouvrir de pull ni rien modifier
function requireAccount() {
  if (ACC.user && ACC.pseudo) return true;
  if (window.openAccount) openAccount(ACC.user ? 'pseudo' : 'login', ACC.user ? '' : 'acc_need');
  return false;
}

// Ligne de la base → entrée d'historique (même forme que l'historique local)
function rowToHist(r) {
  const j = (typeof SERIES !== 'undefined' && (SERIES[r.serie] || []).find(x => x.name === r.jeton)) || {};
  return { name: r.jeton, odds: r.odds, glow: j.glow || '#ffffff', img: j.img || 'img/jetons/template.png', ts: Date.parse(r.created_at), pseudo: r.pseudo };
}

async function loadAccount(user) {
  ACC.user = user || null;
  ACC.pseudo = null;
  ACC.hist = [];
  if (user) {
    const [{ data: prof }, { data: rows }] = await Promise.all([
      sb.from('profiles').select('pseudo, avatar').eq('id', user.id).maybeSingle(),
      sb.from('pulls').select('serie, jeton, odds, created_at').order('created_at', { ascending: false }).limit(30),
    ]);
    ACC.pseudo = prof?.pseudo || null; // null = pseudo pas encore choisi
    ACC.avatar = prof?.avatar || 'default';
    ACC.hist = (rows || []).map(rowToHist);
  }
  renderAccBtn();
  if (typeof renderHist === 'function') { renderHist(); renderBoard(); }
  if (typeof renderActions === 'function') renderActions(); // boutons de pull : « Se connecter » ou « Ouvrir »
  if (typeof route === 'function' && location.hash) route(); // la page ouverte se met à jour avec le compte
  if (user && typeof ecoSync === 'function') ecoSync(); else { ACC.isAdmin = false; if (typeof renderAdminBtn === 'function') renderAdminBtn(); }
}

// Appelé à chaque jeton révélé. Renvoie true si le tirage part en ligne (sinon historique local).
function accRecordPull(j, serie) {
  if (!ACC.user) return false;
  ACC.hist.unshift({ name: j.name, odds: j.odds, glow: j.glow, img: j.img || 'img/jetons/template.png', ts: Date.now() });
  ACC.hist = ACC.hist.slice(0, 30);
  renderLive(); boardSoon(); // déjà enregistré par le serveur au moment du tirage
  return true;
}
let boardTimer;
const boardSoon = () => { clearTimeout(boardTimer); boardTimer = setTimeout(renderBoard, 1500); };

// Bouton dans la barre du haut
function renderAccBtn() {
  const b = document.getElementById('open-account');
  b.classList.toggle('in', !!ACC.user);
  const ps = ACC.pseudo || '?';
  const pp = typeof avatarHTML === 'function' ? avatarHTML({ avatar: ACC.avatar, pseudo: ps }, 28) : `<span class="av">${esc(ps[0].toUpperCase())}</span>`;
  b.innerHTML = ACC.user
    ? `${pp}<span class="acc-name">${esc(ps)}</span>`
    : `<span>${t('login')}</span>`;
}
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Fenêtre compte (même style que les paramètres)
(function () {
  const panel = document.getElementById('account');
  const body = panel.querySelector('.set-body'), title = panel.querySelector('.set-title');
  let view = 'login', msg = '', busy = false;

  const DISCORD = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M20.3 4.4A19.8 19.8 0 0 0 15.4 3l-.6 1.3a18.4 18.4 0 0 0-5.6 0L8.6 3a19.7 19.7 0 0 0-4.9 1.5C.6 9.1-.3 13.6.1 18a19.9 19.9 0 0 0 6 3l1.3-2a12.9 12.9 0 0 1-2-1l.5-.4a14.2 14.2 0 0 0 12.2 0l.5.4c-.6.4-1.3.7-2 1l1.3 2a19.8 19.8 0 0 0 6-3c.5-5.1-.8-9.5-3.6-13.6zM8.5 15.3c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4zm7 0c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4z"/></svg>';
  const GOOGLE = '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.2 6.6 2.2 12s4.4 9.8 9.8 9.8c5.7 0 9.4-4 9.4-9.6 0-.6-.1-1.1-.2-1.6H12z"/></svg>';

  const VIEWS = {
    login: () => [t('login'), `
      <p class="muted acc-p">${t('acc_oauth_p')}</p>
      <button type="button" class="btn acc-oauth discord" data-oauth="discord">${DISCORD}${t('acc_with', { p: 'Discord' })}</button>`],  // Google : désactivé pour l'instant (remettre le bouton data-oauth="google" pour le réactiver)
    pseudo: () => [t('acc_choose_pseudo'), `
      <p class="muted acc-p">${t('acc_choose_pseudo_p')}</p>
      <label class="acc-field"><span>${t('acc_pseudo')}</span><input name="pseudo" type="text" required maxlength="16" autocomplete="nickname"></label>
      <small class="muted acc-hint">${t('acc_pseudo_hint')}</small>
      <button class="btn primary acc-go">${t('acc_confirm')}</button>`],
    me: () => [t('acc_my_account'), `
      <div class="acc-me"><span class="av">${esc((ACC.pseudo || '?')[0].toUpperCase())}</span><div><b>${esc(ACC.pseudo || '?')}</b><small class="muted">${esc(ACC.user.email || '')}</small></div></div>
      <p class="muted acc-p">${t('acc_me_p')}</p>
      <a class="btn primary acc-prof" href="#profil">${t('my_profile')}</a>
      <button class="btn ghost acc-out">${t('logout')}</button>`],
  };

  function render() {
    const [ttl, html] = VIEWS[view]();
    title.textContent = ttl;
    body.innerHTML = `<form class="acc-form" novalidate>${html}<p class="acc-msg${msg.ok ? ' ok' : ''}">${msg.text || ''}</p></form>`;
    const first = body.querySelector('input');
    if (first && panel.classList.contains('on')) setTimeout(() => first.focus(), 50);
  }
  const go = (v, m = '') => { view = v; msg = typeof m === 'string' ? { text: m } : m; render(); };
  const fail = key => { msg = { text: t(key) }; busy = false; render(); };
  // Ouvre la fenêtre de compte depuis le reste du site (ex. : pull sans être connecté)
  window.openAccount = (v = 'login', key = '') => { panel.classList.add('on'); go(v, key ? { text: t(key) } : ''); };

  async function submit(f) {
    if (busy || !sb || view !== 'pseudo') return;
    const pseudo = (new FormData(f).get('pseudo') || '').trim();
    if (!PSEUDO_RE.test(pseudo)) return fail('err_pseudo');
    busy = true;
    const { error } = await sb.rpc('set_pseudo', { p: pseudo });
    busy = false;
    if (error) return fail(error.message.includes('taken') ? 'err_pseudo_taken' : error.message.includes('bad') ? 'err_pseudo' : 'err_generic');
    panel.classList.remove('on');
    loadAccount(ACC.user);
  }

  panel.addEventListener('submit', e => { e.preventDefault(); submit(e.target); });
  panel.addEventListener('click', async e => {
    if (e.target === panel || e.target.closest('.set-close')) { if (view !== 'pseudo' || ACC.pseudo) panel.classList.remove('on'); return; }
    const o = e.target.closest('[data-oauth]');
    if (o) {
      const { error } = await sb.auth.signInWithOAuth({ provider: o.dataset.oauth, options: { redirectTo: location.origin + '/' } });
      if (error) fail('err_generic');
      return;
    }
    if (e.target.closest('.acc-prof')) panel.classList.remove('on');
    if (e.target.closest('.acc-out')) { await sb.auth.signOut(); panel.classList.remove('on'); }
  });
  document.getElementById('open-account').addEventListener('click', () => {
    if (!sb) return;
    if (ACC.user && ACC.pseudo) { location.hash = '#profil'; return route(); } // connecté : direct sur ton profil
    msg = ''; view = !ACC.user ? 'login' : ACC.pseudo ? 'me' : 'pseudo';
    panel.classList.add('on');
    render();
  });
  addEventListener('keydown', e => { if (e.key === 'Escape' && (view !== 'pseudo' || ACC.pseudo)) panel.classList.remove('on'); });

  renderAccBtn();
  if (!sb) return;
  // Session gardée par Supabase dans le navigateur ; on recharge le compte à chaque changement
  let lastId;
  sb.auth.onAuthStateChange((ev, session) => {
    const id = session?.user?.id || null;
    if (id === lastId && ev !== 'USER_UPDATED') return;
    lastId = id;
    setTimeout(async () => {
      await loadAccount(session?.user);
      if (ACC.user && !ACC.pseudo) window.openAccount('pseudo'); // première connexion : on choisit son pseudo
    });
  });
})();
