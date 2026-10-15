// Comptes joueurs (Supabase) : inscription avec code reçu par mail, connexion, mot de passe oublié.
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
  if (ACC.user) return true;
  if (window.openAccount) openAccount('signup', 'acc_need');
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
      sb.from('profiles').select('pseudo').eq('id', user.id).maybeSingle(),
      sb.from('pulls').select('serie, jeton, odds, created_at').order('created_at', { ascending: false }).limit(30),
    ]);
    ACC.pseudo = prof?.pseudo || user.user_metadata?.pseudo || '?';
    ACC.hist = (rows || []).map(rowToHist);
  }
  renderAccBtn();
  if (typeof renderHist === 'function') { renderHist(); renderBoard(); }
  if (typeof renderActions === 'function') renderActions(); // boutons de pull : « Se connecter » ou « Ouvrir »
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
  b.innerHTML = ACC.user
    ? `<span class="av">${esc(ACC.pseudo[0].toUpperCase())}</span><span class="acc-name">${esc(ACC.pseudo)}</span>`
    : `<span>${t('login')}</span>`;
}
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Fenêtre compte (même style que les paramètres)
(function () {
  const panel = document.getElementById('account');
  const body = panel.querySelector('.set-body'), title = panel.querySelector('.set-title');
  let view = 'login', email = '', msg = '', busy = false;

  const field = (name, type, label, extra = '') =>
    `<label class="acc-field"><span>${t(label)}</span><input name="${name}" type="${type}" ${extra}></label>`;
  const VIEWS = {
    login: () => [t('login'), `
      ${field('email', 'email', 'acc_email', `autocomplete="email" required value="${esc(email)}"`)}
      ${field('password', 'password', 'acc_password', 'autocomplete="current-password" required')}
      <button class="btn primary acc-go">${t('login')}</button>
      <div class="acc-links"><a data-go="forgot">${t('acc_forgot')}</a><a data-go="signup">${t('acc_no_account')}</a></div>`],
    signup: () => [t('signup'), `
      ${field('pseudo', 'text', 'acc_pseudo', 'autocomplete="nickname" required minlength="3" maxlength="16"')}
      <small class="muted acc-hint">${t('acc_pseudo_hint')}</small>
      ${field('email', 'email', 'acc_email', `autocomplete="email" required value="${esc(email)}"`)}
      ${field('password', 'password', 'acc_password', 'autocomplete="new-password" required minlength="6"')}
      <button class="btn primary acc-go">${t('signup')}</button>
      <div class="acc-links"><a data-go="login">${t('acc_have_account')}</a></div>`],
    code: () => [t('acc_check_mail'), `
      <p class="muted acc-p">${t('acc_link_sent', { e: `<b>${esc(email)}</b>` })}</p>
      <button type="button" class="btn primary" data-go="login">${t('acc_go_login')}</button>
      <div class="acc-links"><a data-resend="signup">${t('acc_resend')}</a><a data-go="signup">${t('back')}</a></div>`],
    forgot: () => [t('acc_forgot'), `
      <p class="muted acc-p">${t('acc_forgot_p')}</p>
      ${field('email', 'email', 'acc_email', `autocomplete="email" required value="${esc(email)}"`)}
      <button class="btn primary acc-go">${t('acc_send_link')}</button>
      <div class="acc-links"><a data-go="login">${t('back')}</a></div>`],
    sent: () => [t('acc_check_mail'), `
      <p class="muted acc-p">${t('acc_link_reset', { e: `<b>${esc(email)}</b>` })}</p>
      <div class="acc-links"><a data-resend="recovery">${t('acc_resend')}</a><a data-go="login">${t('back')}</a></div>`],
    reset: () => [t('acc_set_pass'), `
      ${field('password', 'password', 'acc_new_pass', 'autocomplete="new-password" required minlength="6"')}
      <button class="btn primary acc-go">${t('acc_confirm')}</button>`],
    me: () => [t('acc_my_account'), `
      <div class="acc-me"><span class="av">${esc(ACC.pseudo[0].toUpperCase())}</span><div><b>${esc(ACC.pseudo)}</b><small class="muted">${esc(ACC.user.email)}</small></div></div>
      <p class="muted acc-p">${t('acc_me_p')}</p>
      <button class="btn ghost acc-out">${t('logout')}</button>`],
  };
  function render() {
    const [ttl, html] = VIEWS[view]();
    title.textContent = ttl;
    body.innerHTML = `<form class="acc-form" novalidate>${html}<p class="acc-msg${msg.ok ? ' ok' : ''}">${msg.text || ''}</p></form>`;
    const first = body.querySelector('input:not([value]), input[value=""]') || body.querySelector('input');
    if (first && panel.classList.contains('on')) setTimeout(() => first.focus(), 50);
  }
  const go = (v, m = '') => { view = v; msg = typeof m === 'string' ? { text: m } : m; render(); };
  const fail = key => { msg = { text: t(key) }; busy = false; render(); };
  // Ouvre la fenêtre de compte depuis le reste du site (ex. : pull sans être connecté)
  window.openAccount = (v = 'signup', key = '') => { panel.classList.add('on'); go(v, key ? { text: t(key) } : ''); };
  // Messages d'erreur Supabase → texte du site
  function errKey(e) {
    const c = e?.code || '', m = (e?.message || '').toLowerCase();
    if (c === 'invalid_credentials' || m.includes('invalid login')) return 'err_credentials';
    if (c === 'email_not_confirmed') return 'err_not_confirmed';
    if (c === 'user_already_exists' || c === 'email_exists' || m.includes('already registered')) return 'err_email_used';
    if (c === 'weak_password' || m.includes('password should')) return 'err_weak_pass';
    if (c === 'otp_expired' || m.includes('expired') || m.includes('invalid')) return 'err_code';
    if (c.includes('rate_limit') || m.includes('rate limit') || e?.status === 429) return 'err_rate';
    if (c === 'email_address_invalid' || m.includes('email address')) return 'err_email';
    return 'err_generic';
  }

  async function submit(f) {
    if (busy || !sb) return;
    const v = Object.fromEntries(new FormData(f));
    if (v.email !== undefined) email = v.email.trim();
    if (v.email !== undefined && !/^\S+@\S+\.\S+$/.test(email)) return fail('err_email');
    if (v.password !== undefined && v.password.length < 6) return fail('err_weak_pass');
    if (v.code !== undefined && !/^\d{6,10}$/.test(v.code.trim())) return fail('err_code');
    busy = true;
    f.querySelector('.acc-go')?.setAttribute('disabled', '');
    let r;
    if (view === 'login') {
      r = await sb.auth.signInWithPassword({ email, password: v.password });
      if (r.error && errKey(r.error) === 'err_not_confirmed') {
        await sb.auth.resend({ type: 'signup', email });
        busy = false; return go('code', t('err_not_confirmed'));
      }
    } else if (view === 'signup') {
      const pseudo = v.pseudo.trim();
      if (!PSEUDO_RE.test(pseudo)) return fail('err_pseudo');
      const { data: free, error: e1 } = await sb.rpc('pseudo_available', { p: pseudo });
      if (e1) return fail('err_generic');
      if (!free) return fail('err_pseudo_taken');
      r = await sb.auth.signUp({ email, password: v.password, options: { data: { pseudo }, emailRedirectTo: location.origin + '/' } });
      if (!r.error && r.data.user && !r.data.user.identities?.length) return fail('err_email_used');
      if (!r.error) { busy = false; return go('code'); }
    } else if (view === 'forgot') {
      r = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + '/' });
      if (!r.error) { busy = false; return go('sent'); }
    } else if (view === 'reset') {
      r = await sb.auth.updateUser({ password: v.password });
    }
    busy = false;
    if (r.error) return fail(errKey(r.error));
    panel.classList.remove('on'); // connecté : onAuthStateChange recharge le compte
  }

  panel.addEventListener('submit', e => { e.preventDefault(); submit(e.target); });
  panel.addEventListener('click', async e => {
    if (e.target === panel || e.target.closest('.set-close')) return panel.classList.remove('on');
    const a = e.target.closest('[data-go]');
    if (a) {
      const em = body.querySelector('input[name=email]'); if (em) email = em.value.trim();
      return go(a.dataset.go);
    }
    const rs = e.target.closest('[data-resend]');
    if (rs) {
      const { error } = rs.dataset.resend === 'signup' ? await sb.auth.resend({ type: 'signup', email, options: { emailRedirectTo: location.origin + '/' } }) : await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + '/' });
      return go(view, error ? { text: t(errKey(error)) } : { text: t('acc_resent'), ok: true });
    }
    if (e.target.closest('.acc-out')) { await sb.auth.signOut(); panel.classList.remove('on'); }
  });
  document.getElementById('open-account').addEventListener('click', () => {
    if (!sb) return;
    msg = ''; view = ACC.user ? 'me' : view === 'me' ? 'login' : view;
    panel.classList.add('on');
    render();
  });
  addEventListener('keydown', e => { if (e.key === 'Escape') panel.classList.remove('on'); });

  renderAccBtn();
  if (!sb) return;
  // Session gardée par Supabase dans le navigateur ; on recharge le compte à chaque changement
  let lastId;
  sb.auth.onAuthStateChange((ev, session) => {
    // Arrivée depuis le lien « mot de passe oublié » du mail : on demande le nouveau mot de passe
    if (ev === 'PASSWORD_RECOVERY') { view = 'reset'; msg = ''; panel.classList.add('on'); render(); }
    const id = session?.user?.id || null;
    if (id === lastId && ev !== 'USER_UPDATED') return;
    lastId = id;
    setTimeout(() => loadAccount(session?.user)); // hors du callback (recommandé par Supabase)
  });
})();
