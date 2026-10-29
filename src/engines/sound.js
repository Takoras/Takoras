// Sons du site (Web Audio). Synthétisés, OU un fichier sous licence vérifiée quand il est déclaré dans src/data/sounds.json
// (dossier public/sfx) : le fichier remplace alors le son synthétisé. Porté depuis legacy/sound.js :
// seul le branchement change (le volume et le mode allégé viennent des réglages React, via configureSound).
// Les écouteurs globaux (clic sur un bouton, survol) sont posés par installSoundListeners() au démarrage.

import FILES from '../data/sounds.json';

const env_ = { volume: () => 70, reduced: () => false };
export function configureSound(o) { Object.assign(env_, o); }

const sfx = (() => {
  let ctx = null, master = null, bus = null;
  let muted = false;
  try { muted = localStorage.getItem('takoras-muted') === '1'; } catch {}
  const vol = () => (muted ? 0 : .8 * (env_.volume() / 100));

  // Réverbération : une « salle » fabriquée avec du bruit qui s'éteint doucement
  function room(sec = 2.2) {
    const len = Math.ceil(ctx.sampleRate * sec), ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    const c = ctx.createConvolver(); c.buffer = ir; return c;
  }
  // Téléphone / appareil lent : la réverbération « convolution » demande trop de calcul et faisait grésiller le son.
  // On y met un écho léger (délai) à la place, une mémoire audio plus grande et moins de sons en même temps.
  const LITE = matchMedia('(pointer: coarse)').matches || env_.reduced();
  const MAX_VOICES = LITE ? 18 : 48;
  let voices = 0;
  function echo() {
    const d = ctx.createDelay(1), fb = ctx.createGain(), lp = ctx.createBiquadFilter(), inp = ctx.createGain();
    d.delayTime.value = .11; fb.gain.value = .32; lp.type = 'lowpass'; lp.frequency.value = 1800;
    inp.connect(d); d.connect(lp).connect(fb).connect(d);
    const out = ctx.createGain(); lp.connect(out);
    return { input: inp, output: out };
  }
  function init() {
    if (ctx) return ctx.state === 'suspended' && ctx.resume();
    const AC = window.AudioContext || window.webkitAudioContext;
    try { ctx = new AC({ latencyHint: LITE ? 'playback' : 'interactive' }); } catch { ctx = new AC(); }
    master = ctx.createGain(); master.gain.value = vol();
    // bus → coupe-aigus chaud → (sec + réverb) → compresseur doux → sortie
    bus = ctx.createGain();
    const warm = ctx.createBiquadFilter(); warm.type = 'lowpass'; warm.frequency.value = 3600; warm.Q.value = .5;
    const wet = ctx.createGain(); wet.gain.value = LITE ? .18 : .22;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3;
    bus.connect(warm);
    warm.connect(comp);
    if (LITE) { const e = echo(); warm.connect(e.input); e.output.connect(wet).connect(comp); }
    else warm.connect(room()).connect(wet).connect(comp);
    comp.connect(master).connect(ctx.destination);
  }
  addEventListener('pointerdown', init, { capture: true });
  addEventListener('keydown', init, { capture: true });

  const ok = () => ctx && !muted;
  // Fichiers audio : chargés à la première utilisation ; tant qu'ils ne sont pas prêts (ou absents), son synthétisé
  const buffers = {}, loading = {};
  function file(group, key, gain = 1) {
    const url = FILES[group]?.[key];
    if (!url || !ok()) return false;
    const b = buffers[url];
    if (!b) {
      if (!loading[url]) loading[url] = fetch(url).then(r => r.arrayBuffer()).then(a => ctx.decodeAudioData(a)).then(x => { buffers[url] = x; }).catch(() => {});
      return false;
    }
    const src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = b; g.gain.value = gain; src.connect(g).connect(bus); src.start();
    return true;
  }
  const now = () => ctx.currentTime;

  // Enveloppe douce : petite attaque, longue extinction
  function env(g, t, peak, attack, dur) {
    g.gain.setValueAtTime(.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  }
  function osc(type, f, t, dur, peak, attack = .01, out = bus, glide) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    // trop de sons en même temps (spam de clics) : les nouveaux sont joués sans être branchés, pour ne pas saturer
    if (voices >= MAX_VOICES) return o;
    voices++; o.onended = () => { voices--; };
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
  let lastHover = 0, lastClick = 0;
  const tierOf = odds => (odds >= 100000 ? 'mythic' : odds >= 10000 ? 'legend' : odds >= 1000 ? 'epic' : odds >= 100 ? 'rare' : 'common');

  return {
    // Pour les cinématiques : accès au son du site (même volume, même filtre)
    audio() { init(); return { ctx, out: bus, ok: ok() }; },
    setMuted(m) { muted = m; try { localStorage.setItem('takoras-muted', m ? '1' : '0'); } catch {} if (master) master.gain.value = vol(); },
    setVolume(v) { if (master && !muted) master.gain.value = .8 * v; },
    get muted() { return muted; },

    // Sons d'interface : bas (≈ −18 dB sous la musique) et UN seul par interaction (un 2e clic dans les 80 ms est ignoré)
    click() { const t = performance.now(); if (t - lastClick < 80) return; lastClick = t; if (!file('ui', 'click', .35)) mar(NOTE(3 + Math.floor(Math.random() * 2)), { vol: .05, dur: .22 }); },
    hover() { const t = performance.now(); if (t - lastHover < 90) return; lastHover = t; if (!file('ui', 'hover', .2)) mar(NOTE(5), { vol: .015, dur: .12 }); },
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
    // juste avant une cinématique : pas de battements de cœur, une note de cloche qui monte à chaque fois + un souffle doux
    suspense(step = 0) { ep(NOTE(4 + (step % 8)), { vol: .06, dur: 1.4 }); ep(NOTE(8 + (step % 8)), { vol: .03, dur: 1.2, delay: .18 }); air({ dur: 1, vol: .03 + Math.min(.05, step * .008), from: 300, to: 900 }); },

    // Révélation : arpège de piano électrique, plus long selon la rareté, avec une nappe pour les rares
    reveal(odds) {
      if (file('reveal', tierOf(odds))) return;
      const lvl = Math.min(7, Math.floor(Math.log10(odds) * 1.2));
      for (let i = 0; i <= 2 + lvl; i++) ep(NOTE(i * 2), { vol: .09, dur: .9, delay: i * .07 });
      if (odds >= 1000) pad([NOTE(0), NOTE(2), NOTE(4), NOTE(5)], { vol: .035, dur: 2.2 });
    },
    impact() { thump(120, { vol: .6, dur: .8, to: 32 }); air({ dur: .7, vol: .14, from: 900, to: 90 }); },
    riser(dur = 1.8) { air({ dur, vol: .16, from: 120, to: 2600, rise: true, q: 2 }); if (ok()) osc('triangle', 55, now(), dur, .06, dur * .9, bus, 330); },
    next() { if (file('ui', 'next', .4)) return; ep(NOTE(4), { vol: .07, dur: .4 }); ep(NOTE(6), { vol: .07, dur: .5, delay: .07 }); },
    regen() { ep(NOTE(5), { vol: .08, dur: .6 }); ep(NOTE(7), { vol: .07, dur: .8, delay: .1 }); },
    upgrade() { if (file('ui', 'upgrade', .5)) return; [0, 2, 4, 5].forEach((n, i) => ep(NOTE(n + 3), { vol: .08, dur: .7, delay: i * .08 })); },
    // Annonce de l'admin : accord chaud + coup sourd
    announce() { thump(70, { vol: .4, dur: .6 }); [0, 2, 4, 7].forEach((n, i) => ep(NOTE(n + 2), { vol: .08, dur: 1.2, delay: .06 + i * .12 })); pad([NOTE(0), NOTE(2), NOTE(4)], { vol: .04, dur: 2 }); },
    // Message d'un ami : petit « ploc » à deux notes
    message() { if (file('ui', 'message', .5)) return; mar(NOTE(5), { vol: .1, dur: .3 }); mar(NOTE(7), { vol: .1, dur: .4, delay: .08 }); },
    // Refus : « bonk » grave et mat
    // Mode turbo : petite note qui monte à chaque jeton (la gamme recommence tous les 15)
    combo(n) { const k = (n - 1) % 15; mar(NOTE(k), { vol: .09, dur: .18 }); if (k === 14) ep(NOTE(15), { vol: .07, dur: .6 }); },
    deny() { if (file('ui', 'deny', .4)) return; mar(110, { vol: .12, dur: .25 }); mar(104, { vol: .08, dur: .25, delay: .06 }); },
  };
})();

export { sfx };

let installed = false;
export function installSoundListeners() {
  if (installed) return;
  installed = true;
  document.addEventListener('click', e => { if (e.target.closest?.('button:not([data-nosound])')) sfx.click(); });
  document.addEventListener('pointerover', e => { if (e.target.closest?.('[data-hoversound]')) sfx.hover(); });
}
