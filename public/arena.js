// Page Combat (« Ring ») : rang, JOUER (classé), Entraînement, ton équipe de 3 jetons, fiches des jetons.
// Le match lui-même : ring-engine.js (physique), ring-ui.js (écran), ring-config.js (valeurs). Voir docs/COMBAT.md.

const ELS = {
  fire: { ico: '🔥', col: '#fb923c', fr: 'Feu', en: 'Fire' },
  water: { ico: '💧', col: '#38bdf8', fr: 'Eau', en: 'Water' },
  plant: { ico: '🌿', col: '#4ade80', fr: 'Plante', en: 'Plant' },
  light: { ico: '✨', col: '#fde68a', fr: 'Lumière', en: 'Light' },
  shadow: { ico: '🌑', col: '#a78bfa', fr: 'Ténèbres', en: 'Dark' },
};
const elName = el => ELS[el][SETTINGS.lang === 'en' ? 'en' : 'fr'];
const AT = {
  fr: { tryTuto: 'Essayer le Ring (tuto)', rank: 'Ton rang', r_bronze: 'Bronze', r_silver: 'Argent', r_gold: 'Or', r_plat: 'Platine', r_diam: 'Diamant', r_master: 'Maître', r_legend: 'Légende', play: 'JOUER', rankedSoon: 'Classé · arrive bientôt', edit: 'Modifier', noSyn: 'Pas de synergie : mets 2 jetons de la même famille, ou des jetons dont les effets se combinent.', howTitle: 'Comment ça marche ?', statuses: 'Statuts', reactions: 'Réactions (combos)', tuto: 'Revoir le tuto du Ring', cost: '{n} pt', stSpd: 'Vitesse', cd: 'recharge {n} s', saveTeam: 'Valider l’équipe', budget: 'Budget : {n}/{m} pts', budgetOver: 'Trop de points pour le classé (l’entraînement reste possible).', budgetHint: 'Commune 1 · Rare 2 · Épique 3 · Légendaire 4 · Mythique 5 pts', teamFull: 'Ton équipe est pleine : retire un jeton d’abord', title: 'Combat', sub: 'Prépare ton équipe de 3 jetons. Le combat est en train d’être refait.', newMode: '🛠️ Nouveau combat en préparation', newModeTxt: 'L’ancien mode est retiré, un combat tout neuf arrive bientôt.', team: 'Ton équipe',
    slots: ['Jeton 1', 'Jeton 2', 'Jeton 3'], lanes: ['Gauche', 'Milieu', 'Droite'], pick: 'Choisir', train: 'Entraînement contre l’IA', ranked: '🏆 Classé', soon: 'Bientôt : rangs Bronze → Légende, saisons et battle pass',
    need3: 'Choisis 3 jetons pour combattre', els: 'Éléments', elsHelp: '🔥 bat 🌿 · 🌿 bat 💧 · 💧 bat 🔥 · ✨ et 🌑 forts l’un contre l’autre (×1,3 de dégâts)',
    how: 'Comment ça marche', howText: 'Un duel sur un ring rond, façon billard × pétanque × sumo. À chaque tour, toi et l’adversaire visez <b>en même temps</b> sans voir le tir de l’autre : tape un de tes jetons, glisse vers l’arrière comme un lance-pierre (plus tu tires loin, plus c’est fort), puis valide. Les deux tirs partent ensemble. Un jeton dont le centre sort du ring est éliminé. Le premier qui n’a plus de jetons perd. Chaque jeton a un pouvoir et 3 stats : poids, puissance, taille.', round: 'Manche {n}', step1: 'Touche un de tes jetons', step2: 'Touche ou glisse ton jeton vers un endroit', abilOn: 'Capacité activée', abilOff: 'Activer la capacité', laneHint: 'même endroit = duel', tuto1t: 'Choisis un jeton', tuto1: 'À chaque manche, touche un de tes jetons. L’adversaire choisit en même temps : vous voyez chacun le jeton de l’autre.', tuto2t: 'Pose-le en cachette', tuto2: 'Touche (ou glisse vers) <b>gauche, milieu ou droite</b>. L’autre ne voit pas où tu le mets. Tu peux allumer la capacité avant (1 fois par combat).', tuto3t: 'Duel ou coup direct', tuto3: '<b>Même endroit</b> : les deux jetons se battent. <b>Endroits différents</b> : chacun frappe le joueur d’en face. Le premier à 0 ❤️ perd !', tutoGo: 'Compris, on y va !', rest: 'Repos', stuck: 'Bloqué', foeCant: 'En face, ne peut pas jouer : {n}', foePlays: 'Il joue', revealTxt: 'Révélation !', recapClash: '⚔️ Duel ({l}) : {a} contre {b} · ton jeton inflige {x} PV, en reçoit {y}', recapMiss: '💥 Coups directs : {a} ({la}) et {b} ({lb}) · tu infliges {x} ❤️, tu perds {y} ❤️', needLogin: 'Connecte-toi pour monter ton équipe et combattre.', normal: 'Normal', stHp: 'PV', stAtk: 'Attaque', stDef: 'Défense', stCurse: 'maudit', stRust: 'rouillé (−30 % déf.)', stNoHeal: 'ne peut plus être soigné', inTeam: 'déjà dans l’équipe', version: 'Version', chooseThis: 'Prendre ce jeton', dragHint: 'Glisse ton jeton sur un endroit, ou touche un endroit puis « Poser ici ».', phaseToken: 'Choisis ton jeton pour cette manche', phaseLane: 'Tu joues <b>{a}</b>, il joue <b>{b}</b>. Où poses-tu ton jeton ?', ok: 'Valider', place: 'Poser ici', usedAb: 'déjà utilisée', tired: 'Ce jeton se repose cette manche', clash: 'Croisement !', block: 'Protégé', dazzled: 'Ébloui', recharged: 'Capacité rechargée', frozenL: 'Gelé', rounds: '{n} manches', dmgWord: 'dégâts',
    pickTitle: 'Choisis un jeton', lvl: 'Niv.', power: 'Puissance', ability: 'Capacité', passive: 'Passif', remove: 'Retirer', none: 'Tu n’as pas encore de jeton : ouvre des pulls !',
    ready: 'PRÊT', win: 'Victoire !', lose: 'Défaite…', draw: 'Égalité', again: 'Rejouer', back: 'Retour', bot: 'Robot', you: 'Toi', mvp: 'Meilleur jeton',
    quit: 'Abandonner le combat ?', eff: 'Efficace !', weak: 'Peu efficace', dodge: 'Esquive', miss: 'Raté', crit: 'CRITIQUE', revive: 'Ressuscité !', time: 'Temps écoulé',
    lvlUp: 'Monter au niveau {n}', lvlCost: 'utilise {n} doublon(s)', lvlNeed: 'Il faut {n} doublon(s) libre(s) (tu en as {h})', lvlMax: 'Niveau max', lvlOk: '{j} passe niveau {n} !', element: 'Élément' },
  en: { tryTuto: 'Try the Ring (tutorial)', rank: 'Your rank', r_bronze: 'Bronze', r_silver: 'Silver', r_gold: 'Gold', r_plat: 'Platinum', r_diam: 'Diamond', r_master: 'Master', r_legend: 'Legend', play: 'PLAY', rankedSoon: 'Ranked · coming soon', edit: 'Edit', noSyn: 'No synergy: add 2 tokens of the same family, or tokens whose effects combine.', howTitle: 'How does it work?', statuses: 'Statuses', reactions: 'Reactions (combos)', tuto: 'Replay the Ring tutorial', cost: '{n} pt', stSpd: 'Speed', cd: '{n} s cooldown', saveTeam: 'Save team', budget: 'Budget: {n}/{m} pts', budgetOver: 'Too many points for ranked (training still works).', budgetHint: 'Common 1 · Rare 2 · Epic 3 · Legendary 4 · Mythic 5 pts', teamFull: 'Your team is full: remove a token first', title: 'Battle', sub: 'Build your team of 3 tokens. Battles are being remade.', newMode: '🛠️ New battle mode in the works', newModeTxt: 'The old mode is gone, a brand-new battle is coming soon.', team: 'Your team',
    slots: ['Token 1', 'Token 2', 'Token 3'], lanes: ['Left', 'Middle', 'Right'], pick: 'Pick', train: 'Training vs the AI', ranked: '🏆 Ranked', soon: 'Soon: Bronze → Legend tiers, seasons and battle pass',
    need3: 'Pick 3 tokens to fight', els: 'Elements', elsHelp: '🔥 beats 🌿 · 🌿 beats 💧 · 💧 beats 🔥 · ✨ and 🌑 strong against each other (×1.3 damage)',
    how: 'How it works', howText: 'A duel on a round ring, billiards × pétanque × sumo. Each turn, you and your opponent aim <b>at the same time</b> without seeing each other’s shot: tap one of your tokens, drag backwards like a slingshot (the further, the harder), then confirm. Both shots go off together. A token whose center leaves the ring is out. The first player with no tokens left loses. Each token has a power and 3 stats: weight, power, size.', round: 'Round {n}', step1: 'Tap one of your tokens', step2: 'Tap or drag your token to a spot', abilOn: 'Ability on', abilOff: 'Turn on ability', laneHint: 'same spot = duel', tuto1t: 'Pick a token', tuto1: 'Each round, tap one of your tokens. The opponent picks at the same time: you each see the other’s token.', tuto2t: 'Place it secretly', tuto2: 'Tap (or drag to) <b>left, middle or right</b>. The other can’t see where you put it. You can turn on the ability first (once per battle).', tuto3t: 'Duel or direct hit', tuto3: '<b>Same spot</b>: the two tokens fight. <b>Different spots</b>: each hits the opposing player. First to 0 ❤️ loses!', tutoGo: 'Got it, let’s go!', rest: 'Resting', stuck: 'Stuck', foeCant: 'Opponent can’t play: {n}', foePlays: 'They play', revealTxt: 'Reveal!', recapClash: '⚔️ Duel ({l}): {a} vs {b} · your token deals {x} HP, takes {y}', recapMiss: '💥 Direct hits: {a} ({la}) and {b} ({lb}) · you deal {x} ❤️, you lose {y} ❤️', needLogin: 'Log in to build your team and fight.', normal: 'Normal', stHp: 'HP', stAtk: 'Attack', stDef: 'Defense', stCurse: 'cursed', stRust: 'rusted (−30% def.)', stNoHeal: 'can no longer be healed', inTeam: 'already in the team', version: 'Version', chooseThis: 'Take this token', dragHint: 'Drag your token onto a spot, or tap a spot then “Place here”.', phaseToken: 'Pick your token for this round', phaseLane: 'You play <b>{a}</b>, they play <b>{b}</b>. Where do you place your token?', ok: 'Confirm', place: 'Place here', usedAb: 'already used', tired: 'This token is resting this round', clash: 'Clash!', block: 'Protected', dazzled: 'Dazzled', recharged: 'Ability recharged', frozenL: 'Frozen', rounds: '{n} rounds', dmgWord: 'damage',
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

// ---------- Page Combat : rang, JOUER (classé), Entraînement, ton équipe
const rankOf = elo => [...RCFG.RANKS].reverse().find(r => elo >= r.min) || RCFG.RANKS[0];
async function renderCombat() {
  const page = $('page-combat');
  if (!ACC.user) {
    page.innerHTML = `<div class="page-empty"><h2>${at('title')}</h2><p class="muted">${at('needLogin')}</p><button class="btn primary" onclick="openAccount('login')">${t('login')}</button><button class="btn ghost" data-ftuto>🎓 ${at('tryTuto')}</button></div>`;
    page.querySelector('[data-ftuto]').onclick = () => startRingTuto(() => renderCombat());
    return;
  }
  await Promise.all([loadInventory(), loadLevels(), (async () => {
    const { data } = await sb.rpc('my_deck');
    ARENA.team = [0, 1, 2].map(i => data?.[i] ? { id: data[i].id, serie: data[i].serie || 'Takoras', name: data[i].jeton, odds: data[i].odds, variant: data[i].variant || '' } : null);
  })()]);
  drawCombat();
}
// Mini carte d'un jeton de l'équipe : image, nom, niveau, passif ou abilité
function teamCard(u, i) {
  if (!u) return `<button class="ar-slot empty" data-edit><span class="ar-pos">${slotName(i)}</span><b>＋</b><small>${at('pick')}</small></button>`;
  const j = jetonOf(u.name, u.serie), el = CB.elOf(u.name), k = powerText(u.name);
  return `<button class="ar-slot" data-info="${i}" style="--g:${hexRGB(j.glow)};--el:${ELS[el].col}">
    <span class="ar-pos">${slotName(i)}</span><span class="ar-el" title="${elName(el)}">${ELS[el].ico}</span>
    <img class="${vCls(u.variant)}" src="${texOf(j)}" alt="">
    <b>${jnH(u.name)}${vTag(u.variant)}</b>
    <small>${at('lvl')} ${lvlOf(u.name, u.serie)}</small>
    <small class="ar-ab" style="--c:${PW_COL[k.pw]}">✦ ${esc(k.name)}</small>
  </button>`;
}
function drawCombat() {
  const page = $('page-combat'), full = ARENA.team.every(Boolean), team = ARENA.team.filter(Boolean);
  const elo = RCFG.ELO.start, rk = rankOf(elo);
  page.innerHTML = `<div class="ar-page fm">
    <div class="fm-rank"><span class="fm-ico">${rk.ico}</span><div><small>${at('rank')}</small><b>${at('r_' + rk.k)}</b></div><div class="fm-elo"><b>${fmt(elo)}</b><small>Elo</small></div></div>
    <button class="fm-play" disabled><b>⚔️ ${at('play')}</b><small>${at('rankedSoon')}</small></button>
    <button class="btn fm-train" ${full ? '' : 'disabled'}>🤖 ${at('train')}</button>
    ${full ? '' : `<small class="muted fm-need">${at('need3')}</small>`}
    <div class="fm-team">
      <div class="fm-th"><h3>${at('team')}</h3><button class="btn ghost sm" data-edit>✏️ ${at('edit')}</button></div>
      <div class="ar-team">${ARENA.team.map(teamCard).join('')}</div>
    </div>
    <details class="ar-help"><summary>${at('howTitle')}</summary>
      <p class="muted">${at('howText')}</p>
      <button class="btn ghost sm" data-ftuto>🎓 ${at('tuto')}</button>
    </details>
  </div>`;
  page.onclick = e => {
    if (e.target.closest('[data-edit]')) return editTeam();
    const inf = e.target.closest('[data-info]'); if (inf) { const u = ARENA.team[+inf.dataset.info]; sfx.click(); return openSheet({ name: u.name, serie: u.serie, variant: u.variant }); }
    if (e.target.closest('[data-ftuto]')) return startRingTuto(() => drawCombat());
    if (e.target.closest('.fm-train')) return startTraining();
  };
}
// ---------- Entraînement contre l'IA (sans Elo). Le tout premier match lance le tuto.
function startTraining() {
  if (!ringTutoSeen()) return startRingTuto(() => drawCombat());
  const mine = ARENA.team.map(u => ({ name: u.name, lvl: lvlOf(u.name, u.serie), variant: u.variant }));
  const avg = Math.round(mine.reduce((x, u) => x + u.lvl, 0) / 3);
  const pool = Object.keys(RCFG.TOKENS).sort(() => Math.random() - .5).slice(0, 3);
  const bot = pool.map(name => ({ name, lvl: Math.max(1, Math.min(RCFG.LEVEL_MAX, avg + Math.round(Math.random() * 2 - 1))), variant: '' }));
  startRing([mine, bot], { names: [ACC.pseudo || rt('you'), rt('bot')], ai: 'normal', onEnd: r => r === 'again' ? startTraining() : drawCombat() });
}

// ---------- Fiche complète d'un jeton (équipe, choix) : stats, élément, niveau, passif ou abilité
function tokenSheetHTML(o) {
  const j = jetonOf(o.name, o.serie), el = CB.elOf(o.name), lvl = o.lvl || lvlOf(o.name, o.serie);
  return `<div class="tk-sheet" style="--g:${hexRGB(j.glow)};--el:${ELS[el].col}">
    <div class="tk-top">
      <div class="tk-img"><img class="${vCls(o.variant || '')}" src="${texOf(j)}" alt=""></div>
      <div><span class="tier t-${tierKey(j.odds)}">${t(tierKey(j.odds))}</span>
        <h2>${jnH(o.name)} ${vTag(o.variant || '')}</h2>
        <div class="tk-chips"><span style="color:${ELS[el].col}">${ELS[el].ico} ${elName(el)}</span><span>${at('lvl')} ${lvl}/10</span><span>${at('cost', { n: RCFG.BUDGET[tierKey(j.odds)] })}</span></div></div>
    </div>
    ${kitHTML(o.name)}
    ${ringStatsHTML(o.name, lvl, o.variant || '')}
    ${o.extra || ''}
  </div>`;
}
function kitHTML(name) {
  const k = powerText(name);
  return `<div class="tk-sk" style="--g:${hexRGB(PW_COL[k.pw])}"><small>✦ ${rt('power')} · ${k.when}</small><b>${esc(k.name)}</b><p>${esc(k.desc)}</p></div>`;
}
function openSheet(o) {
  const card = $('jm-card');
  jm.style.setProperty('--g', hexRGB(jetonOf(o.name).glow));
  card.onclick = card.oninput = card.onchange = null;
  card.classList.add('sheetmode');
  card.innerHTML = `<button class="set-close jm-close" aria-label="${t('close')}">✕</button>${tokenSheetHTML(o)}`;
  jm.classList.add('on');
}

// ---------- Modifier l'équipe : ta collection en grille, tap = ajouter / retirer.
// En haut : les 3 places (tap sur la pastille = changer de mutation), le budget en points et les synergies.
function editTeam() {
  sfx.click();
  const key = (serie, name) => serie + '|' + name; // plusieurs collections : un jeton = collection + nom
  const by = {};
  INV.groups.forEach(x => { (by[key(x.serie, x.name)] ||= { k: key(x.serie, x.name), serie: x.serie, name: x.name, odds: x.odds, vars: {} }).vars[x.variant] = x.ids[0]; });
  const all = Object.values(by);
  const series = seriesList().filter(sr => all.some(u => u.serie === sr));
  const team = ARENA.team.map(u => u && by[key(u.serie || 'Takoras', u.name)] ? { ...u } : null);
  const S = { serie: series[0] || 'Takoras', el: 'all' };
  const baseV = g => Object.keys(g.vars).sort((a, b) => VRANK[a] - VRANK[b])[0]; // par défaut : la version normale
  const pts = () => team.filter(Boolean).reduce((x, u) => x + RCFG.BUDGET[tierKey(u.odds)], 0);
  const o = document.createElement('div');
  o.className = 'tp-box te';
  o.innerHTML = `<div class="tp-panel">
    <div class="tp-head"><div><small class="eyebrow">${at('title')}</small><h2>${at('team')}</h2></div><button class="tp-x" data-close aria-label="${t('close')}">✕</button></div>
    <div class="te-top" id="te-top"></div>
    <div class="te-filt">
      ${series.length > 1 ? `<div class="tp-series">${series.map(sr => `<button data-serie="${esc(sr)}">${esc(sr)}</button>`).join('')}</div>` : ''}
      <div class="tp-els">${['all', 'fire', 'water', 'plant', 'light', 'shadow'].map(e => `<button data-el="${e}">${e === 'all' ? t('all') : ELS[e].ico + ' ' + elName(e)}</button>`).join('')}</div>
    </div>
    <p class="te-legend">${rt('statsLegend')}</p>
    <div class="tp-grid te-grid" id="te-grid"></div>
    <div class="te-foot"><button class="btn primary" data-save>${at('saveTeam')}</button></div>
  </div>`;
  document.body.appendChild(o);
  document.documentElement.classList.add('lock');
  requestAnimationFrame(() => o.classList.add('on'));
  const close = () => { o.classList.remove('on'); document.documentElement.classList.remove('lock'); setTimeout(() => o.remove(), 250); };
  const drawTop = () => {
    const p = pts(), tm = team.filter(Boolean);
    o.querySelector('#te-top').innerHTML = `<div class="te-slots">${team.map((u, i) => {
      if (!u) return `<div class="te-s empty"><b>＋</b><small>${slotName(i)}</small></div>`;
      const j = jetonOf(u.name, u.serie), g = by[key(u.serie, u.name)], vs = Object.keys(g.vars);
      return `<div class="te-s" style="--g:${hexRGB(j.glow)}"><button class="te-rm" data-rm="${i}" aria-label="${at('remove')}">✕</button>
        <img class="${vCls(u.variant)}" src="${texOf(j)}" alt=""><b>${jnH(u.name)}</b>
        <button class="te-v ${u.variant ? 'v-' + u.variant : 'v-none'}" data-cyc="${i}" ${vs.length > 1 ? '' : 'disabled'}>${u.variant ? t('v_' + u.variant) + ' ×' + RCFG.MUTATION[u.variant] : at('normal')}${vs.length > 1 ? ' ⟳' : ''}</button></div>`;
    }).join('')}</div>
    <div class="te-info"><span class="te-pts${p > RCFG.BUDGET_MAX ? ' over' : ''}">${at('budget', { n: p, m: RCFG.BUDGET_MAX })}</span><small class="muted">${p > RCFG.BUDGET_MAX ? at('budgetOver') : at('budgetHint')}</small></div>
`;
  };
  const drawGrid = () => {
    o.querySelectorAll('[data-el]').forEach(b => b.classList.toggle('on', b.dataset.el === S.el));
    o.querySelectorAll('[data-serie]').forEach(b => b.classList.toggle('on', b.dataset.serie === S.serie));
    const inTeam = new Set(team.filter(Boolean).map(u => key(u.serie, u.name)));
    const vis = all.filter(u => u.serie === S.serie && (S.el === 'all' || CB.elOf(u.name) === S.el)).sort((a, b) => b.odds - a.odds);
    o.querySelector('#te-grid').innerHTML = vis.map(u => {
      const j = jetonOf(u.name, u.serie), el = CB.elOf(u.name), k = powerText(u.name), on = inTeam.has(u.k);
      return `<button class="tp-c${on ? ' sel' : ''}" data-k="${esc(u.k)}" style="--g:${hexRGB(j.glow)};--el:${ELS[el].col}">
        <span class="tp-el">${ELS[el].ico}</span><span class="tp-lv">${at('lvl')}${lvlOf(u.name, u.serie)}</span>
        <span class="te-i" data-i="${esc(u.k)}">ⓘ</span>
        <img src="${texOf(j)}" alt="">
        <b>${jnH(u.name)}</b>
        <small class="ar-ab" style="--c:${PW_COL[k.pw]}" title="${esc(k.desc)}">✦ ${esc(k.name)}</small>
        <small class="te-pd">${esc(k.desc)}</small>
        ${ringStatsHTML(u.name, lvlOf(u.name, u.serie), '', true)}
        <small class="te-cost">${at('cost', { n: RCFG.BUDGET[tierKey(u.odds)] })}</small>
        ${on ? '<span class="te-ok">✓</span>' : ''}
      </button>`;
    }).join('') || `<p class="muted">${at('none')}</p>`;
  };
  drawTop(); drawGrid();
  o.addEventListener('click', async e => {
    if (e.target === o || e.target.closest('[data-close]')) return close();
    const inf = e.target.closest('[data-i]'); if (inf) { const u = by[inf.dataset.i]; sfx.click(); return openSheet({ name: u.name, serie: u.serie, variant: baseV(u) }); }
    const el = e.target.closest('[data-el]'); if (el) { S.el = el.dataset.el; sfx.click(); return drawGrid(); }
    const sr = e.target.closest('[data-serie]'); if (sr) { S.serie = sr.dataset.serie; S.el = 'all'; sfx.click(); return drawGrid(); }
    const rm = e.target.closest('[data-rm]'); if (rm) { team[+rm.dataset.rm] = null; sfx.click(); drawTop(); return drawGrid(); }
    const cy = e.target.closest('[data-cyc]');
    if (cy) {
      const u = team[+cy.dataset.cyc], g = by[key(u.serie, u.name)], vs = Object.keys(g.vars).sort((a, b) => VRANK[a] - VRANK[b]);
      u.variant = vs[(vs.indexOf(u.variant) + 1) % vs.length]; u.id = g.vars[u.variant]; sfx.click(); return drawTop();
    }
    const c = e.target.closest('.tp-c');
    if (c) {
      const g = by[c.dataset.k], had = team.findIndex(u => u && key(u.serie, u.name) === g.k);
      let added = -1;
      if (had >= 0) { team[had] = null; sfx.click(); }
      else {
        const free = team.findIndex(u => !u);
        if (free < 0) { sfx.deny(); toast(at('teamFull'), true); return; }
        const v = baseV(g); team[free] = { id: g.vars[v], serie: g.serie, name: g.name, odds: g.odds, variant: v }; sfx.upgrade(); added = free;
      }
      drawTop(); drawGrid();
      if (added >= 0 && !reducedFx()) o.querySelectorAll('.te-s')[added]?.animate([{ transform: 'scale(.6)', opacity: .3 }, { transform: 'scale(1.08)' }, { transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.2, 1.3, .4, 1)' });
      return;
    }
    if (e.target.closest('[data-save]')) {
      ARENA.team = team.slice(); close();
      await sb.rpc('set_deck', { ids: ARENA.team.filter(Boolean).map(x => x.id) });
      drawCombat();
    }
  });
}

// ---------- Fiche d'un jeton (Bestiaire) : élément, passif ou abilité, niveau et bouton pour monter de niveau
function combatInfoHTML(name, owned = 0, serie = 'Takoras') {
  const el = CB.elOf(name), L = lvlOf(name, serie);
  const free = INV.groups.filter(x => x.name === name && x.serie === serie).reduce((s, x) => s + x.free.length, 0);
  const can = L < 10 && free >= L && owned - L >= 1;
  return `<div class="ar-info" style="--el:${ELS[el].col}">
    <div class="ar-info-h"><span>${ELS[el].ico} ${elName(el)}</span><b>${at('lvl')} ${L}/10</b></div>
    ${kitHTML(name)}
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
