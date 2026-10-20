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
    'Mobu': ['Bulle', 'Bouclier sur l’allié le plus blessé.', 'Collant', 'Ses attaques ralentissent la cible.'],
    'Pikko': ['Épines', '3 piqûres sur des ennemis au hasard.', 'Pollen', 'Soigne un peu l’équipe toutes les 5 s.'],
    'Rouillé': ['Rouille', 'Frappe et baisse la défense de la cible.', 'Ferraille', 'En tombant K.O., blesse tous les ennemis.'],
    'Givre': ['Gel', 'Frappe et gèle la cible 2 s.', 'Froid', '+25 % de dégâts sur les cibles ralenties ou gelées.'],
    'Soléo': ['Soleil', 'Soigne toute l’équipe.', 'Aube', 'Commence avec la moitié de son énergie.'],
    'Azura': ['Raz-de-marée', 'Frappe tous les ennemis.', 'Courant', 'Chaque capacité alliée lui donne de l’énergie.'],
    'Carmin': ['Saignée', 'Grosse attaque qui le soigne de la moitié des dégâts.', 'Rage', 'Plus il est blessé, plus il tape fort.'],
    'Vyolis': ['Barrière', 'Bouclier sur toute l’équipe.', 'Écho', '20 % de chance de frapper deux fois.'],
    'Lumis': ['Éblouir', 'Frappe ; la cible rate ses 2 prochaines attaques.', 'Éclat', 'Ses coups critiques font +50 %.'],
    'Nyx': ['Ombre', 'Esquive tout 3 s, sa prochaine attaque ×2.', 'Nuit', '+20 % de vitesse.'],
    'Astra': ['Étoile filante', 'Frappe l’ennemi le plus faible, critique garanti.', 'Constellation', 'Chaque critique de l’équipe lui donne de l’énergie.'],
    'Kraïos': ['Tempête', 'Frappe et ralentit tous les ennemis.', 'Fureur', '+5 % d’attaque à chaque attaque (10 fois max).'],
    'Koi': ['Courant', 'Frappe et remplit l’énergie des alliés de 50 %.', 'Chance', '10 % d’esquive.'],
    'Néphéris': ['Malédiction', 'La cible perd des PV pendant 6 s.', 'Racines', 'Renvoie 20 % des dégâts reçus.'],
    'Zénith': ['Aube', 'Ressuscite un allié K.O. (une fois), sinon soigne.', 'Halo', 'L’équipe subit −10 % de dégâts.'],
    'Oblivion': ['Néant', 'Dégâts énormes qui ignorent bouclier et défense.', 'Vide', 'Les ennemis touchés sont moins soignés.'],
    'Takoras': ['Jugement', 'Frappe tous les ennemis + bouclier à toute l’équipe.', 'Couronne', '+15 % à toutes les stats de l’équipe.'],
  },
  en: {
    'Mobu': ['Bubble', 'Shields the most hurt ally.', 'Sticky', 'Its attacks slow the target.'],
    'Pikko': ['Thorns', '3 stings on random enemies.', 'Pollen', 'Heals the team a little every 5 s.'],
    'Rouillé': ['Rust', 'Hits and lowers the target’s defense.', 'Scrap', 'When knocked out, hurts every enemy.'],
    'Givre': ['Freeze', 'Hits and freezes the target for 2 s.', 'Cold', '+25% damage on slowed or frozen targets.'],
    'Soléo': ['Sunlight', 'Heals the whole team.', 'Dawn', 'Starts with half its energy.'],
    'Azura': ['Tidal wave', 'Hits every enemy.', 'Current', 'Every ally ability gives it energy.'],
    'Carmin': ['Bloodletting', 'Big hit that heals it for half the damage.', 'Rage', 'The more hurt it is, the harder it hits.'],
    'Vyolis': ['Barrier', 'Shields the whole team.', 'Echo', '20% chance to strike twice.'],
    'Lumis': ['Dazzle', 'Hits; the target misses its next 2 attacks.', 'Gleam', 'Its critical hits deal +50%.'],
    'Nyx': ['Shadow', 'Dodges everything for 3 s, next attack ×2.', 'Night', '+20% speed.'],
    'Astra': ['Shooting star', 'Hits the weakest enemy, guaranteed crit.', 'Constellation', 'Every team crit gives it energy.'],
    'Kraïos': ['Storm', 'Hits and slows every enemy.', 'Fury', '+5% attack on every attack (10 times max).'],
    'Koi': ['Current', 'Hits and fills allies’ energy by 50%.', 'Luck', '10% dodge.'],
    'Néphéris': ['Curse', 'The target loses HP for 6 s.', 'Roots', 'Reflects 20% of damage taken.'],
    'Zénith': ['Dawn', 'Revives a knocked-out ally (once), otherwise heals.', 'Halo', 'The team takes −10% damage.'],
    'Oblivion': ['Void', 'Huge damage ignoring shield and defense.', 'Emptiness', 'Enemies hit get less healing.'],
    'Takoras': ['Judgment', 'Hits every enemy + shields the whole team.', 'Crown', '+15% to all team stats.'],
  },
};
const skillsOf = name => (SKILLS[SETTINGS.lang] || SKILLS.fr)[name] || SKILLS.fr.Mobu;
const AT = {
  fr: { title: 'Combat', sub: 'Monte ton équipe de 3 jetons et affronte le robot. Le classé avec les rangs arrive bientôt.', team: 'Ton équipe',
    slots: ['Devant', 'Milieu', 'Derrière'], pick: 'Choisir', train: '⚔️ Entraînement contre le robot', ranked: '🏆 Classé', soon: 'Bientôt : rangs Bronze → Légende, saisons et battle pass',
    need3: 'Choisis 3 jetons pour combattre', els: 'Éléments', elsHelp: '🔥 bat 🌿 · 🌿 bat 💧 · 💧 bat 🔥 · ✨ et 🌑 forts l’un contre l’autre (×1,3 de dégâts)',
    how: 'Comment ça marche', howText: 'Tes jetons attaquent tout seuls. Quand la jauge d’énergie d’un jeton est pleine, <b>touche-le</b> pour lancer sa capacité. Le jeton de devant prend les coups en premier.',
    pickTitle: 'Choisis un jeton', lvl: 'Niv.', power: 'Puissance', ability: 'Capacité', passive: 'Passif', remove: 'Retirer', none: 'Tu n’as pas encore de jeton : ouvre des pulls !',
    ready: 'PRÊT', win: 'Victoire !', lose: 'Défaite…', draw: 'Égalité', again: 'Rejouer', back: 'Retour', bot: 'Robot', you: 'Toi', mvp: 'Meilleur jeton',
    quit: 'Abandonner le combat ?', eff: 'Efficace !', weak: 'Peu efficace', dodge: 'Esquive', miss: 'Raté', crit: 'CRITIQUE', revive: 'Ressuscité !', time: 'Temps écoulé',
    lvlUp: 'Monter au niveau {n}', lvlCost: 'utilise {n} doublon(s)', lvlNeed: 'Il faut {n} doublon(s) libre(s) (tu en as {h})', lvlMax: 'Niveau max', lvlOk: '{j} passe niveau {n} !', element: 'Élément' },
  en: { title: 'Battle', sub: 'Build your team of 3 tokens and fight the bot. Ranked with tiers is coming soon.', team: 'Your team',
    slots: ['Front', 'Middle', 'Back'], pick: 'Pick', train: '⚔️ Training vs the bot', ranked: '🏆 Ranked', soon: 'Soon: Bronze → Legend tiers, seasons and battle pass',
    need3: 'Pick 3 tokens to fight', els: 'Elements', elsHelp: '🔥 beats 🌿 · 🌿 beats 💧 · 💧 beats 🔥 · ✨ and 🌑 strong against each other (×1.3 damage)',
    how: 'How it works', howText: 'Your tokens attack on their own. When a token’s energy bar is full, <b>tap it</b> to cast its ability. The front token takes hits first.',
    pickTitle: 'Pick a token', lvl: 'Lv.', power: 'Power', ability: 'Ability', passive: 'Passive', remove: 'Remove', none: 'You have no tokens yet: open some pulls!',
    ready: 'READY', win: 'Victory!', lose: 'Defeat…', draw: 'Draw', again: 'Play again', back: 'Back', bot: 'Bot', you: 'You', mvp: 'Best token',
    quit: 'Forfeit the battle?', eff: 'Effective!', weak: 'Not effective', dodge: 'Dodge', miss: 'Miss', crit: 'CRIT', revive: 'Revived!', time: 'Time’s up',
    lvlUp: 'Level up to {n}', lvlCost: 'uses {n} duplicate(s)', lvlNeed: 'Needs {n} free duplicate(s) (you have {h})', lvlMax: 'Max level', lvlOk: '{j} is now level {n}!', element: 'Element' },
};
const slotName = i => ((AT[SETTINGS.lang] || AT.fr).slots)[i];
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
function pickSlot(slot) {
  sfx.click();
  const used = new Set(ARENA.team.filter((u, i) => u && i !== slot).map(u => u.name));
  const best = {};
  INV.groups.forEach(x => {
    const cur = best[x.name];
    if (!cur || VRANK[x.variant] > VRANK[cur.variant]) best[x.name] = { id: x.ids[0], name: x.name, odds: x.odds, variant: x.variant };
  });
  const list = Object.values(best).sort((a, b) => CB.power(CB.stats(b.name, b.odds, lvlOf(b.name), b.variant)) - CB.power(CB.stats(a.name, a.odds, lvlOf(a.name), a.variant)));
  const card = $('jm-card');
  jm.style.setProperty('--g', '139, 92, 246');
  card.onclick = card.oninput = card.onchange = null;
  card.innerHTML = `<button class="set-close jm-close" aria-label="${t('close')}">✕</button>
    <div class="pk-wrap ar-pick"><h2>${at('pickTitle')} · ${slotName(slot)}</h2>
      ${ARENA.team[slot] ? `<button class="btn ghost sm" data-rm>✕ ${at('remove')}</button>` : ''}
      <div class="ar-plist">${list.map(u => {
        const j = jetonOf(u.name), el = CB.elOf(u.name), s = CB.stats(u.name, u.odds, lvlOf(u.name), u.variant), [an, ad, pn, pd] = skillsOf(u.name), off = used.has(u.name);
        return `<button class="ar-pi${off ? ' off' : ''}" data-id="${u.id}" ${off ? 'disabled' : ''} style="--g:${hexRGB(j.glow)};--el:${ELS[el].col}">
          <img class="${vCls(u.variant)}" src="${texOf(j)}" alt="">
          <div><b>${jnH(u.name)}${vTag(u.variant)} <span class="ar-elc">${ELS[el].ico} ${elName(el)}</span></b>
            <small>${at('lvl')} ${lvlOf(u.name)} · ⚡${fmt(CB.power(s))} · ❤️${fmt(s.hp)} · ⚔️${s.atk}</small>
            <small><b>✦ ${esc(an)}</b> — ${esc(ad)}</small><small><b>◈ ${esc(pn)}</b> — ${esc(pd)}</small></div>
        </button>`;
      }).join('') || `<p class="muted">${at('none')}</p>`}</div></div>`;
  jm.classList.add('on');
  card.onclick = async e => {
    if (e.target.closest('[data-rm]')) ARENA.team[slot] = null;
    else {
      const b = e.target.closest('.ar-pi'); if (!b) return;
      ARENA.team[slot] = list.find(u => String(u.id) === b.dataset.id);
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
// Écran de combat
// =====================================================================
const FIGHT = { st: null, loop: 0, speed: 1, inputs: [], acc: 0, last: 0, dmg: [{}, {}], names: ['', ''] };
function startTraining() {
  if (!ARENA.team.every(Boolean)) return;
  const seed = (Math.random() * 2 ** 31) >>> 0;
  let s = seed; const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const mine = ARENA.team.map(u => ({ name: u.name, odds: u.odds, lvl: lvlOf(u.name), variant: u.variant }));
  startFight([mine, botTeam(mine, rnd)], seed, [ACC.pseudo || at('you'), at('bot')]);
}
function startFight(teams, seed, names) {
  FIGHT.st = CB.create(teams, seed); FIGHT.inputs = []; FIGHT.acc = 0; FIGHT.dmg = [{}, {}]; FIGHT.names = names;
  let o = $('arena'); if (!o) { o = document.createElement('div'); o.id = 'arena'; o.className = 'arena'; document.body.appendChild(o); }
  o.innerHTML = `
    <div class="ar-top"><button class="ar-x" aria-label="${t('close')}">✕</button><b class="ar-time" id="ar-time">0:00</b><button class="ar-speed" id="ar-speed">×${FIGHT.speed}</button></div>
    <div class="ar-name foe">${esc(names[1])}</div>
    <div class="ar-row foe" id="ar-row1">${FIGHT.st.teams[1].map(u => unitHTML(u)).join('')}</div>
    <div class="ar-mid" id="ar-mid"></div>
    <div class="ar-row me" id="ar-row0">${FIGHT.st.teams[0].map(u => unitHTML(u)).join('')}</div>
    <div class="ar-name me">${esc(names[0])}</div>
    <p class="ar-tip">${at('howText')}</p>`;
  o.hidden = false;
  document.documentElement.classList.add('lock');
  requestAnimationFrame(() => o.classList.add('on'));
  o.querySelector('#ar-row0').onclick = e => {
    const c = e.target.closest('.ar-u'); if (!c) return;
    const u = FIGHT.st.teams[0][+c.dataset.i];
    if (CB.canCast(u) && !FIGHT.inputs.some(x => x.i === u.i)) { FIGHT.inputs.push({ side: 0, i: u.i }); sfx.click(); }
  };
  o.querySelector('#ar-speed').onclick = () => { FIGHT.speed = FIGHT.speed === 1 ? 2 : 1; $('ar-speed').textContent = '×' + FIGHT.speed; sfx.click(); };
  o.querySelector('.ar-x').onclick = async () => { if (FIGHT.st.over || await ask(at('quit'))) closeFight(); };
  updateUnits();
  FIGHT.last = performance.now();
  cancelAnimationFrame(FIGHT.loop);
  FIGHT.loop = requestAnimationFrame(frame);
}
function closeFight() {
  cancelAnimationFrame(FIGHT.loop);
  const o = $('arena'); if (!o) return;
  o.classList.remove('on'); document.documentElement.classList.remove('lock');
  setTimeout(() => { o.hidden = true; o.innerHTML = ''; }, 250);
}
function unitHTML(u) {
  const j = jetonOf(u.name), el = ELS[u.el], [an] = skillsOf(u.name);
  return `<div class="ar-u" data-i="${u.i}" style="--g:${hexRGB(j.glow)};--el:${el.col}">
    <span class="ar-uel">${el.ico}</span><span class="ar-ulv">${at('lvl')}${u.lvl}</span>
    <div class="ar-uimg"><img class="${vCls(u.variant)}" src="${texOf(j)}" alt=""></div>
    <b class="ar-un">${jnH(u.name)}</b>
    <div class="ar-hp"><i></i><s></s><em></em></div>
    <div class="ar-en"><i></i></div>
    <small class="ar-ab">${u.side === 0 ? '✦ ' + esc(an) : ''}</small>
    <div class="ar-st"></div>
  </div>`;
}
const unitEl = r => $('ar-row' + r.side)?.children[r.i];
function updateUnits() {
  for (const team of FIGHT.st.teams) for (const u of team) {
    const c = unitEl(u); if (!c) continue;
    c.querySelector('.ar-hp i').style.width = (u.hp / u.max * 100) + '%';
    c.querySelector('.ar-hp s').style.width = Math.min(100, u.shield / u.max * 100) + '%';
    c.querySelector('.ar-hp em').textContent = fmt(u.hp);
    c.querySelector('.ar-en i').style.width = u.energy + '%';
    c.classList.toggle('ready', u.side === 0 && CB.canCast(u));
    c.classList.toggle('ko', !u.alive);
    c.classList.toggle('frozen', u.st.freeze > 0);
    const icons = [u.st.freeze > 0 && '❄️', u.st.slow > 0 && '🐌', u.st.blind > 0 && '😵', u.st.evade > 0 && '🌫️', u.st.curse > 0 && '💀', u.st.rust > 0 && '🧲', u.st.wither > 0 && '🥀', u.st.fury > 0 && '💢'].filter(Boolean);
    c.querySelector('.ar-st').textContent = icons.join('');
  }
  const s = Math.floor(FIGHT.st.tick / 10);
  $('ar-time').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
function frame(now) {
  if (!FIGHT.st) return;
  FIGHT.acc += Math.min(250, now - FIGHT.last) * FIGHT.speed; FIGHT.last = now;
  while (FIGHT.acc >= CB.TICK && !FIGHT.st.over) {
    FIGHT.acc -= CB.TICK;
    const inputs = [...FIGHT.inputs, ...CB.ai(FIGHT.st, 1)]; FIGHT.inputs = [];
    CB.step(FIGHT.st, inputs).forEach(play);
  }
  updateUnits();
  if (FIGHT.st.over) return setTimeout(showResult, 900);
  FIGHT.loop = requestAnimationFrame(frame);
}

// ---------- Effets visuels de chaque événement
function anim(el, kf, o) { if (el && !reducedFx()) el.animate(kf, o); }
function floater(r, text, cls) {
  const c = unitEl(r); if (!c) return;
  const f = document.createElement('i'); f.className = 'ar-f ' + cls; f.textContent = text;
  f.style.left = (35 + Math.random() * 30) + '%';
  c.appendChild(f);
  setTimeout(() => f.remove(), 900);
}
function projectile(a, b, col) {
  if (reducedFx()) return;
  const A = unitEl(a)?.querySelector('.ar-uimg').getBoundingClientRect(), B = unitEl(b)?.querySelector('.ar-uimg').getBoundingClientRect(); if (!A || !B) return;
  const p = document.createElement('i'); p.className = 'ar-proj'; p.style.background = col; p.style.boxShadow = `0 0 12px ${col}`;
  document.body.appendChild(p);
  const x0 = A.left + A.width / 2, y0 = A.top + A.height / 2, x1 = B.left + B.width / 2, y1 = B.top + B.height / 2;
  p.animate([{ transform: `translate(${x0}px, ${y0}px) scale(1)` }, { transform: `translate(${x1}px, ${y1}px) scale(.6)` }], { duration: 220 / FIGHT.speed, easing: 'ease-in' }).finished.then(() => p.remove());
}
function sparks(r, col, n = 8) {
  if (reducedFx()) return;
  const c = unitEl(r)?.querySelector('.ar-uimg'); if (!c) return;
  const R = c.getBoundingClientRect();
  for (let k = 0; k < n; k++) {
    const s = document.createElement('i'); s.className = 'ar-spark'; s.style.background = col;
    document.body.appendChild(s);
    const a = Math.random() * Math.PI * 2, d = 20 + Math.random() * 40, x = R.left + R.width / 2, y = R.top + R.height / 2;
    s.animate([{ transform: `translate(${x}px, ${y}px)`, opacity: 1 }, { transform: `translate(${x + Math.cos(a) * d}px, ${y + Math.sin(a) * d}px)`, opacity: 0 }], { duration: 420, easing: 'cubic-bezier(.2, .8, .3, 1)' }).finished.then(() => s.remove());
  }
}
const unitOf = r => FIGHT.st.teams[r.side][r.i];
function play(e) {
  const fast = FIGHT.speed > 1;
  if (e.t === 'atk') {
    const c = unitEl(e.from), dir = e.from.side === 0 ? -1 : 1;
    anim(c, [{ transform: 'none' }, { transform: `translateY(${dir * 14}px) scale(1.04)` }, { transform: 'none' }], { duration: fast ? 160 : 260, easing: 'ease-out' });
    projectile(e.from, e.to, ELS[unitOf(e.from).el].col);
    if (!fast) sfx.tick?.(40);
  }
  if (e.t === 'hit') {
    const c = unitEl(e.to), col = ELS[unitOf(e.from).el].col;
    FIGHT.dmg[e.from.side][e.from.i] = (FIGHT.dmg[e.from.side][e.from.i] || 0) + e.d + e.sh;
    floater(e.to, (e.crit ? '💥 ' : '') + '−' + fmt(e.d + e.sh), e.crit ? 'crit' : e.reflect ? 'reflect' : 'dmg');
    if (e.em > 1) floater(e.to, at('eff'), 'eff');
    else if (e.em < 1) floater(e.to, at('weak'), 'weakf');
    anim(c?.querySelector('.ar-uimg'), [{ filter: 'brightness(2.4)', transform: 'translateX(-4px)' }, { filter: 'none', transform: 'translateX(3px)' }, { transform: 'none' }], { duration: 200 });
    sparks(e.to, col, e.crit ? 14 : e.ability ? 10 : 5);
    if (e.crit && !fast) sfx.thump?.();
  }
  if (e.t === 'dot') floater(e.u, '−' + fmt(e.d), 'dot');
  if (e.t === 'miss') floater(e.to, at('miss'), 'info');
  if (e.t === 'dodge') { floater(e.to, at('dodge'), 'info'); anim(unitEl(e.to), [{ transform: 'none' }, { transform: 'translateX(16px)' }, { transform: 'none' }], { duration: 260 }); }
  if (e.t === 'heal') { floater(e.u, '+' + fmt(e.n), 'heal'); sparks(e.u, '#4ade80', 6); }
  if (e.t === 'shield') { floater(e.u, '🛡 +' + fmt(e.n), 'shield'); sparks(e.u, '#7dd3fc', 6); }
  if (e.t === 'revive') { floater(e.u, at('revive'), 'heal'); sparks(e.u, '#fde68a', 16); sfx.upgrade?.(); }
  if (e.t === 'ko') { anim(unitEl(e.u), [{ transform: 'none', opacity: 1 }, { transform: 'translateY(10px) rotate(-6deg)', opacity: .45 }], { duration: 450, fill: 'none' }); sfx.deny?.(); }
  if (e.t === 'abil') {
    const u = unitOf(e.u), c = unitEl(e.u), [an] = skillsOf(u.name);
    const call = document.createElement('div'); call.className = 'ar-call'; call.style.setProperty('--el', ELS[u.el].col);
    call.innerHTML = `<img src="${texOf(jetonOf(u.name))}" alt=""><b>${esc(an)}</b>`;
    $('ar-mid')?.replaceChildren(call);
    setTimeout(() => call.remove(), 1100);
    anim(c, [{ transform: 'scale(1)' }, { transform: 'scale(1.12)' }, { transform: 'scale(1)' }], { duration: 380, easing: 'cubic-bezier(.2, 1.4, .4, 1)' });
    sparks(e.u, ELS[u.el].col, 16);
    sfx.reveal?.(e.u.side === 0 ? 600 : 200);
  }
}

function showResult() {
  const st = FIGHT.st, o = $('arena'); if (!o || !st) return;
  const w = st.winner, mine = w === 0, mvpI = Object.entries(FIGHT.dmg[0]).sort((a, b) => b[1] - a[1])[0]?.[0];
  const mvp = mvpI != null ? st.teams[0][mvpI] : null;
  const box = document.createElement('div'); box.className = 'ar-end ' + (w === -1 ? 'draw' : mine ? 'win' : 'lose');
  box.innerHTML = `<div class="ar-endc">
    <h2>${w === -1 ? at('draw') : mine ? at('win') : at('lose')}</h2>
    ${st.tick >= CB.MAX_TICKS ? `<small class="muted">${at('time')}</small>` : ''}
    ${mvp ? `<div class="ar-mvp"><img src="${texOf(jetonOf(mvp.name))}" alt=""><div><small class="muted">${at('mvp')}</small><b>${jnH(mvp.name)}</b><small>${fmt(FIGHT.dmg[0][mvpI])} ${SETTINGS.lang === 'en' ? 'damage' : 'dégâts'}</small></div></div>` : ''}
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
