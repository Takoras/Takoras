// Fenêtre « Probas & infos » : les vraies chances de chaque jeton (avec ou sans potions) et comment marche le jeu.

const INFO = {
  fr: {
    title: 'Probas & infos', luck: 'Avec une chance de', yours: 'ta chance actuelle',
    th: ['Jeton', 'Affiché', 'Chance réelle', 'En moyenne', 'Revente'], one_in: '1 sur {n}',
    how: 'Comment ça marche',
    rules: [
      ['🎲 Le tirage', 'Le jeu teste les jetons du plus rare au plus commun : Takoras a 1 chance sur 1 000 000, s’il ne tombe pas on teste le suivant, etc. Si rien ne tombe, tu as Mobu. Le jeton est tiré par le serveur dès que tu ouvres : cliquer plus ou moins vite ne change rien.'],
      ['🍀 La chance', 'La chance multiplie la probabilité de chaque jeton. Avec ×2, Takoras passe à 1 chance sur 500 000. Les communs baissent un peu, puisque les rares tombent plus souvent.'],
      ['🧪 Les potions se cumulent', 'Chaque potion ajoute son bonus : ×1,3 = +0,3, ×2 = +1, ×5 = +4. Donc ×2 + ×1,3 = ×2,3, et ×2 + ×1,3 + ×5 = ×6,3. Boire une potion que tu as déjà rallonge sa durée (deux ×2 = ×2 pendant 6 pulls) au lieu d’ajouter son bonus. Chaque potion compte ses pulls de son côté. La chance totale est plafonnée à ×500.'],
      ['⏳ Recharge', 'Tu gagnes 1 pull toutes les 3 min jusqu’à ton stock max (5 au départ). Le sablier double la vitesse (1 pull toutes les 1 min 30) ; plusieurs sabliers rallongent la durée.'],
      ['⚡ Recharge éclair', 'Donne +1 pull tout de suite, si ton stock n’est pas plein.'],
      ['📦 Stock max', 'Améliorable de 5 à 10 : 1 000, 3 000, 9 000, 27 000 puis 81 000 pièces.'],
      ['🪙 Revente', 'Un jeton se revend la moitié de sa rareté : 1/2 → 1 pièce, 1/1 000 → 500, 1/1 000 000 → 500 000. Les jetons verrouillés ne peuvent pas être vendus.'],
      ['🛒 Boutique', 'Tous les objets sont en vente, mais le stock change toutes les 5 h (le même pour tout le monde, chacun peut acheter jusqu’au stock affiché). Toujours au moins 5 potions ×1,3 et 2 ×2 ; les grosses potions (×10, ×25, ×50, ×100) n’apparaissent que de temps en temps. Les objets achetés vont dans ton inventaire ; tu les utilises quand tu veux.'],
    ],
  },
  en: {
    title: 'Odds & info', luck: 'With a luck of', yours: 'your current luck',
    th: ['Token', 'Shown', 'Real chance', 'On average', 'Sell'], one_in: '1 in {n}',
    how: 'How it works',
    rules: [
      ['🎲 The roll', 'The game checks tokens from rarest to most common: Takoras has a 1 in 1,000,000 chance, if it misses the next one is checked, and so on. If nothing hits, you get Mobu. The token is rolled by the server as soon as you open: clicking faster or slower changes nothing.'],
      ['🍀 Luck', 'Luck multiplies every token’s chance. With ×2, Takoras becomes 1 in 500,000. Commons drop a little since rares hit more often.'],
      ['🧪 Potions stack', 'Each potion adds its bonus: ×1.3 = +0.3, ×2 = +1, ×5 = +4. So ×2 + ×1.3 = ×2.3, and ×2 + ×1.3 + ×5 = ×6.3. Drinking a potion you already have extends its duration (two ×2 = ×2 for 6 pulls) instead of adding its bonus. Each potion counts its own pulls. Total luck is capped at ×500.'],
      ['⏳ Recharge', 'You get 1 pull every 3 min up to your max stock (5 at first). The hourglass doubles the speed (1 pull every 1 min 30); several hourglasses extend the duration.'],
      ['⚡ Instant refill', 'Gives +1 pull right away, if your stock isn’t full.'],
      ['📦 Max stock', 'Upgradable from 5 to 10: 1,000, 3,000, 9,000, 27,000 then 81,000 coins.'],
      ['🪙 Selling', 'A token sells for half its rarity: 1/2 → 1 coin, 1/1,000 → 500, 1/1,000,000 → 500,000. Locked tokens can’t be sold.'],
      ['🛒 Shop', 'Every item is on sale, but stock changes every 5 h (same for everyone, each player can buy up to the stock shown). Always at least 5 ×1.3 potions and 2 ×2; big potions (×10, ×25, ×50, ×100) only show up now and then. Bought items go to your inventory; use them whenever you want.'],
    ],
  },
};

// Vraies probabilités avec une chance donnée (même calcul que le serveur)
function realOdds(luck) {
  const list = [...SERIES.Takoras].sort((a, b) => b.odds - a.odds);
  let rest = 1;
  const out = list.map(j => { const p = rest * Math.min(1, Math.min(500, luck) / j.odds); rest -= p; return { j, p }; });
  out[out.length - 1].p += rest;
  return out.reverse();
}
const pct = p => (p * 100 >= 1 ? (p * 100).toFixed(1) : (p * 100).toPrecision(2)).replace('.', SETTINGS.lang === 'fr' ? ',' : '.') + ' %';

function openInfo() {
  const T = INFO[SETTINGS.lang] || INFO.fr;
  const mine = ACC.user ? (eco.luck || 1) : 1;
  const choices = [...new Set([1, 1.3, 2, 5, 10, 25, 100, 500, +mine.toFixed(2)])].sort((a, b) => a - b);
  let luck = mine;
  const card = $('jm-card');
  jm.style.setProperty('--g', '139, 92, 246');
  card.onclick = card.oninput = card.onchange = null;
  const draw = () => {
    card.innerHTML = `
      <button class="set-close jm-close" aria-label="${t('close')}">✕</button>
      <div class="info">
        <h2>ℹ️ ${T.title}</h2>
        <div class="info-luck"><span class="muted">${T.luck}</span>${choices.map(c => `<button class="chip${c === luck ? ' on' : ''}" data-l="${c}">×${dec(c)}${c === +mine.toFixed(2) && mine > 1 ? ' · ' + T.yours : ''}</button>`).join('')}</div>
        <div class="info-table"><table><thead><tr>${T.th.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${
          realOdds(luck).map(({ j, p }) => `<tr><td><img src="${texOf(j)}" alt=""><span class="t-${tierKey(j.odds)}">${jnH(j.name)}</span></td><td>1/${fmt(j.odds)}</td><td><b>${pct(p)}</b></td><td class="muted">${T.one_in.replace('{n}', fmt(Math.max(1, Math.round(1 / p))))}</td><td>${money(sellValue(j.odds))}</td></tr>`).join('')
        }</tbody></table></div>
        <h3>${T.how}</h3>
        <div class="info-rules">${T.rules.map(([h, p]) => `<div><b>${h}</b><p class="muted">${p}</p></div>`).join('')}</div>
      </div>`;
  };
  draw();
  jm.classList.add('on');
  card.onclick = e => { const b = e.target.closest('[data-l]'); if (b) { luck = +b.dataset.l; draw(); } };
}
document.addEventListener('click', e => { if (e.target.closest('[data-info]')) openInfo(); });
