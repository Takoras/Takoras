// Quêtes du jour : 3 petites missions par joueur et par jour (choisies par le serveur), récompense à récupérer.
// Elles avancent toutes seules (le serveur compte les pulls, ventes, achats, combats…) ; le panneau est sur l'accueil.

const QUEST_ITEM = { potion1: '🧪 ×1,3', potion2: '🧪 ×2', potion3: '🧪 ×5', instant: '⚡', hourglass: '⏳' };
let QST = { list: [], loaded: 0, reset: 0, done: new Set() }, qTimer, qTick;

function questsSoon() { clearTimeout(qTimer); qTimer = setTimeout(renderQuests, 600); }

async function renderQuests() {
  const box = $('quests');
  if (!ACC.user) { box.hidden = true; return; }
  const { data } = await sb.rpc('my_quests');
  if (!data) { box.hidden = true; return; }
  // une quête vient d'être terminée : petite notif
  const finished = data.quests.filter(q => q.value >= q.target && !q.claimed).map(q => q.id);
  if (QST.loaded) finished.filter(id => !QST.done.has(id)).forEach(() => { sfx.regen(); toast('✅ ' + t('q_done')); });
  QST = { list: data.quests, loaded: Date.now(), reset: data.reset_in, done: new Set(finished) };
  box.hidden = false;
  box.innerHTML = `
    <div class="q-head"><b>🎯 ${t('q_title')}</b><small class="muted" id="q-reset"></small></div>
    ${data.quests.map(q => {
      const ok = q.value >= q.target, reward = [q.coins ? money(q.coins) : '', q.item ? `${QUEST_ITEM[q.item] || q.item}${q.qty > 1 ? ' ×' + q.qty : ''}` : ''].filter(Boolean).join(' ');
      return `<div class="q${ok ? ' ok' : ''}${q.claimed ? ' claimed' : ''}">
        <div class="q-top"><span>${t('q_' + q.stat, { n: q.target })}</span><span class="q-rew">${reward}</span></div>
        <div class="q-bar"><i style="width:${q.value / q.target * 100}%"></i><b>${q.value}/${q.target}</b></div>
        ${q.claimed ? '<span class="q-check">✓</span>' : ok ? `<button class="btn primary sm q-claim" data-q="${q.id}">${t('q_claim')}</button>` : ''}
      </div>`;
    }).join('')}`;
  clearInterval(qTick);
  const tick = () => { const el = $('q-reset'); if (!el) return clearInterval(qTick); const left = Math.max(0, QST.reset - Math.round((Date.now() - QST.loaded) / 1000)); el.textContent = t('q_reset', { t: hms(left) }); if (!left) { clearInterval(qTick); questsSoon(); } };
  tick(); qTick = setInterval(tick, 1000);
}
$('quests').addEventListener('click', async e => {
  const b = e.target.closest('[data-q]'); if (!b) return;
  b.disabled = true;
  const { data, error } = await sb.rpc('claim_quest', { p_id: b.dataset.q });
  if (error) { b.disabled = false; sfx.deny(); return toast(errText(error), true); }
  const r = b.getBoundingClientRect(), coin = document.querySelector('.nav .bal img');
  for (let i = 0; i < 3; i++) setTimeout(() => moDissolve(coin, { left: r.left + r.width * (.2 + i * .3) - 18, top: r.top - 8, width: 36, height: 36 }, .8), i * 110);
  sfx.upgrade(); toast('🎁 ' + t('q_got'));
  applyState(data);
});
if (ACC.user) renderQuests();
