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
    how: 'Comment ça marche', howText: 'À chaque manche, vous choisissez chacun un jeton (on voit celui de l’autre), puis vous le posez <b>à gauche, au milieu ou à droite</b> sans voir où l’autre le met. <b>Même endroit</b> : les deux jetons se battent. <b>Endroits différents</b> : chacun frappe le joueur d’en face. Chaque capacité ne sert qu’<b>une fois</b> par combat. Un jeton joué se repose la manche suivante.', round: 'Manche {n}', rest: 'Repos', stuck: 'Bloqué', foeCant: 'En face, ne peut pas jouer : {n}', foePlays: 'Il joue', revealTxt: 'Révélation !', recapClash: '⚔️ {a} et {b} se croisent ({l}) · tu infliges {x}, tu prends {y}', recapMiss: '{a} ({la}) et {b} ({lb}) ne se croisent pas · tu infliges {x}, tu prends {y}', needLogin: 'Connecte-toi pour monter ton équipe et combattre.', normal: 'Normal', stHp: 'PV', stAtk: 'Attaque', stDef: 'Défense', stCurse: 'maudit', stRust: 'rouillé (−30 % déf.)', stNoHeal: 'ne peut plus être soigné', inTeam: 'déjà dans l’équipe', version: 'Version', chooseThis: 'Prendre ce jeton', dragHint: 'Glisse ton jeton sur un endroit, ou touche un endroit puis « Poser ici ».', phaseToken: 'Choisis ton jeton pour cette manche', phaseLane: 'Tu joues <b>{a}</b>, il joue <b>{b}</b>. Où poses-tu ton jeton ?', ok: 'Valider', place: 'Poser ici', usedAb: 'déjà utilisée', tired: 'Ce jeton se repose cette manche', clash: 'Croisement !', block: 'Protégé', dazzled: 'Ébloui', recharged: 'Capacité rechargée', frozenL: 'Gelé', rounds: '{n} manches', dmgWord: 'dégâts',
    pickTitle: 'Choisis un jeton', lvl: 'Niv.', power: 'Puissance', ability: 'Capacité', passive: 'Passif', remove: 'Retirer', none: 'Tu n’as pas encore de jeton : ouvre des pulls !',
    ready: 'PRÊT', win: 'Victoire !', lose: 'Défaite…', draw: 'Égalité', again: 'Rejouer', back: 'Retour', bot: 'Robot', you: 'Toi', mvp: 'Meilleur jeton',
    quit: 'Abandonner le combat ?', eff: 'Efficace !', weak: 'Peu efficace', dodge: 'Esquive', miss: 'Raté', crit: 'CRITIQUE', revive: 'Ressuscité !', time: 'Temps écoulé',
    lvlUp: 'Monter au niveau {n}', lvlCost: 'utilise {n} doublon(s)', lvlNeed: 'Il faut {n} doublon(s) libre(s) (tu en as {h})', lvlMax: 'Niveau max', lvlOk: '{j} passe niveau {n} !', element: 'Élément' },
  en: { title: 'Battle', sub: 'Pick 3 tokens and fight the bot. Ranked with tiers is coming soon.', team: 'Your team',
    slots: ['Token 1', 'Token 2', 'Token 3'], lanes: ['Left', 'Middle', 'Right'], pick: 'Pick', train: '⚔️ Training vs the bot', ranked: '🏆 Ranked', soon: 'Soon: Bronze → Legend tiers, seasons and battle pass',
    need3: 'Pick 3 tokens to fight', els: 'Elements', elsHelp: '🔥 beats 🌿 · 🌿 beats 💧 · 💧 beats 🔥 · ✨ and 🌑 strong against each other (×1.3 damage)',
    how: 'How it works', howText: 'Each round, you both pick a token (you see each other’s), then place it <b>left, middle or right</b> without seeing where the other puts theirs. <b>Same spot</b>: the two tokens fight. <b>Different spots</b>: each hits the opposing player. Each ability can only be used <b>once</b> per battle. A token that just played rests the next round.', round: 'Round {n}', rest: 'Resting', stuck: 'Stuck', foeCant: 'Opponent can’t play: {n}', foePlays: 'They play', revealTxt: 'Reveal!', recapClash: '⚔️ {a} and {b} clash ({l}) · you deal {x}, you take {y}', recapMiss: '{a} ({la}) and {b} ({lb}) don’t cross · you deal {x}, you take {y}', needLogin: 'Log in to build your team and fight.', normal: 'Normal', stHp: 'HP', stAtk: 'Attack', stDef: 'Defense', stCurse: 'cursed', stRust: 'rusted (−30% def.)', stNoHeal: 'can no longer be healed', inTeam: 'already in the team', version: 'Version', chooseThis: 'Take this token', dragHint: 'Drag your token onto a spot, or tap a spot then “Place here”.', phaseToken: 'Pick your token for this round', phaseLane: 'You play <b>{a}</b>, they play <b>{b}</b>. Where do you place your token?', ok: 'Confirm', place: 'Place here', usedAb: 'already used', tired: 'This token is resting this round', clash: 'Clash!', block: 'Protected', dazzled: 'Dazzled', recharged: 'Ability recharged', frozenL: 'Frozen', rounds: '{n} rounds', dmgWord: 'damage',
    pickTitle: 'Pick a token', lvl: 'Lv.', power: 'Power', ability: 'Ability', passive: 'Passive', remove: 'Remove', none: 'You have no tokens yet: open some pulls!',
    ready: 'READY', win: 'Victory!', lose: 'Defeat…', draw: 'Draw', again: 'Play again', back: 'Back', bot: 'Bot', you: 'You', mvp: 'Best token',
    quit: 'Forfeit the battle?', eff: 'Effective!', weak: 'Not effective', dodge: 'Dodge', miss: 'Miss', crit: 'CRIT', revive: 'Revived!', time: 'Time’s up',
    lvlUp: 'Level up to {n}', lvlCost: 'uses {n} duplicate(s)', lvlNeed: 'Needs {n} free duplicate(s) (you have {h})', lvlMax: 'Max level', lvlOk: '{j} is now level {n}!', element: 'Element' },
};
const slotName = i => ((AT[SETTINGS.lang] || AT.fr).slots)[i];
const atList = k => (AT[SETTINGS.lang] || AT.fr)[k];
const at = (k, v = {}) => String((AT[SETTINGS.lang] || AT.fr)[k] ?? AT.fr[k]).replace(/\{(\w+)\}/g, (_, x) => v[x] ?? '');

const ARENA = { levels: {}, team: [null, null, null] };
// niveau d'un jeton dans sa collection (plusieurs collections : la clé est « collection|jeton »)
const lvlOf = (name, serie = 'Takoras') => ARENA.levels[(serie || 'Takoras') + '|' + name] || 1;
async function loadLevels() {
  const { data } = await sb.rpc('my_levels');
  ARENA.levels = {}; (data || []).forEach(r => { ARENA.levels[(r.serie || 'Takoras') + '|' + r.jeton] = r.lvl; });
}
const VRANK = { '': 0, gold: 1, celeste: 2, ombre: 3 };

// ---------- Page Combat
async function renderCombat() {
  const page = $('page-combat');
  if (!ACC.user) { page.innerHTML = `<div class="page-empty"><h2>${at('title')}</h2><p class="muted">${at('needLogin')}</p><button class="btn primary" onclick="openAccount('login')">${t('login')}</button></div>`; return; }
  await Promise.all([loadInventory(), loadLevels(), (async () => {
    const { data } = await sb.rpc('my_deck');
    ARENA.team = [0, 1, 2].map(i => data?.[i] ? { id: data[i].id, serie: data[i].serie || 'Takoras', name: data[i].jeton, odds: data[i].odds, variant: data[i].variant || '' } : null);
  })()]);
  drawCombat();
}
function teamCard(u, i) {
  if (!u) return `<button class="ar-slot empty" data-slot="${i}"><span class="ar-pos">${slotName(i)}</span><b>＋</b><small>${at('pick')}</small></button>`;
  const j = jetonOf(u.name, u.serie), el = CB.elOf(u.name), s = CB.stats(u.name, u.odds, lvlOf(u.name, u.serie), u.variant), [an] = skillsOf(u.name);
  return `<button class="ar-slot" data-slot="${i}" style="--g:${hexRGB(j.glow)};--el:${ELS[el].col}">
    <span class="ar-pos">${slotName(i)}</span><span class="ar-el" title="${elName(el)}">${ELS[el].ico}</span>
    <img class="${vCls(u.variant)}" src="${texOf(j)}" alt="">
    <b>${jnH(u.name)}${vTag(u.variant)}</b>
    <small>${at('lvl')} ${lvlOf(u.name, u.serie)} · ⚡${fmt(CB.power(s))}</small>
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

// ---------- Fiche complète d'un jeton (équipe, choix, combat) : stats, élément, capacité, passif, état en combat
const SHEET_MAX = { hp: 330, atk: 140, def: 55 };
function tokenSheetHTML(o) {
  const j = jetonOf(o.name, o.serie), el = CB.elOf(o.name), lvl = o.lvl || lvlOf(o.name, o.serie), s = CB.stats(o.name, j.odds, lvl, o.variant || ''), [an, ad, pn, pd] = skillsOf(o.name), u = o.unit;
  const hp = u ? u.hp : Math.round(s.hp / 10), hpMax = u ? u.max : Math.round(s.hp / 10), atk = Math.round(u ? u.atk : s.atk), def = Math.round(u ? u.def : s.def);
  const bar = (label, v, max, txt) => `<div class="tk-bar"><span>${label}</span><div><i style="width:${Math.min(100, v / max * 100)}%"></i></div><b>${txt}</b></div>`;
  const status = u ? [u.used && '✦ ' + at('usedAb'), u.curse > 0 && '💀 ' + at('stCurse'), u.rust && '🧲 ' + at('stRust'), u.noHeal && '🥀 ' + at('stNoHeal'), !u.alive && '☠️ K.O.'].filter(Boolean) : [];
  return `<div class="tk-sheet" style="--g:${hexRGB(j.glow)};--el:${ELS[el].col}">
    <div class="tk-top">
      <div class="tk-img"><img class="${vCls(o.variant || '')}" src="${texOf(j)}" alt=""></div>
      <div><span class="tier t-${tierKey(j.odds)}">${t(tierKey(j.odds))}</span>
        <h2>${jnH(o.name)} ${vTag(o.variant || '')}</h2>
        <div class="tk-chips"><span style="color:${ELS[el].col}">${ELS[el].ico} ${elName(el)}</span><span>${at('lvl')} ${lvl}/10</span><span>1/${fmt(j.odds)}</span></div></div>
    </div>
    <div class="tk-stats">
      ${bar('❤️ ' + at('stHp'), hp, SHEET_MAX.hp, u ? `${hp}/${hpMax}` : hp)}
      ${bar('⚔️ ' + at('stAtk'), atk, SHEET_MAX.atk, atk)}
      ${bar('🛡️ ' + at('stDef'), def, SHEET_MAX.def, def)}
    </div>
    <div class="tk-sk${u?.used ? ' done' : ''}"><small>✦ ${at('ability')}</small><b>${esc(an)}</b><p>${esc(ad)}</p></div>
    <div class="tk-sk p"><small>◈ ${at('passive')}</small><b>${esc(pn)}</b><p>${esc(pd)}</p></div>
    ${status.length ? `<div class="tk-status">${status.map(x => `<span>${x}</span>`).join('')}</div>` : ''}
    ${o.extra || ''}
  </div>`;
}
function openSheet(o) {
  const card = $('jm-card');
  jm.style.setProperty('--g', hexRGB(jetonOf(o.name).glow));
  card.onclick = card.oninput = card.onchange = null;
  card.classList.add('sheetmode');
  card.innerHTML = `<button class="set-close jm-close" aria-label="${t('close')}">✕</button>${tokenSheetHTML(o)}`;
  jm.classList.add('on');
}

// ---------- Choix d'un jeton pour l'équipe : grande fenêtre à part.
// À gauche : tous tes jetons (filtre par élément), à droite : la fiche du jeton choisi, ses versions et « Prendre ce jeton ».
// Sur téléphone : la grille, puis la fiche s'ouvre par-dessus (bouton retour).
// Peu importe combien d'exemplaires tu as : il suffit d'avoir le jeton. Mutations : Doré +5 %, Céleste +10 %, Ombre +15 % de stats.
const VBONUS_TXT = { '': 0, gold: 5, celeste: 10, ombre: 15 };
function pickSlot(slot) {
  sfx.click();
  const key = (serie, name) => serie + '|' + name; // plusieurs collections : un jeton = collection + nom
  const used = new Set(ARENA.team.filter((u, i) => u && i !== slot).map(u => key(u.serie || 'Takoras', u.name)));
  const by = {}; // collection|jeton → { variante → id d'un exemplaire }
  INV.groups.forEach(x => { (by[key(x.serie, x.name)] ||= { k: key(x.serie, x.name), serie: x.serie, name: x.name, odds: x.odds, vars: {} }).vars[x.variant] = x.ids[0]; });
  // version par défaut : la normale (c'est au joueur de choisir une mutation), sinon la plus simple qu'il a
  const baseV = g => Object.keys(g.vars).sort((a, b) => VRANK[a] - VRANK[b])[0];
  const all = Object.values(by);
  const series = seriesList().filter(sr => all.some(u => u.serie === sr));
  const cur = ARENA.team[slot], curK = cur && key(cur.serie || 'Takoras', cur.name);
  const S = { serie: cur?.serie || series[0] || 'Takoras', el: 'all', k: curK || all.find(u => !used.has(u.k))?.k || null, v: cur?.variant ?? null };
  const o = document.createElement('div');
  o.className = 'tp-box';
  o.innerHTML = `<div class="tp-panel">
    <div class="tp-head"><div><small class="eyebrow">${at('team')} · ${slotName(slot)}</small><h2>${at('pickTitle')}</h2></div>
      <div class="tp-hbtn">${cur ? `<button class="btn ghost sm" data-rm>✕ ${at('remove')}</button>` : ''}<button class="tp-x" data-close aria-label="${t('close')}">✕</button></div></div>
    <div class="tp-body">
      <div class="tp-left">
        ${series.length > 1 ? `<div class="tp-series">${series.map(sr => `<button data-serie="${esc(sr)}">${esc(sr)}</button>`).join('')}</div>` : ''}
        <div class="tp-els">${['all', 'fire', 'water', 'plant', 'light', 'shadow'].map(e => `<button data-el="${e}">${e === 'all' ? t('all') : ELS[e].ico + ' ' + elName(e)}</button>`).join('')}</div>
        <div class="tp-grid" id="tp-grid"></div>
      </div>
      <div class="tp-right" id="tp-right"></div>
    </div>
  </div>`;
  document.body.appendChild(o);
  document.documentElement.classList.add('lock');
  requestAnimationFrame(() => o.classList.add('on'));
  const close = () => { o.classList.remove('on'); document.documentElement.classList.remove('lock'); setTimeout(() => o.remove(), 250); };
  const save = async () => { close(); await sb.rpc('set_deck', { ids: ARENA.team.filter(Boolean).map(x => x.id) }); drawCombat(); };

  const drawGrid = () => {
    o.querySelectorAll('[data-el]').forEach(b => b.classList.toggle('on', b.dataset.el === S.el));
    o.querySelectorAll('[data-serie]').forEach(b => b.classList.toggle('on', b.dataset.serie === S.serie));
    const vis = all.filter(u => u.serie === S.serie && (S.el === 'all' || CB.elOf(u.name) === S.el)).sort((a, b) => b.odds - a.odds);
    o.querySelector('#tp-grid').innerHTML = vis.map(u => {
      const j = jetonOf(u.name, u.serie), el = CB.elOf(u.name), off = used.has(u.k);
      return `<button class="tp-c${off ? ' off' : ''}${S.k === u.k ? ' sel' : ''}" data-k="${esc(u.k)}" style="--g:${hexRGB(j.glow)};--el:${ELS[el].col}">
        <span class="tp-el">${ELS[el].ico}</span><span class="tp-lv">${at('lvl')}${lvlOf(u.name, u.serie)}</span>
        <img src="${texOf(j)}" alt="">
        <b>${jnH(u.name)}</b>
        <span class="tp-vd">${Object.keys(u.vars).filter(Boolean).map(v => `<i class="v-dot on ${v}"></i>`).join('')}</span>
        ${off ? `<small>${at('inTeam')}</small>` : `<small class="t-${tierKey(u.odds)}">1/${fmt(u.odds)}</small>`}
      </button>`;
    }).join('') || `<p class="muted">${at('none')}</p>`;
  };
  const drawRight = (anim = true) => {
    const R = o.querySelector('#tp-right');
    if (!S.k || !by[S.k]) { R.innerHTML = `<p class="muted tp-empty">${at('none')}</p>`; return; }
    const u = by[S.k], vs = Object.keys(u.vars).sort((a, b) => VRANK[a] - VRANK[b]);
    if (S.v == null || !(S.v in u.vars)) S.v = baseV(u);
    R.innerHTML = `<button class="tp-back" data-back>‹ ${at('back')}</button>
      ${tokenSheetHTML({ name: u.name, serie: u.serie, variant: S.v, extra: `
        <div class="tk-vp"><small>${at('version')}</small><div class="ar-vpick">${vs.map(x => `<button data-v="${x}" class="${x ? 'v-' + x : 'v-none'}${x === S.v ? ' on' : ''}">${x ? t('v_' + x) + ' +' + VBONUS_TXT[x] + '%' : at('normal')}</button>`).join('')}</div></div>
        <button class="btn primary tk-choose" data-choose ${used.has(S.k) ? 'disabled' : ''}>${used.has(S.k) ? at('inTeam') : at('chooseThis')}</button>` })}`;
    if (anim && !reducedFx()) R.querySelector('.tk-sheet').animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.2, .9, .3, 1)' });
  };
  drawGrid(); drawRight(false);
  o.addEventListener('click', e => {
    if (e.target === o || e.target.closest('[data-close]')) return close();
    if (e.target.closest('[data-rm]')) { ARENA.team[slot] = null; return save(); }
    if (e.target.closest('[data-back]')) { o.classList.remove('detail'); return; }
    const el = e.target.closest('[data-el]'); if (el) { S.el = el.dataset.el; sfx.click(); return drawGrid(); }
    const sr = e.target.closest('[data-serie]'); if (sr) { S.serie = sr.dataset.serie; S.el = 'all'; sfx.click(); return drawGrid(); }
    const c = e.target.closest('.tp-c');
    if (c) { S.k = c.dataset.k; S.v = curK === S.k ? cur.variant : null; sfx.click(); drawGrid(); drawRight(); o.classList.add('detail'); return; }
    const v = e.target.closest('[data-v]'); if (v) { S.v = v.dataset.v; sfx.click(); return drawRight(false); }
    if (e.target.closest('[data-choose]') && S.k && !used.has(S.k)) {
      const u = by[S.k]; ARENA.team[slot] = { id: u.vars[S.v], serie: u.serie, name: u.name, odds: u.odds, variant: S.v }; sfx.upgrade(); save();
    }
  });
}

// ---------- Robot : une équipe de force proche de la tienne (mêmes paliers de rareté, niveaux proches)
function botTeam(mine, rnd) {
  const pickd = new Set();
  return mine.map(u => {
    const all = SERIES[u.serie] || SERIES.Takoras, idx = n => all.findIndex(j => j.name === n); // le robot pioche dans la même collection
    let k = 0, cand;
    do { const i = Math.max(0, Math.min(all.length - 1, idx(u.name) + Math.round((rnd() - .5) * 4))); cand = all[i]; k++; } while (pickd.has(cand.name) && k < 20);
    pickd.add(cand.name);
    return { name: cand.name, odds: cand.odds, lvl: Math.max(1, Math.min(10, lvlOf(u.name, u.serie) + Math.round((rnd() - .5) * 2))), variant: '' };
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
  const mine = ARENA.team.map(u => ({ name: u.name, serie: u.serie, odds: u.odds, lvl: lvlOf(u.name, u.serie), variant: u.variant }));
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
  o.querySelector('#ar-row0').onclick = e => {
    const c = e.target.closest('.ar-u'); if (!c || FIGHT.dragged) return;
    if (e.target.closest('.ar-ui')) return unitInfo(FIGHT.st.teams[0][+c.dataset.i]);
    pickToken(+c.dataset.i);
  };
  o.querySelector('#ar-row1').onclick = e => { const c = e.target.closest('.ar-u'); if (c) unitInfo(FIGHT.st.teams[1][+c.dataset.i]); };
  o.querySelector('#ar-row0').addEventListener('pointerdown', dragStart);
  o.querySelector('#ar-lanes').onclick = e => { const b = e.target.closest('[data-lane]'); if (b) pickLane(+b.dataset.lane); };
  o.querySelector('#ar-bar').onclick = e => {
    if (e.target.closest("[data-ok]")) fightConfirm();
    if (e.target.closest('[data-abil]')) { FIGHT.abil = !FIGHT.abil; sfx.click(); drawBar(); }
  };
  o.querySelector('.ar-x').onclick = async () => { if (FIGHT.st.over || await ask(at('quit'))) closeFight(); };
  o.querySelector('[data-help]').onclick = () => toast(at('howText'));
  FIGHT.recap = '';
  refresh();
  intro(names, teams);
}
// Écran d'entrée : les deux équipes arrivent de chaque côté, « VS » au milieu
async function intro(names, teams) {
  FIGHT.busy = true;
  const o = $('arena'), v = document.createElement('div'); v.className = 'ar-vs';
  const row = (side) => `<div class="ar-vsside s${side}"><b>${esc(names[side])}</b><div>${FIGHT.st.teams[side].map(u => `<img class="${vCls(u.variant)}" src="${texOf(jetonOf(u.name))}" alt="">`).join('')}</div></div>`;
  v.innerHTML = `${row(1)}<div class="ar-vsmid">VS</div>${row(0)}`;
  o.appendChild(v);
  sfx.reveal?.(2500);
  document.querySelectorAll('.ar-u').forEach((c, k) => anim(c, [{ opacity: 0, transform: `translateY(${c.closest('.foe') ? -30 : 30}px) scale(.8)` }, { opacity: 1, transform: 'none' }], { duration: 420, delay: 900 + (k % 3) * 90, easing: 'cubic-bezier(.2, 1.2, .4, 1)', fill: 'backwards' }));
  await sleep(1400);
  anim(v, [{ opacity: 1 }, { opacity: 0, transform: 'scale(1.08)' }], { duration: 300, fill: 'forwards' });
  await sleep(300); v.remove();
  FIGHT.busy = false;
  roundBanner();
}
// « Manche 3 » qui traverse les endroits
function roundBanner() {
  const L = $('ar-lanes'); if (!L || FIGHT.st.over) return;
  const b = document.createElement('div'); b.className = 'ar-banner';
  b.innerHTML = `<b>${at('round', { n: FIGHT.st.round })}</b>`;
  L.appendChild(b);
  anim(b, [{ opacity: 0, transform: 'translate(-50%, -50%) translateX(-60px) skewX(-12deg)' }, { opacity: 1, transform: 'translate(-50%, -50%) skewX(-12deg)', offset: .25 }, { opacity: 1, transform: 'translate(-50%, -50%) skewX(-12deg)', offset: .7 }, { opacity: 0, transform: 'translate(-50%, -50%) translateX(60px) skewX(-12deg)' }], { duration: 1100, easing: 'ease-out' });
  setTimeout(() => b.remove(), 1150);
}
function closeFight() {
  const o = $('arena'); if (!o) return;
  o.classList.remove('on'); document.documentElement.classList.remove('lock');
  setTimeout(() => { o.hidden = true; o.innerHTML = ''; }, 250);
}
function unitHTML(u) {
  const j = jetonOf(u.name), el = ELS[u.el];
  return `<div class="ar-u" data-i="${u.i}" style="--g:${hexRGB(j.glow)};--el:${el.col}">
    <span class="ar-uel">${el.ico}</span><span class="ar-ulv">${at('lvl')}${u.lvl}</span><button class="ar-ui" aria-label="i">i</button>
    <div class="ar-uimg"><img class="${vCls(u.variant)}" src="${texOf(j)}" alt=""></div>
    <b class="ar-un">${jnH(u.name)}</b>
    <div class="ar-hp"><i></i><em></em></div>
    <small class="ar-sk a">✦ ${esc(skillsOf(u.name)[0])}</small><small class="ar-sk p">◈ ${esc(skillsOf(u.name)[2])}</small>
    <small class="ar-ust"></small>
  </div>`;
}
const unitEl = r => $('ar-row' + r.side)?.children[r.i];
// Redessine tout l'état (PV, jetons jouables, manche…)
function refresh() {
  const st = FIGHT.st, can = [0, 1].map(sd => new Set(st.over ? [] : CB.playable(st, sd)));
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
    const tired = u.alive && !can[u.side].has(u.i) && FIGHT.phase !== 'resolve';
    const why = !tired ? '' : u.stuck ? '🔗 ' + at('stuck') : '💤 ' + at('rest');
    let tag = c.querySelector('.ar-rest'); if (!tag) { tag = document.createElement('span'); tag.className = 'ar-rest'; c.appendChild(tag); }
    tag.textContent = why; tag.hidden = !why;
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
    const off = st.teams[1].filter(u => u.alive && !CB.playable(st, 1).includes(u.i)).map(u => jn(u.name));
    bar.innerHTML = `${FIGHT.recap ? `<div class="ar-recap">${FIGHT.recap}</div>` : ''}<p>${at('phaseToken')}${off.length ? `<br><small class="ar-foeoff">${at('foeCant', { n: off.join(', ') })}</small>` : ''}</p><button class="btn primary" data-ok ${FIGHT.sel == null ? 'disabled' : ''}>${at('ok')}</button>`;
    return;
  }
  const me = st.teams[0][FIGHT.sel], foe = st.teams[1][FIGHT.foePick], [an, ad] = skillsOf(me.name);
  bar.innerHTML = `<p>${at('phaseLane', { a: jn(me.name), b: jn(foe.name) })}<br><small>${at('dragHint')}</small></p>
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
function unitInfo(u) { sfx.click(); openSheet({ name: u.name, variant: u.variant, lvl: u.lvl, unit: u }); }

// ---------- Glisser son jeton sur un endroit (téléphone et souris) : au moment de choisir l'endroit
function dragStart(e) {
  const c = e.target.closest('.ar-u');
  FIGHT.dragged = false;
  if (!c || e.target.closest('.ar-ui') || FIGHT.phase !== 'lane' || +c.dataset.i !== FIGHT.sel) return;
  const img = c.querySelector('.ar-uimg img'), r = img.getBoundingClientRect(), x0 = e.clientX, y0 = e.clientY;
  let ghost = null, over = null;
  const lanes = [...document.querySelectorAll('.ar-lane')];
  const move = ev => {
    const dx = ev.clientX - x0, dy = ev.clientY - y0;
    if (!ghost && Math.hypot(dx, dy) < 8) return;
    if (!ghost) {
      FIGHT.dragged = true;
      ghost = img.cloneNode(); ghost.className = 'ar-ghost ' + img.className;
      ghost.style.cssText = `width:${r.width}px;height:${r.height}px;left:${r.left}px;top:${r.top}px`;
      document.body.appendChild(ghost); c.classList.add('lifted'); sfx.click();
    }
    ghost.style.transform = `translate(${dx}px, ${dy}px) scale(1.25) rotate(${Math.max(-12, Math.min(12, dx / 12))}deg)`;
    const hit = lanes.find(L => { const b = L.getBoundingClientRect(); return ev.clientX >= b.left && ev.clientX <= b.right && ev.clientY >= b.top && ev.clientY <= b.bottom && !L.disabled; });
    if (hit !== over) { over?.classList.remove('hover'); over = hit; over?.classList.add('hover'); }
  };
  const up = () => {
    removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', up);
    c.classList.remove('lifted'); over?.classList.remove('hover');
    if (ghost) {
      if (over) { // posé : on lance la manche
        ghost.remove(); FIGHT.lane = +over.dataset.lane; FIGHT.dropFrom = r; refresh(); fightConfirm();
      } else ghost.animate([{ transform: ghost.style.transform }, { transform: 'none' }], { duration: 220, easing: 'ease-out' }).finished.then(() => ghost.remove());
    }
    setTimeout(() => { FIGHT.dragged = false; }, 50);
  };
  addEventListener('pointermove', move); addEventListener('pointerup', up); addEventListener('pointercancel', up);
}
async function fightConfirm() {
  const st = FIGHT.st;
  if (FIGHT.phase === 'token' && FIGHT.sel != null) {
    // le robot a choisi en même temps : on révèle les deux jetons
    FIGHT.foePick = CB.aiToken(st, 1);
    FIGHT.phase = 'lane'; FIGHT.lane = null; FIGHT.abil = false;
    sfx.reveal?.(300);
    refresh();
    // le jeton choisi en face se retourne, celui qu'on a choisi se soulève
    const c = unitEl({ side: 1, i: FIGHT.foePick });
    anim(c, [{ transform: 'rotateY(0)' }, { transform: 'rotateY(90deg) scale(1.1)', offset: .45 }, { transform: 'rotateY(0) scale(1.08)' }, { transform: 'none' }], { duration: 650, easing: 'ease-in-out' });
    anim(unitEl({ side: 0, i: FIGHT.sel }), [{ transform: 'none' }, { transform: 'translateY(-10px) scale(1.06)' }, { transform: 'translateY(-6px)' }], { duration: 420, easing: 'cubic-bezier(.2, 1.4, .4, 1)' });
    const pill = document.createElement('div'); pill.className = 'ar-play'; pill.style.setProperty('--el', ELS[st.teams[1][FIGHT.foePick].el].col);
    pill.innerHTML = `${at('foePlays')} <b>${jnH(st.teams[1][FIGHT.foePick].name)}</b>`;
    $('ar-lanes').appendChild(pill); setTimeout(() => pill.remove(), 1600);
    return;
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
    roundBanner();
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
const slotOf = (lane, side) => document.querySelectorAll('.ar-lane')[lane]?.querySelector(side === 0 ? '.ar-slotm' : '.ar-slotf');
// un jeton vole d'un point A (sa carte, ou là où on l'a lâché) jusqu'au centre d'un élément B, en arc
function flyImg(src, cls, from, toEl, ms = 520) {
  const to = toEl.getBoundingClientRect(), g = document.createElement('img');
  g.src = src; g.className = 'ar-ghost ' + cls;
  const w = 52; g.style.cssText = `width:${w}px;height:${w}px;left:0;top:0`;
  document.body.appendChild(g);
  const x0 = from.left + from.width / 2 - w / 2, y0 = from.top + from.height / 2 - w / 2, x1 = to.left + to.width / 2 - w / 2, y1 = to.top + to.height / 2 - w / 2;
  const mx = (x0 + x1) / 2 + (x1 > x0 ? -30 : 30), my = Math.min(y0, y1) - 30;
  const a = g.animate([
    { transform: `translate(${x0}px, ${y0}px) scale(1.3) rotate(0)` },
    { transform: `translate(${mx}px, ${my}px) scale(1.15) rotate(${x1 > x0 ? 200 : -200}deg)`, offset: .5 },
    { transform: `translate(${x1}px, ${y1}px) scale(1) rotate(360deg)` },
  ], { duration: reducedFx() ? 1 : ms, easing: 'cubic-bezier(.45, 0, .2, 1)' });
  // si l'onglet est en arrière-plan, les animations s'arrêtent : on n'attend jamais plus que prévu
  return Promise.race([a.finished.catch(() => {}), new Promise(r => setTimeout(r, ms + 150))]).then(() => g.remove());
}
// Charge vers une barre de vie : élan en arrière, vol en arc avec traînée, impact, retour à sa place
async function dashTo(slot, target, col) {
  const img = slot.querySelector('img'); if (!img || reducedFx()) return;
  const a = img.getBoundingClientRect(), b = target.getBoundingClientRect();
  const up = b.top < a.top ? -1 : 1;
  await new Promise(r => { const k = img.animate([{ transform: 'none' }, { transform: `translateY(${-up * 10}px) scale(.9)` }], { duration: 160, easing: 'ease-out', fill: 'forwards' }); setTimeout(r, 170); k.finished.catch(() => {}); });
  img.style.visibility = 'hidden'; img.getAnimations().forEach(x => x.cancel());
  const g = document.createElement('img'); g.src = img.src; g.className = 'ar-ghost ' + img.className; const w = a.width;
  g.style.cssText = `width:${w}px;height:${w}px;left:0;top:0;--c:${col}`;
  document.body.appendChild(g);
  const x0 = a.left, y0 = a.top, x1 = b.left + b.width / 2 - w / 2, y1 = b.top + b.height / 2 - w / 2, mx = (x0 + x1) / 2 + (x1 > x0 ? 40 : -40), my = (y0 + y1) / 2;
  const fly = (from, to, ms) => new Promise(r => { g.animate([from, to], { duration: ms, easing: 'cubic-bezier(.5, 0, .9, .5)', fill: 'forwards' }); setTimeout(r, ms); });
  // traînée
  const trail = setInterval(() => { const R = g.getBoundingClientRect(); const t = document.createElement('i'); t.className = 'ar-spark'; t.style.background = col; document.body.appendChild(t); t.animate([{ transform: `translate(${R.left + R.width / 2}px, ${R.top + R.height / 2}px) scale(1.4)`, opacity: .9 }, { transform: `translate(${R.left + R.width / 2}px, ${R.top + R.height / 2}px) scale(.2)`, opacity: 0 }], { duration: 380 }).finished.then(() => t.remove(), () => t.remove()); }, 30);
  await fly({ transform: `translate(${x0}px, ${y0}px) rotate(0) scale(1)` }, { transform: `translate(${mx}px, ${my}px) rotate(${x1 > x0 ? 180 : -180}deg) scale(1.15)` }, 170);
  await fly({ transform: `translate(${mx}px, ${my}px) rotate(${x1 > x0 ? 180 : -180}deg) scale(1.15)` }, { transform: `translate(${x1}px, ${y1}px) rotate(${x1 > x0 ? 360 : -360}deg) scale(.9)` }, 170);
  clearInterval(trail);
  sparks(target, col, 14);
  await fly({ transform: `translate(${x1}px, ${y1}px) scale(.9)`, opacity: 1 }, { transform: `translate(${x0}px, ${y0}px) scale(1)`, opacity: .2 }, 260);
  g.remove(); img.style.visibility = '';
  img.animate([{ transform: 'scale(1.25)', opacity: .4 }, { transform: 'none', opacity: 1 }], { duration: 200 });
}
async function placeIn(lane, side, u, abil) {
  const slot = slotOf(lane, side); if (!slot) return;
  const card = unitEl(u), img = card?.querySelector('.ar-uimg img');
  const from = side === 0 && FIGHT.dropFrom ? FIGHT.dropFrom : img.getBoundingClientRect();
  card?.classList.add('out');
  await flyImg(texOf(jetonOf(u.name)), vCls(u.variant), from, slot);
  slot.innerHTML = `<img class="${vCls(u.variant)}" src="${texOf(jetonOf(u.name))}" alt="">${abil ? '<i>✦</i>' : ''}`;
  slot.style.setProperty('--el', ELS[u.el].col);
  anim(slot, [{ transform: 'scale(1.35)' }, { transform: 'scale(.92)' }, { transform: 'none' }], { duration: 260 });
}
// fin de manche : les jetons repartent dans leur carte
async function returnHome(picks) {
  await Promise.all(picks.map((p, side) => {
    const slot = slotOf(p.lane, side), u = FIGHT.st.teams[side][p.i], card = unitEl(u);
    if (!slot?.firstElementChild || !card) { card?.classList.remove('out'); return; }
    const from = slot.getBoundingClientRect(); slot.innerHTML = '';
    return flyImg(texOf(jetonOf(u.name)), vCls(u.variant), from, card.querySelector('.ar-uimg'), 420).then(() => card.classList.remove('out'));
  }));
  document.querySelectorAll('.ar-u.out').forEach(c => c.classList.remove('out'));
}
function roundRecap(ev) {
  const st = FIGHT.st, rv = ev.find(e => e.t === 'reveal'); if (!rv) return '';
  const [a, b] = rv.picks, me = st.teams[0][a.i], foe = st.teams[1][b.i];
  const clash = ev.find(e => e.t === 'clash');
  const dealt = sd => ev.filter(e => (e.t === 'hit' || e.t === 'face') && e.from?.side === sd).reduce((x, e) => x + e.d, 0);
  const lanes = atList('lanes');
  return clash ? at('recapClash', { a: jn(me.name), b: jn(foe.name), l: lanes[a.lane], x: dealt(0), y: dealt(1) })
    : at('recapMiss', { a: jn(me.name), la: lanes[a.lane], b: jn(foe.name), lb: lanes[b.lane], x: dealt(0), y: dealt(1) });
}
async function playRound(ev) {
  document.querySelectorAll('.ar-slotf, .ar-slotm').forEach(s => { s.innerHTML = ''; });
  FIGHT.recap = roundRecap(ev);
  let picks = null;
  for (const e of ev) {
    if (e.t === 'reveal') {
      picks = e.picks;
      const L = $('ar-lanes'), rv = document.createElement('div'); rv.className = 'ar-banner rv'; rv.innerHTML = `<b>${at('revealTxt')}</b>`; L.appendChild(rv);
      anim(rv, [{ opacity: 0, transform: 'translate(-50%, -50%) scale(1.6)' }, { opacity: 1, transform: 'translate(-50%, -50%) scale(1)', offset: .3 }, { opacity: 0, transform: 'translate(-50%, -50%) scale(.9)' }], { duration: 700 });
      L.classList.add('suspense'); await sleep(550); L.classList.remove('suspense'); rv.remove();
      sfx.whooshOut?.();
      await Promise.all(e.picks.map((p, side) => placeIn(p.lane, side, FIGHT.st.teams[side][p.i], p.abil)));
      FIGHT.dropFrom = null;
      await sleep(250);
    }
    if (e.t === 'abil') {
      const u = unitOf(e.u), [an] = skillsOf(u.name), side = e.u.side, mine = picks?.[side], theirs = picks?.[1 - side];
      const call = document.createElement('div'); call.className = 'ar-call'; call.style.setProperty('--el', ELS[u.el].col);
      call.innerHTML = `<img src="${texOf(jetonOf(u.name))}" alt=""><b>${esc(an)}</b>`;
      $('ar-lanes').appendChild(call); setTimeout(() => call.remove(), 1400);
      sfx.reveal?.(side === 0 ? 900 : 300);
      const lanes = [...document.querySelectorAll('.ar-lane')];
      await ABFX(u.name)({ me: unitEl(e.u), foe: unitEl({ side: 1 - side, i: theirs?.i ?? 0 }), mySlot: mine && slotOf(mine.lane, side), foeSlot: theirs && slotOf(theirs.lane, 1 - side),
        myLane: mine && lanes[mine.lane], lanes, myBar: lifeEl(side), foeBar: lifeEl(1 - side), myCards: [...$('ar-row' + side).children], foeCards: [...$('ar-row' + (1 - side)).children], col: ELS[u.el].col });
    }
    if (e.t === 'clash') {
      const lanes = document.querySelectorAll('.ar-lane');
      (e.lane < 0 ? [...lanes] : [lanes[e.lane]]).forEach(L => { L.classList.add('clash'); setTimeout(() => L.classList.remove('clash'), 700); });
      // les deux jetons foncent l'un sur l'autre
      if (picks) picks.forEach((p, side) => anim(slotOf(p.lane, side), [{ transform: 'none' }, { transform: `translateY(${side === 0 ? -28 : 28}px) scale(1.15)` }, { transform: 'none' }], { duration: 380, easing: 'cubic-bezier(.5, 0, .3, 1.4)' }));
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
      // le jeton fonce sur la barre de vie du joueur d'en face puis revient
      const pk = e.from && picks?.[e.from.side], sl = pk && slotOf(pk.lane, e.from.side);
      if (sl?.firstElementChild) await dashTo(sl, p, ELS[unitOf(e.from).el].col);
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
  await sleep(450);
  if (picks) await returnHome(picks);
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
  anim(box.querySelector('.ar-endc'), [{ opacity: 0, transform: 'scale(.6) translateY(30px)' }, { opacity: 1, transform: 'scale(1.04)', offset: .7 }, { transform: 'none' }], { duration: 520, easing: 'cubic-bezier(.2, 1.2, .4, 1)' });
  if (mine && !reducedFx()) for (let k = 0; k < 40; k++) setTimeout(() => {
    const c = document.createElement('i'); c.className = 'ar-spark'; c.style.background = ['#fde68a', '#a78bfa', '#4ade80', '#f472b6', '#38bdf8'][k % 5];
    document.body.appendChild(c); const x = Math.random() * innerWidth;
    c.animate([{ transform: `translate(${x}px, -10px) rotate(0)` }, { transform: `translate(${x + (Math.random() - .5) * 120}px, ${innerHeight + 10}px) rotate(${Math.random() * 720}deg)` }], { duration: 1600 + Math.random() * 900, easing: 'ease-in' }).finished.then(() => c.remove(), () => c.remove());
  }, k * 30);
  mine ? sfx.upgrade?.() : sfx.deny?.();
  box.onclick = e => {
    if (e.target.closest('[data-back]')) closeFight();
    if (e.target.closest('[data-again]')) { box.remove(); startTraining(); }
  };
}

// ---------- Fiche d'un jeton (Bestiaire) : élément, capacité, passif, niveau et bouton pour monter de niveau
function combatInfoHTML(name, owned = 0, serie = 'Takoras') {
  const el = CB.elOf(name), [an, ad, pn, pd] = skillsOf(name), L = lvlOf(name, serie);
  const free = INV.groups.filter(x => x.name === name && x.serie === serie).reduce((s, x) => s + x.free.length, 0);
  const can = L < 10 && free >= L && owned - L >= 1;
  return `<div class="ar-info" style="--el:${ELS[el].col}">
    <div class="ar-info-h"><span>${ELS[el].ico} ${elName(el)}</span><b>${at('lvl')} ${L}/10</b></div>
    <p><b>✦ ${esc(an)}</b> — ${esc(ad)}</p>
    <p><b>◈ ${esc(pn)}</b> — ${esc(pd)}</p>
    ${owned ? (L >= 10 ? `<small class="muted">${at('lvlMax')}</small>` : `<button class="btn ghost ar-lvl" data-lvlup="${esc(name)}" data-serie="${esc(serie)}" ${can ? '' : 'disabled'}>⬆️ ${at('lvlUp', { n: L + 1 })} · ${at('lvlCost', { n: L })}</button>${can ? '' : `<small class="muted">${at('lvlNeed', { n: L, h: Math.max(0, Math.min(free, owned - 1)) })}</small>`}`) : ''}
  </div>`;
}
async function levelUp(name, serie = 'Takoras') {
  const { data, error } = await sb.rpc('level_up', { p_jeton: name, p_serie: serie });
  if (error) { sfx.deny(); toast(errText(error), true); return false; }
  ARENA.levels[serie + '|' + name] = data.lvl; sfx.upgrade(); toast('⬆️ ' + at('lvlOk', { j: jn(name), n: data.lvl }));
  return true;
}
if (typeof ACC !== 'undefined' && ACC.user) loadLevels();
