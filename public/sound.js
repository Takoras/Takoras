// Sons du site, tous fabriqués en direct avec la Web Audio API (aucun fichier à charger).
// Style lo-fi doux : sons ronds et graves (piano électrique, marimba feutré), tout passe dans un filtre
// qui coupe les aigus + une petite réverbération chaude. Le son démarre au premier clic (les navigateurs l'exigent).

const sfx = (() => {
  let ctx = null, master = null, bus = null;
  let muted = false;
  try { muted = localStorage.getItem('takoras-muted') === '1'; } catch {}
  const vol = () => (muted ? 0 : .8 * (SETTINGS.volume / 100));

  // Réverbération : une « salle » fabriquée avec du bruit qui s'éteint doucement
  function room(sec = 2.2) {
    const len = Math.ceil(ctx.sampleRate * sec), ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    const c = ctx.createConvolver(); c.buffer = ir; return c;
  }
  function init() {
    if (ctx) return ctx.state === 'suspended' && ctx.resume();
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = vol();
    // bus → coupe-aigus chaud → (sec + réverb) → compresseur doux → sortie
    bus = ctx.createGain();
    const warm = ctx.createBiquadFilter(); warm.type = 'lowpass'; warm.frequency.value = 3600; warm.Q.value = .5;
    const verb = room(), wet = ctx.createGain(); wet.gain.value = .22;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3;
    bus.connect(warm);
    warm.connect(comp); warm.connect(verb).connect(wet).connect(comp);
    comp.connect(master).connect(ctx.destination);
  }
  addEventListener('pointerdown', init, { capture: true });
  addEventListener('keydown', init, { capture: true });

  const ok = () => ctx && !muted;
  const now = () => ctx.currentTime;

  // Enveloppe douce : petite attaque, longue extinction
  function env(g, t, peak, attack, dur) {
    g.gain.setValueAtTime(.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  }
  function osc(type, f, t, dur, peak, attack = .01, out = bus, glide) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (glide) o.frequency.exponentialRampToValueAtTime(glide, t + dur);
    env(g, t, peak, attack, dur);
    o.connect(g).connect(out); o.start(t); o.stop(t + dur + .05);
    return o;
  }
  // Piano électrique : fondamentale + une harmonique qui s'éteint vite, léger trémolo
  function ep(f, { vol = .12, dur = .9, delay = 0 } = {}) {
    if (!ok()) return;
    const t = now() + delay;
    osc('sine', f, t, dur, vol, .008);
    osc('sine', f * 2, t, dur * .35, vol * .28, .004);
    osc('triangle', f * 1.003, t, dur * .8, vol * .25, .01);
  }
  // Marimba feutré : très court, boisé
  function mar(f, { vol = .1, dur = .35, delay = 0 } = {}) {
    if (!ok()) return;
    const t = now() + delay;
    osc('sine', f, t, dur, vol, .003);
    osc('sine', f * 3.9, t, dur * .18, vol * .18, .002);
  }
  // Coup sourd (grave qui descend)
  function thump(f = 90, { vol = .35, dur = .35, delay = 0, to } = {}) {
    if (!ok()) return;
    osc('sine', f, now() + delay, dur, vol, .004, bus, to || f * .5);
  }
  // Souffle filtré, toujours dans le grave / médium
  function air({ dur = .4, vol = .1, from = 300, to = 1400, delay = 0, rise = false, q = .7 } = {}) {
    if (!ok()) return;
    const t = now() + delay, len = Math.ceil(ctx.sampleRate * dur), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = buf; f.type = 'lowpass'; f.Q.value = q;
    f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(to, t + dur);
    if (rise) { g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + dur * .92); g.gain.linearRampToValueAtTime(0, t + dur); }
    else { g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur); }
    src.connect(f).connect(g).connect(bus); src.start(t); src.stop(t + dur);
  }
  // Nappe chaude (accord tenu, s'ouvre doucement)
  function pad(freqs, { vol = .05, dur = 1.6, delay = 0 } = {}) {
    if (!ok()) return;
    const t = now() + delay, f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.setValueAtTime(400, t); f.frequency.linearRampToValueAtTime(1600, t + dur * .5); f.connect(bus);
    freqs.forEach(fr => [-4, 4].forEach(c => { const o = osc('triangle', fr, t, dur, vol, dur * .35, f); o.detune.value = c; }));
  }

  // Gamme pentatonique majeure à partir de do grave (rien ne dépasse ~1 kHz)
  const NOTE = n => 196 * 2 ** ([0, 2, 4, 7, 9][((n % 5) + 5) % 5] / 12 + Math.floor(n / 5));
  let lastHover = 0;

  return {
    // Pour les cinématiques : accès au son du site (même volume, même filtre)
    audio() { init(); return { ctx, out: bus, ok: ok() }; },
    setMuted(m) { muted = m; try { localStorage.setItem('takoras-muted', m ? '1' : '0'); } catch {} if (master) master.gain.value = vol(); },
    setVolume(v) { if (master && !muted) master.gain.value = .8 * v; },
    get muted() { return muted; },

    click() { mar(NOTE(3 + Math.floor(Math.random() * 2)), { vol: .08, dur: .22 }); },
    hover() { const t = performance.now(); if (t - lastHover < 90) return; lastHover = t; mar(NOTE(5), { vol: .022, dur: .12 }); },
    whoosh() { air({ dur: .45, vol: .14, from: 180, to: 1300 }); ep(NOTE(2), { vol: .05, dur: .5 }); },
    whooshOut() { air({ dur: .45, vol: .12, from: 1300, to: 160 }); },
    // Transition pixel : petit arpège lo-fi qui descend + crépitement de vinyle
    corrupt() {
      [7, 5, 4, 2, 0].forEach((n, i) => ep(NOTE(n), { vol: .07, dur: .4, delay: i * .06 }));
      for (let i = 0; i < 8; i++) air({ dur: .03, vol: .06, from: 900, to: 500, delay: Math.random() * .4 });
      thump(80, { vol: .2, dur: .5, delay: .3 });
    },
    // …puis tout s'évapore : souffle doux qui monte, quelques notes rondes
    evaporate() {
      air({ dur: 1.4, vol: .06, from: 250, to: 2200, rise: true });
      [4, 7, 9].forEach((n, i) => ep(NOTE(n), { vol: .04, dur: .8, delay: .25 + i * .22 }));
    },
    spawn() { ep(NOTE(4), { vol: .08, dur: .5 }); },

    // Clic du compteur : grave pour les communs, monte doucement avec la rareté (plafonné, jamais strident)
    tick(v) {
      const L = Math.log10(Math.max(2, v)), n = Math.round(L * 2.2);   // 1/2 → note 1 … 1/1 000 000 → note 13
      thump(70 + L * 12, { vol: .22, dur: .25 });
      mar(NOTE(n), { vol: .12, dur: .3 });
      if (v >= 10000) pad([NOTE(n) / 2, NOTE(n + 2) / 2, NOTE(n + 4) / 2], { vol: .02 + Math.min(.04, (L - 4) * .015), dur: 1.2 });
    },
    hold() { thump(100, { vol: .4, dur: .45, to: 45 }); air({ dur: .3, vol: .06, from: 600, to: 120 }); },
    heartbeat() { thump(62, { vol: .4, dur: .2, to: 40 }); thump(62, { vol: .3, dur: .2, to: 40, delay: .22 }); },

    // Révélation : arpège de piano électrique, plus long selon la rareté, avec une nappe pour les rares
    reveal(odds) {
      const lvl = Math.min(7, Math.floor(Math.log10(odds) * 1.2));
      for (let i = 0; i <= 2 + lvl; i++) ep(NOTE(i * 2), { vol: .09, dur: .9, delay: i * .07 });
      if (odds >= 1000) pad([NOTE(0), NOTE(2), NOTE(4), NOTE(5)], { vol: .035, dur: 2.2 });
    },
    impact() { thump(120, { vol: .6, dur: .8, to: 32 }); air({ dur: .7, vol: .14, from: 900, to: 90 }); },
    riser(dur = 1.8) { air({ dur, vol: .16, from: 120, to: 2600, rise: true, q: 2 }); if (ok()) osc('triangle', 55, now(), dur, .06, dur * .9, bus, 330); },
    next() { ep(NOTE(4), { vol: .07, dur: .4 }); ep(NOTE(6), { vol: .07, dur: .5, delay: .07 }); },
    regen() { ep(NOTE(5), { vol: .08, dur: .6 }); ep(NOTE(7), { vol: .07, dur: .8, delay: .1 }); },
    upgrade() { [0, 2, 4, 5].forEach((n, i) => ep(NOTE(n + 3), { vol: .08, dur: .7, delay: i * .08 })); },
    // Annonce de l'admin : accord chaud + coup sourd
    announce() { thump(70, { vol: .4, dur: .6 }); [0, 2, 4, 7].forEach((n, i) => ep(NOTE(n + 2), { vol: .08, dur: 1.2, delay: .06 + i * .12 })); pad([NOTE(0), NOTE(2), NOTE(4)], { vol: .04, dur: 2 }); },
    // Message d'un ami : petit « ploc » à deux notes
    message() { mar(NOTE(5), { vol: .1, dur: .3 }); mar(NOTE(7), { vol: .1, dur: .4, delay: .08 }); },
    // Refus : « bonk » grave et mat
    deny() { mar(110, { vol: .12, dur: .25 }); mar(104, { vol: .08, dur: .25, delay: .06 }); },
  };
})();

// Bouton son/muet dans la barre du haut
(function () {
  const b = document.getElementById('mute');
  const draw = () => {
    b.innerHTML = sfx.muted
      ? '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="m23 9-6 6M17 9l6 6"/></svg>'
      : '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></svg>';
    b.setAttribute('aria-label', sfx.muted ? t('unmute') : t('mute'));
  };
  b.addEventListener('click', () => { sfx.setMuted(!sfx.muted); draw(); if (!sfx.muted) sfx.click(); });
  draw();
})();

// Clic sur n'importe quel bouton + petit son au survol des boutons et des types de pull
document.addEventListener('click', e => { if (e.target.closest?.('button:not(#op-coin):not(#mute)')) sfx.click(); });
document.addEventListener('pointerover', e => { if (e.target.closest?.('.btn, .type, .chip, .seg button')) sfx.hover(); });
