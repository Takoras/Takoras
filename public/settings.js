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
    week: 'Cette semaine', all_time: 'Depuis toujours', board_empty: 'Aucun joueur classé pour l’instant. Le classement arrivera avec les comptes.',
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
  },
  en: {
    nav_home: 'Home', nav_board: 'Leaderboard', pulls: 'Pulls', history: 'My history', see_all: 'See all',
    live: 'Live', live_empty: 'Players’ pulls will show up here', board_tag: 'Leaderboard', board_title: 'Top players',
    week: 'This week', all_time: 'All time', board_empty: 'No ranked players yet. The leaderboard will arrive with accounts.',
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
