// Boutique du jour : 5 objets tirés chaque jour (les mêmes pour tout le monde), achetés avec les pièces.
// Potions de chance, recharge instantanée, sablier (recharge 2x plus rapide) et bannières de profil.

let SHOP = null, shopTimer;

function itemIcon(it) {
  if (it.kind === 'banner') { const id = it.id.slice(2); return BANNER_IMG[id] ? `<img class="si-banner" src="${BANNER_IMG[id]}" alt="">` : (() => { const c = bannerCanvas(id); return `<img class="si-banner" src="${c.toDataURL()}" alt="">`; })(); }
  return (ICONS[it.id] || ICONS.instant)();
}
function itemText(it) {
  if (it.kind === 'potion') return [t('it_potion', { m: String(it.data.mult).replace('.', SETTINGS.lang === 'fr' ? ',' : '.') }), t('it_potion_d', { m: it.data.mult, n: it.data.rolls })];
  if (it.kind === 'instant') return [t('it_instant'), t('it_instant_d')];
  if (it.kind === 'hourglass') return [t('it_hourglass'), t('it_hourglass_d', { n: it.data.minutes })];
  return [t('it_banner', { n: bannerName(it.id.slice(2)) }), t('it_banner_d')];
}
const hms = s => [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map(n => String(n).padStart(2, '0')).join(':');

// Effets actifs (potion, sablier) : affichés dans la boutique et sous le stock de l'accueil
function effectsHTML() {
  const e = [];
  if (eco.luck_left > 0) e.push(`<span class="fx-chip">🧪 ${t('fx_luck', { m: String(eco.luck_mult).replace('.', ','), n: eco.luck_left })}</span>`);
  if (eco.fast_left > 0) e.push(`<span class="fx-chip">⏳ ${t('fx_fast', { t: hms(Math.max(0, Math.round(eco.fast_left - (Date.now() - eco.synced) / 1000))) })}</span>`);
  return e.join('');
}

async function renderShop() {
  const page = $('page-shop');
  const { data, error } = await sb.rpc('shop_today');
  if (error) { page.innerHTML = `<p class="muted">${t('err_generic')}</p>`; return; }
  SHOP = data; SHOP.loaded = Date.now();
  page.innerHTML = `
    <div class="page-head">
      <div><div class="eyebrow">${t('nav_shop')}</div><h2 class="page-title">${t('shop_title')}</h2>
      <p class="muted">${t('shop_reset')} <b id="shop-reset"></b></p></div>
      <div class="shop-bal">${ACC.user ? money(eco.coins) : ''}</div>
    </div>
    <div class="fx-row" id="shop-fx">${ACC.user ? effectsHTML() : ''}</div>
    <div class="shop-grid">${SHOP.items.map(it => {
      const [name, desc] = itemText(it), left = it.limit - it.bought, soldOut = it.owned || left <= 0;
      return `<div class="si${soldOut ? ' out' : ''}" data-id="${it.id}">
        <div class="si-icon">${itemIcon(it)}</div>
        <b>${name}</b><p class="muted">${desc}</p>
        <div class="si-foot"><span class="si-price">${money(it.price)}</span><small class="muted">${it.owned ? t('owned') : t('left_today', { n: Math.max(0, left) })}</small></div>
        <button class="btn primary" data-buy="${it.id}" ${soldOut || !ACC.user ? 'disabled' : ''}>${it.owned ? t('owned') : left <= 0 ? t('sold_out') : t('buy')}</button>
      </div>`;
    }).join('')}</div>
    ${ACC.user ? '' : `<p class="muted center">${t('acc_need')}</p>`}`;
  page.onclick = async e => {
    const b = e.target.closest('[data-buy]'); if (!b || b.disabled) return;
    const it = SHOP.items.find(i => i.id === b.dataset.buy);
    if (eco.coins < it.price) { sfx.deny(); return toast(t('err_coins'), true); }
    b.disabled = true;
    const { data, error } = await sb.rpc('buy_item', { p_item: it.id });
    if (error) { sfx.deny(); toast(errText(error), true); return renderShop(); }
    applyState(data);
    sfx.upgrade();
    toast(t('bought', { n: itemText(it)[0] }));
    renderShop();
  };
  clearInterval(shopTimer);
  const tick = () => {
    const el = $('shop-reset'); if (!el) return clearInterval(shopTimer);
    const left = Math.max(0, SHOP.reset_in - Math.round((Date.now() - SHOP.loaded) / 1000));
    el.textContent = hms(left);
    if (ACC.user) $('shop-fx').innerHTML = effectsHTML();
    if (left === 0) renderShop();
  };
  tick(); shopTimer = setInterval(tick, 1000);
}
