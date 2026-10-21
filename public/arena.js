// Combat : remis à zéro, un nouveau mode est en préparation. Il reste l'équipe de 3 jetons, les éléments, les stats et les niveaux.
// Éléments et stats : combat-engine.js (CB). Voir docs/COMBAT.md.

const ELS = {
  fire: { ico: '🔥', col: '#fb923c', fr: 'Feu', en: 'Fire' },
  water: { ico: '💧', col: '#38bdf8', fr: 'Eau', en: 'Water' },
  plant: { ico: '🌿', col: '#4ade80', fr: 'Plante', en: 'Plant' },
  light: { ico: '✨', col: '#fde68a', fr: 'Lumière', en: 'Light' },
  shadow: { ico: '🌑', col: '#a78bfa', fr: 'Ténèbres', en: 'Dark' },
};
const elName = el => ELS[el][SETTINGS.lang === 'en' ? 'en' : 'fr'];
const AT = {
  fr: { title: 'Combat', sub: 'Prépare ton équipe de 3 jetons. Le combat est en train d’être refait.', newMode: '🛠️ Nouveau combat en préparation', newModeTxt: 'L’ancien mode est retiré, un combat tout neuf arrive bientôt.', team: 'Ton équipe',
    slots: ['Jeton 1', 'Jeton 2', 'Jeton 3'], lanes: ['Gauche', 'Milieu', 'Droite'], pick: 'Choisir', train: '⚔️ Entraînement contre le robot', ranked: '🏆 Classé', soon: 'Bientôt : rangs Bronze → Légende, saisons et battle pass',
    need3: 'Choisis 3 jetons pour combattre', els: 'Éléments', elsHelp: '🔥 bat 🌿 · 🌿 bat 💧 · 💧 bat 🔥 · ✨ et 🌑 forts l’un contre l’autre (×1,3 de dégâts)',
    how: 'Comment ça marche', howText: 'À chaque manche, vous choisissez chacun un jeton (on voit celui de l’autre), puis vous le posez <b>à gauche, au milieu ou à droite</b> sans voir où l’autre le met. <b>Même endroit</b> : les deux jetons se battent. <b>Endroits différents</b> : chacun frappe le joueur d’en face. Chaque capacité ne sert qu’<b>une fois</b> par combat. Un jeton joué se repose la manche suivante.', round: 'Manche {n}', step1: 'Touche un de tes jetons', step2: 'Touche ou glisse ton jeton vers un endroit', abilOn: 'Capacité activée', abilOff: 'Activer la capacité', laneHint: 'même endroit = duel', tuto1t: 'Choisis un jeton', tuto1: 'À chaque manche, touche un de tes jetons. L’adversaire choisit en même temps : vous voyez chacun le jeton de l’autre.', tuto2t: 'Pose-le en cachette', tuto2: 'Touche (ou glisse vers) <b>gauche, milieu ou droite</b>. L’autre ne voit pas où tu le mets. Tu peux allumer la capacité avant (1 fois par combat).', tuto3t: 'Duel ou coup direct', tuto3: '<b>Même endroit</b> : les deux jetons se battent. <b>Endroits différents</b> : chacun frappe le joueur d’en face. Le premier à 0 ❤️ perd !', tutoGo: 'Compris, on y va !', rest: 'Repos', stuck: 'Bloqué', foeCant: 'En face, ne peut pas jouer : {n}', foePlays: 'Il joue', revealTxt: 'Révélation !', recapClash: '⚔️ Duel ({l}) : {a} contre {b} · ton jeton inflige {x} PV, en reçoit {y}', recapMiss: '💥 Coups directs : {a} ({la}) et {b} ({lb}) · tu infliges {x} ❤️, tu perds {y} ❤️', needLogin: 'Connecte-toi pour monter ton équipe et combattre.', normal: 'Normal', stHp: 'PV', stAtk: 'Attaque', stDef: 'Défense', stCurse: 'maudit', stRust: 'rouillé (−30 % déf.)', stNoHeal: 'ne peut plus être soigné', inTeam: 'déjà dans l’équipe', version: 'Version', chooseThis: 'Prendre ce jeton', dragHint: 'Glisse ton jeton sur un endroit, ou touche un endroit puis « Poser ici ».', phaseToken: 'Choisis ton jeton pour cette manche', phaseLane: 'Tu joues <b>{a}</b>, il joue <b>{b}</b>. Où poses-tu ton jeton ?', ok: 'Valider', place: 'Poser ici', usedAb: 'déjà utilisée', tired: 'Ce jeton se repose cette manche', clash: 'Croisement !', block: 'Protégé', dazzled: 'Ébloui', recharged: 'Capacité rechargée', frozenL: 'Gelé', rounds: '{n} manches', dmgWord: 'dégâts',
    pickTitle: 'Choisis un jeton', lvl: 'Niv.', power: 'Puissance', ability: 'Capacité', passive: 'Passif', remove: 'Retirer', none: 'Tu n’as pas encore de jeton : ouvre des pulls !',
    ready: 'PRÊT', win: 'Victoire !', lose: 'Défaite…', draw: 'Égalité', again: 'Rejouer', back: 'Retour', bot: 'Robot', you: 'Toi', mvp: 'Meilleur jeton',
    quit: 'Abandonner le combat ?', eff: 'Efficace !', weak: 'Peu efficace', dodge: 'Esquive', miss: 'Raté', crit: 'CRITIQUE', revive: 'Ressuscité !', time: 'Temps écoulé',
    lvlUp: 'Monter au niveau {n}', lvlCost: 'utilise {n} doublon(s)', lvlNeed: 'Il faut {n} doublon(s) libre(s) (tu en as {h})', lvlMax: 'Niveau max', lvlOk: '{j} passe niveau {n} !', element: 'Élément' },
  en: { title: 'Battle', sub: 'Build your team of 3 tokens. Battles are being remade.', newMode: '🛠️ New battle mode in the works', newModeTxt: 'The old mode is gone, a brand-new battle is coming soon.', team: 'Your team',
    slots: ['Token 1', 'Token 2', 'Token 3'], lanes: ['Left', 'Middle', 'Right'], pick: 'Pick', train: '⚔️ Training vs the bot', ranked: '🏆 Ranked', soon: 'Soon: Bronze → Legend tiers, seasons and battle pass',
    need3: 'Pick 3 tokens to fight', els: 'Elements', elsHelp: '🔥 beats 🌿 · 🌿 beats 💧 · 💧 beats 🔥 · ✨ and 🌑 strong against each other (×1.3 damage)',
    how: 'How it works', howText: 'Each round, you both pick a token (you see each other’s), then place it <b>left, middle or right</b> without seeing where the other puts theirs. <b>Same spot</b>: the two tokens fight. <b>Different spots</b>: each hits the opposing player. Each ability can only be used <b>once</b> per battle. A token that just played rests the next round.', round: 'Round {n}', step1: 'Tap one of your tokens', step2: 'Tap or drag your token to a spot', abilOn: 'Ability on', abilOff: 'Turn on ability', laneHint: 'same spot = duel', tuto1t: 'Pick a token', tuto1: 'Each round, tap one of your tokens. The opponent picks at the same time: you each see the other’s token.', tuto2t: 'Place it secretly', tuto2: 'Tap (or drag to) <b>left, middle or right</b>. The other can’t see where you put it. You can turn on the ability first (once per battle).', tuto3t: 'Duel or direct hit', tuto3: '<b>Same spot</b>: the two tokens fight. <b>Different spots</b>: each hits the opposing player. First to 0 ❤️ loses!', tutoGo: 'Got it, let’s go!', rest: 'Resting', stuck: 'Stuck', foeCant: 'Opponent can’t play: {n}', foePlays: 'They play', revealTxt: 'Reveal!', recapClash: '⚔️ Duel ({l}): {a} vs {b} · your token deals {x} HP, takes {y}', recapMiss: '💥 Direct hits: {a} ({la}) and {b} ({lb}) · you deal {x} ❤️, you lose {y} ❤️', needLogin: 'Log in to build your team and fight.', normal: 'Normal', stHp: 'HP', stAtk: 'Attack', stDef: 'Defense', stCurse: 'cursed', stRust: 'rusted (−30% def.)', stNoHeal: 'can no longer be healed', inTeam: 'already in the team', version: 'Version', chooseThis: 'Take this token', dragHint: 'Drag your token onto a spot, or tap a spot then “Place here”.', phaseToken: 'Pick your token for this round', phaseLane: 'You play <b>{a}</b>, they play <b>{b}</b>. Where do you place your token?', ok: 'Confirm', place: 'Place here', usedAb: 'already used', tired: 'This token is resting this round', clash: 'Clash!', block: 'Protected', dazzled: 'Dazzled', recharged: 'Ability recharged', frozenL: 'Frozen', rounds: '{n} rounds', dmgWord: 'damage',
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
  const j = jetonOf(u.name, u.serie), el = CB.elOf(u.name), s = CB.stats(u.name, u.odds, lvlOf(u.name, u.serie), u.variant);
  return `<button class="ar-slot" data-slot="${i}" style="--g:${hexRGB(j.glow)};--el:${ELS[el].col}">
    <span class="ar-pos">${slotName(i)}</span><span class="ar-el" title="${elName(el)}">${ELS[el].ico}</span>
    <img class="${vCls(u.variant)}" src="${texOf(j)}" alt="">
    <b>${jnH(u.name)}${vTag(u.variant)}</b>
    <small>${at('lvl')} ${lvlOf(u.name, u.serie)} · ⚡${fmt(CB.power(s))}</small>
  </button>`;
}
function drawCombat() {
  const page = $('page-combat');
  page.innerHTML = `<div class="ar-page">
    <div class="page-head"><div><div class="eyebrow">${at('title')}</div><h2 class="page-title">${at('team')}</h2><p class="muted">${at('sub')}</p></div></div>
    <div class="ar-team">${ARENA.team.map(teamCard).join('')}</div>
    <div class="ar-go">
      <div class="ar-ranked"><b>${at('newMode')}</b><small>${at('newModeTxt')}</small></div>
    </div>
    <div class="ar-help">
      <div><h4>${at('els')}</h4><p class="muted">${at('elsHelp')}</p></div>
    </div>
  </div>`;
  page.querySelector('.ar-team').onclick = e => { const b = e.target.closest('[data-slot]'); if (b) pickSlot(+b.dataset.slot); };
}

// ---------- Fiche complète d'un jeton (équipe, choix) : stats, élément, niveau
const SHEET_MAX = { hp: 330, atk: 140, def: 55 };
function tokenSheetHTML(o) {
  const j = jetonOf(o.name, o.serie), el = CB.elOf(o.name), lvl = o.lvl || lvlOf(o.name, o.serie), s = CB.stats(o.name, j.odds, lvl, o.variant || ''), u = o.unit;
  const hp = u ? u.hp : Math.round(s.hp / 10), hpMax = u ? u.max : Math.round(s.hp / 10), atk = Math.round(u ? u.atk : s.atk), def = Math.round(u ? u.def : s.def);
  const bar = (label, v, max, txt) => `<div class="tk-bar"><span>${label}</span><div><i style="width:${Math.min(100, v / max * 100)}%"></i></div><b>${txt}</b></div>`;
  const status = u && !u.alive ? ['☠️ K.O.'] : [];
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

// ---------- Fiche d'un jeton (Bestiaire) : élément, niveau et bouton pour monter de niveau
function combatInfoHTML(name, owned = 0, serie = 'Takoras') {
  const el = CB.elOf(name), L = lvlOf(name, serie);
  const free = INV.groups.filter(x => x.name === name && x.serie === serie).reduce((s, x) => s + x.free.length, 0);
  const can = L < 10 && free >= L && owned - L >= 1;
  return `<div class="ar-info" style="--el:${ELS[el].col}">
    <div class="ar-info-h"><span>${ELS[el].ico} ${elName(el)}</span><b>${at('lvl')} ${L}/10</b></div>
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
