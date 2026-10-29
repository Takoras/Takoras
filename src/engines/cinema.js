// Cinématiques des jetons rares (1/1000 et plus).
// Chaque jeton a son petit film : ses plans, ses coupes, sa musique (composée en direct avec Web Audio),
// puis la révélation commune (le jeton qui arrive en tournant et se pose, son nom, sa cote).
// Tout est dessiné en direct dans un petit canvas agrandi sans lissage (pixel art). Pas de dessins détaillés :
// des formes simples (verre, flèches, plumes, ombre…) qui bougent bien.
// Les mouvements utilisent des courbes « humaines » : anticipation, petits dépassements, ressorts amortis, pauses.
import { LOCALE, SERIES, jn, sfx, texOf, t } from './env';
import FILES from '../data/sounds.json';
import './cinema.css';

const MYSTERE = '/img/jetons/mystere.png';

const CINE = (() => {
  const S = 3; // taille d'un « pixel » à l'écran
  const TAU = Math.PI * 2;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const lerp = (a, b, k) => a + (b - a) * k;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (v, a, b) => clamp((v - a) / (b - a));
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${clamp(a)})`; };
  // courbes de mouvement (moins « robot » qu'un simple lissage)
  const E = {
    out: (k, p = 3) => 1 - (1 - k) ** p, // part vite, se pose doucement
    in: (k, p = 3) => k ** p, // démarre doucement, finit vite
    io: k => (k < .5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2),
    back: k => 1 + 2.7 * (k - 1) ** 3 + 1.7 * (k - 1) ** 2, // dépasse un peu puis revient
    spring: k => 1 - Math.exp(-6 * k) * Math.cos(11 * k), // arrive, rebondit, se calme
    antic: k => (k < .25 ? -Math.sin(k / .25 * Math.PI) * .08 : E.out((k - .25) / .75, 4)), // recule un peu avant de partir
  };

  // =====================================================================
  // Dessin
  // =====================================================================
  const P = (x, X, Y, s, c) => { x.fillStyle = c; x.fillRect(Math.round(X), Math.round(Y), s, s); };
  function glow(x, cx, cy, r, col, a) {
    if (r <= 0 || a <= 0) return;
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, rgba(col, a)); g.addColorStop(1, rgba(col, 0));
    x.fillStyle = g; x.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  function vignette(x, w, h, col = '#000000', a = .7) {
    const g = x.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .25, w / 2, h / 2, Math.max(w, h) * .72);
    g.addColorStop(0, rgba(col, 0)); g.addColorStop(1, rgba(col, a)); x.fillStyle = g; x.fillRect(0, 0, w, h);
  }
  // jeton (image) : écrasé par le cosinus de son angle (il tourne sur lui-même), teinte optionnelle
  const tintCv = document.createElement('canvas'); tintCv.width = tintCv.height = 96;
  const tc = tintCv.getContext('2d'); tc.imageSmoothingEnabled = false;
  function coin(x, im, cx, cy, size, o = {}) {
    if (!im || !im.complete || !im.naturalWidth || size < 1) return;
    const { ang = 0, alpha = 1, tint, tintA = 0, rot = 0 } = o;
    const c = Math.max(.05, Math.abs(Math.cos(ang)));
    let src = im;
    if (tint && tintA > 0) {
      tc.globalCompositeOperation = 'source-over'; tc.clearRect(0, 0, 96, 96); tc.drawImage(im, 0, 0, 96, 96);
      tc.globalCompositeOperation = 'source-atop'; tc.fillStyle = rgba(tint, tintA); tc.fillRect(0, 0, 96, 96);
      tc.globalCompositeOperation = 'source-over'; src = tintCv;
    }
    x.save(); x.globalAlpha *= alpha; x.translate(Math.round(cx), Math.round(cy)); if (rot) x.rotate(rot); x.scale(c, 1);
    x.drawImage(src, -size / 2, -size / 2, size, size); x.restore();
  }
  // étoile à 4 branches (reflet, scintillement)
  function twinkle(x, X, Y, r, col) { P(x, X, Y, 1, col); for (let i = 1; i <= r; i++) { const a = 1 - i / (r + 1); P(x, X + i, Y, 1, rgba(col, a)); P(x, X - i, Y, 1, rgba(col, a)); P(x, X, Y + i, 1, rgba(col, a)); P(x, X, Y - i, 1, rgba(col, a)); } }

  // =====================================================================
  // Musique (Web Audio) : de vrais petits instruments, et une partition par jeton
  // =====================================================================
  function Music() {
    const A = sfx.audio();
    if (!A.ok) return null;
    const { ctx } = A, t0 = ctx.currentTime + .06, nodes = [];
    const bus = ctx.createGain(); bus.gain.value = .9;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 18000; lp.Q.value = .4;
    bus.connect(lp).connect(A.out);
    const T = s => t0 + s;
    const keep = n => { nodes.push(n); return n; };
    const NB = (() => { const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; })();
    function env(g, t, v, a, d, hold = 0) { g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(v, t + a); if (hold) g.gain.setValueAtTime(v, t + a + hold); g.gain.exponentialRampToValueAtTime(.0001, t + a + hold + d); }
    function osc(type, f, t, { v = .1, a = .005, d = .5, hold = 0, glide, det = 0, dest = bus } = {}) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t); if (glide) o.frequency.exponentialRampToValueAtTime(glide, t + a + hold + d);
      o.detune.value = det; env(g, t, v, a, d, hold); o.connect(g).connect(dest); o.start(t); o.stop(t + a + hold + d + .05); keep(o); return o;
    }
    function noise(t, { v = .1, a = .005, d = .4, hold = 0, type = 'lowpass', f = 1000, f2, q = 1, dest = bus } = {}) {
      const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = NB; s.loop = true; fl.type = type; fl.Q.value = q; fl.frequency.setValueAtTime(f, t); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + a + hold + d);
      env(g, t, v, a, d, hold); s.connect(fl).connect(g).connect(dest); s.start(t); s.stop(t + a + hold + d + .05); keep(s);
    }
    function fm(f, t, ratio, idx, v, d, a = .003) {
      const c = ctx.createOscillator(), m = ctx.createOscillator(), mg = ctx.createGain(), g = ctx.createGain();
      c.frequency.value = f; m.frequency.value = f * ratio;
      mg.gain.setValueAtTime(f * idx, t); mg.gain.exponentialRampToValueAtTime(Math.max(.01, f * idx * .03), t + d);
      m.connect(mg).connect(c.frequency); env(g, t, v, a, d); c.connect(g).connect(bus);
      c.start(t); m.start(t); c.stop(t + d + .1); m.stop(t + d + .1); keep(c); keep(m);
    }
    function sustained(fs, t, dur, v, { type = 'sawtooth', cut = 1400, q = .6, att = .4, lfo = 0, formants } = {}) {
      const g = ctx.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(v, t + dur * att); g.gain.setValueAtTime(v, t + dur * .8); g.gain.linearRampToValueAtTime(.0001, t + dur);
      g.connect(bus);
      let inp = g;
      if (formants) { inp = ctx.createGain(); formants.forEach(ff => { const b = ctx.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = ff; b.Q.value = 5; inp.connect(b).connect(g); }); }
      else { const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = cut; fl.Q.value = q; fl.connect(g); inp = fl; }
      if (lfo) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = lfo; lg.gain.value = v * .55; l.connect(lg).connect(g.gain); l.start(t); l.stop(t + dur + .05); keep(l); }
      fs.forEach(f => [-8, 8].forEach(dt => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = dt; o.connect(inp); o.start(t); o.stop(t + dur + .05); keep(o); }));
    }
    const I = {
      bell: (f, t, v = .08, d = 1.8) => fm(f, t, 3.51, 2.2, v, d),
      glass: (f, t, v = .06, d = 2.6) => { fm(f, t, 7.07, 1.4, v, d); osc('sine', f * 2, t, { v: v * .25, d: d * .5 }); },
      ep: (f, t, v = .07, d = 1.2) => { osc('sine', f, t, { v, a: .006, d }); osc('sine', f * 2, t, { v: v * .3, d: d * .35 }); osc('triangle', f * 1.003, t, { v: v * .2, d: d * .8 }); },
      pluck: (f, t, v = .08, d = .6, bright = 3200) => {
        const o = ctx.createOscillator(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
        o.type = 'sawtooth'; o.frequency.value = f; fl.type = 'lowpass'; fl.Q.value = 2;
        fl.frequency.setValueAtTime(bright, t); fl.frequency.exponentialRampToValueAtTime(Math.max(180, f * 1.4), t + d * .45);
        env(g, t, v, .002, d); o.connect(fl).connect(g).connect(bus); o.start(t); o.stop(t + d + .05); keep(o);
      },
      koto: (f, t, v = .09) => { const o = osc('triangle', f * 1.025, t, { v, a: .002, d: .9 }); o.frequency.exponentialRampToValueAtTime(f, t + .05); osc('sine', f * 2, t, { v: v * .3, d: .3 }); },
      pad: (fs, t, dur, v = .035, cut = 1300) => sustained(fs, t, dur, v, { cut }),
      warm: (fs, t, dur, v = .04) => sustained(fs, t, dur, v, { type: 'triangle', cut: 2200 }),
      strings: (fs, t, dur, v = .03) => sustained(fs, t, dur, v, { cut: 2400, lfo: 7.5, att: .25 }),
      choir: (fs, t, dur, v = .05) => sustained(fs, t, dur, v, { formants: [650, 1100, 2600], att: .45 }),
      brass: (f, t, dur, v = .05) => {
        const fl = ctx.createBiquadFilter(), g = ctx.createGain(); fl.type = 'lowpass'; fl.Q.value = 1.2;
        fl.frequency.setValueAtTime(400, t); fl.frequency.linearRampToValueAtTime(2800, t + .07); fl.frequency.linearRampToValueAtTime(1500, t + .3);
        g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(v, t + .04); g.gain.setValueAtTime(v * .85, t + Math.max(.06, dur - .08)); g.gain.linearRampToValueAtTime(.0001, t + dur);
        fl.connect(g).connect(bus);
        [-6, 6].forEach(dt => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = dt; o.connect(fl); o.start(t); o.stop(t + dur + .05); keep(o); });
      },
      bass: (f, t, d = .5, v = .13) => { osc('triangle', f, t, { v, a: .01, d }); osc('sine', f / 2, t, { v: v * .7, a: .01, d }); },
      sub: (f, t, dur, v = .15) => osc('sine', f, t, { v, a: dur * .3, hold: dur * .4, d: dur * .3 }),
      kick: (t, v = .5) => osc('sine', 150, t, { v, a: .002, d: .32, glide: 42 }),
      snare: (t, v = .12) => { noise(t, { v, d: .15, type: 'bandpass', f: 1900, q: .8 }); osc('triangle', 200, t, { v: v * .5, d: .09, glide: 120 }); },
      hat: (t, v = .035) => noise(t, { v, d: .045, type: 'highpass', f: 7500 }),
      crash: (t, v = .1) => noise(t, { v, d: 2.2, type: 'highpass', f: 5000, q: .4 }),
      taiko: (t, v = .55) => { osc('sine', 98, t, { v, a: .002, d: .75, glide: 48 }); noise(t, { v: v * .3, d: .22, type: 'lowpass', f: 380 }); },
      tom: (t, f = 140, v = .3) => osc('sine', f, t, { v, a: .002, d: .35, glide: f * .55 }),
      impact: (t, v = .75) => { osc('sine', 72, t, { v, a: .003, d: 1.8, glide: 26 }); noise(t, { v: v * .3, d: 1.1, type: 'lowpass', f: 1400, f2: 90 }); },
      whoosh: (t, d = .6, v = .12, up = true) => noise(t, { v, a: d * .55, d: d * .45, type: 'bandpass', f: up ? 300 : 2600, f2: up ? 2600 : 260, q: .9 }),
      swell: (t, d, v = .1) => { const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = NB; s.loop = true; fl.type = 'highpass'; fl.frequency.value = 2800; g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v, t + d); g.gain.linearRampToValueAtTime(.0001, t + d + .04); s.connect(fl).connect(g).connect(bus); s.start(t); s.stop(t + d + .1); keep(s); },
      crack: (t, v = .3) => { noise(t, { v, d: .1, type: 'highpass', f: 2200 }); osc('square', 2600, t, { v: v * .15, d: .06, glide: 500 }); osc('sine', 90, t, { v: v * .6, d: .3, glide: 50 }); },
      tink: (t, v = .05) => osc('sine', rnd(2400, 5600), t, { v, a: .001, d: rnd(.12, .35) }),
      shatter: (t, v = .12) => { noise(t, { v, d: .5, type: 'highpass', f: 3000 }); for (let i = 0; i < 34; i++) I.tink(t + rnd(0, 1.1) ** 1.6, v * rnd(.2, .7)); },
      thwip: (t, v = .1) => noise(t, { v, a: .02, d: .14, type: 'bandpass', f: 4200, f2: 900, q: 2 }),
      thunk: (t, v = .28) => { osc('sine', 240, t, { v, a: .002, d: .22, glide: 70 }); noise(t, { v: v * .5, d: .05, type: 'lowpass', f: 1200 }); },
      rumble: (t, d, v = .22) => noise(t, { v, a: d * .45, hold: d * .25, d: d * .3, type: 'lowpass', f: 160, q: .5 }),
      whale: (t, v = .16) => { osc('sine', 190, t, { v, a: .5, d: 2.2, glide: 92 }); osc('sine', 384, t + .1, { v: v * .25, a: .5, d: 2, glide: 188 }); },
      bubble: (t, v = .04) => osc('sine', rnd(500, 900), t, { v, a: .004, d: .09, glide: rnd(1200, 1800) }),
      ring: (f, t, d, v = .02) => osc('sine', f, t, { v, a: .05, d }),
      splash: (t, v = .12) => { noise(t, { v, d: .5, type: 'highpass', f: 1800 }); for (let i = 0; i < 8; i++) I.bubble(t + rnd(0, .4), v * .4); },
    };
    const hz = (root, s) => root * 2 ** (s / 12);
    return {
      T, I, hz,
      // ralenti : la musique s'étouffe (filtre), puis revient
      slow(on, at) { lp.frequency.setTargetAtTime(on ? 520 : 18000, T(at), on ? .12 : .25); },
      stop(fade = .3) { const n = ctx.currentTime; bus.gain.cancelScheduledValues(n); bus.gain.setValueAtTime(bus.gain.value, n); bus.gain.linearRampToValueAtTime(0, n + fade); setTimeout(() => { nodes.forEach(o => { try { o.stop(); } catch {} }); try { bus.disconnect(); } catch {} }, fade * 1000 + 120); },
      now: () => ctx.currentTime - t0,
    };
  }
  // fichier sous licence (src/data/sounds.json) : il remplace la musique composée
  function trackOf(name, D) {
    const url = FILES.music?.[name], A = sfx.audio();
    if (!url || !A.ok) return null;
    const el = new Audio(url), src = A.ctx.createMediaElementSource(el), g = A.ctx.createGain();
    src.connect(g).connect(A.out); void el.play().catch(() => {});
    const tm = setTimeout(() => g.gain.linearRampToValueAtTime(0, A.ctx.currentTime + .6), Math.max(0, D * 1000 - 600));
    return { stop() { clearTimeout(tm); el.pause(); }, slow() {}, licensed: true };
  }
  // accords : listes de demi-tons depuis la tonique
  const chordHz = (m, root, c, oct = 0) => c.map(s => m.hz(root, s + oct * 12));
  // une progression d'accords mesure par mesure, de `a` à `b` (secondes)
  function bars(m, a, b, bpm, chords, fn) { const bar = 240 / bpm; for (let i = 0, s = a; s < b - .05; i++, s += bar) fn(m.T(s), chords[i % chords.length], i, bar / 4, Math.min(bar, b - s)); }
  // la révélation : coup grave, accord du jeton, scintillement
  function revealHit(m, R, root, chord, lead = 'bell') {
    const t = m.T(R);
    m.I.impact(t, .7); m.I.crash(t, .07);
    chord.forEach((s, k) => { m.I[lead](m.hz(root, s + 12), t + k * .05, .07, 2.2); m.I.bell(m.hz(root, s + 24), t + .3 + k * .07, .03, 1.6); });
    m.I.warm(chordHz(m, root, chord), t, 2.6, .045);
    m.I.bass(m.hz(root, -12), t, 1.8, .14);
  }

  // =====================================================================
  // Les films, jeton par jeton. R = moment de la révélation (secondes).
  // scene(c) : c = { x, w, h, cx, cy, M, t, dt, st, mys, img, fx }
  // =====================================================================
  const FILMS = {
    // ---------------------------------------------------------------- Vyolis : une salle de verre, des reflets partout
    Vyolis: {
      R: 6.2, c: ['#0b0614', '#5b3a8c', '#c9a6f2', '#ffffff'],
      init(c) { c.st.panes = Array.from({ length: 16 }, (_, i) => ({ x: (i / 16) * c.w * 1.9 + rnd(-10, 10), y: c.h * rnd(.08, .3), pw: rnd(22, 42), ph: c.h * rnd(.55, .8), sk: rnd(-.25, .25), z: rnd(.35, 1), ph0: rnd(0, 9) })).sort((a, b) => a.z - b.z); },
      music(m, R) {
        const r = 220, ch = [[0, 3, 7, 10], [-4, 0, 3, 7], [3, 7, 10, 14], [-2, 2, 5, 9]], bpm = 84;
        m.I.glass(m.hz(r, 24), m.T(.25), .07, 3);
        bars(m, .4, R - .3, bpm, ch, (t, c, i, b, len) => {
          m.I.pad(chordHz(m, r, c, -1), t, len + .1, .028, 1100);
          const arp = [0, 1, 2, 3, 2, 1, 2, 3];
          arp.forEach((n, k) => { if (t + k * b / 2 < m.T(R - .35)) m.I.glass(m.hz(r, c[n] + 12 + (i >= 3 && k % 4 === 3 ? 12 : 0)), t + k * b / 2, i >= 3 ? .05 : .04, 1.8); });
          if (i >= 2) { m.I.bass(m.hz(r, c[0] - 12), t, 1.4, .1); [1, 3].forEach(k => m.I.hat(t + k * b, .025)); }
        });
        m.I.strings(chordHz(m, r, [0, 7, 12, 15]), m.T(R - 2.2), 2, .03);
        m.I.swell(m.T(R - 1.3), 1.05, .1);
        revealHit(m, R, r, [0, 3, 7, 12], 'glass');
      },
      scene(c) {
        const { x, w, h, cx, cy, M, t, st } = c, [bg, dk, ac, li] = this.c, R = this.R;
        x.fillStyle = bg; x.fillRect(0, 0, w, h); glow(x, cx, cy, M * .9, dk, .35);
        const act2 = t > 3.3, cs = M * .3;
        if (!act2) {
          // plan 1 : on glisse lentement le long d'une rangée de vitres
          const cam = -E.io(seg(t, 0, 3.3)) * w * .7;
          st.panes.forEach(p => {
            const X = p.x + cam * p.z - w * .25, Y = p.y + (1 - p.z) * 10, a = seg(t, .1 + p.z * .5, .7 + p.z * .5);
            if (X > w + 40 || X + p.pw < -40 || a <= 0) return;
            pane(x, X, Y, p.pw * p.z * 1.3, p.ph * (.6 + p.z * .4), p.sk, t, p.ph0, a * (.4 + .6 * p.z), c.mys, cs * .5);
          });
          coin(x, c.mys, cx, cy + Math.sin(t * 1.6) * 2, cs * E.out(seg(t, .2, 1.4)), { ang: Math.sin(t * .8) * .5 });
        } else {
          // plan 2 (coupe) : on est au milieu d'un kaléidoscope de vitres, les reflets tournent et se rejoignent
          const k = seg(t, 3.3, R - .2), N = 8, rr = lerp(M * .44, 0, E.in(k, 2.4)), sp = lerp(.4, 5, E.in(k, 2));
          st.rot = (st.rot || 0) + c.dt * sp;
          for (let i = 0; i < N; i++) {
            const a = st.rot + i / N * TAU, X = cx + Math.cos(a) * rr, Y = cy + Math.sin(a) * rr * .8;
            x.save(); x.translate(X, Y); x.rotate(a + Math.PI / 2);
            pane(x, -14, -26, 28, 52, .15, t, i, .55, null, 0); x.restore();
            coin(x, c.mys, X, Y, cs * .55, { alpha: .5, tint: ac, tintA: .4, ang: st.rot * 2 + i });
          }
          glow(x, cx, cy, M * (.3 + k * .4), ac, .25 + k * .5);
          coin(x, c.mys, cx, cy, cs * (1 + k * .2), { ang: st.rot * .7 });
          for (let i = 0; i < 6; i++) if ((Math.floor(t * 9) + i) % 3 === 0) twinkle(x, cx + Math.cos(i * 2.1 + t) * rr * 1.1, cy + Math.sin(i * 1.7 + t) * rr * .9, 2 + (i % 2), li);
          c.fx.shake(E.in(k, 3) * 2.5);
          if (t > R - .2) c.fx.flash(li, .9);
        }
        vignette(x, w, h, bg, .75);
      },
    },
    // ---------------------------------------------------------------- Lumis : un tunnel de losanges roses (la scène d'origine, en plus riche)
    Lumis: {
      R: 5.6, c: ['#14050e', '#a33a76', '#f7a8d8', '#fff0f8'],
      init(c) { c.st.petals = Array.from({ length: 50 }, () => ({ a: rnd(0, TAU), z: rnd(0, 1), s: rnd(.6, 1.4) })); },
      music(m, R) {
        const r = 174.6, ch = [[0, 4, 7, 11], [2, 6, 9, 14], [-1, 2, 7, 11], [0, 4, 7, 14]], bpm = 98;
        const mel = [12, 16, 19, 18, 16, 14, 16, 11];
        bars(m, .3, R - .3, bpm, ch, (t, c, i, b, len) => {
          m.I.warm(chordHz(m, r, c), t, len + .1, .032);
          mel.forEach((n, k) => { if (i % 2 === 1 && k > 3) return; m.I.ep(m.hz(r, n + (i >= 2 ? 0 : -12)), t + k * b / 2, .045, .9); });
          if (i >= 1) for (let k = 0; k < 8; k++) m.I.hat(t + k * b / 2, k % 2 ? .02 : .03);
          if (i >= 2) { m.I.kick(t, .32); m.I.kick(t + 2 * b, .28); m.I.bass(m.hz(r, c[0] - 12), t, 1, .1); }
        });
        m.I.swell(m.T(R - 1.1), .9, .1);
        revealHit(m, R, r, [0, 4, 7, 11], 'ep');
      },
      scene(c) {
        const { x, w, h, cx, cy, M, t, st, dt } = c, [bg, dk, ac, li] = this.c, R = this.R;
        x.fillStyle = bg; x.fillRect(0, 0, w, h);
        const cut = t > 3.2, k = seg(t, 0, R), speed = lerp(.1, .55, E.in(k, 2)), end = seg(t, R - .55, R);
        st.z = (st.z || 0) + dt * speed;
        st.rot = lerp(st.rot || 0, cut ? Math.PI / 4 : 0, cut ? .08 : 0);
        x.save(); x.translate(cx, cy); x.rotate(st.rot + Math.sin(t * .5) * .05); if (cut) x.scale(1.15, 1.15);
        // spokes
        for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; x.strokeStyle = rgba(dk, .25); x.lineWidth = 1; x.beginPath(); x.moveTo(0, 0); x.lineTo(Math.cos(a) * w, Math.sin(a) * w); x.stroke(); }
        // tunnel de losanges qui viennent vers nous
        for (let i = 0; i < 16; i++) {
          let z = ((i / 16) + st.z) % 1; if (end) z *= 1 - E.in(end, 2);
          const r = 3 + z * z * M * 1.7, a = z < .85 ? z * 1.1 : (1 - z) * 6;
          x.strokeStyle = rgba(i % 2 ? ac : li, a); x.lineWidth = 1 + Math.round(z * 2);
          x.beginPath(); x.moveTo(0, -r); x.lineTo(r, 0); x.lineTo(0, r); x.lineTo(-r, 0); x.closePath(); x.stroke();
          if (i % 4 === 0) { [[0, -r], [r, 0], [0, r], [-r, 0]].forEach(([X, Y]) => twinkle(x, X, Y, 1 + Math.round(z * 2), li)); }
        }
        // pétales (petits losanges) qui filent
        st.petals.forEach(p => { p.z += dt * speed * 1.4 * p.s; if (p.z > 1) { p.z = 0; p.a = rnd(0, TAU); } const r = p.z * p.z * M * 1.3; const X = Math.cos(p.a) * r, Y = Math.sin(p.a) * r; P(x, X, Y, p.z > .6 ? 2 : 1, rgba(p.z > .5 ? li : ac, .9 * p.z)); });
        x.restore();
        const pulse = Math.sin(t * lerp(2, 9, k)) * .5 + .5;
        glow(x, cx, cy, M * (.35 + .15 * pulse + end * .5), ac, .35 + .3 * k);
        coin(x, c.mys, cx, cy, M * .3 * (1 + .04 * pulse) * (1 - end * .3), { ang: t * lerp(.6, 5, E.in(k, 2)) });
        if (cut && t < 3.35) c.fx.flash(li, .5);
        c.fx.shake(E.in(k, 4) * 2);
        vignette(x, w, h, bg, .7);
      },
    },
    // ---------------------------------------------------------------- Nyx : la nuit, des flèches de lumière traversent le jeton une à une
    Nyx: {
      R: 6.1, c: ['#05051a', '#2f2a8f', '#7c8cf8', '#dbe4ff'],
      hits: [1.0, 1.85, 2.55, 3.1, 3.55, 3.9, 4.2, 4.45, 4.66, 4.84, 5.0],
      init(c) {
        c.st.stars = Array.from({ length: Math.floor(c.w * c.h / 70) }, () => ({ x: rnd(0, c.w), y: rnd(0, c.h), z: rnd(.2, 1), p: rnd(0, 9) }));
        c.st.arrows = this.hits.map((at, i) => ({ at, a: (i * 2.39 + .6) % TAU, done: false }));
        for (let i = 0; i < 8; i++) c.st.arrows.push({ at: this.R - .25, a: i / 8 * TAU + .2, done: false, last: true });
        c.st.o = { x: 0, y: 0, vx: 0, vy: 0 }; c.st.parts = []; c.st.hit = 0;
      },
      music(m, R) {
        const r = 146.8, ch = [[0, 3, 7], [-4, 0, 3], [-7, -4, 0], [-5, -1, 2]], bpm = 100;
        bars(m, .2, R - .3, bpm, ch, (t, c, i, b, len) => {
          m.I.strings(chordHz(m, r, c, -1), t, len + .05, .028);
          for (let k = 0; k < 8; k++) m.I.bass(m.hz(r, c[0] - 12), t + k * b / 2, .22, k % 2 ? .06 : .09);
          if (i >= 2) [0, 3, 6].forEach(k => m.I.tom(t + k * b / 2, 120, .14));
        });
        this.hits.forEach((h, i) => { m.I.thwip(m.T(h - .16), .07 + i * .004); m.I.thunk(m.T(h), .2 + i * .012); m.I.bell(m.hz(r, [12, 15, 19, 22, 24][i % 5]), m.T(h), .03, .8); });
        m.I.whoosh(m.T(R - .7), .45, .14); m.I.swell(m.T(R - 1), .75, .09);
        revealHit(m, R, r, [0, 3, 7, 10], 'bell');
      },
      scene(c) {
        const { x, w, h, cx, cy, M, t, st, dt } = c, [bg, dk, ac, li] = this.c, R = this.R;
        x.fillStyle = bg; x.fillRect(0, 0, w, h); glow(x, cx, cy, M, dk, .4);
        st.stars.forEach(s => { s.x -= dt * 4 * s.z; if (s.x < 0) s.x = w; P(x, s.x, s.y, s.z > .8 ? 2 : 1, rgba(li, (.3 + .7 * (Math.sin(t * 2 + s.p) * .5 + .5)) * s.z)); });
        // couronne d'éclats (comme les cristaux du jeton)
        const k = seg(t, 0, R);
        for (let i = 0; i < 9; i++) { const a = t * (.3 + k * .9) + i / 9 * TAU, rr = M * (.46 - .06 * k), X = cx + Math.cos(a) * rr, Y = cy + Math.sin(a) * rr * .9, s = 4 + (i % 3) * 2; x.fillStyle = rgba(i % 2 ? ac : li, .45 + .3 * k); x.beginPath(); x.moveTo(X + Math.cos(a) * s * 1.6, Y + Math.sin(a) * s * 1.6); x.lineTo(X + Math.cos(a + 2.2) * s * .6, Y + Math.sin(a + 2.2) * s * .6); x.lineTo(X - Math.cos(a) * s * .4, Y - Math.sin(a) * s * .4); x.lineTo(X + Math.cos(a - 2.2) * s * .6, Y + Math.sin(a - 2.2) * s * .6); x.fill(); }
        // ressort : le jeton encaisse les impacts et revient
        const o = st.o; o.vx += (-70 * o.x - 9 * o.vx) * dt; o.vy += (-70 * o.y - 9 * o.vy) * dt; o.x += o.vx * dt; o.y += o.vy * dt;
        const D0 = Math.max(w, h) * .75, cs = M * .32;
        st.hit = Math.max(0, st.hit - dt * 3);
        glow(x, cx + o.x, cy + o.y, cs * (1.2 + st.hit), ac, .3 + st.hit * .5);
        coin(x, c.mys, cx + o.x, cy + o.y, cs * (1 - st.hit * .06), { tint: '#ffffff', tintA: st.hit * .5, rot: o.x * .012, ang: o.y * .03 });
        st.arrows.forEach(ar => {
          const u = (t - ar.at) / (ar.last ? .5 : .62) + .5; // .5 = au centre
          if (u < 0 || u > 1.05) return;
          const dx = Math.cos(ar.a), dy = Math.sin(ar.a), X = cx - dx * D0 + dx * D0 * 2 * u, Y = cy - dy * D0 + dy * D0 * 2 * u;
          if (u >= .5 && !ar.done) {
            ar.done = true; st.hit = 1; o.vx += dx * (ar.last ? 10 : 70); o.vy += dy * (ar.last ? 10 : 70);
            for (let i = 0; i < 10; i++) st.parts.push({ x: cx, y: cy, vx: dx * rnd(30, 90) + rnd(-25, 25), vy: dy * rnd(30, 90) + rnd(-25, 25), l: 1 });
            c.fx.shake(ar.last ? 3 : 1.6);
          }
          arrow(x, X, Y, ar.a, li, ac);
        });
        st.parts = st.parts.filter(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.l -= dt * 2.2; P(x, p.x, p.y, 1, rgba(li, p.l)); return p.l > 0; });
        if (t > R - .25) c.fx.flash(li, .8);
        vignette(x, w, h, bg, .75);
      },
    },
    // ---------------------------------------------------------------- Astra : les comètes dorées… et une grande étoile filante qui la percute
    Astra: {
      R: 6.6, c: ['#06071a', '#2b3a67', '#f6d39a', '#ffffff'],
      init(c) { c.st.stars = Array.from({ length: Math.floor(c.w * c.h / 60) }, () => ({ x: rnd(0, c.w), y: rnd(0, c.h), z: rnd(.05, 1), p: rnd(0, 9) })); c.st.comets = []; c.st.embers = []; },
      music(m, R) {
        const r = 164.8, ch = [[0, 4, 7, 14], [-3, 0, 4, 9], [5, 9, 12, 16], [7, 11, 14, 19]], bpm = 110;
        bars(m, .3, 5.2, bpm, ch, (t, c, i, b, len) => {
          m.I.pad(chordHz(m, r, c), t, len + .05, .03, 1600);
          [0, 2, 1, 3, 2, 1, 3, 2].forEach((n, k) => m.I.bell(m.hz(r, c[n] + 12), t + k * b / 2, .045, 1.2));
          if (i >= 1) { m.I.kick(t, .3); m.I.snare(t + 2 * b, .08); }
        });
        m.I.rumble(m.T(2.8), 2.6, .3); m.I.whoosh(m.T(4.3), 1, .16);
        m.I.impact(m.T(5.32), 1); m.I.crash(m.T(5.32), .16); m.I.ring(2600, m.T(5.4), 1.1, .015);
        m.I.choir(chordHz(m, r, [0, 7, 12]), m.T(5.6), 1, .03);
        revealHit(m, R, r, [0, 4, 7, 14], 'bell');
      },
      scene(c) {
        const { x, w, h, cx, cy, M, t, st, dt } = c, [bg, dk, ac, li] = this.c;
        // plan rapproché après la coupe : tout est un peu plus gros
        const zoom = t > 4.3 ? 1.35 : 1;
        x.fillStyle = bg; x.fillRect(0, 0, w, h);
        x.save(); x.translate(cx, cy); x.scale(zoom, zoom); x.translate(-cx, -cy);
        glow(x, cx, cy, M, dk, .5);
        st.stars.forEach(s => { s.z -= dt * .05; if (s.z <= .05) { s.z = 1; s.x = rnd(0, w); s.y = rnd(0, h); } const X = cx + (s.x - cx) / s.z * .3, Y = cy + (s.y - cy) / s.z * .3; if (X < 0 || X > w || Y < 0 || Y > h) return; P(x, X, Y, s.z < .3 ? 2 : 1, rgba(s.z < .35 ? li : ac, .35 + .6 * (1 - s.z))); });
        if (Math.random() < .05) st.comets.push({ x: rnd(w * .4, w * 1.3), y: rnd(-20, h * .3), v: rnd(70, 120) });
        st.comets = st.comets.filter(m => { m.x -= m.v * dt; m.y += m.v * .55 * dt; for (let i = 0; i < 26; i++) P(x, m.x + i, m.y - i * .55, i < 3 ? 2 : 1, rgba(i < 4 ? li : ac, (1 - i / 26) * .85)); return m.x > -40; });
        // l'astéroïde : il naît au fond, grossit, et fonce sur le jeton
        const z = seg(t, 2.6, 5.32), ax = lerp(w * .12, cx, E.in(z, 2.2)), ay = lerp(h * .14, cy, E.in(z, 2.2)), ar = lerp(1, M * .22, E.in(z, 3));
        const front = z > .82;
        if (!front && z > 0) rock(x, ax, ay, ar, z, st, dt, t);
        coin(x, c.mys, cx, cy + Math.sin(t * 1.4) * 2, M * .3, { ang: t * .9 });
        if (front) rock(x, ax, ay, ar, z, st, dt, t);
        x.restore();
        c.fx.shake(E.in(z, 3) * (t > 4.3 ? 5 : 2));
        vignette(x, w, h, bg, .6);
        if (t > 5.32) c.fx.white(1);
      },
    },
    // ---------------------------------------------------------------- Kraïos : sous l'eau, une ombre immense passe derrière, puis devant
    Kraïos: {
      R: 5.4, c: ['#01020a', '#0f1d5c', '#3d3fa8', '#a8b4ff'], noFlash: true,
      init(c) {
        c.st.snow = Array.from({ length: 90 }, () => ({ x: rnd(0, c.w), y: rnd(0, c.h), v: rnd(2, 7), s: rnd(0, 9) }));
        c.st.bub = []; c.st.o = { x: 0, y: 0, vx: 0, vy: 0 }; c.st.pushed = {};
      },
      music(m, R) {
        const r = 92.5, ch = [[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [-5, -2, 2]];
        m.I.sub(m.hz(r, -12), m.T(.1), R - .4, .14);
        bars(m, .2, R - .4, 70, ch, (t, c) => { m.I.pad(chordHz(m, r, c), t, 240 / 70 + .2, .03, 700); m.I.bell(m.hz(r, c[1] + 24), t + .4, .025, 2.5); });
        for (let s = .5; s < R - .5; s += rnd(.25, .7)) m.I.bubble(m.T(s), .02);
        m.I.whoosh(m.T(1.55), .7, .12); m.I.whoosh(m.T(3.35), .8, .14);
        m.I.strings(chordHz(m, r, [0, 7, 12, 15], 1), m.T(3.9), 1.3, .03);
        m.I.whale(m.T(4.2), .18); m.I.rumble(m.T(4.4), 1.6, .36); m.I.swell(m.T(R - 1), .8, .08);
        revealHit(m, R, r * 2, [0, 3, 7, 12], 'bell');
      },
      scene(c) {
        const { x, w, h, cx, cy, M, t, st, dt } = c, [bg, dk, ac, li] = this.c, R = this.R;
        const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#2a5aa8'); g.addColorStop(.55, '#143a7a'); g.addColorStop(1, '#071636'); x.fillStyle = g; x.fillRect(0, 0, w, h);
        // rayons de lumière qui tombent de la surface
        for (let i = 0; i < 5; i++) { const X = w * (.15 + i * .18) + Math.sin(t * .4 + i) * 10; x.fillStyle = rgba(li, .05 + .03 * Math.sin(t + i)); x.beginPath(); x.moveTo(X - 6, 0); x.lineTo(X + 6, 0); x.lineTo(X + 30, h); x.lineTo(X + 4, h); x.fill(); }
        st.snow.forEach(s => { s.y += s.v * dt; s.x += Math.sin(t + s.s) * dt * 2; if (s.y > h) { s.y = 0; s.x = rnd(0, w); } P(x, s.x, s.y, 1, rgba(li, .25)); });
        // les passages de l'ombre (derrière le jeton)
        const pass = (a, b, dir, big) => { const u = seg(t, a, b); if (u <= 0 || u >= 1) return null; const X = dir > 0 ? lerp(-w * .4, w * 1.4, E.io(u)) : lerp(w * 1.4, -w * .4, E.io(u)); shadow(x, X, cy + 8, M * big, dir); return { X, u }; };
        const p1 = pass(1.5, 2.3, 1, .6), p2 = pass(3.3, 4.2, -1, .75);
        // le jeton flotte : poussé par le remous, il dérive puis revient lentement (eau)
        const o = st.o;
        [[p1, 1, 'a'], [p2, -1, 'b']].forEach(([p, dir, id]) => { if (p && !st.pushed[id] && Math.abs(p.X - cx) < M * .2) { st.pushed[id] = true; o.vx += dir * 85; o.vy -= 22; for (let i = 0; i < 18; i++) st.bub.push({ x: cx + rnd(-12, 12), y: cy + rnd(-6, 10), v: rnd(10, 30), l: 1 }); } });
        o.vx += (-5 * o.x - 2.2 * o.vx) * dt; o.vy += (-5 * o.y - 2.2 * o.vy) * dt; o.x += o.vx * dt; o.y += o.vy * dt;
        const near = E.out(seg(t, 4.0, R - .4)), cs = M * (.3 + .14 * near);
        glow(x, cx + o.x, cy + o.y, cs * 1.4, ac, .25 + .3 * near);
        coin(x, c.mys, cx + o.x, cy + o.y + Math.sin(t * 1.3) * 2, cs, { rot: o.vx * .006 + Math.sin(t * .9) * .05, ang: Math.sin(t * .7) * .4 });
        st.bub = st.bub.filter(b => { b.y -= b.v * dt; b.x += Math.sin(b.y * .3) * .3; b.l -= dt * .6; x.strokeStyle = rgba(li, b.l * .7); x.lineWidth = 1; x.beginPath(); x.arc(Math.round(b.x), Math.round(b.y), 1.5, 0, TAU); x.stroke(); return b.l > 0; });
        // l'ombre passe DEVANT la caméra, immense : elle couvre tout l'écran (c'est la transition vers la révélation)
        if (t > 4.4) { this.front(c, seg(t, 4.4, 6.4)); c.fx.shake(2.5); }
        vignette(x, w, h, bg, .55);
      },
      front(c, u) {
        const { x, w, h, cx, cy } = c, X = lerp(w * 2.2, -w * 1.2, E.io(u));
        shadow(x, X, cy, Math.max(w, h) * 2.6, -1, .98);
        const cover = clamp(1 - Math.abs(X - cx) / (w * .75));
        if (cover > 0) { x.fillStyle = `rgba(0,0,6,${E.in(cover, 1.5)})`; x.fillRect(0, 0, w, h); }
        if (c.live) c.live.style.opacity = String(1 - E.in(cover, 1.5)); // le sprite par-dessus est caché lui aussi
      },
      // pendant la révélation, l'ombre finit de passer et dévoile le jeton
      over(c, ms) { const u = .5 + clamp(ms / 1400) * .5; if (u < 1) this.front(c, u); },
    },
    // ---------------------------------------------------------------- Koi : l'étang de nuit, deux carpes, le saut, le tourbillon
    Koi: {
      R: 7.6, c: ['#08050d', '#2b2433', '#f0453a', '#fff4ee'],
      init(c) { c.st.petals = Array.from({ length: 36 }, () => ({ x: rnd(0, c.w), y: rnd(0, c.h), v: rnd(6, 14), s: rnd(0, 9) })); c.st.trail = [[], []]; c.st.sw = []; c.st.splash = []; c.st.ang = 0; },
      music(m, R) {
        const r = 196, pent = [0, 2, 4, 7, 9], n = i => pent[((i % 5) + 5) % 5] + 12 * Math.floor(i / 5);
        const mel = [5, 7, 8, 7, 5, 4, 2, 4, 5, 7, 9, 10, 9, 7, 8, 7];
        mel.forEach((d, i) => m.I.koto(m.hz(r, n(d)), m.T(.4 + i * .3), .08));
        m.I.warm(chordHz(m, r, [0, 7, 12]), m.T(.2), 2.6, .03);
        // coupe : les tambours entrent
        for (let s = 2.5, i = 0; s < 4.4; s += .25, i++) { if (i % 4 === 0) m.I.taiko(m.T(s), .5); if (i % 4 === 2) m.I.taiko(m.T(s), .3); m.I.koto(m.hz(r, n(5 + (i * 3) % 7)), m.T(s), .06); }
        m.I.strings(chordHz(m, r, [0, 4, 7, 12]), m.T(2.5), 2, .03);
        // le saut
        m.I.whoosh(m.T(4.4), .5, .14); m.I.splash(m.T(4.55), .14); m.I.splash(m.T(5.3), .16); m.I.taiko(m.T(5.3), .8);
        // le tourbillon : tout le monde joue
        for (let s = 5.5, i = 0; s < R - .3; s += .125, i++) { if (i % 2 === 0) m.I.taiko(m.T(s), .35 + i * .01); m.I.koto(m.hz(r, n(10 + (i % 8))), m.T(s), .05); }
        m.I.choir(chordHz(m, r, [0, 4, 7, 12, 16]), m.T(5.5), R - 5.7, .045); m.I.swell(m.T(R - 1.2), 1, .12);
        revealHit(m, R, r, [0, 4, 7, 12, 14], 'koto');
      },
      scene(c) {
        const { x, w, h, cx, cy, M, t, st, dt } = c, [bg, dk, ac, li] = this.c, R = this.R;
        const act = t < 2.5 ? 0 : t < 4.4 ? 1 : t < 5.5 ? 2 : 3;
        x.fillStyle = bg; x.fillRect(0, 0, w, h);
        x.save(); if (act === 1 || act === 3) { x.translate(cx, cy); x.scale(1.2, 1.2); x.translate(-cx, -cy); }
        // l'eau : reflet de lune et ronds dans l'eau
        glow(x, cx + w * .22, cy - h * .2, M * .5, li, .12 + .04 * Math.sin(t * 2));
        for (let y = 0; y < h; y += 4) { x.fillStyle = rgba(dk, .3 + .2 * Math.sin(y * .2 + t * 2)); x.fillRect(0, y, w, 1); }
        for (let i = 0; i < 4; i++) { const r = ((t * 14 + i * 22) % 88) / 88 * M * .8; x.strokeStyle = rgba(li, (1 - r / (M * .8)) * .25); x.lineWidth = 1; x.beginPath(); x.ellipse(cx, cy, r, r * .8, 0, 0, TAU); x.stroke(); }
        const k = seg(t, 0, R), speed = act === 0 ? .9 : act === 1 ? 2.3 : act === 2 ? 1.2 : lerp(3, 7, seg(t, 5.5, R));
        st.ang += dt * speed;
        const rad = act === 3 ? M * lerp(.36, .02, E.in(seg(t, 5.5, R - .15), 2)) : M * .36;
        // tourbillon de lumière rouge et blanche (dernier acte)
        if (act === 3) { const q = seg(t, 5.5, R); for (let i = 0; i < 260; i++) { const p = (i / 260 + t * .3) % 1, r = M * .6 * (1 - p), a = i * 2.4 + t * (2 + q * 6) + (1 - p) * 5; P(x, cx + Math.cos(a) * r, cy + Math.sin(a) * r * .85, i % 6 ? 1 : 2, rgba(i % 2 ? ac : li, .3 + .6 * p * q)); } }
        // les deux carpes (rouge, blanche) qui tournent l'une autour de l'autre
        if (act !== 2) [[ac, 0], [li, Math.PI]].forEach(([col, off], f) => {
          const a = st.ang + off, X = cx + Math.cos(a) * rad, Y = cy + Math.sin(a) * rad * .8;
          const tr = st.trail[f]; tr.unshift([X, Y]); tr.length = Math.min(tr.length, act === 0 ? 1 : 14);
          tr.forEach(([tx, ty], i) => i && P(x, tx, ty, 2, rgba(col, (1 - i / 14) * .5)));
          koi(x, X, Y, a + Math.PI / 2, M * .26, col, f ? ac : li, t * 9 + f);
        });
        // le saut : elles bondissent hors de l'eau et se croisent au-dessus du jeton
        if (act === 2) { const u = seg(t, 4.4, 5.3); [[ac, -1], [li, 1]].forEach(([col, s], f) => { const X = cx + s * lerp(-M * .7, M * .7, u), Y = cy - Math.sin(u * Math.PI) * M * .3, vx = s * 1.4 * M, vy = -Math.cos(u * Math.PI) * Math.PI * .3 * M; koi(x, X, Y, Math.atan2(vy, vx), M * .38 * (1 + Math.sin(u * Math.PI) * .3), col, f ? ac : li, t * 12 + f); }); if (t < 4.6 || (t > 5.25 && t < 5.4)) for (let i = 0; i < 4; i++) st.splash.push({ x: cx + rnd(-M * .7, M * .7), y: cy + rnd(-5, 5), vx: rnd(-30, 30), vy: rnd(-80, -40), l: 1 }); }
        st.splash = st.splash.filter(s => { s.vy += 160 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.l -= dt * 1.5; P(x, s.x, s.y, 1, rgba(li, s.l)); return s.l > 0; });
        glow(x, cx, cy, M * (.3 + .3 * k), ac, .2 + .3 * k);
        coin(x, c.mys, cx, cy, M * .28 * (1 + (act === 3 ? .2 * seg(t, 5.5, R) : 0)), { ang: st.ang * .4 });
        // pétales qui tombent
        st.petals.forEach(p => { p.y += p.v * dt * (act === 3 ? 3 : 1); p.x += Math.sin(t * 1.5 + p.s) * dt * 8 - (act === 3 ? 20 * dt : 0); if (p.y > h) { p.y = -2; p.x = rnd(0, w); } P(x, p.x, p.y, 2, rgba('#ffb3c7', .8)); });
        x.restore();
        if (t > 5.3 && t < 5.45) c.fx.shake(4);
        c.fx.shake(E.in(seg(t, 5.5, R), 3) * 3);
        if (t > R - .15) c.fx.flash(li, .9);
        vignette(x, w, h, bg, .75);
      },
    },
    // ---------------------------------------------------------------- Néphéris : un œil d'ange, des plumes s'accrochent, tout devient blanc
    Néphéris: {
      R: 8.0, c: ['#120a05', '#7a3a14', '#f08a3c', '#fff6ea'],
      init(c) {
        const N = 26;
        c.st.f = Array.from({ length: N }, (_, i) => { const ring = i % 2, slot = Math.floor(i / 2); return { s: .9 + i * .19, x0: rnd(.1, .9) * c.w, a: slot / 13 * TAU + ring * (TAU / 26), r: ring ? .33 : .25, L: ring ? 18 : 14, sw: rnd(0, 9), on: false }; });
        c.st.dust = Array.from({ length: 50 }, () => ({ x: rnd(0, c.w), y: rnd(0, c.h), v: rnd(2, 6), p: rnd(0, 9) }));
      },
      music(m, R) {
        const r = 233.1, ch = [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2]];
        bars(m, .3, 6.2, 76, ch, (t, c, i, b, len) => { m.I.choir(chordHz(m, r, c, -1), t, len + .1, .04); m.I.warm(chordHz(m, r, c), t, len, .02); if (i >= 1) m.I.bass(m.hz(r, c[0] - 12), t, 2, .08); });
        const sc = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21, 23, 24];
        this.init && Array.from({ length: 26 }, (_, i) => .9 + i * .19 + 1.1).forEach((at, i) => m.I.bell(m.hz(r, sc[i % sc.length] + 12), m.T(at), .035, 1.4));
        m.I.choir(chordHz(m, r, [0, 7, 12, 16, 19]), m.T(6), 2, .07);
        m.I.rumble(m.T(6), 2, .3); m.I.ring(m.hz(r, 36), m.T(6.4), 1.6, .02); m.I.swell(m.T(6.6), 1.3, .12);
        revealHit(m, R, r, [0, 4, 7, 11, 14], 'bell');
      },
      scene(c) {
        const { x, w, h, cx, cy, M, t, st, dt } = c, [bg, dk, ac, li] = this.c, R = this.R;
        const k = seg(t, 0, R), white = E.in(seg(t, 6, 7.4), 2);
        x.fillStyle = bg; x.fillRect(0, 0, w, h);
        // la caméra avance doucement et se balance un peu
        x.save(); const zoom = 1 + E.io(k) * .22; x.translate(cx, cy); x.rotate(Math.sin(t * .4) * .03); x.scale(zoom, zoom); x.translate(-cx, -cy);
        // rayons divins qui tournent lentement depuis le haut
        for (let i = 0; i < 9; i++) { const a = Math.PI / 2 + (i - 4) * .16 + Math.sin(t * .35 + i) * .05; x.fillStyle = rgba('#ffd9a8', .035 + .025 * Math.sin(t * 1.3 + i) + .04 * k); x.beginPath(); x.moveTo(cx - 3, -h * .3); x.lineTo(cx + Math.cos(a - .04) * h * 2, -h * .3 + Math.sin(a - .04) * h * 2); x.lineTo(cx + Math.cos(a + .04) * h * 2, -h * .3 + Math.sin(a + .04) * h * 2); x.fill(); }
        st.dust.forEach(d => { d.y -= d.v * dt * (1 + k * 3); d.x += Math.sin(t + d.p) * dt * 4; if (d.y < 0) { d.y = h; d.x = rnd(0, w); } P(x, d.x, d.y, d.p > 7 ? 2 : 1, rgba(li, .25 + .3 * Math.sin(t * 2 + d.p))); });
        glow(x, cx, cy, M * (.5 + .4 * k), '#ffd9a8', .25 + .4 * k);
        // l'anneau de plumes tourne de plus en plus vite, respire, et s'ouvre quand tout devient blanc
        st.spin = (st.spin || 0) + dt * lerp(.15, 1.4, E.in(k, 2));
        st.rings = (st.rings || []).filter(r => { r.u += dt * 1.6; x.strokeStyle = rgba('#fff6ea', (1 - r.u) * .6); x.lineWidth = 1; x.beginPath(); x.arc(cx, cy, M * (.15 + r.u * .35), 0, TAU); x.stroke(); return r.u < 1; });
        st.f.forEach((f, i) => {
          const u = seg(t, f.s, f.s + 1.1); if (u <= 0) return;
          const breathe = 1 + .06 * Math.sin(t * 3 + i) + white * .5, a = f.a + st.spin;
          const tx = cx + Math.cos(a) * M * f.r * breathe, ty = cy + Math.sin(a) * M * f.r * breathe;
          let X, Y, ang, L = f.L;
          if (u < 1) { const fall = E.io(u); X = lerp(f.x0, tx, fall) + Math.sin(t * 2.4 + f.sw) * 12 * (1 - fall); Y = lerp(-12, ty, fall); ang = lerp(Math.PI / 2 + Math.sin(t * 3 + f.sw) * .7, a, E.out(u, 4)); }
          else {
            if (!f.on) { f.on = t; st.pulse = 1; st.rings.push({ u: 0 }); }
            const since = t - f.on; X = tx; Y = ty; ang = a + Math.sin(t * 7 + i) * .12; // la plume frémit
            L = f.L * (1 + .45 * Math.exp(-6 * since) * Math.cos(14 * since)); // petit rebond en s'accrochant
          }
          feather(x, X, Y, ang, L, li, '#f2c99a');
        });
        st.pulse = Math.max(0, (st.pulse || 0) - dt * 3);
        // l'œil : une lumière qui s'ouvre au centre et bat
        const eye = seg(t, 4.6, 6.5), beat = Math.sin(t * lerp(2, 8, k)) * .5 + .5;
        coin(x, c.mys, cx, cy + Math.sin(t * 1.5) * 1.5, M * .26 * (1 + st.pulse * .06), { tint: '#fff6ea', tintA: eye * .7 + st.pulse * .3, ang: Math.sin(t * .9) * .4 });
        glow(x, cx, cy, M * .2 * (1 + eye + beat * eye * .3), '#ffffff', eye * .8 + st.pulse * .3);
        x.restore();
        // tout devient blanc, l'écran tremble
        c.fx.shake(white * 4 + seg(t, 7.4, R) * 2);
        if (white > 0) c.fx.white(white);
        vignette(x, w, h, bg, .6 * (1 - white));
      },
    },
    // ---------------------------------------------------------------- Zénith : des rayons le nourrissent, il rougit, rougit… et paf
    Zénith: {
      R: 7.8, c: ['#120306', '#6e1424', '#d9364f', '#ffd6dc'],
      init(c) { c.st.beams = Array.from({ length: 20 }, (_, i) => ({ s: .8 + i * .28, a: (i * 2.399) % TAU })); c.st.emb = Array.from({ length: 70 }, () => ({ x: rnd(0, c.w), y: rnd(0, c.h), v: rnd(6, 20) })); },
      music(m, R) {
        const r = 146.8, ch = [[0, 3, 7], [1, 5, 8], [0, 3, 7], [-2, 1, 5]];
        bars(m, .2, 7.15, 90, ch, (t, c, i, b, len) => {
          m.I.strings(chordHz(m, r, c, -1), t, len + .05, .03 + i * .004);
          if (i >= 1) { m.I.kick(t, .35); m.I.snare(t + 2 * b, .08); }
          if (i >= 3) for (let k = 0; k < 8; k++) m.I.kick(t + k * b / 2, .22);
          if (i >= 2) m.I.choir(chordHz(m, r, c), t, len, .035);
        });
        this.init && Array.from({ length: 20 }, (_, i) => .8 + i * .28).forEach((s, i) => m.I.pluck(m.hz(r, [12, 13, 15, 17, 19, 20, 22, 24][i % 8]), m.T(s), .04, .4));
        m.I.swell(m.T(5.6), 1.55, .13);
        m.I.whoosh(m.T(7.15), .5, .14, false); // aspiré : silence juste avant le « paf »
        revealHit(m, R, r, [0, 3, 7, 12], 'pluck');
      },
      scene(c) {
        const { x, w, h, cx, cy, M, t, st, dt } = c, [bg, dk, ac, li] = this.c, R = this.R;
        const suck = seg(t, 7.15, R - .05);
        x.fillStyle = bg; x.fillRect(0, 0, w, h);
        st.emb.forEach(e => { e.y -= e.v * dt; if (e.y < 0) { e.y = h; e.x = rnd(0, w); } P(x, e.x, e.y, 1, rgba(ac, .5 * (1 - suck))); });
        const k = seg(t, .5, 7.1), D0 = Math.max(w, h) * .8, all = seg(t, 6.3, 7.1);
        // les rayons arrivent des bords et nourrissent le jeton (des impulsions de lumière filent dessus)
        st.beams.forEach((b, i) => {
          const u = seg(t, b.s, b.s + .3); if (u <= 0 || suck >= 1) return;
          const dx = Math.cos(b.a), dy = Math.sin(b.a), sx = cx + dx * D0, sy = cy + dy * D0, len = E.out(u) * (1 - E.in(suck, 2));
          const ex = lerp(sx, cx, len), ey = lerp(sy, cy, len);
          x.strokeStyle = rgba(all ? li : ac, .35 + .4 * all); x.lineWidth = 1 + Math.round(all * 2); x.beginPath(); x.moveTo(sx, sy); x.lineTo(ex, ey); x.stroke();
          for (let q = 0; q < 3; q++) { const p = ((t * 1.4 + q / 3 + i * .17) % 1); if (p > len) continue; P(x, lerp(sx, cx, p), lerp(sy, cy, p), 2, rgba(li, .9)); }
        });
        // il rougit, tremble, gonfle… puis se contracte d'un coup avant d'exploser
        const beat = Math.sin(t * lerp(3, 14, k)) * .5 + .5, swell = 1 + all * .25 - E.out(suck, 2) * .45;
        glow(x, cx, cy, M * (.4 + .4 * k) * swell, ac, (.25 + .5 * k) * (1 - suck * .8));
        coin(x, c.mys, cx + rnd(-1, 1) * k * 2, cy + rnd(-1, 1) * k * 2, M * .3 * swell * (1 + beat * .04 * k), { tint: '#ff2a3f', tintA: E.in(k, 1.4) * .85 });
        c.fx.shake(k * 2.5 * (1 - suck));
        if (suck > 0) { x.fillStyle = `rgba(0,0,0,${E.in(suck, 2) * .8})`; x.fillRect(0, 0, w, h); coin(x, c.mys, cx, cy, M * .3 * swell, { tint: '#ff2a3f', tintA: .9 }); }
        vignette(x, w, h, bg, .8);
      },
    },
    // ---------------------------------------------------------------- Oblivion : l'écran se fige, se fissure, éclate… explosion
    Oblivion: {
      R: 9.0, c: ['#020b0d', '#14524f', '#3fc7b6', '#e6fffb'],
      cracks: [3.0, 3.45, 3.8, 4.1, 4.35],
      init(c) { c.st.parts = []; c.st.ex = []; },
      music(m, R) {
        const r = 138.6;
        m.I.sub(m.hz(r, -12), m.T(.1), 2.95, .2);
        m.I.pad(chordHz(m, r, [0, 1, 7], -1), m.T(.1), 2.9, .035, 900);
        [0.4, 1.3, 2.1, 2.6].forEach((s, i) => m.I.bell(m.hz(r, [12, 13, 19, 16][i]), m.T(s), .04, 2));
        // tout s'arrête net à la première fissure : un son qui reste suspendu
        this.cracks.forEach((s, i) => m.I.crack(m.T(s), .3 + i * .05));
        m.I.ring(m.hz(r, 36), m.T(3.05), 1.8, .012);
        m.I.shatter(m.T(4.8), .16);
        m.I.ring(m.hz(r, 24), m.T(6.1), .6, .015); m.I.whoosh(m.T(6.4), .5, .1);
        m.I.impact(m.T(6.9), 1); m.I.crash(m.T(6.9), .14);
        m.I.choir(chordHz(m, r, [0, 4, 7, 12]), m.T(6.95), 1.9, .06);
        for (let s = 7.2, i = 0; s < R - .3; s += .19, i++) { m.I.taiko(m.T(s), .25 + i * .03); }
        m.I.brass(m.hz(r, 12), m.T(7.4), 1.2, .045); m.I.brass(m.hz(r, 16), m.T(7.4), 1.2, .04); m.I.swell(m.T(R - 1), .8, .1);
        revealHit(m, R, r, [0, 4, 7, 12], 'bell');
      },
      scene(c) {
        const { x, w, h, cx, cy, M, t, st, dt } = c, [bg, dk, ac, li] = this.c, R = this.R;
        if (t < 3.0) {
          // le trou noir : disque turquoise, particules aspirées
          x.fillStyle = bg; x.fillRect(0, 0, w, h);
          for (let i = 0; i < 6; i++) st.parts.push({ a: rnd(0, TAU), r: Math.max(w, h) * .6, v: rnd(30, 60) });
          st.parts = st.parts.filter(p => { p.r -= p.v * dt * (1 + 60 / Math.max(10, p.r)); p.a += dt * (1 + 50 / Math.max(10, p.r)); P(x, cx + Math.cos(p.a) * p.r, cy + Math.sin(p.a) * p.r * .5, 1, rgba(p.r < 50 ? li : ac, .9)); return p.r > 6; });
          for (let i = 0; i < 220; i++) { const a = i / 220 * TAU + t * 1.2, r = M * (.32 + (i % 5) * .025); P(x, cx + Math.cos(a) * r, cy + Math.sin(a) * r * .32, 1, rgba(i % 3 ? ac : li, .6)); }
          x.fillStyle = '#000'; x.beginPath(); x.arc(cx, cy, M * .17, 0, TAU); x.fill();
          coin(x, c.mys, cx, cy, M * .26, { ang: t * 1.4 });
          vignette(x, w, h, bg, .7);
          st.snap = null;
          return;
        }
        // 3.0 : l'image se fige. On garde la dernière image et on la fissure.
        if (!st.snap) { st.snap = document.createElement('canvas'); st.snap.width = w; st.snap.height = h; st.snap.getContext('2d').drawImage(x.canvas, 0, 0); st.main = crackPath(cx, h, 18); st.branches = this.cracks.slice(1).map(() => branch(st.main, M)); }
        if (t < 4.8) {
          // deux moitiés légèrement décalées le long de la fissure
          const gap = 1 + E.out(seg(t, 3.0, 3.15)) * 1.5;
          x.fillStyle = '#000'; x.fillRect(0, 0, w, h);
          half(x, st.snap, st.main, -1, gap, w, h); half(x, st.snap, st.main, 1, gap, w, h);
          x.fillStyle = 'rgba(0,10,12,.3)'; x.fillRect(0, 0, w, h);
          drawCrack(x, st.main, seg(t, 3.0, 3.12), li);
          st.branches.forEach((b, i) => drawCrack(x, b, seg(t, this.cracks[i + 1], this.cracks[i + 1] + .1), li));
          if (t < 3.08) c.fx.flash(li, .6);
          return;
        }
        // 4.8 : ça éclate en mille morceaux qui tombent
        if (!st.shards) st.shards = shatterPieces(w, h, cx, cy);
        x.fillStyle = '#000'; x.fillRect(0, 0, w, h);
        st.shards.forEach(s => {
          s.vy += 140 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.r += s.vr * dt;
          if (s.y > h + 60) return;
          x.save(); x.translate(s.x, s.y); x.rotate(s.r); x.beginPath(); s.pts.forEach(([px, py], i) => (i ? x.lineTo(px, py) : x.moveTo(px, py))); x.closePath(); x.clip();
          x.drawImage(st.snap, -s.ox, -s.oy); x.restore();
        });
        if (t < 4.9) c.fx.flash(li, .5);
        // le noir, un point turquoise… qui explose
        if (t > 6.0) {
          const pre = seg(t, 6.0, 6.9);
          if (t < 6.9) { glow(x, cx, cy, 2 + E.in(pre, 3) * M * .2, ac, .9); P(x, cx, cy, 1, li); c.fx.shake(E.in(pre, 4) * 2); }
          else {
            if (!st.boom) { st.boom = true; c.fx.flash('#ffffff', 1); for (let i = 0; i < 260; i++) { const a = rnd(0, TAU), v = rnd(40, 240); st.ex.push({ x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, l: 1, c: i % 3 ? ac : li }); } }
            const q = seg(t, 6.9, R);
            [0, .18, .4].forEach(d => { const u = seg(t, 6.9 + d, 7.9 + d); if (u <= 0 || u >= 1) return; x.strokeStyle = rgba(d ? ac : li, 1 - u); x.lineWidth = 2; x.beginPath(); x.arc(cx, cy, E.out(u) * Math.max(w, h) * .8, 0, TAU); x.stroke(); });
            st.ex.forEach(p => { const back = seg(t, 7.6, R - .1); p.vx *= .965; p.vy *= .965; p.x = lerp(p.x + p.vx * dt, cx, E.in(back, 2) * .12); p.y = lerp(p.y + p.vy * dt, cy, E.in(back, 2) * .12); P(x, p.x, p.y, 1, rgba(p.c, .4 + .6 * p.l)); });
            glow(x, cx, cy, M * (.3 + .5 * q), ac, .5);
            coin(x, c.mys, cx, cy, M * .3 * E.back(seg(t, 7.2, 8.2)), { ang: t * 3 });
            c.fx.shake((1 - seg(t, 6.9, 7.6)) * 6 + seg(t, 8, R) * 2);
          }
        }
      },
    },
    // ---------------------------------------------------------------- Takoras : « Bien joué. », puis tous les jetons viennent s'écraser au centre… et il les fait exploser
    Takoras: {
      R: 12.4, c: ['#04030c', '#1d3fae', '#3cc8ea', '#ffffff'], noSpin: true,
      BOOM: 9.6,
      init(c) {
        const others = SERIES.Takoras.filter(o => o.name !== 'Takoras' && o.img), M = c.M;
        c.st.toks = others.map((o, i) => {
          const im = new Image(); im.src = o.img;
          const ring = i < 6 ? 0 : 1, n = ring ? others.length - 6 : 6, k = ring ? i - 6 : i;
          return { im, at: 3.4 + i * (.33 - i * .006), from: (i * 2.399 + .4) % TAU, slot: k / n * TAU + ring * .31, r: ring ? M * .36 : M * .19 };
        });
        c.st.real = new Image(); c.st.real.src = '/img/jetons/serie-takoras/takoras.gif';
        c.st.clock = 0;
      },
      music(m, R) {
        const C = 65.4, B = this.BOOM;
        // « Bien joué. » : rien qu'une nappe grave et large qui respire (pas de notes)
        m.I.warm(chordHz(m, C, [12, 19, 24, 27]), m.T(.15), 3.1, .05); m.I.sub(C, m.T(.15), 3.1, .16);
        m.I.choir(chordHz(m, C, [24, 31, 36]), m.T(.6), 2.6, .03); m.I.swell(m.T(1.9), 1.2, .05);
        // le grand coup qui lance la suite
        m.I.taiko(m.T(3.2), .9); m.I.impact(m.T(3.2), .6);
        // cordes graves qui martèlent pendant que les jetons arrivent
        bars(m, 3.2, B, 92, [[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [-5, -2, 2]], (t, c2, i, b, len) => {
          m.I.strings(chordHz(m, C, c2, 1), t, len + .05, .028 + i * .004);
          for (let k = 0; k < 8; k++) m.I.bass(m.hz(C, c2[0] + 12), t + k * b / 2, .2, .07);
          if (i >= 2) m.I.choir(chordHz(m, C, c2, 2), t, len, .03 + i * .004);
        });
        // chaque jeton qui s'écrase : un tambour, et tous les 4 un « braam » de cuivres graves
        this.init && Array.from({ length: 16 }, (_, i) => 3.4 + i * (.33 - i * .006) + .5).forEach((at, i) => {
          m.I.taiko(m.T(at), .45 + i * .02);
          if (i % 4 === 3) [0, 7, 12].forEach(n => m.I.brass(m.hz(C, n + 12 + Math.floor(i / 4) * 2), m.T(at), .9, .045));
        });
        // la masse tremble : roulement de tambours qui accélère
        for (let t = 8.4, gap = .22; t < B - .05; t += gap, gap = Math.max(.05, gap * .86)) m.I.taiko(m.T(t), .3 + (t - 8.4) * .25);
        m.I.swell(m.T(8.5), B - 8.5, .14); m.I.choir(chordHz(m, C, [24, 31, 36, 39]), m.T(8.4), B - 8.4, .06);
        // l'explosion, puis le ralenti (tout s'étouffe sous un grand accord)
        m.I.impact(m.T(B), 1); m.I.crash(m.T(B), .18);
        [0, 7, 12, 15].forEach(n => m.I.brass(m.hz(C, n + 12), m.T(B), 2.2, .05));
        m.slow(true, B + .05);
        m.I.choir(chordHz(m, C, [24, 31, 36, 40]), m.T(B + .05), 2.2, .07); m.I.sub(m.hz(C, -12), m.T(B), 2.2, .2);
        m.slow(false, 11.8);
        m.I.swell(m.T(11.8), R - 11.8, .1);
        revealHit(m, R, C * 4, [0, 4, 7, 12], 'bell');
        [0, 7, 12, 16].forEach(n => m.I.brass(m.hz(C, n + 12), m.T(R), 2.2, .05));
        m.I.choir(chordHz(m, C, [24, 28, 31, 36]), m.T(R), 2.4, .06);
      },
      scene(c) {
        const { x, w, h, cx, cy, M, t, st, dt } = c, [, dk, ac, li] = this.c, B = this.BOOM;
        x.fillStyle = '#000'; x.fillRect(0, 0, w, h);
        c.fx.title('Bien joué.', t > .3 && t < 2.8);
        if (t < 3.2) return;
        const slow = t > B + .05 && t < 11.8 ? .18 : 1; st.clock += dt * slow;
        // la caméra pousse doucement vers le centre ; chaque impact donne un petit coup
        st.punch = Math.max(0, (st.punch || 0) - dt * 4);
        const zoom = 1 + E.io(seg(t, 3.2, B)) * .12 + st.punch * .05;
        x.save(); x.translate(cx, cy); x.scale(zoom, zoom); x.translate(-cx, -cy);
        // la galaxie au fond
        const ga = seg(t, 3.2, 4.2);
        for (let i = 0; i < 420; i++) { const arm = i % 3, d = (i / 420) * M * .95, a = arm * 2.09 + d * .045 + st.clock * .2; P(x, cx + Math.cos(a) * d * 1.3 + Math.sin(i) * 3, cy + Math.sin(a) * d * .7 + Math.cos(i) * 3, 1, rgba([ac, dk, li, '#ff7aa2', '#8b5cf6'][i % 5], ga * (.45 * (1 - d / (M * .95)) + .1))); }
        const sz = M * .2, boom = t >= B;
        if (!boom) {
          // ils arrivent de loin, accélèrent, et s'écrasent au centre un par un
          let hits = 0;
          st.toks.forEach(o => {
            const u = seg(t, o.at, o.at + .5); if (u <= 0) return;
            const rot = o.slot + st.clock * .15;
            const sx = cx + Math.cos(o.from) * Math.max(w, h) * .9, sy = cy + Math.sin(o.from) * Math.max(w, h) * .9;
            const tx = cx + Math.cos(rot) * o.r, ty = cy + Math.sin(rot) * o.r * .92;
            if (u >= 1 && !o.hit) { o.hit = true; hits++; }
            const k = E.in(u, 2.2), X = lerp(sx, tx, k), Y = lerp(sy, ty, k);
            if (u < 1) for (let q = 1; q < 6; q++) coin(x, o.im, lerp(sx, tx, E.in(Math.max(0, u - q * .04), 2.2)), lerp(sy, ty, E.in(Math.max(0, u - q * .04), 2.2)), sz, { alpha: .12 * (6 - q) / 5 });
            const settle = o.hit ? E.spring(clamp((t - o.at - .5) / .5)) : 1;
            coin(x, o.im, X, Y, sz * (o.hit ? .8 + .2 * settle : 1.15 - .15 * u), { rot: Math.sin(t * 2 + o.slot) * .05 });
          });
          if (hits) { st.punch = 1; c.fx.shake(3); c.fx.flash('#ffffff', .18); }
          const q = seg(t, 8.4, B);
          glow(x, cx, cy, M * (.15 + .5 * q), li, .2 + .7 * E.in(q, 2));
          c.fx.shake(E.in(q, 3) * 4);
          if (t > B - .15) c.fx.flash(li, .6);
          x.restore();
          return;
        }
        // l'explosion : Takoras sort du lot, les jetons volent et retombent au ralenti
        if (!st.flung) { st.flung = true; c.fx.flash('#ffffff', 1); st.toks.forEach(o => { const rot = o.slot + st.clock * .15, a = rot + rnd(-.25, .25), v = rnd(110, 200); o.x = cx + Math.cos(rot) * o.r; o.y = cy + Math.sin(rot) * o.r; o.vx = Math.cos(a) * v; o.vy = Math.sin(a) * v - 70; o.ro = 0; o.vr = rnd(-3, 3); }); }
        const cdt = dt * slow;
        st.toks.forEach(o => { o.vy += 150 * cdt; o.x += o.vx * cdt; o.y += o.vy * cdt; o.ro += o.vr * cdt; coin(x, o.im, o.x, o.y, sz, { rot: o.ro }); });
        [0, .3, .6].forEach(d => { const u = seg(t, B + d, B + 1.3 + d); if (u <= 0 || u >= 1) return; x.strokeStyle = rgba(d ? ac : li, 1 - u); x.lineWidth = 3 - d * 2; x.beginPath(); x.arc(cx, cy, E.out(u) * M * 1.1, 0, TAU); x.stroke(); });
        glow(x, cx, cy, M * .55, ac, .55);
        coin(x, st.real, cx, cy, M * .4 * E.back(seg(t, B, B + .7)));
        x.restore();
        if (t > 11.75 && t < 11.9) c.fx.flash(li, .6);
        c.fx.shake(slow < 1 ? .7 : 1.8);
      },
    },
  };
  FILMS.Kraios = FILMS['Kraïos'];

  // ---------- petites formes utilisées par les films
  // une vitre : quadrilatère penché, bord clair, reflet qui glisse, et le reflet du jeton dedans
  function pane(x, X, Y, W, H, sk, t, ph, a, mys, rs) {
    const pts = [[X, Y], [X + W, Y + W * sk], [X + W, Y + H + W * sk], [X, Y + H]];
    x.save(); x.globalAlpha *= a; x.beginPath(); pts.forEach(([px, py], i) => (i ? x.lineTo(px, py) : x.moveTo(px, py))); x.closePath();
    x.fillStyle = 'rgba(201,166,242,.09)'; x.fill(); x.strokeStyle = 'rgba(255,255,255,.55)'; x.lineWidth = 1; x.stroke();
    x.clip();
    const bx = X + ((t * 34 + ph * 60) % (W + 70)) - 35;
    x.fillStyle = 'rgba(255,255,255,.32)'; x.beginPath(); x.moveTo(bx, Y - 10); x.lineTo(bx + 6, Y - 10); x.lineTo(bx - 14, Y + H + 20); x.lineTo(bx - 20, Y + H + 20); x.fill();
    x.fillStyle = 'rgba(255,255,255,.18)'; x.beginPath(); x.moveTo(bx + 9, Y - 10); x.lineTo(bx + 11, Y - 10); x.lineTo(bx - 9, Y + H + 20); x.lineTo(bx - 11, Y + H + 20); x.fill();
    if (mys && rs) coin(x, mys, X + W / 2, Y + H * .5, rs, { alpha: .35, ang: t * .6 + ph });
    x.restore();
  }
  // une flèche de lumière (pointe, tige, empennage) et sa traînée
  function arrow(x, X, Y, a, col, tail) {
    const dx = Math.cos(a), dy = Math.sin(a), L = 40;
    glow(x, X - dx * L * .4, Y - dy * L * .4, L * .55, tail, .35);
    for (let i = 0; i < 26; i++) P(x, X - dx * (L + i * 2), Y - dy * (L + i * 2), 2, rgba(tail, (1 - i / 26) * .55));
    x.strokeStyle = col; x.lineWidth = 2; x.beginPath(); x.moveTo(X, Y); x.lineTo(X - dx * L, Y - dy * L); x.stroke();
    x.fillStyle = col; x.beginPath(); x.moveTo(X + dx * 7, Y + dy * 7); x.lineTo(X - dx * 3 - dy * 5, Y - dy * 3 + dx * 5); x.lineTo(X - dx * 3 + dy * 5, Y - dy * 3 - dx * 5); x.fill();
    [-1, 1].forEach(s => { x.beginPath(); x.moveTo(X - dx * (L - 3), Y - dy * (L - 3)); x.lineTo(X - dx * (L + 5) - s * dy * 5, Y - dy * (L + 5) + s * dx * 5); x.stroke(); });
  }
  // une grande étoile filante (Astra) : tête de lumière, longue traînée dorée qui s'effile, étincelles qui s'en détachent
  function rock(x, X, Y, r, z, st, dt) {
    const dx = X - x.canvas.width * .12, dy = Y - x.canvas.height * .14, d = Math.hypot(dx, dy) || 1, ux = -dx / d, uy = -dy / d;
    const L = r * 9 + 30, a = clamp(z * 3);
    // traînée : large et douce, puis un trait vif au centre
    for (let i = 0; i < 24; i++) { const f = i / 24; glow(x, X + ux * L * f, Y + uy * L * f, r * (1.6 - f * 1.3) + 2, i % 3 ? '#f6d39a' : '#ffe9c2', .16 * (1 - f) * a); }
    x.strokeStyle = rgba('#fff4dc', .85 * a); x.lineWidth = Math.max(1, r * .45); x.lineCap = 'round';
    x.beginPath(); x.moveTo(X, Y); x.lineTo(X + ux * L * .55, Y + uy * L * .55); x.stroke();
    x.strokeStyle = rgba('#f6d39a', .45 * a); x.lineWidth = Math.max(1, r * .25); x.beginPath(); x.moveTo(X, Y); x.lineTo(X + ux * L, Y + uy * L); x.stroke();
    if (Math.random() < .9) st.embers.push({ x: X + rnd(-r, r) * .5, y: Y + rnd(-r, r) * .5, vx: ux * rnd(15, 50) + rnd(-12, 12), vy: uy * rnd(15, 50) + rnd(-12, 12), l: 1 });
    st.embers = st.embers.filter(e => { e.x += e.vx * dt; e.y += e.vy * dt; e.l -= dt * 1.3; P(x, e.x, e.y, e.l > .6 ? 2 : 1, rgba(e.l > .5 ? '#ffffff' : '#f6d39a', e.l)); return e.l > 0; });
    // tête : halo doré, cœur blanc, étoile à 4 branches
    glow(x, X, Y, r * 3 + 4, '#f6d39a', .55 * a); glow(x, X, Y, r * 1.4 + 2, '#ffffff', .9 * a);
    twinkle(x, X, Y, Math.round(r * 1.6 + 3), '#ffffff');
  }
  // une ombre floue et allongée (on devine une baleine), avec sa queue
  function shadow(x, X, Y, L, dir, a = .92) {
    const g = x.createRadialGradient(X, Y, 0, X, Y, L * .55);
    g.addColorStop(0, `rgba(0,0,6,${a})`); g.addColorStop(.6, `rgba(0,0,8,${a * .6})`); g.addColorStop(1, 'rgba(0,0,8,0)');
    x.save(); x.translate(X, Y); x.scale(1, .32); x.translate(-X, -Y); x.fillStyle = g; x.fillRect(X - L, Y - L, L * 2, L * 2); x.restore();
    const tx = X - dir * L * .62, t2 = x.createRadialGradient(tx, Y, 0, tx, Y, L * .22);
    t2.addColorStop(0, `rgba(0,0,6,${a * .8})`); t2.addColorStop(1, 'rgba(0,0,8,0)');
    x.fillStyle = t2; [-1, 1].forEach(s => x.fillRect(tx - L * .22, Y + s * L * .08 - L * .22, L * .44, L * .44));
  }
  // une carpe stylisée : corps en perles qui ondule, queue en éventail, deux nageoires
  function koi(x, X, Y, a, L, col, spot, ph) {
    const n = 9, dx = Math.cos(a), dy = Math.sin(a);
    for (let i = n - 1; i >= 0; i--) {
      const f = i / n, wv = Math.sin(ph - i * .7) * L * .05 * f, r = L * .13 * (1 - f * .7) + .6;
      const px = X - dx * L * f + -dy * wv, py = Y - dy * L * f + dx * wv;
      if (i === n - 1) { x.fillStyle = rgba(col, .85); x.beginPath(); x.moveTo(px, py); x.lineTo(px - dx * L * .2 - dy * L * .14, py - dy * L * .2 + dx * L * .14); x.lineTo(px - dx * L * .2 + dy * L * .14, py - dy * L * .2 - dx * L * .14); x.fill(); }
      if (i === 2) [-1, 1].forEach(s => { x.fillStyle = rgba(col, .7); x.beginPath(); x.moveTo(px, py); x.lineTo(px - dx * L * .12 + s * -dy * L * .17, py - dy * L * .12 + s * dx * L * .17); x.lineTo(px - dx * L * .2, py - dy * L * .2); x.fill(); });
      x.fillStyle = i === 3 || i === 5 ? spot : col; x.beginPath(); x.arc(px, py, r, 0, TAU); x.fill();
    }
  }
  // une plume : tige + barbes de chaque côté, plus larges au milieu
  function feather(x, X, Y, a, L, col, shade) {
    const dx = Math.cos(a), dy = Math.sin(a);
    for (let i = 0; i < L; i++) { const wd = Math.sin((i / L) * Math.PI) * L * .2, px = X + dx * i, py = Y + dy * i; [-1, 1].forEach(s => { for (let k = 1; k <= wd; k++) P(x, px - s * dy * k + dx * k * .4, py + s * dx * k + dy * k * .4, 1, rgba(s > 0 ? col : shade, .85 - k / (wd + 2) * .4)); }); }
    x.strokeStyle = rgba(shade, .9); x.lineWidth = 1; x.beginPath(); x.moveTo(X, Y); x.lineTo(X + dx * L, Y + dy * L); x.stroke();
  }
  // fissure : ligne brisée du haut en bas, et ses branches
  function crackPath(cx, h, n) { const pts = [[cx + rnd(-6, 6), -2]]; for (let i = 1; i <= n; i++) pts.push([cx + rnd(-10, 10), (i / n) * (h + 4)]); return pts; }
  function branch(main, M) { const s = main[Math.floor(rnd(2, main.length - 2))]; let [X, Y] = s; const pts = [[X, Y]], a = rnd(0, TAU); for (let i = 0; i < 6; i++) { X += Math.cos(a + rnd(-.5, .5)) * M * .08; Y += Math.sin(a + rnd(-.5, .5)) * M * .08; pts.push([X, Y]); } return pts; }
  function drawCrack(x, pts, k, col) { if (k <= 0) return; const n = Math.max(1, Math.floor((pts.length - 1) * k)); x.strokeStyle = col; x.lineWidth = 1; x.beginPath(); pts.slice(0, n + 1).forEach(([px, py], i) => (i ? x.lineTo(px, py) : x.moveTo(px, py))); x.stroke(); x.strokeStyle = 'rgba(0,0,0,.8)'; x.beginPath(); pts.slice(0, n + 1).forEach(([px, py], i) => (i ? x.lineTo(px + 1, py) : x.moveTo(px + 1, py))); x.stroke(); }
  function half(x, snap, main, side, gap, w, h) {
    x.save(); x.beginPath(); x.moveTo(side < 0 ? 0 : w, -4); main.forEach(([px, py]) => x.lineTo(px, py)); x.lineTo(side < 0 ? 0 : w, h + 4); x.closePath(); x.clip();
    x.drawImage(snap, side * gap, side * gap * .3); x.restore();
  }
  // éclats : la grille de l'image coupée en triangles qui partent depuis le centre
  function shatterPieces(w, h, cx, cy) {
    const C = 14, Rw = 8, cw = w / C, rh = h / Rw, out = [];
    for (let i = 0; i < C; i++) for (let j = 0; j < Rw; j++) {
      const x0 = i * cw, y0 = j * rh, jit = () => rnd(-cw * .25, cw * .25);
      const a = [x0 + jit(), y0 + jit()], b = [x0 + cw + jit(), y0 + jit()], c2 = [x0 + cw + jit(), y0 + rh + jit()], d = [x0 + jit(), y0 + rh + jit()];
      [[a, b, c2], [a, c2, d]].forEach(tri => {
        const mx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3, my = (tri[0][1] + tri[1][1] + tri[2][1]) / 3, ang = Math.atan2(my - cy, mx - cx), v = rnd(30, 140);
        out.push({ x: mx, y: my, ox: mx, oy: my, pts: tri.map(([px, py]) => [px - mx, py - my]), vx: Math.cos(ang) * v, vy: Math.sin(ang) * v - rnd(10, 60), r: 0, vr: rnd(-3, 3) });
      });
    }
    return out;
  }

  // Jetons rares sans film à eux (une future série) : une version simple
  const GENERIC = j => ({
    R: 5, c: ['#05050a', '#312e81', j.glow || '#a78bfa', '#ffffff'],
    music(m, R) { const r = 196; bars(m, .3, R - .3, 96, [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2]], (t, c, i, b, len) => { m.I.pad(chordHz(m, r, c), t, len, .03); [0, 1, 2, 1].forEach((n, k) => m.I.bell(m.hz(r, c[n] + 12), t + k * b, .04, 1)); }); m.I.swell(m.T(R - 1), .8, .1); revealHit(m, R, r, [0, 4, 7, 12]); },
    scene(c) { const { x, w, h, cx, cy, M, t } = c, k = seg(t, 0, this.R); x.fillStyle = this.c[0]; x.fillRect(0, 0, w, h); glow(x, cx, cy, M * (.4 + .4 * k), this.c[2], .4); coin(x, c.mys, cx, cy, M * .3, { ang: t * lerp(1, 8, E.in(k, 2)) }); vignette(x, w, h); },
  });

  // =====================================================================
  // Lecture
  // =====================================================================
  function play(j) {
    return new Promise(resolve => {
      const F = FILMS[j.name] || GENERIC(j), R = F.R, HOLD = 2.6, D = R + HOLD;
      const th = { c: F.c };
      const root = document.createElement('div');
      root.className = 'cine';
      root.innerHTML = `<canvas class="cine-cv"></canvas><div class="cine-flash"></div><div class="cine-card"></div><div class="cine-title"><b></b><small></small></div><div class="cine-skip">${t('cine_skip')}</div>`;
      root.style.setProperty('--cc', th.c[2]);
      root.querySelector('.cine-title b').textContent = jn(j.name);
      root.querySelector('.cine-title small').textContent = '1/' + j.odds.toLocaleString(LOCALE());
      document.body.appendChild(root);
      const cv = root.querySelector('canvas'), fl = root.querySelector('.cine-flash'), skip = root.querySelector('.cine-skip'), card = root.querySelector('.cine-card');
      const live = document.createElement('img'); live.className = 'px cine-live'; live.alt = ''; live.hidden = true; live.src = texOf(j); cv.after(live);
      const w = Math.ceil(innerWidth / S), h = Math.ceil(innerHeight / S);
      cv.width = w; cv.height = h;
      const x = cv.getContext('2d'); x.imageSmoothingEnabled = false;
      const img = new Image(); img.src = texOf(j);
      const mys = new Image(); mys.src = MYSTERE;
      const TS = (j.grid || 64) / 64;
      // effets communs : flash coloré, écran blanc, tremblement, carton de texte
      let flashA = 0, flashC = '#ffffff', whiteA = 0, shakeA = 0;
      const fx = {
        flash(col, a) { flashC = col; flashA = Math.max(flashA, a); },
        white(a) { whiteA = Math.max(whiteA, a); },
        shake(a) { shakeA = Math.max(shakeA, a); },
        // carton de texte : chaque lettre arrive l'une après l'autre (CSS)
        title(txt, on) {
          if (card.dataset.t !== txt) { card.dataset.t = txt; card.setAttribute('aria-label', txt); card.innerHTML = [...txt].map((ch, i) => `<span style="--i:${i}" aria-hidden="true">${ch === ' ' ? '&nbsp;' : ch}</span>`).join(''); }
          card.classList.toggle('on', !!on);
        },
      };
      const c = { x, w, h, cx: w / 2, cy: h / 2, M: Math.min(w, h), t: 0, dt: 0, st: {}, img, mys, fx, live };
      const t0 = performance.now();
      let ended = false, last = t0, jump = 0, rev = null, broken = false;
      const skipAt = t0 + 2000;
      // jamais bloqué : si une scène ou la musique plante sur un appareil, on passe à la révélation au lieu de rester sur un écran figé
      const fail = (where, e) => { console.error('[cinématique]', j.name, where, e); if (!broken) { broken = true; const tt = (performance.now() - t0) / 1000 + jump; if (tt < R) jump += R - tt; } };
      try { F.init?.(c); } catch (e) { fail('init', e); }
      let mus = { stop() {}, slow() {} };
      try { mus = trackOf(j.name, D) || (() => { const m = Music(); if (m) F.music(m, R); return m; })() || mus; } catch (e) { console.error('[cinématique] musique', j.name, e); try { mus.stop?.(); } catch {} }
      requestAnimationFrame(() => root.classList.add('on'));

      function frame(now) {
        if (ended) return;
        const tt = (now - t0) / 1000 + jump;
        c.dt = Math.min(.05, (now - last) / 1000); last = now; c.t = tt;
        skip.classList.toggle('on', now > skipAt && tt < R - .3);
        shakeA = 0; whiteA = 0;
        x.save();
        if (tt < R && !broken) {
          try { F.scene.call(F, c); } catch (e) { x.restore(); fail('scène', e); requestAnimationFrame(frame); return; }
          // bandes noires de cinéma
          const bar = Math.round(E.out(seg(tt, 0, .6)) * h * .085);
          x.fillStyle = '#000'; x.fillRect(0, 0, w, bar); x.fillRect(0, h - bar, w, bar);
        } else {
          if (!rev) { rev = { at: now }; if (!F.noFlash) { flashA = 1; flashC = '#ffffff'; } root.classList.add('named'); fx.title('', false); rev.streaks = Array.from({ length: 70 }, () => ({ a: rnd(0, TAU), r: rnd(4, 20), v: rnd(3, 9), L: rnd(6, 22), life: 1 })); }
          reveal(now - rev.at);
          try { F.over?.call(F, c, now - rev.at); } catch (e) { console.error(e); }
        }
        x.restore();
        // tremblement (petit zoom pour ne jamais voir les bords)
        cv.style.transform = shakeA > .05 ? `translate(${rnd(-shakeA, shakeA) * S}px, ${rnd(-shakeA, shakeA) * S}px) scale(1.03)` : '';
        // écran blanc (Astra, Néphéris) et flash
        const fa = Math.max(whiteA, flashA);
        fl.style.opacity = fa; fl.style.background = whiteA >= flashA ? '#fff' : flashC;
        flashA = Math.max(0, flashA - c.dt * 2.6);
        if (tt >= D) return finish();
        requestAnimationFrame(frame);
      }
      // la révélation (commune) : le jeton arrive de profil en tournant vite, freine, se pose de face ; rayons, ondes
      function reveal(ms) {
        const { cx } = c, ry = h * .42, turn = clamp(ms / 900), q = clamp(ms / 450);
        const size = Math.min(w, h) * .5 * (.55 + .45 * E.back(clamp(ms / 520)));
        x.fillStyle = th.c[0]; x.fillRect(0, 0, w, h);
        const nR = 14, RR = Math.hypot(w, h);
        for (let i = 0; i < nR; i++) { const a0 = ms / 1000 * .3 + i / nR * TAU, a1 = a0 + Math.PI / nR * .35; x.fillStyle = rgba(i % 2 ? th.c[2] : th.c[3], .05 + .08 * (1 - turn)); x.beginPath(); x.moveTo(cx, ry); x.lineTo(cx + Math.cos(a0) * RR, ry + Math.sin(a0) * RR); x.lineTo(cx + Math.cos(a1) * RR, ry + Math.sin(a1) * RR); x.fill(); }
        glow(x, cx, ry, size * 1.6, th.c[2], .7);
        [0, .25].forEach(d => { const qq = clamp((ms / 1000 - d) / .55); if (qq <= 0 || qq >= 1) return; x.strokeStyle = rgba(d ? th.c[2] : th.c[3], 1 - qq); x.lineWidth = d ? 2 : 3; x.beginPath(); x.arc(cx, ry, size * (.55 + qq * 2.4), 0, TAU); x.stroke(); });
        rev.streaks.forEach(sk => { sk.r += sk.v; sk.v *= .97; sk.life -= .018; if (sk.life <= 0) return; x.strokeStyle = rgba(th.c[3], sk.life * .8); x.lineWidth = 1; x.beginPath(); x.moveTo(cx + Math.cos(sk.a) * sk.r, ry + Math.sin(sk.a) * sk.r); x.lineTo(cx + Math.cos(sk.a) * (sk.r + sk.L * sk.life), ry + Math.sin(sk.a) * (sk.r + sk.L * sk.life)); x.stroke(); });
        const spinT = clamp(ms / 1500), ang = F.noSpin ? 0 : (1 - (1 - spinT) ** 4) * Math.PI * 12, bob = Math.sin(ms / 1000 * 2.4) * 2 * spinT;
        // le vrai sprite (animé si c'est un GIF, avec le doodle) posé par-dessus le canvas, à la même place
        const k = cv.getBoundingClientRect().width / w, sz = size * TS * k;
        live.style.width = live.style.height = `${sz}px`;
        live.style.left = `${cv.offsetLeft + cx * k - sz / 2}px`;
        live.style.top = `${cv.offsetTop + (ry + bob) * k - sz / 2}px`;
        live.style.transform = `scaleX(${Math.max(.05, Math.abs(Math.cos(ang)))})`;
        live.hidden = false;
        if (q < 1) for (let i = 0; i < 60; i++) { const a = i / 60 * TAU + i, r = size * (.5 + q * 1.8 + (i % 5) * .08); P(x, cx + Math.cos(a) * r, ry + Math.sin(a) * r, 1, rgba(i % 2 ? th.c[2] : th.c[3], 1 - q)); }
        if (ms < 260) shakeA = Math.max(shakeA, 2 * (1 - ms / 260));
      }
      function finish() {
        if (ended) return; ended = true;
        mus.stop(1.2);
        root.classList.add('out');
        setTimeout(() => root.remove(), 700);
        resolve();
      }
      // passer : on va directement à la révélation
      root.addEventListener('pointerdown', () => {
        const tt = (performance.now() - t0) / 1000 + jump;
        if ((performance.now() < skipAt && !broken) || tt >= R - .3) return;
        jump += R - tt; mus.stop(.15);
        const m = Music(); if (m) revealHit(m, 0, 196, [0, 4, 7, 12]);
      });
      // sécurité : onglet en arrière-plan (plus d'images dessinées) → on termine quand même
      setTimeout(finish, D * 1000 + 4000);
      requestAnimationFrame(frame);
    });
  }

  return { play, THEMES: FILMS };
})();

export { CINE };
