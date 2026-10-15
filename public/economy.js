// Économie : argent (◆) et stock de pulls Takoras qui se recharge tout seul.
// On ne peut pas acheter de pull Takoras : on en gagne 1 toutes les 5 min, jusqu'au stock max.
// Le stock max (5 au départ) s'améliore jusqu'à 10 avec de l'argent, et chaque niveau coûte 3× plus cher.
// Tout est sauvegardé dans le navigateur en attendant les comptes (Supabase).

const ECO_KEY = 'takoras-eco';
const REGEN = 5 * 60 * 1000, BASE_MAX = 5, TOP_MAX = 10;
const upgradeCost = target => 1000 * 3 ** (target - BASE_MAX - 1); // 6 = 1 000, 7 = 3 000, 8 = 9 000, 9 = 27 000, 10 = 81 000

let eco = { coins: 0, stock: BASE_MAX, max: BASE_MAX, last: Date.now() };
try { eco = { ...eco, ...JSON.parse(localStorage.getItem(ECO_KEY)) }; } catch {}
const saveEco = () => { try { localStorage.setItem(ECO_KEY, JSON.stringify(eco)); } catch {} };

// Ajoute les pulls gagnés depuis la dernière fois (même site fermé)
function regen() {
  const now = Date.now();
  if (eco.stock >= eco.max) { eco.last = now; return; }
  const gained = Math.floor((now - eco.last) / REGEN);
  if (gained > 0) {
    eco.stock = Math.min(eco.max, eco.stock + gained);
    eco.last = eco.stock >= eco.max ? now : eco.last + gained * REGEN;
    saveEco();
  }
}
const nextIn = () => Math.max(0, REGEN - (Date.now() - eco.last));
const mmss = ms => { const s = Math.ceil(ms / 1000); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
const fmt = n => n.toLocaleString(LOCALE());
const isTakoras = () => PULLS[current].name === 'Takoras';

// Prend des pulls dans le stock ; si on était plein, la recharge démarre maintenant
function takePulls(n) {
  regen();
  if (eco.stock >= eco.max) eco.last = Date.now();
  eco.stock -= n;
  saveEco();
  render();
}

// Ouvre 1 pull ou tout le stock (pour les autres pulls, l'ancien fonctionnement reste)
function openPulls(n) {
  if (!isTakoras()) return buy(n === 'all' ? 10 : n);
  regen();
  const count = n === 'all' ? eco.stock : Math.min(1, eco.stock);
  if (!count) return sfx.deny();
  takePulls(count);
  buy(count);
}

function upgrade() {
  if (eco.max >= TOP_MAX || eco.coins < upgradeCost(eco.max + 1)) return;
  eco.coins -= upgradeCost(eco.max + 1);
  eco.max++;
  sfx.upgrade();
  saveEco();
  render();
}

// Boutons de l'accueil : stock + Ouvrir 1 / Tout ouvrir + amélioration (Takoras), ou l'ancien achat (autres pulls)
function renderActions() {
  const box = $('actions');
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
      ? `<button class="btn upgrade" data-up ${eco.coins >= cost ? '' : 'disabled'}>${t('stock_max', { a: eco.max, b: eco.max + 1 })} · ${fmt(cost)} ◆</button>`
      : `<span class="muted small">${t('stock_top')}</span>`}`;
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
  renderActions();
  if (opening.classList.contains('on')) ecoDecorate();
}

// Mise à jour chaque seconde (compte à rebours, recharge)
setInterval(() => {
  const before = eco.stock;
  regen();
  if (eco.stock !== before) { if (eco.stock > before) sfx.regen(); return render(); }
  const el = $('stock-next');
  if (el) el.textContent = eco.stock >= eco.max ? t('stock_full') : t('plus1_in', { t: mmss(nextIn()) });
  if (opening.classList.contains('on') && !eco.stock) ecoDecorate();
}, 1000);

// Quand on change de pull, on redessine les boutons
const selectBase = select;
select = function (i) { selectBase(i); renderActions(); };

// Menu debug : argent et stock
$('dbg-coins').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  const v = +b.dataset.c;
  eco.coins = v === 0 ? 0 : Math.max(0, eco.coins + v);
  saveEco(); render();
});
$('dbg-stock').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  const a = b.dataset.s;
  if (a === 'add') eco.stock = Math.min(eco.max, eco.stock + 1);
  if (a === 'fill') eco.stock = eco.max;
  if (a === 'empty') { eco.stock = 0; eco.last = Date.now(); }
  if (a === 'soon') { if (eco.stock >= eco.max) eco.stock = eco.max - 1; eco.last = Date.now() - REGEN + 5000; }
  if (a === 'reset') { eco.max = BASE_MAX; eco.stock = Math.min(eco.stock, BASE_MAX); }
  saveEco(); render();
});

regen();
render();
