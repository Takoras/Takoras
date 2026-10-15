// Paramètres du joueur (sauvegardés dans le navigateur) + traductions FR / EN.
// Chargé en premier : les autres scripts utilisent SETTINGS et t().

const SETTINGS = { speed: 'normal', lang: 'fr', volume: 70, fx: 'full' };
try { Object.assign(SETTINGS, JSON.parse(localStorage.getItem('takoras-settings'))); } catch {}
const saveSettings = () => { try { localStorage.setItem('takoras-settings', JSON.stringify(SETTINGS)); } catch {} };

// Vitesse des ouvertures : facteur appliqué aux durées (rotation, blocage…)
const SPEED = { normal: 1, rapide: .5, instant: 0 };
const speed = () => SPEED[SETTINGS.speed] ?? 1;
const reducedFx = () => SETTINGS.fx === 'reduced';
const LOCALE = () => (SETTINGS.lang === 'en' ? 'en-US' : 'fr-FR');

const I18N = {
  fr: {
    nav_home: 'Accueil', nav_board: 'Classement', pulls: 'Pulls', history: 'Mon historique', see_all: 'Tout voir',
    live: 'En direct', live_empty: 'Les tirages des joueurs apparaîtront ici', board_tag: 'Classement', board_title: 'Les meilleurs joueurs',
    week: 'Cette semaine', all_time: 'Depuis toujours', board_empty: 'Aucun joueur classé pour l’instant. Connecte-toi et ouvre un pull pour y entrer !',
    hist_empty: 'Aucun pull pour l’instant', ago: 'il y a {n}', just_now: 'à l’instant', you: 'Toi', got: 'a eu',
    grp_perm: 'Permanents', grp_lim: 'Limités', grp_we: 'Week-end', free: 'Gratuit · se recharge', limited: 'Limité', permanent: 'Permanent', sat_sun: 'Sam–Dim',
    ends_in: 'Se termine dans', weekend_only: 'Disponible seulement le samedi et le dimanche', always: 'Toujours disponible', pull: 'Pull',
    k_pulls: 'Pulls ouverts', k_gain: 'Meilleur gain', k_tokens: 'Jetons totaux', k_collec: 'Collection',
    stock_full: 'stock plein', plus1_in: '+1 dans {t}', pulls_word: 'pulls', open1: 'Ouvrir 1', open_all: 'Tout ouvrir ({n})',
    stock_max: 'Stock max {a} → {b}', stock_top: 'Stock max atteint (10)', open_again: 'Ouvrir encore · reste {n}', no_pull: 'Plus de pull · +1 dans {t}',
    click_coin: 'Clique sur le jeton', click_reveal: 'Clique pour révéler', next: 'Suivant · {a}/{b}', see_recap: 'Voir le récap', back: 'Retour',
    series: 'Série Takoras', stats_note: 'Statistiques provisoires · combats bientôt', s_hp: 'PV', s_atk: 'Attaque', s_def: 'Défense', s_spd: 'Vitesse',
    recap_tag: 'Récap · {n} pulls', recap_title: 'Tes {n} jetons', best: 'Meilleur tirage',
    settings: 'Paramètres', set_speed: 'Vitesse des ouvertures', sp_normal: 'Normale', sp_fast: 'Rapide', sp_instant: 'Instantanée',
    set_lang: 'Langue', set_sound: 'Son', set_volume: 'Volume', set_fx: 'Effets visuels', fx_full: 'Complets', fx_reduced: 'Réduits',
    fx_hint: 'Moins de tremblements, de flashs et de particules', close: 'Fermer', mute: 'Couper le son', unmute: 'Activer le son',
    login: 'Connexion', signup: 'Créer un compte', logout: 'Se déconnecter', acc_email: 'Adresse mail', acc_password: 'Mot de passe', acc_pseudo: 'Pseudo',
    acc_pseudo_hint: '3 à 16 caractères : lettres, chiffres, _ - .', acc_forgot: 'Mot de passe oublié ?', acc_no_account: 'Pas de compte ? Inscris-toi',
    acc_have_account: 'Déjà un compte ? Connecte-toi', acc_check_mail: 'Vérifie tes mails', acc_code_sent: 'Code envoyé à {e}. Entre-le ci-dessous (pense aux spams).', acc_link_sent: 'Un lien de confirmation a été envoyé à {e}. Clique dessus pour activer ton compte (pense aux spams), tu reviendras ici connecté.', acc_link_reset: 'Un lien a été envoyé à {e}. Clique dessus pour choisir un nouveau mot de passe.', acc_go_login: 'C’est fait, me connecter', acc_need: 'Crée un compte (ou connecte-toi) pour ouvrir des pulls.', acc_login_to_open: 'Se connecter pour ouvrir', acc_send_link: 'Recevoir le lien', acc_set_pass: 'Choisis ton nouveau mot de passe',
    acc_code: 'Code reçu par mail', acc_confirm: 'Valider', acc_resend: 'Renvoyer le code', acc_resent: 'Nouveau code envoyé',
    acc_forgot_p: 'Entre ton adresse : tu recevras un lien pour choisir un nouveau mot de passe.', acc_send_code: 'Recevoir un code', acc_new_pass: 'Nouveau mot de passe',
    acc_my_account: 'Mon compte', acc_me_p: 'Tes tirages sont enregistrés en ligne : historique, En direct et classement.',
    err_credentials: 'Mail ou mot de passe incorrect', err_not_confirmed: 'Compte pas encore confirmé : un nouveau code vient d’être envoyé.',
    err_email_used: 'Cette adresse a déjà un compte', err_weak_pass: 'Mot de passe trop court (6 caractères minimum)', err_code: 'Code incorrect ou expiré',
    err_rate: 'Trop d’essais, réessaie dans quelques minutes', err_email: 'Adresse mail invalide', err_generic: 'Une erreur est survenue, réessaie',
    err_pseudo: 'Pseudo invalide (3 à 16 caractères : lettres, chiffres, _ - .)', err_pseudo_taken: 'Ce pseudo est déjà pris',
    u_pulls: '{n} pulls', u_tokens: '{n} jetons', u_collec: '{n} / {t} jetons', you_tag: 'toi',
  },
  en: {
    nav_home: 'Home', nav_board: 'Leaderboard', pulls: 'Pulls', history: 'My history', see_all: 'See all',
    live: 'Live', live_empty: 'Players’ pulls will show up here', board_tag: 'Leaderboard', board_title: 'Top players',
    week: 'This week', all_time: 'All time', board_empty: 'No ranked players yet. Log in and open a pull to get in!',
    hist_empty: 'No pulls yet', ago: '{n} ago', just_now: 'just now', you: 'You', got: 'got',
    grp_perm: 'Permanent', grp_lim: 'Limited', grp_we: 'Weekend', free: 'Free · recharges', limited: 'Limited', permanent: 'Permanent', sat_sun: 'Sat–Sun',
    ends_in: 'Ends in', weekend_only: 'Only available on Saturday and Sunday', always: 'Always available', pull: 'Pull',
    k_pulls: 'Pulls opened', k_gain: 'Best pull', k_tokens: 'Total tokens', k_collec: 'Collection',
    stock_full: 'stock full', plus1_in: '+1 in {t}', pulls_word: 'pulls', open1: 'Open 1', open_all: 'Open all ({n})',
    stock_max: 'Max stock {a} → {b}', stock_top: 'Max stock reached (10)', open_again: 'Open again · {n} left', no_pull: 'No pulls left · +1 in {t}',
    click_coin: 'Click the token', click_reveal: 'Click to reveal', next: 'Next · {a}/{b}', see_recap: 'See recap', back: 'Back',
    series: 'Takoras series', stats_note: 'Temporary stats · battles coming soon', s_hp: 'HP', s_atk: 'Attack', s_def: 'Defense', s_spd: 'Speed',
    recap_tag: 'Recap · {n} pulls', recap_title: 'Your {n} tokens', best: 'Best pull',
    settings: 'Settings', set_speed: 'Opening speed', sp_normal: 'Normal', sp_fast: 'Fast', sp_instant: 'Instant',
    set_lang: 'Language', set_sound: 'Sound', set_volume: 'Volume', set_fx: 'Visual effects', fx_full: 'Full', fx_reduced: 'Reduced',
    fx_hint: 'Less shaking, flashes and particles', close: 'Close', mute: 'Mute', unmute: 'Unmute',
    login: 'Log in', signup: 'Sign up', logout: 'Log out', acc_email: 'Email', acc_password: 'Password', acc_pseudo: 'Username',
    acc_pseudo_hint: '3 to 16 characters: letters, digits, _ - .', acc_forgot: 'Forgot password?', acc_no_account: 'No account? Sign up',
    acc_have_account: 'Already have an account? Log in', acc_check_mail: 'Check your email', acc_code_sent: 'Code sent to {e}. Enter it below (check spam).', acc_link_sent: 'A confirmation link was sent to {e}. Click it to activate your account (check spam), you’ll come back here logged in.', acc_link_reset: 'A link was sent to {e}. Click it to choose a new password.', acc_go_login: 'Done, log me in', acc_need: 'Create an account (or log in) to open pulls.', acc_login_to_open: 'Log in to open', acc_send_link: 'Get the link', acc_set_pass: 'Choose your new password',
    acc_code: 'Code from the email', acc_confirm: 'Confirm', acc_resend: 'Resend code', acc_resent: 'New code sent',
    acc_forgot_p: 'Enter your email: you’ll get a link to choose a new password.', acc_send_code: 'Get a code', acc_new_pass: 'New password',
    acc_my_account: 'My account', acc_me_p: 'Your pulls are saved online: history, Live and leaderboard.',
    err_credentials: 'Wrong email or password', err_not_confirmed: 'Account not confirmed yet: a new code was just sent.',
    err_email_used: 'This email already has an account', err_weak_pass: 'Password too short (6 characters minimum)', err_code: 'Wrong or expired code',
    err_rate: 'Too many attempts, try again in a few minutes', err_email: 'Invalid email address', err_generic: 'Something went wrong, try again',
    err_pseudo: 'Invalid username (3 to 16 characters: letters, digits, _ - .)', err_pseudo_taken: 'This username is taken',
    u_pulls: '{n} pulls', u_tokens: '{n} tokens', u_collec: '{n} / {t} tokens', you_tag: 'you',
  },
};
function t(key, vars = {}) {
  let s = (I18N[SETTINGS.lang] || I18N.fr)[key] ?? I18N.fr[key] ?? key;
  for (const k in vars) s = s.replace('{' + k + '}', vars[k]);
  return s;
}
document.documentElement.lang = SETTINGS.lang;

// Textes fixes de la page : <x data-i18n="clé">
function applyI18n() { document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); }); }
applyI18n();

// Fenêtre des paramètres
(function () {
  const panel = document.getElementById('settings');
  const seg = (key, opts) => `<div class="seg set-seg" data-key="${key}">${opts.map(([v, l]) => `<button data-v="${v}" class="${SETTINGS[key] === v ? 'on' : ''}">${t(l)}</button>`).join('')}</div>`;
  function render() {
    panel.querySelector('.set-body').innerHTML = `
      <div class="set-row"><b>${t('set_speed')}</b>${seg('speed', [['normal', 'sp_normal'], ['rapide', 'sp_fast'], ['instant', 'sp_instant']])}</div>
      <div class="set-row"><b>${t('set_lang')}</b>${seg('lang', [['fr', 'Français'], ['en', 'English']])}</div>
      <div class="set-row"><b>${t('set_volume')}</b><input type="range" id="set-volume" min="0" max="100" step="1" value="${SETTINGS.volume}"><span class="muted" id="set-vol-val">${SETTINGS.volume} %</span></div>
      <div class="set-row"><b>${t('set_fx')}</b>${seg('fx', [['full', 'fx_full'], ['reduced', 'fx_reduced']])}<small class="muted">${t('fx_hint')}</small></div>`;
    panel.querySelector('.set-title').textContent = t('settings');
  }
  panel.addEventListener('click', e => {
    if (e.target === panel || e.target.closest('.set-close')) return panel.classList.remove('on');
    const b = e.target.closest('.set-seg button'); if (!b) return;
    const key = b.closest('.set-seg').dataset.key;
    SETTINGS[key] = b.dataset.v;
    saveSettings();
    if (key === 'lang') return location.reload(); // tout le site se retraduit
    if (key === 'fx') document.documentElement.classList.toggle('reduce-fx', reducedFx());
    render();
  });
  panel.addEventListener('input', e => {
    if (e.target.id !== 'set-volume') return;
    SETTINGS.volume = +e.target.value;
    panel.querySelector('#set-vol-val').textContent = SETTINGS.volume + ' %';
    saveSettings();
    if (typeof sfx !== 'undefined') sfx.setVolume(SETTINGS.volume / 100);
  });
  document.getElementById('open-settings').addEventListener('click', () => { render(); panel.classList.add('on'); });
  addEventListener('keydown', e => { if (e.key === 'Escape') panel.classList.remove('on'); });
  document.documentElement.classList.toggle('reduce-fx', reducedFx());
})();
