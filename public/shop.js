// Boutique : tous les objets, rangés par catégorie. Le stock change toutes les 5 h (le même pour tout le monde,
// chacun peut acheter jusqu'au stock affiché). Au moins 5 potions ×1,3 et 2 ×2 ; le reste dépend de la chance.

let SHOP = null, shopTimer, shopCat = 'all';
const CATS = [['potion', 'cat_potions', '🧪'], ['util', 'cat_utils', '⚙️'], ['banner', 'cat_cosm', '🎨']];
const catOf = it => (it.kind === 'potion' ? 'potion' : it.kind === 'banner' ? 'banner' : 'util');

// Couleur de chaque potion (sert au halo de la carte)
const POTION_GLOW = { 1.3: '134, 239, 172', 2: '196, 181, 253', 5: '251, 191, 36', 10: '103, 232, 249', 25: '244, 114, 182', 50: '251, 146, 60', 100: '255, 255, 255' };
const glowOf = it => it.kind === 'potion' ? POTION_GLOW[it.data.mult] || '139, 92, 246' : it.kind === 'banner' ? '249, 115, 22' : '139, 92, 246';

function itemIcon(it) {
  if (it.kind === 'banner') { const id = it.id.slice(2); return BANNER_IMG[id] ? `<img class="si-banner" src="${BANNER_IMG[id]}" alt="">` : (() => { const c = bannerCanvas(id); return `<img class="si-banner" src="${c.toDataURL()}" alt="">`; })(); }
  return (ICONS[it.id] || ICONS.instant)();
}
function itemText(it) {
  if (it.kind === 'potion') return [t('it_potion', { m: dec(it.data.mult) }), t('it_potion_d', { m: dec(it.data.mult), n: it.data.rolls })];
  if (it.kind === 'instant') return [t('it_instant'), t('it_instant_d')];
  if (it.kind === 'hourglass') return [t('it_hourglass'), t('it_hourglass_d', { n: it.data.minutes })];
  return [t('it_banner', { n: bannerName(it.id.slice(2)) }), t('it_banner_d')];
}
const dec = n => String(Math.round(n * 100) / 100).replace('.', SETTINGS.lang === 'fr' ? ',' : '.');
const hms = s => [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map(n => String(n).padStart(2, '0')).join(':');

// Effets actifs (potions cumulées, sablier) : affichés dans la boutique et sous le stock de l'accueil
function effectsHTML() {
  const e = [];
  if ((eco.potions || []).length) {
    e.push(`<span class="fx-chip total">🍀 ${t('fx_total', { m: dec(eco.luck) })}</span>`);
    eco.potions.forEach(p => e.push(`<span class="fx-chip">🧪 ${t('fx_luck', { m: dec(p.m), n: p.n })}</span>`));
  }
  if (eco.fast_left > 0) e.push(`<span class="fx-chip">⏳ ${t('fx_fast', { t: hms(Math.max(0, Math.round(eco.fast_left - (Date.now() - eco.synced) / 1000))) })}</span>`);
  return e.join('');
}

const shopLeft = () => Math.max(0, SHOP.reset_in - Math.round((Date.now() - SHOP.loaded) / 1000));

function cardHTML(it) {
  const changed = it.base_price != null && it.price !== it.base_price, pct = changed ? Math.round((it.price / it.base_price - 1) * 100) : 0;
  const [name, desc] = itemText(it), left = Math.max(0, it.stock - it.bought), out = it.owned || left <= 0;
  const status = it.owned ? `<span class="si-stock ok">✓ ${t('unlocked_b')}</span>`
    : left > 0 ? `<span class="si-stock">${t('stock_n', { n: left })}</span>` : `<span class="si-stock none">${t('sold_out')}</span>`;
  const btn = it.owned ? `<button class="btn ghost si-btn" disabled>✓ ${t('owned')}</button>`
    : out ? `<button class="btn ghost si-btn" disabled>${t('back_in')} <b class="si-timer">${hms(shopLeft())}</b></button>`
    : `<button class="btn primary si-btn${ACC.user && eco.coins < it.price ? ' poor' : ''}" data-buy="${it.id}" ${ACC.user ? '' : 'disabled'}>${t('buy')} · ${changed ? `<s>${fmt(it.base_price)}</s> ` : ''}${money(it.price)}</button>${ACC.user && eco.coins < it.price ? `<small class="si-miss">${t('missing', { n: fmt(it.price - eco.coins) })}</small>` : ''}`;
  return `<div class="si${out ? ' out' : ''}${it.kind === 'potion' && it.data.mult >= 10 ? ' epic' : ''}" data-id="${it.id}" style="--g:${glowOf(it)}">
    ${status}
    ${changed ? `<span class="si-deal${pct > 0 ? ' up' : ''}">${pct > 0 ? '+' : ''}${pct}%</span>` : ''}
    <div class="si-icon">${itemIcon(it)}</div>
    <b>${name}</b><p class="muted">${desc}</p>
    ${btn}
  </div>`;
}

async function renderShop() {
  const page = $('page-shop');
  const { data, error } = await sb.rpc('shop_today');
  if (error) { page.innerHTML = `<p class="muted">${t('err_generic')}</p>`; return; }
  SHOP = data; SHOP.loaded = Date.now();
  const groups = CATS.map(([k, label, ico]) => [k, label, ico, SHOP.items.filter(it => catOf(it) === k)]);
  page.innerHTML = `
    <div class="page-head">
      <div><div class="eyebrow">${t('nav_shop')}</div><h2 class="page-title">${t('shop_title')}</h2>
      <p class="muted">${t('shop_reset')} <b id="shop-reset">${hms(shopLeft())}</b></p></div>
      <div class="shop-right"><button class="btn ghost sm" data-info>ℹ️ ${t('odds_info')}</button><div class="shop-bal">${ACC.user ? money(eco.coins) : ''}</div></div>
    </div>
    <div class="fx-row" id="shop-fx">${ACC.user ? effectsHTML() : ''}</div>
    <div class="chips shop-cats">${[['all', 'all', '✨'], ...CATS].map(([k, l, ico]) => `<button class="chip${shopCat === k ? ' on' : ''}" data-cat="${k}">${ico} ${t(l)}</button>`).join('')}</div>
    ${groups.filter(([k]) => shopCat === 'all' || shopCat === k).map(([k, label, ico, list]) => list.length ? `
      <section class="shop-sec">
        <h3 class="shop-h">${ico} ${t(label)} <small class="muted">${t('in_stock', { n: list.filter(it => !it.owned && it.stock - it.bought > 0).length, m: list.length })}</small></h3>
        <div class="shop-grid">${list.map(cardHTML).join('')}</div>
      </section>` : '').join('')}
    ${ACC.user ? '' : `<p class="muted center">${t('acc_need')}</p>`}`;
  page.onclick = async e => {
    const c = e.target.closest('[data-cat]');
    if (c) { shopCat = c.dataset.cat; sfx.click(); return renderShop(); }
    const b = e.target.closest('[data-buy]'); if (!b || b.disabled) return;
    const it = SHOP.items.find(i => i.id === b.dataset.buy), card = b.closest('.si');
    if (eco.coins < it.price) {
      sfx.deny();
      card.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }], { duration: 260 });
      return toast(t('err_coins'), true);
    }
    b.disabled = true;
    const { data, error } = await sb.rpc('buy_item', { p_item: it.id });
    if (error) { sfx.deny(); toast(errText(error), true); return renderShop(); }
    applyState(data);
    sfx.upgrade();
    toast(t('bought', { n: itemText(it)[0] }) + (it.kind === 'banner' ? '' : ' → ' + t('nav_inv')));
    // la carte se met à jour (stock) avec un petit « pop »
    it.bought++;
    if (it.kind === 'banner') it.owned = true;
    card.outerHTML = cardHTML(it);
    page.querySelector(`.si[data-id="${it.id}"]`)?.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.05)' }, { transform: 'scale(1)' }], { duration: 320, easing: 'cubic-bezier(.2,1.4,.4,1)' });
    page.querySelectorAll('.si-btn[data-buy]').forEach(x => { const i = SHOP.items.find(y => y.id === x.dataset.buy); if (i && (eco.coins < i.price) !== x.classList.contains('poor')) x.closest('.si').outerHTML = cardHTML(i); });
  };
  clearInterval(shopTimer);
  shopTimer = setInterval(() => {
    const el = $('shop-reset'); if (!el) return clearInterval(shopTimer);
    const left = shopLeft();
    el.textContent = hms(left);
    document.querySelectorAll('.si-timer').forEach(x => { x.textContent = hms(left); });
    if (ACC.user) $('shop-fx').innerHTML = effectsHTML();
    if (left === 0) renderShop();
  }, 1000);
}
