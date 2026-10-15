// Sons du site, tous fabriqués en direct avec la Web Audio API (aucun fichier à charger).
// Le son démarre au premier clic (les navigateurs l'exigent) et se coupe avec le bouton du haut.

const sfx = (() => {
  let ctx = null, master = null;
  let muted = false;
  try { muted = localStorage.getItem('takoras-muted') === '1'; } catch {}

  function init() {
    if (ctx) return ctx.state === 'suspended' && ctx.resume();
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : .5;
    // Petit compresseur pour que les sons forts ne saturent pas
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp).connect(ctx.destination);
  }
  addEventListener('pointerdown', init, { capture: true });
  addEventListener('keydown', init, { capture: true });

  const ok = () => ctx && !muted;
  const now = () => ctx.currentTime;

  // Une note : fréquence (avec glissé optionnel), forme d'onde, volume, durée, délai
  function tone(f, { to, type = 'sine', vol = .2, dur = .12, delay = 0, attack = .005 } = {}) {
    if (!ok()) return;
    const t = now() + delay, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g).connect(master);
    o.start(t); o.stop(t + dur + .05);
  }

  // Souffle filtré (whoosh, impacts, riser)
  function noise({ dur = .3, vol = .2, from = 400, to = 3000, type = 'bandpass', q = 1, delay = 0, rise = false } = {}) {
    if (!ok()) return;
    const t = now() + delay, len = Math.ceil(ctx.sampleRate * dur), buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = buf;
    f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(from, t);
    f.frequency.exponentialRampToValueAtTime(to, t + dur);
    if (rise) { g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + dur * .95); g.gain.linearRampToValueAtTime(0, t + dur); }
    else { g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur); }
    src.connect(f).connect(g).connect(master);
    src.start(t); src.stop(t + dur);
  }

  // Gamme majeure pentatonique : tout sonne « juste » et joyeux
  const note = n => 523.25 * 2 ** ([0, 2, 4, 7, 9][((n % 5) + 5) % 5] / 12 + Math.floor(n / 5));
  let lastHover = 0;

  return {
    setMuted(m) { muted = m; try { localStorage.setItem('takoras-muted', m ? '1' : '0'); } catch {} if (master) master.gain.value = m ? 0 : .5; },
    get muted() { return muted; },

    click() { tone(1100, { to: 1500, type: 'square', vol: .06, dur: .05 }); },
    hover() { const t = performance.now(); if (t - lastHover < 70) return; lastHover = t; tone(1800, { vol: .025, dur: .03 }); },
    whoosh() { noise({ dur: .38, vol: .22, from: 300, to: 4000 }); tone(220, { to: 660, type: 'triangle', vol: .08, dur: .3 }); },
    // Transition pixel : bips carrés aléatoires et grésillements qui « meurent » (corruption)…
    corrupt() {
      for (let i = 0; i < 14; i++) {
        const k = 1 - i / 14, f = [180, 260, 390, 520, 780, 1040, 1560, 2080, 3120][Math.floor(Math.random() * 9)];
        tone(f * (.9 + Math.random() * .2), { to: f * (Math.random() < .5 ? .5 : 1.5), type: 'square', vol: .07 * k + .01, dur: .03, delay: i * .028 + Math.random() * .01 });
        if (i % 3 === 0) noise({ dur: .03, vol: .12 * k, from: 1500 + Math.random() * 4000, to: 800, type: 'bandpass', q: 6, delay: i * .028 });
      }
      tone(900, { to: 60, type: 'sawtooth', vol: .05, dur: .4 }); // le signal qui meurt
    },
    // …puis tout s'évapore : un souffle aigu qui monte et disparaît, avec quelques scintillements
    evaporate() {
      noise({ dur: 1.6, vol: .07, from: 2500, to: 12000, type: 'highpass', delay: .05 });
      for (let i = 0; i < 6; i++) tone(2400 + Math.random() * 2400, { vol: .02, dur: .12, delay: .15 + i * .2 + Math.random() * .1 });
    },
    whooshOut() { noise({ dur: .45, vol: .18, from: 3500, to: 250 }); },
    spawn() { tone(660, { to: 990, type: 'triangle', vol: .1, dur: .18 }); },

    // Clic du compteur : plus la chance affichée est rare, plus la note monte
    tick(v) {
      const step = Math.round(Math.log10(Math.max(1, v)) * 3.3);
      tone(note(step), { type: 'triangle', vol: .16, dur: .14 });
      tone(note(step) * 2, { vol: .05, dur: .08 });
      if (v >= 500) noise({ dur: .08, vol: .08, from: 2000, to: 6000, type: 'highpass' });
    },
    hold() { tone(110, { to: 45, vol: .5, dur: .35 }); noise({ dur: .25, vol: .1, from: 800, to: 120, type: 'lowpass' }); },
    heartbeat() { tone(70, { to: 40, vol: .45, dur: .18 }); tone(70, { to: 40, vol: .35, dur: .18, delay: .22 }); },

    // Révélation : un arpège, plus long et plus brillant selon la rareté
    reveal(odds) {
      const lvl = Math.min(7, Math.floor(Math.log10(odds) * 1.2));
      for (let i = 0; i <= 2 + lvl; i++) {
        tone(note(i * 2), { type: 'triangle', vol: .13, dur: .35, delay: i * .055 });
        tone(note(i * 2) * 2, { vol: .04, dur: .25, delay: i * .055 });
      }
      if (odds >= 1000) noise({ dur: .9, vol: .07, from: 6000, to: 12000, type: 'highpass', delay: .1 });
    },
    impact() { tone(140, { to: 35, vol: .8, dur: .7 }); noise({ dur: .6, vol: .3, from: 1500, to: 80, type: 'lowpass' }); },
    riser(dur = 1.8) {
      if (!ok()) return;
      noise({ dur, vol: .35, from: 200, to: 9000, type: 'bandpass', q: 2, rise: true });
      const t = now(), o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(80, t); o.frequency.exponentialRampToValueAtTime(1400, t + dur);
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.12, t + dur * .95); g.gain.linearRampToValueAtTime(0, t + dur);
      o.connect(g).connect(master); o.start(t); o.stop(t + dur + .05);
    },
    next() { tone(784, { type: 'square', vol: .05, dur: .06 }); tone(1175, { type: 'square', vol: .05, dur: .08, delay: .06 }); },
    regen() { tone(1047, { vol: .1, dur: .15 }); tone(1568, { vol: .1, dur: .25, delay: .09 }); },
    upgrade() { [0, 2, 4, 5, 7].forEach((n, i) => tone(note(n), { type: 'square', vol: .06, dur: .18, delay: i * .07 })); },
    deny() { tone(220, { to: 160, type: 'square', vol: .06, dur: .14 }); },
  };
})();

// Bouton son/muet dans la barre du haut
(function () {
  const b = document.getElementById('mute');
  const draw = () => {
    b.innerHTML = sfx.muted
      ? '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="m23 9-6 6M17 9l6 6"/></svg>'
      : '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></svg>';
    b.setAttribute('aria-label', sfx.muted ? 'Activer le son' : 'Couper le son');
  };
  b.addEventListener('click', () => { sfx.setMuted(!sfx.muted); draw(); if (!sfx.muted) sfx.click(); });
  draw();
})();

// Clic sur n'importe quel bouton + petit son au survol des boutons et des types de pull
document.addEventListener('click', e => { if (e.target.closest?.('button:not(#op-coin):not(#mute)')) sfx.click(); });
document.addEventListener('pointerover', e => { if (e.target.closest?.('.btn, .type, .chip, .seg button')) sfx.hover(); });
