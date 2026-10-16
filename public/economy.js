// Économie : argent (◆) et stock de pulls Takoras qui se recharge tout seul.
// On ne peut pas acheter de pull Takoras : on en gagne 1 toutes les 3 min, jusqu'au stock max.
// Le stock max (5 au départ) s'améliore jusqu'à 10 avec de l'argent, et chaque niveau coûte 3× plus cher.
// L'argent, le stock et les tirages sont gérés par le serveur (Supabase) : impossible de tricher depuis le navigateur.
// Ici on garde juste une copie pour l'affichage et le compte à rebours.

const ECO_KEY = 'takoras-eco';
const REGEN = 3 * 60 * 1000, BASE_MAX = 5, TOP_MAX = 10;
const upgradeCost = target => 1000 * 3 ** (target - BASE_MAX - 1); // 6 = 1 000, 7 = 3 000, 8 = 9 000, 9 = 27 000, 10 = 81 000

let eco = { coins: 0, stock: BASE_MAX, max: BASE_MAX, last: Date.now() };
try { eco = { ...eco, ...JSON.parse(localStorage.getItem(ECO_KEY)) }; } catch {}
const saveEco = () => { try { localStorage.setItem(ECO_KEY, JSON.stringify(eco)); } catch {} };

// Ajoute les pulls gagnés depuis la dernière fois (même site fermé)
function regen() {
  const now = Date.now();
  if (eco.stock >= eco.max) { eco.last = now; return; }
  const gained = Math.floor((now - eco.last) / (eco.step || REGEN));
  if (gained > 0) {
    eco.stock = Math.min(eco.max, eco.stock + gained);
    eco.last = eco.stock >= eco.max ? now : eco.last + gained * (eco.step || REGEN);
    saveEco();
  }
}
const nextIn = () => Math.max(0, (eco.step || REGEN) - (Date.now() - eco.last));
const mmss = ms => { const s = Math.ceil(ms / 1000); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
const fmt = n => n.toLocaleString(LOCALE());
const isTakoras = () => PULLS[current].name === 'Takoras';

// Copie l'état renvoyé par le serveur
function applyState(st) {
  if (!st) return;
  eco.coins = st.coins; eco.stock = st.stock; eco.max = st.max;
  eco.step = (st.step || 180) * 1000;
  eco.last = Date.now() - (eco.step / 1000 - st.next_in) * 1000;
  eco.potions = st.potions || []; eco.luck = +st.luck || 1; eco.fast_left = st.fast_left || 0; eco.synced = Date.now();
  ACC.isAdmin = !!st.admin;
  if (typeof questsSoon === 'function') questsSoon(); // les quêtes avancent après chaque action
  const bb = $('ban-bar'); bb.hidden = !st.banned; bb.textContent = st.banned ? '⛔ ' + t('banned_bar') : '';
  if (typeof renderAdminBtn === 'function') renderAdminBtn();
  render();
}
async function ecoSync() {
  if (!ACC.user) return;
  const { data, error } = await sb.rpc('eco_state');
  if (!error) applyState(data);
}

// Ouvre 1 pull ou tout le stock : le serveur retire les pulls et tire les jetons, on joue juste l'animation
let opening_busy = false;
async function openPulls(n) {
  if (!requireAccount() || opening_busy) return;
  if (!isTakoras()) return buy(n === 'all' ? 10 : n);
  regen();
  const count = n === 'all' ? eco.stock : Math.min(1, eco.stock);
  if (!count) return sfx.deny();
  opening_busy = true;
  const { data, error } = await sb.rpc('take_pulls', { n: count, force: ACC.isAdmin ? debug.force || null : null, luck: ACC.isAdmin ? debug.luck : 1, p_variant: ACC.isAdmin ? debug.variant || null : null });
  opening_busy = false;
  if (error) { sfx.deny(); return ecoSync(); }
  applyState(data.state);
  buy(data.results.length, data.results, data.variants || null);
}

async function upgrade() {
  if (!requireAccount()) return;
  if (eco.max >= TOP_MAX || eco.coins < upgradeCost(eco.max + 1)) return;
  const { data, error } = await sb.rpc('upgrade_stock');
  if (error) { sfx.deny(); return ecoSync(); }
  sfx.upgrade();
  applyState(data);
}

// Boutons de l'accueil : stock + Ouvrir 1 / Tout ouvrir + amélioration (Takoras), ou l'ancien achat (autres pulls)
function renderActions() {
  const box = $('actions');
  const info = `<button class="link-btn" data-info>ℹ️ ${t('odds_info')}</button>`;
  if (!ACC.user) { box.innerHTML = `<button class="btn primary" data-open="1">${t('acc_login_to_open')}</button>${info}`; return; }
  if (!isTakoras()) {
    const p = PULLS[current];
    box.innerHTML = `<button class="btn primary" data-open="1">Pull ×1 · ${fmt(p.price)} ◆</button><button class="btn ghost" data-open="10">Pull ×10 · ${fmt(p.price * 10)} ◆</button>`;
    return;
  }
  const full = eco.stock >= eco.max, cost = upgradeCost(eco.max + 1);
  box.innerHTML = `
    <div class="stock">
      <div class="pips">${Array.from({ length: eco.max }, (_, i) => `<img src="img/jetons/takoras.png" alt="" class="${i < eco.stock ? 'on' : ''}">`).join('')}</div>
      <span><b id="stock-n">${eco.stock}</b>/${eco.max} ${t('pulls_word')} · <span id="stock-next">${full ? t('stock_full') : t('plus1_in', { t: mmss(nextIn()) })}</span></span>
    </div>
    <div class="row-btns">
      <button class="btn primary" data-open="1" ${eco.stock ? '' : 'disabled'}>${t('open1')}</button>
      <button class="btn ghost" data-open="all" ${eco.stock > 1 ? '' : 'disabled'}>${t('open_all', { n: eco.stock })}</button>
    </div>
    ${eco.max < TOP_MAX
      ? `<button class="btn upgrade" data-up ${eco.coins >= cost ? '' : 'disabled'}>${t('stock_max', { a: eco.max, b: eco.max + 1 })} · ${money(cost)}</button>`
      : `<span class="muted small">${t('stock_top')}</span>`}
    ${typeof effectsHTML === 'function' ? `<div class="fx-row" id="home-fx">${effectsHTML()}</div>` : ''}
    ${info}`;
}
$('actions').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || b.disabled) return;
  if (b.dataset.open) openPulls(b.dataset.open === 'all' ? 'all' : +b.dataset.open);
  else if ('up' in b.dataset) upgrade();
});

// Boutons de fin d'ouverture : « Ouvrir encore » / « Tout ouvrir » selon le stock
function ecoDecorate() {
  if (!isTakoras()) return;
  regen();
  const again = $('op-again'), all = $('op-recap-again');
  again.disabled = !eco.stock;
  again.textContent = eco.stock ? t('open_again', { n: eco.stock }) : t('no_pull', { t: mmss(nextIn()) });
  all.disabled = !eco.stock;
  all.textContent = eco.stock ? t('open_all', { n: eco.stock }) : t('no_pull', { t: mmss(nextIn()) });
}

function render() {
  $('bal').textContent = fmt(eco.coins);
  const sb2 = document.querySelector('.shop-bal'); if (sb2 && ACC.user) sb2.innerHTML = money(eco.coins);
  renderActions();
  if (opening.classList.contains('on')) ecoDecorate();
}

// Mise à jour chaque seconde (compte à rebours, recharge)
setInterval(() => {
  const before = eco.stock;
  regen();
  if (eco.stock !== before) { if (eco.stock > before) sfx.regen(); render(); return ecoSync(); } // on confirme avec le serveur
  const el = $('stock-next');
  if (el) el.textContent = eco.stock >= eco.max ? t('stock_full') : t('plus1_in', { t: mmss(nextIn()) });
  // effets en cours (sablier) : le temps restant défile en direct, et on resynchronise quand il se termine
  const fx = $('home-fx');
  if (fx && eco.fast_left > 0) {
    fx.innerHTML = effectsHTML();
    if ((Date.now() - eco.synced) / 1000 >= eco.fast_left) { eco.fast_left = 0; ecoSync(); }
  }
  if (opening.classList.contains('on') && !eco.stock) ecoDecorate();
}, 1000);

// Quand on change de pull, on redessine les boutons
const selectBase = select;
select = function (i) { selectBase(i); renderActions(); };

regen();
render();
