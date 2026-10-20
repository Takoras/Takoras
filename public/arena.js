// Combat (étape 1) : ton équipe de 3 jetons, les éléments, les capacités / passifs, et l'entraînement contre le robot.
// Les règles sont dans combat-engine.js (CB) ; ici : la page Combat, le choix de l'équipe et l'écran de combat animé.
// Étape 2 (à venir) : le classé en direct avec les rangs. Voir docs/COMBAT.md.

const ELS = {
  fire: { ico: '🔥', col: '#fb923c', fr: 'Feu', en: 'Fire' },
  water: { ico: '💧', col: '#38bdf8', fr: 'Eau', en: 'Water' },
  plant: { ico: '🌿', col: '#4ade80', fr: 'Plante', en: 'Plant' },
  light: { ico: '✨', col: '#fde68a', fr: 'Lumière', en: 'Light' },
  shadow: { ico: '🌑', col: '#a78bfa', fr: 'Ténèbres', en: 'Dark' },
};
const elName = el => ELS[el][SETTINGS.lang === 'en' ? 'en' : 'fr'];
// [nom de la capacité, description, nom du passif, description]
const SKILLS = {
  fr: {
    'Mobu': ['Bulle', 'Ne prend aucun dégât ce tour.', 'Collant', 'Le jeton qu’il croise ne pourra pas être rejoué au tour suivant.'],
    'Pikko': ['Épines', 'Inflige 6 dégâts au joueur d’en face, croisé ou pas.', 'Pollen', 'Quand il n’est pas joué, soigne ses alliés de 5 PV.'],
    'Rouillé': ['Rouille', 'S’il croise : le jeton adverse perd 30 % de défense pour tout le combat.', 'Ferraille', 'En tombant K.O., inflige 5 dégâts au joueur d’en face.'],
    'Givre': ['Gel', 'L’endroit où il est posé est interdit à l’adversaire au tour suivant.', 'Froid', '+25 % de dégâts contre un jeton déjà blessé.'],
    'Soléo': ['Soleil', 'Soigne tous tes jetons de 30 %.', 'Aube', '+20 % de dégâts quand il est posé au milieu.'],
    'Azura': ['Raz-de-marée', 'Croise forcément le jeton adverse, où qu’il soit.', 'Courant', '+3 dégâts quand il frappe le joueur.'],
    'Carmin': ['Saignée', 'Dégâts ×2 en croisement, et se soigne de la moitié.', 'Rage', 'Plus il est blessé, plus il tape fort (jusqu’à +50 %).'],
    'Vyolis': ['Barrière', 'Ton joueur gagne un bouclier de 8 PV.', 'Écho', '25 % de chance de frapper une 2e fois en croisement.'],
    'Lumis': ['Éblouir', 'Le prochain jeton adverse ne fera aucun dégât.', 'Éclat', '+50 % de dégâts quand il frappe le joueur.'],
    'Nyx': ['Ombre', 'S’il est croisé, il passe à travers et frappe le joueur ×2.', 'Nuit', 'Insaisissable : rien ne le touche quand il traverse.'],
    'Astra': ['Étoile filante', 'Coup critique : dégâts ×2 (jeton ou joueur).', 'Constellation', 'Chaque jeton qu’il met K.O. donne +6 % de dégâts à l’équipe.'],
    'Kraïos': ['Tempête', 'En croisement, frappe le jeton ET le joueur.', 'Fureur', '+10 % de dégâts à chaque fois qu’il est rejoué.'],
    'Koi': ['Courant', 'Recharge la capacité déjà utilisée d’un allié.', 'Chance', '20 % de chance d’esquiver en croisement.'],
    'Néphéris': ['Malédiction', 'Le jeton croisé perd des PV pendant 3 tours (sinon le joueur).', 'Racines', 'Renvoie 25 % des dégâts reçus.'],
    'Zénith': ['Aube', 'Ressuscite un jeton K.O. à 50 % (sinon soigne l’équipe).', 'Halo', 'Ton joueur subit −20 % de dégâts.'],
    'Oblivion': ['Néant', 'S’il croise : met K.O. le jeton adverse d’un coup (sauf Takoras). Sinon 10 dégâts au joueur.', 'Vide', 'Les jetons qu’il touche ne peuvent plus être soignés.'],
    'Takoras': ['Jugement', 'Croise forcément le jeton adverse + bouclier de 6 PV pour ton joueur.', 'Couronne', '+15 % à toutes les stats de l’équipe.'],
  },
  en: {
    'Mobu': ['Bubble', 'Takes no damage this turn.', 'Sticky', 'The token it crosses can’t be played next turn.'],
    'Pikko': ['Thorns', 'Deals 6 damage to the opponent, crossed or not.', 'Pollen', 'When not played, heals its allies by 5 HP.'],
    'Rouillé': ['Rust', 'If it crosses: the enemy token loses 30% defense for the whole battle.', 'Scrap', 'When knocked out, deals 5 damage to the opponent.'],
    'Givre': ['Freeze', 'The spot it’s placed on is forbidden to the opponent next turn.', 'Cold', '+25% damage against an already hurt token.'],
    'Soléo': ['Sunlight', 'Heals all your tokens by 30%.', 'Dawn', '+20% damage when placed in the middle.'],
    'Azura': ['Tidal wave', 'Always crosses the enemy token, wherever it is.', 'Current', '+3 damage when it hits the player.'],
    'Carmin': ['Bloodletting', '×2 damage when crossing, and heals for half.', 'Rage', 'The more hurt it is, the harder it hits (up to +50%).'],
    'Vyolis': ['Barrier', 'Your player gets an 8 HP shield.', 'Echo', '25% chance to strike a 2nd time when crossing.'],
    'Lumis': ['Dazzle', 'The next enemy token deals no damage.', 'Gleam', '+50% damage when it hits the player.'],
    'Nyx': ['Shadow', 'If crossed, it slips through and hits the player ×2.', 'Night', 'Elusive: nothing touches it while slipping through.'],
    'Astra': ['Shooting star', 'Critical hit: ×2 damage (token or player).', 'Constellation', 'Every token it knocks out gives the team +6% damage.'],
    'Kraïos': ['Storm', 'When crossing, hits the token AND the player.', 'Fury', '+10% damage every time it’s played again.'],
    'Koi': ['Current', 'Recharges an ally’s already used ability.', 'Luck', '20% chance to dodge when crossing.'],
    'Néphéris': ['Curse', 'The crossed token loses HP for 3 turns (otherwise the player).', 'Roots', 'Reflects 25% of damage taken.'],
    'Zénith': ['Dawn', 'Revives a knocked-out token at 50% (otherwise heals the team).', 'Halo', 'Your player takes −20% damage.'],
    'Oblivion': ['Void', 'If it crosses: knocks the enemy token out in one hit (except Takoras). Otherwise 10 damage to the player.', 'Emptiness', 'Tokens it hits can no longer be healed.'],
    'Takoras': ['Judgment', 'Always crosses the enemy token + 6 HP shield for your player.', 'Crown', '+15% to all team stats.'],
  },
};
const skillsOf = name => (SKILLS[SETTINGS.lang] || SKILLS.fr)[name] || SKILLS.fr.Mobu;
const AT = {
  fr: { title: 'Combat', sub: 'Choisis 3 jetons et affronte le robot. Le classé avec les rangs arrive bientôt.', team: 'Ton équipe',
    slots: ['Jeton 1', 'Jeton 2', 'Jeton 3'], lanes: ['Gauche', 'Milieu', 'Droite'], pick: 'Choisir', train: '⚔️ Entraînement contre le robot', ranked: '🏆 Classé', soon: 'Bientôt : rangs Bronze → Légende, saisons et battle pass',
    need3: 'Choisis 3 jetons pour combattre', els: 'Éléments', elsHelp: '🔥 bat 🌿 · 🌿 bat 💧 · 💧 bat 🔥 · ✨ et 🌑 forts l’un contre l’autre (×1,3 de dégâts)',
    how: 'Comment ça marche', howText: 'À chaque manche, vous choisissez chacun un jeton (on voit celui de l’autre), puis vous le posez <b>à gauche, au milieu ou à droite</b> sans voir où l’autre le met. <b>Même endroit</b> : les deux jetons se battent. <b>Endroits différents</b> : chacun frappe le joueur d’en face. Chaque capacité ne sert qu’<b>une fois</b> par combat. Un jeton joué se repose la manche suivante.', round: 'Manche {n}', normal: 'Normal', phaseToken: 'Choisis ton jeton pour cette manche', phaseLane: 'Tu joues <b>{a}</b>, il joue <b>{b}</b>. Où poses-tu ton jeton ?', ok: 'Valider', place: 'Poser ici', usedAb: 'déjà utilisée', tired: 'Ce jeton se repose cette manche', clash: 'Croisement !', block: 'Protégé', dazzled: 'Ébloui', recharged: 'Capacité rechargée', frozenL: 'Gelé', rounds: '{n} manches', dmgWord: 'dégâts',
    pickTitle: 'Choisis un jeton', lvl: 'Niv.', power: 'Puissance', ability: 'Capacité', passive: 'Passif', remove: 'Retirer', none: 'Tu n’as pas encore de jeton : ouvre des pulls !',
    ready: 'PRÊT', win: 'Victoire !', lose: 'Défaite…', draw: 'Égalité', again: 'Rejouer', back: 'Retour', bot: 'Robot', you: 'Toi', mvp: 'Meilleur jeton',
    quit: 'Abandonner le combat ?', eff: 'Efficace !', weak: 'Peu efficace', dodge: 'Esquive', miss: 'Raté', crit: 'CRITIQUE', revive: 'Ressuscité !', time: 'Temps écoulé',
    lvlUp: 'Monter au niveau {n}', lvlCost: 'utilise {n} doublon(s)', lvlNeed: 'Il faut {n} doublon(s) libre(s) (tu en as {h})', lvlMax: 'Niveau max', lvlOk: '{j} passe niveau {n} !', element: 'Élément' },
  en: { title: 'Battle', sub: 'Pick 3 tokens and fight the bot. Ranked with tiers is coming soon.', team: 'Your team',
    slots: ['Token 1', 'Token 2', 'Token 3'], lanes: ['Left', 'Middle', 'Right'], pick: 'Pick', train: '⚔️ Training vs the bot', ranked: '🏆 Ranked', soon: 'Soon: Bronze → Legend tiers, seasons and battle pass',
    need3: 'Pick 3 tokens to fight', els: 'Elements', elsHelp: '🔥 beats 🌿 · 🌿 beats 💧 · 💧 beats 🔥 · ✨ and 🌑 strong against each other (×1.3 damage)',
    how: 'How it works', howText: 'Each round, you both pick a token (you see each other’s), then place it <b>left, middle or right</b> without seeing where the other puts theirs. <b>Same spot</b>: the two tokens fight. <b>Different spots</b>: each hits the opposing player. Each ability can only be used <b>once</b> per battle. A token that just played rests the next round.', round: 'Round {n}', normal: 'Normal', phaseToken: 'Pick your token for this round', phaseLane: 'You play <b>{a}</b>, they play <b>{b}</b>. Where do you place your token?', ok: 'Confirm', place: 'Place here', usedAb: 'already used', tired: 'This token is resting this round', clash: 'Clash!', block: 'Protected', dazzled: 'Dazzled', recharged: 'Ability recharged', frozenL: 'Frozen', rounds: '{n} rounds', dmgWord: 'damage',
    pickTitle: 'Pick a token', lvl: 'Lv.', power: 'Power', ability: 'Ability', passive: 'Passive', remove: 'Remove', none: 'You have no tokens yet: open some pulls!',
    ready: 'READY', win: 'Victory!', lose: 'Defeat…', draw: 'Draw', again: 'Play again', back: 'Back', bot: 'Bot', you: 'You', mvp: 'Best token',
    quit: 'Forfeit the battle?', eff: 'Effective!', weak: 'Not effective', dodge: 'Dodge', miss: 'Miss', crit: 'CRIT', revive: 'Revived!', time: 'Time’s up',
    lvlUp: 'Level up to {n}', lvlCost: 'uses {n} duplicate(s)', lvlNeed: 'Needs {n} free duplicate(s) (you have {h})', lvlMax: 'Max level', lvlOk: '{j} is now level {n}!', element: 'Element' },
};
const slotName = i => ((AT[SETTINGS.lang] || AT.fr).slots)[i];
const atList = k => (AT[SETTINGS.lang] || AT.fr)[k];
const at = (k, v = {}) => String((AT[SETTINGS.lang] || AT.fr)[k] ?? AT.fr[k]).replace(/\{(\w+)\}/g, (_, x) => v[x] ?? '');

const ARENA = { levels: {}, team: [null, null, null] };
const lvlOf = name => ARENA.levels[name] || 1;
async function loadLevels() {
  const { data } = await sb.rpc('my_levels');
  ARENA.levels = {}; (data || []).forEach(r => { ARENA.levels[r.jeton] = r.lvl; });
}
const VRANK = { '': 0, gold: 1, celeste: 2, ombre: 3 };

// ---------- Page Combat
async function renderCombat() {
  const page = $('page-combat');
  if (!ACC.user) { page.innerHTML = `<div class="page-empty"><h2>${at('title')}</h2><p class="muted">${t('acc_need')}</p><button class="btn primary" onclick="openAccount('login')">${t('login')}</button></div>`; return; }
  await Promise.all([loadInventory(), loadLevels(), (async () => {
    const { data } = await sb.rpc('my_deck');
    ARENA.team = [0, 1, 2].map(i => data?.[i] ? { id: data[i].id, name: data[i].jeton, odds: data[i].odds, variant: data[i].variant || '' } : null);
  })()]);
  drawCombat();
}
function teamCard(u, i) {
  if (!u) return `<button class="ar-slot empty" data-slot="${i}"><span class="ar-pos">${slotName(i)}</span><b>＋</b><small>${at('pick')}</small></button>`;
  const j = jetonOf(u.name), el = CB.elOf(u.name), s = CB.stats(u.name, u.odds, lvlOf(u.name), u.variant), [an] = skillsOf(u.name);
  return `<button class="ar-slot" data-slot="${i}" style="--g:${hexRGB(j.glow)};--el:${ELS[el].col}">
    <span class="ar-pos">${slotName(i)}</span><span class="ar-el" title="${elName(el)}">${ELS[el].ico}</span>
    <img class="${vCls(u.variant)}" src="${texOf(j)}" alt="">
    <b>${jnH(u.name)}${vTag(u.variant)}</b>
    <small>${at('lvl')} ${lvlOf(u.name)} · ⚡${fmt(CB.power(s))}</small>
    <small class="ar-ab">✦ ${esc(an)}</small>
  </button>`;
}
function drawCombat() {
  const page = $('page-combat'), full = ARENA.team.every(Boolean);
  page.innerHTML = `<div class="ar-page">
    <div class="page-head"><div><div class="eyebrow">${at('title')}</div><h2 class="page-title">${at('team')}</h2><p class="muted">${at('sub')}</p></div></div>
    <div class="ar-team">${ARENA.team.map(teamCard).join('')}</div>
    <div class="ar-go">
      <button class="btn primary ar-train" ${full ? '' : 'disabled'}>${at('train')}</button>
      ${full ? '' : `<small class="muted">${at('need3')}</small>`}
      <div class="ar-ranked"><b>${at('ranked')}</b><small>${at('soon')}</small></div>
    </div>
    <div class="ar-help">
      <div><h4>${at('how')}</h4><p class="muted">${at('howText')}</p></div>
      <div><h4>${at('els')}</h4><p class="muted">${at('elsHelp')}</p></div>
    </div>
  </div>`;
  page.querySelector('.ar-team').onclick = e => { const b = e.target.closest('[data-slot]'); if (b) pickSlot(+b.dataset.slot); };
  page.querySelector('.ar-train').onclick = () => startTraining();
}

// ---------- Choix d'un jeton pour une case : la meilleure variante possédée de chaque jeton
// Peu importe combien d'exemplaires tu as : il suffit d'avoir le jeton. Pour chaque jeton, tu choisis la version
// (normale ou une mutation que tu possèdes : Doré +5 %, Céleste +10 %, Ombre +15 % de stats).
const VBONUS_TXT = { '': 0, gold: 5, celeste: 10, ombre: 15 };
function pickSlot(slot) {
  sfx.click();
  const used = new Set(ARENA.team.filter((u, i) => u && i !== slot).map(u => u.name));
  const by = {}; // jeton → { variante → id d'un exemplaire }
  INV.groups.forEach(x => { (by[x.name] ||= { name: x.name, odds: x.odds, vars: {} }).vars[x.variant] = x.ids[0]; });
  const bestV = t => Object.keys(t.vars).sort((a, b) => VRANK[b] - VRANK[a])[0];
  const list = Object.values(by).sort((a, b) => CB.power(CB.stats(b.name, b.odds, lvlOf(b.name), bestV(b))) - CB.power(CB.stats(a.name, a.odds, lvlOf(a.name), bestV(a))));
  const cur = ARENA.team[slot];
  const card = $('jm-card');
  jm.style.setProperty('--g', '139, 92, 246');
  card.onclick = card.oninput = card.onchange = null;
  card.innerHTML = `<button class="set-close jm-close" aria-label="${t('close')}">✕</button>
    <div class="pk-wrap ar-pick"><h2>${at('pickTitle')} · ${slotName(slot)}</h2>
      ${cur ? `<button class="btn ghost sm" data-rm>✕ ${at('remove')}</button>` : ''}
      <div class="ar-plist">${list.map(u => {
        const j = jetonOf(u.name), el = CB.elOf(u.name), bv = bestV(u), s = CB.stats(u.name, u.odds, lvlOf(u.name), bv), [an, ad, pn, pd] = skillsOf(u.name), off = used.has(u.name);
        const vs = Object.keys(u.vars).sort((a, b) => VRANK[a] - VRANK[b]);
        return `<div class="ar-pi${off ? ' off' : ''}" style="--g:${hexRGB(j.glow)};--el:${ELS[el].col}">
          <img class="${vCls(bv)}" src="${texOf(j)}" alt="">
          <div><b>${jnH(u.name)} <span class="ar-elc">${ELS[el].ico} ${elName(el)}</span></b>
            <small>${at('lvl')} ${lvlOf(u.name)} · ⚡${fmt(CB.power(s))} · ❤️${fmt(s.hp)} · ⚔️${s.atk}</small>
            <small><b>✦ ${esc(an)}</b> — ${esc(ad)}</small><small><b>◈ ${esc(pn)}</b> — ${esc(pd)}</small>
            <div class="ar-vpick">${vs.map(v => `<button data-pick="${u.vars[v]}" data-n="${esc(u.name)}" data-v="${v}" ${off ? 'disabled' : ''} class="${v ? 'v-' + v : 'v-none'}${cur && cur.name === u.name && cur.variant === v ? ' on' : ''}">${v ? t('v_' + v) + ' +' + VBONUS_TXT[v] + '%' : at('normal')}</button>`).join('')}</div></div>
        </div>`;
      }).join('') || `<p class="muted">${at('none')}</p>`}</div></div>`;
  jm.classList.add('on');
  card.onclick = async e => {
    if (e.target.closest('[data-rm]')) ARENA.team[slot] = null;
    else {
      const b = e.target.closest('[data-pick]'); if (!b) return;
      const u = by[b.dataset.n];
      ARENA.team[slot] = { id: +b.dataset.pick, name: u.name, odds: u.odds, variant: b.dataset.v };
    }
    sfx.click(); jm.classList.remove('on');
    await sb.rpc('set_deck', { ids: ARENA.team.filter(Boolean).map(u => u.id) });
    drawCombat();
  };
}

// ---------- Robot : une équipe de force proche de la tienne (mêmes paliers de rareté, niveaux proches)
function botTeam(mine, rnd) {
  const all = SERIES.Takoras, idx = n => all.findIndex(j => j.name === n), pickd = new Set();
  return mine.map(u => {
    let k = 0, cand;
    do { const i = Math.max(0, Math.min(all.length - 1, idx(u.name) + Math.round((rnd() - .5) * 4))); cand = all[i]; k++; } while (pickd.has(cand.name) && k < 20);
    pickd.add(cand.name);
    return { name: cand.name, odds: cand.odds, lvl: Math.max(1, Math.min(10, lvlOf(u.name) + Math.round((rnd() - .5) * 2))), variant: '' };
  });
}

// =====================================================================
// Écran de combat « 3 endroits »
// Chaque manche : 1) tu choisis ton jeton (l'adversaire aussi, en même temps) → on voit les deux jetons ;
// 2) tu choisis où le poser (gauche / milieu / droite) et si tu lances sa capacité → on révèle les endroits.
// =====================================================================
const FIGHT = { st: null, phase: 'token', sel: null, lane: null, abil: false, foePick: null, busy: false, names: ['', ''], dmg: [{}, {}] };
const sleep = ms => new Promise(r => setTimeout(r, reducedFx() ? ms * .5 : ms));
function startTraining() {
  if (!ARENA.team.every(Boolean)) return;
  const seed = (Math.random() * 2 ** 31) >>> 0;
  let s = seed; const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const mine = ARENA.team.map(u => ({ name: u.name, odds: u.odds, lvl: lvlOf(u.name), variant: u.variant }));
  startFight([mine, botTeam(mine, rnd)], seed, [ACC.pseudo || at('you'), at('bot')]);
}
function startFight(teams, seed, names) {
  Object.assign(FIGHT, { st: CB.create(teams, seed), phase: 'token', sel: null, lane: null, abil: false, foePick: null, busy: false, names, dmg: [{}, {}] });
  let o = $('arena'); if (!o) { o = document.createElement('div'); o.id = 'arena'; o.className = 'arena'; document.body.appendChild(o); }
  o.innerHTML = `
    <div class="ar-top"><button class="ar-x" aria-label="${t('close')}">✕</button><b class="ar-round" id="ar-round"></b><button class="ar-x" data-help aria-label="?">?</button></div>
    <div class="ar-pl foe"><b>${esc(names[1])}</b><div class="ar-life"><i></i><em></em></div><span class="ar-guard"></span></div>
    <div class="ar-row foe" id="ar-row1">${FIGHT.st.teams[1].map(unitHTML).join('')}</div>
    <div class="ar-lanes" id="ar-lanes">${[0, 1, 2].map(l => `<button class="ar-lane" data-lane="${l}"><span>${atList('lanes')[l]}</span><div class="ar-slotf"></div><div class="ar-slotm"></div></button>`).join('')}</div>
    <div class="ar-row me" id="ar-row0">${FIGHT.st.teams[0].map(unitHTML).join('')}</div>
    <div class="ar-pl me"><b>${esc(names[0])}</b><div class="ar-life"><i></i><em></em></div><span class="ar-guard"></span></div>
    <div class="ar-bar" id="ar-bar"></div>`;
  o.hidden = false;
  document.documentElement.classList.add('lock');
  requestAnimationFrame(() => o.classList.add('on'));
  o.querySelector('#ar-row0').onclick = e => { const c = e.target.closest('.ar-u'); if (c) pickToken(+c.dataset.i); };
  o.querySelector('#ar-row1').onclick = e => { const c = e.target.closest('.ar-u'); if (c) unitInfo(FIGHT.st.teams[1][+c.dataset.i]); };
  o.querySelector('#ar-lanes').onclick = e => { const b = e.target.closest('[data-lane]'); if (b) pickLane(+b.dataset.lane); };
  o.querySelector('#ar-bar').onclick = e => {
    if (e.target.closest("[data-ok]")) fightConfirm();
    if (e.target.closest('[data-abil]')) { FIGHT.abil = !FIGHT.abil; sfx.click(); drawBar(); }
  };
  o.querySelector('.ar-x').onclick = async () => { if (FIGHT.st.over || await ask(at('quit'))) closeFight(); };
  o.querySelector('[data-help]').onclick = () => toast(at('howText'));
  refresh();
}
function closeFight() {
  const o = $('arena'); if (!o) return;
  o.classList.remove('on'); document.documentElement.classList.remove('lock');
  setTimeout(() => { o.hidden = true; o.innerHTML = ''; }, 250);
}
function unitHTML(u) {
  const j = jetonOf(u.name), el = ELS[u.el];
  return `<div class="ar-u" data-i="${u.i}" style="--g:${hexRGB(j.glow)};--el:${el.col}">
    <span class="ar-uel">${el.ico}</span><span class="ar-ulv">${at('lvl')}${u.lvl}</span><span class="ar-uab" title="${esc(skillsOf(u.name)[0])}">✦</span>
    <div class="ar-uimg"><img class="${vCls(u.variant)}" src="${texOf(j)}" alt=""></div>
    <b class="ar-un">${jnH(u.name)}</b>
    <div class="ar-hp"><i></i><em></em></div>
    <small class="ar-ust"></small>
  </div>`;
}
const unitEl = r => $('ar-row' + r.side)?.children[r.i];
// Redessine tout l'état (PV, jetons jouables, manche…)
function refresh() {
  const st = FIGHT.st, me = new Set(st.over ? [] : CB.playable(st, 0));
  $('ar-round').textContent = at('round', { n: Math.min(st.over ? st.round - 1 : st.round, CB.MAX_ROUNDS) });
  document.querySelectorAll('.ar-pl').forEach((p, k) => {
    const side = k === 0 ? 1 : 0;
    p.querySelector('.ar-life i').style.width = (st.life[side] / CB.LIFE * 100) + '%';
    p.querySelector('.ar-life em').textContent = `❤️ ${st.life[side]} / ${CB.LIFE}`;
    p.querySelector('.ar-guard').textContent = st.guard[side] ? '🛡 ' + st.guard[side] : '';
  });
  for (const team of st.teams) for (const u of team) {
    const c = unitEl(u); if (!c) continue;
    c.querySelector('.ar-hp i').style.width = (u.hp / u.max * 100) + '%';
    c.querySelector('.ar-hp em').textContent = u.hp;
    c.classList.toggle('ko', !u.alive);
    c.classList.toggle('used', u.used);
    const tired = u.alive && u.side === 0 && !me.has(u.i);
    c.classList.toggle('tired', tired);
    c.classList.toggle('sel', u.side === 0 && FIGHT.sel === u.i);
    c.classList.toggle('foepick', u.side === 1 && FIGHT.foePick === u.i && FIGHT.phase === 'lane');
    c.querySelector('.ar-ust').textContent = [u.curse > 0 && '💀', u.rust && '🧲', u.noHeal && '🥀', tired && '💤'].filter(Boolean).join(' ');
  }
  document.querySelectorAll('.ar-lane').forEach(b => {
    const l = +b.dataset.lane;
    b.classList.toggle('pick', FIGHT.phase === 'lane' && FIGHT.lane === l);
    b.classList.toggle('frozen', st.frozen[0] === l && FIGHT.phase !== 'resolve');
    b.disabled = FIGHT.phase !== 'lane' || st.frozen[0] === l;
  });
  drawBar();
}
// Barre d'action en bas : la consigne de la phase + boutons
function drawBar() {
  const st = FIGHT.st, bar = $('ar-bar'); if (!bar) return;
  if (FIGHT.phase === 'resolve' || st.over) { bar.innerHTML = ''; return; }
  if (FIGHT.phase === 'token') {
    bar.innerHTML = `<p>${at('phaseToken')}</p><button class="btn primary" data-ok ${FIGHT.sel == null ? 'disabled' : ''}>${at('ok')}</button>`;
    return;
  }
  const me = st.teams[0][FIGHT.sel], foe = st.teams[1][FIGHT.foePick], [an, ad] = skillsOf(me.name);
  bar.innerHTML = `<p>${at('phaseLane', { a: jn(me.name), b: jn(foe.name) })}</p>
    <div class="ar-barr">
      ${me.used ? `<span class="ar-abil off">✦ ${esc(an)} · ${at('usedAb')}</span>` : `<button class="ar-abil${FIGHT.abil ? ' on' : ''}" data-abil title="${esc(ad)}">✦ ${esc(an)}<small>${esc(ad)}</small></button>`}
      <button class="btn primary" data-ok ${FIGHT.lane == null ? 'disabled' : ''}>${at('place')}</button>
    </div>`;
}
function pickToken(i) {
  if (FIGHT.phase !== 'token' || FIGHT.busy) { const u = FIGHT.st.teams[0][i]; return unitInfo(u); }
  if (!CB.playable(FIGHT.st, 0).includes(i)) { sfx.deny(); return toast(at('tired'), true); }
  FIGHT.sel = i; sfx.click(); refresh();
}
function pickLane(l) {
  if (FIGHT.phase !== 'lane') return;
  FIGHT.lane = l; sfx.click(); refresh();
}
function unitInfo(u) {
  const [an, ad, pn, pd] = skillsOf(u.name);
  toast(`<b>${jn(u.name)}</b> · ${ELS[u.el].ico} ${elName(u.el)} · ❤️ ${u.hp}/${u.max}<br>✦ <b>${esc(an)}</b>${u.used ? ' (' + at('usedAb') + ')' : ''} — ${esc(ad)}<br>◈ <b>${esc(pn)}</b> — ${esc(pd)}`);
}
async function fightConfirm() {
  const st = FIGHT.st;
  if (FIGHT.phase === 'token' && FIGHT.sel != null) {
    // le robot a choisi en même temps : on révèle les deux jetons
    FIGHT.foePick = CB.aiToken(st, 1);
    FIGHT.phase = 'lane'; FIGHT.lane = null; FIGHT.abil = false;
    sfx.reveal?.(300);
    const c = unitEl({ side: 1, i: FIGHT.foePick });
    anim(c, [{ transform: 'scale(1)' }, { transform: 'scale(1.15)' }, { transform: 'scale(1)' }], { duration: 420, easing: 'cubic-bezier(.2, 1.4, .4, 1)' });
    return refresh();
  }
  if (FIGHT.phase === 'lane' && FIGHT.lane != null) {
    FIGHT.phase = 'resolve'; refresh();
    const mine = { i: FIGHT.sel, lane: FIGHT.lane, abil: FIGHT.abil }, foe = CB.aiLane(st, 1, FIGHT.foePick);
    const ev = CB.resolve(st, [mine, foe]);
    await playRound(ev);
    FIGHT.sel = null; FIGHT.lane = null; FIGHT.abil = false; FIGHT.foePick = null;
    if (st.over) return showResult();
    FIGHT.phase = 'token';
    refresh();
  }
}

// ---------- Animation d'une manche
function anim(el, kf, o) { if (el && !reducedFx()) return el.animate(kf, o); }
function floater(el, text, cls) {
  if (!el) return;
  const f = document.createElement('i'); f.className = 'ar-f ' + cls; f.innerHTML = text;
  f.style.left = (35 + Math.random() * 30) + '%';
  el.appendChild(f); setTimeout(() => f.remove(), 1100);
}
function sparks(el, col, n = 10) {
  if (!el || reducedFx()) return;
  const R = el.getBoundingClientRect();
  for (let k = 0; k < n; k++) {
    const s = document.createElement('i'); s.className = 'ar-spark'; s.style.background = col;
    document.body.appendChild(s);
    const a = Math.random() * Math.PI * 2, d = 24 + Math.random() * 46, x = R.left + R.width / 2, y = R.top + R.height / 2;
    s.animate([{ transform: `translate(${x}px, ${y}px)`, opacity: 1 }, { transform: `translate(${x + Math.cos(a) * d}px, ${y + Math.sin(a) * d}px)`, opacity: 0 }], { duration: 480, easing: 'cubic-bezier(.2, .8, .3, 1)' }).finished.then(() => s.remove());
  }
}
const unitOf = r => FIGHT.st.teams[r.side][r.i];
const lifeEl = side => document.querySelectorAll('.ar-pl')[side === 0 ? 1 : 0];
function placeIn(lane, side, u, abil) {
  const L = document.querySelectorAll('.ar-lane')[lane]; if (!L) return;
  const slot = L.querySelector(side === 0 ? '.ar-slotm' : '.ar-slotf');
  slot.innerHTML = `<img class="${vCls(u.variant)}" src="${texOf(jetonOf(u.name))}" alt="">${abil ? '<i>✦</i>' : ''}`;
  slot.style.setProperty('--el', ELS[u.el].col);
  anim(slot, [{ transform: `translateY(${side === 0 ? 60 : -60}px) scale(.6)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 380, easing: 'cubic-bezier(.2, .9, .3, 1)' });
}
async function playRound(ev) {
  document.querySelectorAll('.ar-slotf, .ar-slotm').forEach(s => { s.innerHTML = ''; });
  for (const e of ev) {
    if (e.t === 'reveal') {
      e.picks.forEach((p, side) => placeIn(p.lane, side, FIGHT.st.teams[side][p.i], p.abil));
      sfx.whooshOut?.();
      await sleep(650);
    }
    if (e.t === 'abil') {
      const u = unitOf(e.u), [an] = skillsOf(u.name);
      const call = document.createElement('div'); call.className = 'ar-call'; call.style.setProperty('--el', ELS[u.el].col);
      call.innerHTML = `<img src="${texOf(jetonOf(u.name))}" alt=""><b>${esc(an)}</b>`;
      $('ar-lanes').appendChild(call); setTimeout(() => call.remove(), 1200);
      sparks(unitEl(e.u), ELS[u.el].col, 14); sfx.reveal?.(e.u.side === 0 ? 900 : 300);
      await sleep(700);
    }
    if (e.t === 'clash') {
      const lanes = document.querySelectorAll('.ar-lane');
      (e.lane < 0 ? [...lanes] : [lanes[e.lane]]).forEach(L => { L.classList.add('clash'); setTimeout(() => L.classList.remove('clash'), 700); });
      floater($('ar-lanes'), '⚔️ ' + at('clash'), 'clashf');
      sfx.thump?.(); await sleep(450);
    }
    if (e.t === 'hit') {
      const c = unitEl(e.to), col = e.from ? ELS[unitOf(e.from).el].col : '#c084fc';
      if (e.from) FIGHT.dmg[e.from.side][e.from.i] = (FIGHT.dmg[e.from.side][e.from.i] || 0) + e.d;
      floater(c, (e.crit ? '💥 ' : '') + '−' + e.d, e.crit ? 'crit' : 'dmg');
      if (e.em > 1) floater(c, at('eff'), 'eff'); else if (e.em < 1) floater(c, at('weak'), 'weakf');
      anim(c?.querySelector('.ar-uimg'), [{ filter: 'brightness(2.4)', transform: 'translateX(-5px)' }, { filter: 'none', transform: 'translateX(4px)' }, { transform: 'none' }], { duration: 240 });
      sparks(c, col, e.crit ? 16 : 8);
      refresh(); await sleep(380);
    }
    if (e.t === 'face') {
      const p = lifeEl(e.side);
      if (e.from) FIGHT.dmg[e.from.side][e.from.i] = (FIGHT.dmg[e.from.side][e.from.i] || 0) + e.d;
      floater(p, (e.crit ? '💥 ' : '') + '−' + e.d + ' ❤️', e.crit ? 'crit' : 'dmg');
      anim(p, [{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'none' }], { duration: 260 });
      sparks(p, '#f87171', 10); sfx.thump?.();
      refresh(); await sleep(420);
    }
    if (e.t === 'guard') { floater(lifeEl(e.side), '🛡 −' + e.n, 'shield'); refresh(); await sleep(250); }
    if (e.t === 'guardup') { floater(lifeEl(e.side), '🛡 +' + e.n, 'shield'); refresh(); await sleep(300); }
    if (e.t === 'block') { floater(unitEl(e.u), '🫧 ' + at('block'), 'info'); await sleep(350); }
    if (e.t === 'dodge') { floater(unitEl(e.u), at('dodge'), 'info'); anim(unitEl(e.u), [{ transform: 'none' }, { transform: 'translateX(14px)' }, { transform: 'none' }], { duration: 260 }); await sleep(350); }
    if (e.t === 'dazzled') { floater(unitEl(e.u), '😵 ' + at('dazzled'), 'info'); await sleep(400); }
    if (e.t === 'heal') { floater(unitEl(e.u), '+' + e.n, 'heal'); sparks(unitEl(e.u), '#4ade80', 6); refresh(); await sleep(250); }
    if (e.t === 'revive') { floater(unitEl(e.u), at('revive'), 'heal'); sparks(unitEl(e.u), '#fde68a', 16); sfx.upgrade?.(); refresh(); await sleep(500); }
    if (e.t === 'recharge') { floater(unitEl(e.u), '✦ ' + at('recharged'), 'shield'); refresh(); await sleep(400); }
    if (e.t === 'status') { floater(unitEl(e.u), e.k === 'curse' ? '💀' : '🧲', 'info'); refresh(); await sleep(300); }
    if (e.t === 'frozen') { const L = document.querySelectorAll('.ar-lane')[e.lane]; floater(L, '❄️ ' + at('frozenL'), 'shield'); await sleep(400); }
    if (e.t === 'ko') { anim(unitEl(e.u), [{ transform: 'none', opacity: 1 }, { transform: 'translateY(10px) rotate(-6deg)', opacity: .4 }], { duration: 450 }); sfx.deny?.(); refresh(); await sleep(500); }
  }
  refresh();
  await sleep(500);
  document.querySelectorAll('.ar-slotf, .ar-slotm').forEach(s => { s.innerHTML = ''; });
}

function showResult() {
  const st = FIGHT.st, o = $('arena'); if (!o || !st) return;
  const w = st.winner, mine = w === 0, mvpI = Object.entries(FIGHT.dmg[0]).sort((a, b) => b[1] - a[1])[0]?.[0];
  const mvp = mvpI != null ? st.teams[0][mvpI] : null;
  const box = document.createElement('div'); box.className = 'ar-end ' + (w === -1 ? 'draw' : mine ? 'win' : 'lose');
  box.innerHTML = `<div class="ar-endc">
    <h2>${w === -1 ? at('draw') : mine ? at('win') : at('lose')}</h2>
    <small class="muted">❤️ ${st.life[0]} — ${st.life[1]} · ${at('rounds', { n: st.round - 1 })}</small>
    ${mvp ? `<div class="ar-mvp"><img src="${texOf(jetonOf(mvp.name))}" alt=""><div><small class="muted">${at('mvp')}</small><b>${jnH(mvp.name)}</b><small>${fmt(FIGHT.dmg[0][mvpI])} ${at('dmgWord')}</small></div></div>` : ''}
    <div class="ask-btns"><button class="btn ghost" data-back>${at('back')}</button><button class="btn primary" data-again>${at('again')}</button></div>
  </div>`;
  o.appendChild(box);
  mine ? sfx.upgrade?.() : sfx.deny?.();
  box.onclick = e => {
    if (e.target.closest('[data-back]')) closeFight();
    if (e.target.closest('[data-again]')) { box.remove(); startTraining(); }
  };
}

// ---------- Fiche d'un jeton (Bestiaire) : élément, capacité, passif, niveau et bouton pour monter de niveau
function combatInfoHTML(name, owned = 0) {
  const el = CB.elOf(name), [an, ad, pn, pd] = skillsOf(name), L = lvlOf(name);
  const free = INV.groups.filter(x => x.name === name).reduce((s, x) => s + x.free.length, 0);
  const can = L < 10 && free >= L && owned - L >= 1;
  return `<div class="ar-info" style="--el:${ELS[el].col}">
    <div class="ar-info-h"><span>${ELS[el].ico} ${elName(el)}</span><b>${at('lvl')} ${L}/10</b></div>
    <p><b>✦ ${esc(an)}</b> — ${esc(ad)}</p>
    <p><b>◈ ${esc(pn)}</b> — ${esc(pd)}</p>
    ${owned ? (L >= 10 ? `<small class="muted">${at('lvlMax')}</small>` : `<button class="btn ghost ar-lvl" data-lvlup="${esc(name)}" ${can ? '' : 'disabled'}>⬆️ ${at('lvlUp', { n: L + 1 })} · ${at('lvlCost', { n: L })}</button>${can ? '' : `<small class="muted">${at('lvlNeed', { n: L, h: Math.max(0, Math.min(free, owned - 1)) })}</small>`}`) : ''}
  </div>`;
}
async function levelUp(name) {
  const { data, error } = await sb.rpc('level_up', { p_jeton: name });
  if (error) { sfx.deny(); toast(errText(error), true); return false; }
  ARENA.levels[name] = data.lvl; sfx.upgrade(); toast('⬆️ ' + at('lvlOk', { j: jn(name), n: data.lvl }));
  return true;
}
if (typeof ACC !== 'undefined' && ACC.user) loadLevels();
