// Écran du combat 1v1 en temps réel : affichage, contrôles (tap / clic / touches 1-2-3), effets, IA d'entraînement et tuto.
// Règles : fight-engine.js (FE). Valeurs : fight-config.js (FCFG).

// ---------- Textes (FR + EN)
const FT = {
  fr: {
    kits: {
      bubble: ['Bulle', 'Toutes les {every} s, donne un bouclier ({shield%} des PV) à l’allié le plus blessé.'],
      sting: ['Piqûre', 'Gros coup sur la cible + Poison.'],
      sparks: ['Étincelles', 'Une attaque sur {every} pose Brûlure.'],
      blizzard: ['Blizzard', 'Touche tous les ennemis + Gel.'],
      eruption: ['Éruption', 'Très gros coup sur la cible + Brûlure.'],
      tide: ['Marée', 'Toutes les {every} s, soigne l’allié le plus blessé ({heal%} des PV).'],
      bloodrage: ['Rage de sang', 'Sous {below%} de PV, passe en Rage jusqu’à la fin.'],
      venom: ['Venin', 'Poison sur tous les ennemis.'],
      bloom: ['Floraison', 'Soigne toute l’équipe ({heal%} des PV) et retire ses malus.'],
      execute: ['Exécution', '+{mult-%} de dégâts sur les ennemis sous {below%} de PV.'],
      starfall: ['Pluie d’étoiles', 'Touche tous les ennemis + Choc.'],
      abyss: ['Abysses', 'Une attaque sur {every} touche aussi les autres ennemis.'],
      leap: ['Saut du dragon', 'Toute l’équipe passe en Rage {dur} s.'],
      thorns: ['Épines', 'Quand on la frappe : {chance%} de chance d’empoisonner l’attaquant.'],
      surge: ['Surtension', 'Gros coup + Choc, et recharge les abilités alliées de {refund} s.'],
      void: ['Néant', 'Achève la cible sous {below%} de PV, sinon énorme coup.'],
      phoenix: ['Phénix', 'Renaît une fois avec {revive%} des PV.'],
      none: ['—', 'Pas encore de pouvoir.'],
    },
    st: { burn: 'Brûlure', poison: 'Poison', freeze: 'Gel', shock: 'Choc', rage: 'Rage', stun: 'Étourdi', vuln: 'Corrodé', shield: 'Bouclier' },
    stD: { burn: 'perd des PV chaque seconde', poison: 'perd des PV, soins divisés par 2', freeze: 'attaque plus lentement', shock: 'subit plus de dégâts', rage: 'attaque plus fort et plus vite' },
    re: { paralysis: 'Paralysie', steam: 'Vapeur', overload: 'Surcharge', corrosion: 'Corrosion', contagion: 'Contagion', frostbite: 'Engelure' },
    reD: { paralysis: 'Gel + Choc : étourdi', steam: 'Brûlure + Gel : gros dégâts', overload: 'Brûlure + Choc : explosion sur tous', corrosion: 'Poison + Choc : subit beaucoup plus de dégâts', contagion: 'Poison + Brûlure : le poison se propage', frostbite: 'Poison + Gel : dégâts et figé' },
    passive: 'Passif', ready: 'Prêt !', stunned: 'Étourdi', ko: 'K.O.', revive: 'Renaissance !', crit: 'CRIT', fight: 'COMBAT !', time: 'Temps écoulé',
    win: 'Victoire !', lose: 'Défaite…', draw: 'Égalité', again: 'Rejouer', back: 'Retour', mvp: 'Meilleur jeton', quit: 'Abandonner le combat ?', bot: 'Robot', you: 'Toi',
    dur: 'Durée {s} s', dealt: '{n} dégâts', fam: 'Famille {e} ×{n}', famB: { atk: '+{v} attaque', hp: '+{v} PV', regen: '+{v} PV/s', cdr: 'abilités −{v} de recharge', crit: '{v} de critique' },
    t1: 'Tes jetons attaquent tout seuls.', t2: 'Quand un bouton brille, tape-le pour lancer l’abilité !', t3: 'Tape un ennemi pour que toute ton équipe le vise.',
    t4: 'Certains effets se combinent : tape Givre (Gel) puis Astra (Choc) !', t4b: 'Maintenant Astra !', t5: 'Bien joué, tu es prêt pour le classé !', tOk: 'OK', tSkip: 'Passer', tEnd: 'Terminer', keys: 'Touches 1 · 2 · 3',
  },
  en: {
    kits: {
      bubble: ['Bubble', 'Every {every} s, shields the most hurt ally ({shield%} of HP).'],
      sting: ['Sting', 'Big hit on the target + Poison.'],
      sparks: ['Sparks', 'One attack in {every} applies Burn.'],
      blizzard: ['Blizzard', 'Hits all enemies + Freeze.'],
      eruption: ['Eruption', 'Huge hit on the target + Burn.'],
      tide: ['Tide', 'Every {every} s, heals the most hurt ally ({heal%} of HP).'],
      bloodrage: ['Blood rage', 'Below {below%} HP, enters Rage until the end.'],
      venom: ['Venom', 'Poison on all enemies.'],
      bloom: ['Bloom', 'Heals the whole team ({heal%} of HP) and removes debuffs.'],
      execute: ['Execute', '+{mult-%} damage on enemies below {below%} HP.'],
      starfall: ['Starfall', 'Hits all enemies + Shock.'],
      abyss: ['Abyss', 'One attack in {every} also hits the other enemies.'],
      leap: ['Dragon leap', 'The whole team enters Rage for {dur} s.'],
      thorns: ['Thorns', 'When hit: {chance%} chance to poison the attacker.'],
      surge: ['Surge', 'Big hit + Shock, and recharges allied abilities by {refund} s.'],
      void: ['Void', 'Finishes the target below {below%} HP, otherwise a huge hit.'],
      phoenix: ['Phoenix', 'Comes back once with {revive%} HP.'],
      none: ['—', 'No power yet.'],
    },
    st: { burn: 'Burn', poison: 'Poison', freeze: 'Freeze', shock: 'Shock', rage: 'Rage', stun: 'Stunned', vuln: 'Corroded', shield: 'Shield' },
    stD: { burn: 'loses HP every second', poison: 'loses HP, heals halved', freeze: 'attacks slower', shock: 'takes more damage', rage: 'hits harder and faster' },
    re: { paralysis: 'Paralysis', steam: 'Steam', overload: 'Overload', corrosion: 'Corrosion', contagion: 'Contagion', frostbite: 'Frostbite' },
    reD: { paralysis: 'Freeze + Shock: stunned', steam: 'Burn + Freeze: big damage', overload: 'Burn + Shock: explosion on all', corrosion: 'Poison + Shock: takes much more damage', contagion: 'Poison + Burn: poison spreads', frostbite: 'Poison + Freeze: damage and frozen' },
    passive: 'Passive', ready: 'Ready!', stunned: 'Stunned', ko: 'K.O.', revive: 'Reborn!', crit: 'CRIT', fight: 'FIGHT!', time: 'Time’s up',
    win: 'Victory!', lose: 'Defeat…', draw: 'Draw', again: 'Play again', back: 'Back', mvp: 'Best token', quit: 'Forfeit the battle?', bot: 'Bot', you: 'You',
    dur: '{s} s long', dealt: '{n} damage', fam: '{e} family ×{n}', famB: { atk: '+{v} attack', hp: '+{v} HP', regen: '+{v} HP/s', cdr: 'abilities −{v} cooldown', crit: '{v} crit chance' },
    t1: 'Your tokens attack on their own.', t2: 'When a button glows, tap it to cast the ability!', t3: 'Tap an enemy so your whole team targets it.',
    t4: 'Some effects combine: tap Givre (Freeze) then Astra (Shock)!', t4b: 'Now Astra!', t5: 'Well done, you’re ready for ranked!', tOk: 'OK', tSkip: 'Skip', tEnd: 'Finish', keys: 'Keys 1 · 2 · 3',
  },
};
const ftL = () => FT[SETTINGS.lang] || FT.fr;
const ft = (k, v = {}) => String(ftL()[k] ?? FT.fr[k]).replace(/\{(\w+)\}/g, (_, x) => v[x] ?? '');
const ST_ICO = { burn: '🔥', poison: '🧪', freeze: '❄️', shock: '⚡', rage: '💢', stun: '💫', vuln: '🎯', shield: '🛡️' };
const RE_COL = { paralysis: '#93c5fd', steam: '#f1f5f9', overload: '#facc15', corrosion: '#a3e635', contagion: '#4ade80', frostbite: '#67e8f9' };
const RE_ICO = { paralysis: '❄️⚡', steam: '🔥❄️', overload: '🔥⚡', corrosion: '🧪⚡', contagion: '🧪🔥', frostbite: '🧪❄️' };
// Nom + description d'un kit, avec les vrais chiffres de la config
function kitText(name) {
  const k = FE.kit(name), [n, d] = ftL().kits[k.id] || ftL().kits.none;
  const pct = x => Math.round(x * 100) + ' %';
  return { kind: k.kind, cd: k.cd, name: n, desc: d.replace(/\{(\w+)(%|-%)?\}/g, (_, key, m) => m === '%' ? pct(k.p[key]) : m === '-%' ? pct(k.p[key] - 1) : k.p[key]) };
}
// Statuts que l'équipe sait poser (pour montrer les combos possibles)
const KIT_STATUS = { sting: ['poison'], blizzard: ['freeze'], eruption: ['burn'], venom: ['poison'], starfall: ['shock'], surge: ['shock'], sparks: ['burn'], thorns: ['poison'] };
function teamSynergy(team) {
  const fam = FE.families(team.map(u => ({ name: u.name })));
  const has = new Set(team.flatMap(u => KIT_STATUS[FE.kit(u.name).id] || []));
  const combos = Object.entries(FCFG.REACTIONS).filter(([, r]) => has.has(r.a) && has.has(r.b)).map(([k]) => k);
  return { fam, combos };
}
function famLines(fam) {
  return fam.list.map(([e, n]) => {
    const f = FCFG.FAMILY[e], v = f.v[Math.min(n, 3) - 2];
    const val = f.stat === 'regen' ? (v * 100).toFixed(1).replace('.0', '') + ' %' : Math.round(v * 100) + ' %';
    return `${ELS[e].ico} ${ft('fam', { e: elName(e), n })} : ${String(ftL().famB[f.stat]).replace('{v}', val)}`;
  });
}

// ---------- État de l'écran de combat
const FG = { st: null, el: null, raf: 0, acc: 0, last: 0, q: [], mem: null, ai: 'normal', names: ['', ''], teams: null, evi: 0, paused: false, tuto: null, onEnd: null };
const fgUnit = (side, i) => FG.el?.querySelector(`.fg-row.s${side} .fg-u[data-i="${i}"]`);
const fgBtn = i => FG.el?.querySelector(`.fg-b[data-i="${i}"]`);

// teams : [[{ name, lvl, variant }×3] ×2]. opts : { names, ai, tuto, onEnd }
function startFight(teams, opts = {}) {
  closeFightUI();
  const seed = (Math.random() * 2 ** 31) >>> 0;
  Object.assign(FG, { st: FE.create(teams, seed), teams, acc: 0, last: 0, q: [], mem: { seed }, ai: opts.ai || 'normal', names: opts.names || [ft('you'), ft('bot')], evi: 0, paused: true, tuto: null, onEnd: opts.onEnd || null, log: [] });
  const o = document.createElement('div');
  o.className = 'fg'; o.id = 'fg';
  o.innerHTML = `
    <div class="fg-top"><button class="fg-x" data-quit aria-label="${t('close')}">✕</button><b class="fg-name">${esc(FG.names[1])}</b><span class="fg-time" id="fg-time">1:30</span></div>
    <div class="fg-row s1">${FG.st.units[1].map(u => fgCard(u)).join('')}</div>
    <div class="fg-mid" id="fg-mid"><div class="fg-fams">${[1, 0].map(s => famLines(FG.st.fam[s]).map(x => `<span class="${s ? 'foe' : ''}">${x}</span>`).join('')).join('')}</div></div>
    <div class="fg-row s0">${FG.st.units[0].map(u => fgCard(u)).join('')}</div>
    <div class="fg-btns">${FG.st.units[0].map(u => fgAbilBtn(u)).join('')}</div>
    <small class="fg-keys">${ft('keys')}</small>`;
  document.body.appendChild(o);
  FG.el = o;
  document.documentElement.classList.add('lock');
  requestAnimationFrame(() => o.classList.add('on'));
  // contrôles : pointer events (doigt, souris, stylet)
  o.addEventListener('pointerdown', e => {
    if (e.target.closest('[data-quit]')) return;
    const b = e.target.closest('.fg-b'); if (b) { e.preventDefault(); return fgInput({ type: 'abil', i: +b.dataset.i }); }
    const f = e.target.closest('.fg-row.s1 .fg-u'); if (f) { e.preventDefault(); return fgInput({ type: 'target', i: +f.dataset.i }); }
  });
  o.querySelector('[data-quit]').onclick = () => { if (FG.st.over || FG.tuto || confirm(ft('quit'))) { fgEndTuto(); closeFightUI(); } };
  addEventListener('keydown', fightKeys);
  fgDraw();
  if (opts.tuto) FG.tuto = { step: 0 };
  fgBanner(ft('fight'), '#fff', true).then(() => { FG.paused = false; if (FG.tuto) fgTutoStep(1); });
  sfx.whoosh?.();
  FG.raf = requestAnimationFrame(fgLoop);
}
function fightKeys(e) {
  if (!FG.st || e.repeat || e.target.closest?.('input, textarea')) return;
  const n = '123'.indexOf(e.key);
  if (n >= 0) { e.preventDefault(); fgInput({ type: 'abil', i: n }); }
}
function closeFightUI() {
  cancelAnimationFrame(FG.raf);
  removeEventListener('keydown', fightKeys);
  document.querySelectorAll('.fg, .fg-res').forEach(x => { x.classList.remove('on'); setTimeout(() => x.remove(), 250); });
  document.documentElement.classList.remove('lock');
  FG.st = null; FG.el = null;
}
function fgCard(u) {
  const j = jetonOf(u.name), k = kitText(u.name);
  return `<div class="fg-u ${u.kind}" data-i="${u.i}" style="--g:${hexRGB(j.glow)};--el:${ELS[u.el].col}">
    <span class="fg-el">${ELS[u.el].ico}</span>${u.lvl > 1 ? `<span class="fg-lv">${u.lvl}</span>` : ''}
    <div class="fg-img"><img class="${vCls(u.variant)}" src="${texOf(j)}" alt=""></div>
    <b>${jnH(u.name)}</b>
    <div class="fg-hp"><i class="sh"></i><i class="hp"></i></div>
    <div class="fg-st"></div>
    <span class="fg-aim">🎯</span>
    <small class="fg-kit" title="${esc(k.desc)}">${k.kind === 'abil' ? '✦' : '◈'} ${esc(k.name)}</small>
  </div>`;
}
function fgAbilBtn(u) {
  const j = jetonOf(u.name), k = kitText(u.name);
  return `<button class="fg-b ${u.kind === 'abil' ? 'abil' : 'pas'}" data-i="${u.i}" style="--g:${hexRGB(j.glow)};--el:${ELS[u.el].col}">
    <span class="fg-bk">${u.i + 1}</span><img class="${vCls(u.variant)}" src="${texOf(j)}" alt="">
    <span class="fg-bt"><b>${esc(k.name)}</b><small>${u.kind === 'abil' ? esc(k.desc) : ft('passive') + ' · ' + esc(k.desc)}</small></span>
    <span class="fg-cd"></span>
  </button>`;
}

// ---------- Actions du joueur (et blocages du tuto)
function fgInput(a) {
  const st = FG.st; if (!st || st.over) return;
  const tu = FG.tuto;
  if (tu?.wait) {
    if (tu.wait.type !== a.type || (tu.wait.i != null && tu.wait.i !== a.i)) { sfx.deny(); return; }
  } else if (FG.paused) return;
  if (a.type === 'abil') {
    const u = st.units[0][a.i];
    if (u.kind !== 'abil') { sfx.deny(); return fgShake(fgBtn(a.i), 4); }
    if (!FE.canCast(st, u)) { sfx.deny(); return fgShake(fgBtn(a.i), 4); }
  }
  if (a.type === 'target' && !st.units[1][a.i]?.alive) return;
  FG.q.push({ side: 0, ...a });
  if (tu?.wait) { const w = tu.wait; tu.wait = null; FG.paused = false; document.querySelectorAll('.fg-hl').forEach(x => x.classList.remove('fg-hl')); tu.after?.(w); }
}

// ---------- Boucle : pas fixes, affichage à chaque image
function fgLoop(now) {
  if (!FG.st) return;
  FG.raf = requestAnimationFrame(fgLoop);
  if (!FG.last) FG.last = now;
  const dt = Math.min(250, now - FG.last); FG.last = now;
  if (!FG.paused && !FG.st.over) {
    FG.acc += dt;
    while (FG.acc >= FCFG.TICK_MS && !FG.st.over && !FG.paused) {
      FG.acc -= FCFG.TICK_MS;
      const acts = FG.q.splice(0).map(a => ({ ...a, tick: FG.st.tick }));
      acts.push(...FE.ai(FG.st, 1, FG.mem, FG.ai).map(a => ({ ...a, tick: FG.st.tick })));
      FG.log.push(...acts);
      FE.step(FG.st, acts);
      FG.tuto?.tick?.();
    }
  }
  const ev = FG.st.ev;
  while (FG.evi < ev.length) fgFx(ev[FG.evi++]);
  fgDraw();
}

// ---------- Affichage de l'état (barres, statuts, recharges, chrono)
function fgDraw() {
  const st = FG.st; if (!st || !FG.el) return;
  const left = Math.max(0, Math.ceil((st.end - st.tick) / FE.TPS));
  const tm = FG.el.querySelector('#fg-time'); tm.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`; tm.classList.toggle('low', left <= 10);
  for (const side of [0, 1]) for (const u of st.units[side]) {
    const c = fgUnit(side, u.i); if (!c) continue;
    c.querySelector('.hp').style.width = (u.hp / u.max * 100) + '%';
    c.querySelector('.sh').style.width = Math.min(100, u.shield / u.max * 100) + '%';
    c.classList.toggle('low', u.alive && u.hp / u.max < .3);
    c.classList.toggle('dead', !u.alive);
    c.classList.toggle('stun', FE.on(st, u, 'stun'));
    if (side === 1) c.classList.toggle('aim', u.alive && FE.targetOf(st, 0) === u);
    const sts = [...['burn', 'poison', 'freeze', 'shock', 'vuln', 'rage', 'stun'].filter(s => FE.on(st, u, s)), ...(u.shield > 0 ? ['shield'] : [])];
    const key = sts.join();
    const box = c.querySelector('.fg-st'); if (box.dataset.k !== key) { box.dataset.k = key; box.innerHTML = sts.map(s => `<i class="s-${s}" title="${ftL().st[s]}">${ST_ICO[s]}</i>`).join(''); }
  }
  for (const u of st.units[0]) {
    const b = fgBtn(u.i); if (!b || u.kind !== 'abil') { b?.classList.toggle('dead', !u.alive); continue; }
    const ready = FE.canCast(st, u), stun = u.alive && FE.on(st, u, 'stun');
    b.classList.toggle('ready', ready); b.classList.toggle('dead', !u.alive); b.classList.toggle('stun', stun);
    b.style.setProperty('--p', u.cdMax ? (1 - u.cd / u.cdMax) : 1);
    b.querySelector('.fg-cd').textContent = !u.alive ? ft('ko') : stun ? '💫' : ready ? '' : Math.ceil(u.cd / FE.TPS);
  }
}

// ---------- Effets visuels et sons de chaque évènement
const fgAnim = (el, kf, o) => el && !reducedFx() ? el.animate(kf, o) : null;
function fgShake(el, px = 8) { fgAnim(el, [{ transform: 'none' }, { transform: `translate(${px}px, ${-px / 2}px)` }, { transform: `translate(${-px}px, ${px / 2}px)` }, { transform: `translate(${px / 2}px, 0)` }, { transform: 'none' }], { duration: 260 }); }
function fgPop(el, text, cls = '') {
  if (!el || !FG.el) return;
  const r = el.getBoundingClientRect(), d = document.createElement('div');
  d.className = 'fg-num ' + cls; d.textContent = text;
  d.style.left = (r.left + r.width / 2 + (Math.random() - .5) * r.width * .5) + 'px'; d.style.top = (r.top + r.height * .35) + 'px';
  FG.el.appendChild(d);
  setTimeout(() => d.remove(), 900);
}
function fgBurst(el, col, size = 1) {
  if (!el || !FG.el || reducedFx()) return;
  const r = el.getBoundingClientRect(), d = document.createElement('div');
  d.className = 'fg-burst'; d.style.setProperty('--c', col); d.style.setProperty('--s', size);
  d.style.left = (r.left + r.width / 2) + 'px'; d.style.top = (r.top + r.height / 2) + 'px';
  FG.el.appendChild(d); setTimeout(() => d.remove(), 650);
}
function fgBanner(text, col, big) {
  return new Promise(res => {
    if (!FG.el) return res();
    const b = document.createElement('div'); b.className = 'fg-banner' + (big ? ' big' : ''); b.style.setProperty('--c', col); b.innerHTML = text;
    FG.el.querySelector('#fg-mid').appendChild(b);
    const a = fgAnim(b, [{ opacity: 0, transform: 'translate(-50%, -50%) scale(1.8)' }, { opacity: 1, transform: 'translate(-50%, -50%) scale(1)', offset: .25 }, { opacity: 1, transform: 'translate(-50%, -50%) scale(1.04)', offset: .75 }, { opacity: 0, transform: 'translate(-50%, -50%) scale(.9)' }], { duration: big ? 900 : 1100, easing: 'ease-out' });
    const done = () => { b.remove(); res(); };
    if (a) a.onfinish = done; else setTimeout(done, 700);
  });
}
function fgFlash(col, o = .35) {
  if (!FG.el || reducedFx()) return;
  const f = document.createElement('div'); f.className = 'fg-flash'; f.style.background = col;
  FG.el.appendChild(f); fgAnim(f, [{ opacity: o }, { opacity: 0 }], { duration: 420 }); setTimeout(() => f.remove(), 430);
}
function fgLunge(from, to) {
  if (!from || !to || reducedFx()) return;
  const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
  const dx = (b.left - a.left) * .28, dy = (b.top - a.top) * .28;
  from.animate([{ transform: 'none' }, { transform: `translate(${dx}px, ${dy}px) scale(1.06)`, offset: .4 }, { transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.3, 1.4, .5, 1)' });
}
function fgFx(e) {
  const st = FG.st;
  if (e.t === 'atk') { fgLunge(fgUnit(e.u.side, e.u.i)?.querySelector('.fg-img'), fgUnit(e.to.side, e.to.i)); return; }
  if (e.t === 'hit') {
    const c = fgUnit(e.to.side, e.to.i); if (!c) return;
    if (e.d > 0) fgPop(c, (e.crit ? ft('crit') + ' ' : '') + '-' + e.d, e.crit ? 'crit' : e.kind === 'dot' ? 'dot' : e.kind === 'react' ? 'react' : e.kind === 'abil' ? 'abil' : '');
    if (e.abs > 0) fgPop(c, '🛡️-' + e.abs, 'shield');
    if (e.kind !== 'dot') fgAnim(c.querySelector('.fg-img'), [{ filter: 'brightness(2.2)' }, { filter: 'none' }], { duration: 180 });
    if (e.big || e.crit) { fgShake(FG.el.querySelector(e.to.side ? '.fg-row.s1' : '.fg-row.s0'), e.big ? 8 : 4); }
    if (e.kind === 'atk' && e.to.side === 1) sfx.click?.();
    return;
  }
  if (e.t === 'abil') {
    const u = st.units[e.u.side][e.u.i], col = ELS[u.el].col, k = kitText(u.name);
    fgBurst(fgUnit(e.u.side, e.u.i), col, 2.2);
    const b = e.u.side === 0 && fgBtn(e.u.i); if (b) fgAnim(b, [{ transform: 'scale(.92)' }, { transform: 'scale(1.06)' }, { transform: 'none' }], { duration: 300 });
    const tag = document.createElement('div'); tag.className = 'fg-cast ' + (e.u.side ? 'foe' : 'me'); tag.style.setProperty('--c', col); tag.innerHTML = `✦ ${esc(k.name)}`;
    FG.el.querySelector('#fg-mid').appendChild(tag); setTimeout(() => tag.remove(), 1100);
    fgFlash(col, .18); sfx.next?.();
    return;
  }
  if (e.t === 'status') { const c = fgUnit(e.u.side, e.u.i); if (c) { fgPop(c, ST_ICO[e.s], 'st'); fgBurst(c, e.s === 'rage' ? '#f87171' : '#fff', .8); } return; }
  if (e.t === 'react') {
    const c = fgUnit(e.u.side, e.u.i), col = RE_COL[e.r];
    fgBurst(c, col, 3.2);
    // plusieurs réactions identiques en même temps (sort de zone) : une seule bannière « ×N »
    const L = FG.lastRe, now = performance.now();
    if (L && L.r === e.r && now - L.at < 500 && L.el.isConnected) { L.n++; L.at = now; L.el.innerHTML = `<small>${RE_ICO[e.r]}</small>${ftL().re[e.r]} ×${L.n} !`; return; }
    fgFlash(col, .45); fgShake(FG.el, 10); sfx.impact?.();
    fgBanner(`<small>${RE_ICO[e.r]}</small>${ftL().re[e.r]} !`, col);
    FG.lastRe = { r: e.r, at: now, n: 1, el: FG.el.querySelector('#fg-mid .fg-banner:last-child') };
    return;
  }
  if (e.t === 'heal') { const c = fgUnit(e.u.side, e.u.i); fgPop(c, '+' + e.n, 'heal'); fgBurst(c, '#4ade80', .9); return; }
  if (e.t === 'shield') { const c = fgUnit(e.u.side, e.u.i); fgPop(c, '+🛡️' + e.n, 'shield'); fgBurst(c, '#93c5fd', .9); return; }
  if (e.t === 'charge') { const b = e.u.side === 0 && fgBtn(e.u.i); if (b) fgAnim(b, [{ filter: 'brightness(1.8)' }, { filter: 'none' }], { duration: 400 }); return; }
  if (e.t === 'ko') { const c = fgUnit(e.u.side, e.u.i); fgBurst(c, '#fff', 2); fgShake(c, 6); fgPop(c, ft('ko'), 'ko'); sfx.deny?.(); return; }
  if (e.t === 'revive') { const c = fgUnit(e.u.side, e.u.i); fgFlash('#fde68a', .4); fgBurst(c, '#fde68a', 3); fgBanner(`🔥 ${ft('revive')}`, '#fde68a'); sfx.announce?.(); return; }
  if (e.t === 'target' && e.side === 0) { const c = fgUnit(1, e.i); fgAnim(c, [{ transform: 'scale(1.08)' }, { transform: 'none' }], { duration: 220 }); sfx.click?.(); return; }
  if (e.t === 'end') return setTimeout(() => fightResult(e), e.time ? 200 : 700);
}

// ---------- Fin du match
function fightResult(e) {
  if (!FG.st) return;
  const st = FG.st, me = e.winner === 0, draw = e.winner == null;
  const mvp = [...st.units[0]].sort((a, b) => b.dealt - a.dealt)[0];
  fgEndTuto(true);
  const box = document.createElement('div');
  box.className = 'fg-res ' + (draw ? 'draw' : me ? 'win' : 'lose');
  box.innerHTML = `<div class="fg-rbox">
    ${e.time ? `<small class="muted">⏱️ ${ft('time')}</small>` : ''}
    <h2>${draw ? ft('draw') : me ? ft('win') : ft('lose')}</h2>
    <div class="fg-mvp"><img class="${vCls(mvp.variant)}" src="${texOf(jetonOf(mvp.name))}" alt=""><div><small>${ft('mvp')}</small><b>${jnH(mvp.name)}</b><small>${ft('dealt', { n: fmt(mvp.dealt) })}</small></div></div>
    <small class="muted">${ft('dur', { s: Math.round(st.tick / FE.TPS) })}</small>
    <div class="fg-rbtn"><button class="btn primary" data-again>${ft('again')}</button><button class="btn ghost" data-back>${ft('back')}</button></div>
  </div>`;
  document.body.appendChild(box);
  requestAnimationFrame(() => box.classList.add('on'));
  if (me) { sfx.announce?.(); fgConfetti(box); } else sfx.deny?.();
  fgAnim(box.querySelector('h2'), [{ transform: 'scale(2.2)', opacity: 0 }, { transform: 'scale(.92)', opacity: 1, offset: .6 }, { transform: 'none' }], { duration: 520, easing: 'cubic-bezier(.2, 1.3, .4, 1)' });
  const onEnd = FG.onEnd;
  box.onclick = ev => {
    if (ev.target.closest('[data-back]')) { closeFightUI(); onEnd?.('back'); }
    if (ev.target.closest('[data-again]')) { closeFightUI(); onEnd?.('again'); }
  };
}
function fgConfetti(host) {
  if (reducedFx()) return;
  const cols = ['#fde68a', '#a78bfa', '#4ade80', '#38bdf8', '#fb7185'];
  for (let k = 0; k < 40; k++) {
    const p = document.createElement('i'); p.className = 'fg-conf'; p.style.background = cols[k % cols.length]; p.style.left = Math.random() * 100 + '%';
    host.appendChild(p);
    p.animate([{ transform: `translateY(-20px) rotate(0)` }, { transform: `translateY(${innerHeight + 40}px) rotate(${720 * (Math.random() - .5)}deg)` }], { duration: 1600 + Math.random() * 1400, delay: Math.random() * 300, easing: 'cubic-bezier(.3, .2, .6, 1)', fill: 'forwards' });
  }
}

// ---------- Tuto interactif (premier combat, ou depuis les paramètres)
const FTUTO_KEY = 'takoras-fight-tuto2';
const fightTutoSeen = () => { try { return localStorage.getItem(FTUTO_KEY) === '1'; } catch { return true; } };
function startFightTuto(onEnd) {
  const mine = ['Givre', 'Astra', 'Mobu'].map(name => ({ name, lvl: 1 })), foe = ['Pikko', 'Rouillé', 'Azura'].map(name => ({ name, lvl: 1 }));
  startFight([mine, foe], { tuto: true, ai: 'easy', names: [ft('you'), ft('bot')], onEnd });
  FG.st.units[1].forEach(u => { u.max = u.hp = Math.round(u.max * .8); });
  FG.st.units[0].forEach(u => { u.cd = u.cdMax; }); // rien n'est prêt avant l'étape 2
}
function fgBubble(text, where, btns) {
  FG.el.querySelector('.fg-tip')?.remove();
  const b = document.createElement('div'); b.className = 'fg-tip ' + where;
  b.innerHTML = `<p>${text}</p><div>${btns.map(([k, l]) => `<button class="btn ${k === 'skip' ? 'ghost' : 'primary'} sm" data-t="${k}">${l}</button>`).join('')}</div>`;
  FG.el.appendChild(b);
  fgAnim(b, [{ opacity: 0, transform: 'translate(-50%, 8px) scale(.96)' }, { opacity: 1, transform: 'translate(-50%, 0)' }], { duration: 240, easing: 'ease-out' });
  b.onclick = e => { const k = e.target.closest('[data-t]')?.dataset.t; if (!k) return; sfx.click(); if (k === 'skip') return fgEndTuto(); FG.tuto?.next?.(k); };
  return b;
}
function fgHl(el) { document.querySelectorAll('.fg-hl').forEach(x => x.classList.remove('fg-hl')); el?.classList.add('fg-hl'); }
function fgTutoStep(n) {
  const tu = FG.tuto; if (!tu || !FG.st) return;
  tu.step = n; tu.next = null; tu.after = null; tu.tick = null;
  const skip = ['skip', ft('tSkip')];
  const later = (s, fn) => { const at = FG.st.tick + FE.sec(s); tu.tick = () => { if (FG.st.tick >= at) { tu.tick = null; fn(); } }; };
  const wait = (w, el, text, where, after) => { FG.paused = true; tu.wait = w; fgHl(el); const b = fgBubble(text, where, [skip]); tu.after = x => { b.remove(); after(x); }; };
  if (n === 1) { FG.paused = true; fgHl(FG.el.querySelector('.fg-row.s0')); fgBubble(ft('t1'), 'mid', [skip, ['ok', ft('tOk')]]); tu.next = () => { FG.el.querySelector('.fg-tip')?.remove(); fgHl(null); FG.paused = false; later(3, () => fgTutoStep(2)); }; }
  if (n === 2) { FG.st.units[0][0].cd = 0; fgDraw(); wait({ type: 'abil', i: 0 }, fgBtn(0), ft('t2'), 'low', () => later(2.5, () => fgTutoStep(3))); }
  if (n === 3) { const f = FG.st.units[1].find(u => u.alive && u.i !== FG.st.target[0]) || FG.st.units[1].find(u => u.alive); wait({ type: 'target', i: f.i }, fgUnit(1, f.i), ft('t3'), 'top', () => later(3, () => fgTutoStep(4))); }
  if (n === 4) {
    FG.st.units[0][0].cd = 0; FG.st.units[0][1].cd = 0; fgDraw();
    wait({ type: 'abil', i: 0 }, fgBtn(0), ft('t4'), 'low', () => later(.4, () => { FG.st.units[0][1].cd = 0; wait({ type: 'abil', i: 1 }, fgBtn(1), ft('t4b'), 'low', () => later(2.2, () => fgTutoStep(5))); }));
  }
  if (n === 5) { FG.paused = true; fgBubble(ft('t5'), 'mid', [['ok', ft('tEnd')]]); tu.next = () => fgEndTuto(); }
}
function fgEndTuto(quiet) {
  if (!FG.tuto) return;
  try { localStorage.setItem(FTUTO_KEY, '1'); } catch {}
  FG.tuto = null; FG.paused = false;
  FG.el?.querySelector('.fg-tip')?.remove(); fgHl(null);
}
