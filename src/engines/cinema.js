// Généré par scripts/port/canvas.mjs depuis legacy/cinema.js — ne pas modifier ici, modifier legacy/ puis relancer.
import { SERIES, sfx, speed, texOf, t } from './env';
import FILES from '../data/sounds.json';
import './cinema.css';

// Cinématiques des jetons rares (1/1000 et plus) : coupure au noir, puis une vraie mise en scène propre à chaque jeton.
// Tout est dessiné en direct en pixel art (canvas basse résolution agrandi sans lissage) et la musique est composée
// en direct (Web Audio) : nappe, arpège, battements, riser, puis la révélation.
// Durée selon la rareté : ~4 s pour 1/1000 → ~12 s pour 1/1 000 000. On peut passer après 2 s.
//
// Déroulé (p = avancement de 0 à 1) :
//   0 → .08  noir total, un coup sourd, un point de lumière
//   .08 → .55 la scène du jeton apparaît, sa silhouette tourne doucement au centre
//   .55 → .88 tension : tout s'accélère, la silhouette grossit, battements de cœur, riser
//   .88 → .94 tout est aspiré vers le centre, silence
//   .94 → 1   flash, le jeton apparaît en couleur avec une onde de choc → la fiche normale prend le relais

const CINE = (() => {
  const S = 4; // taille d'un pixel à l'écran
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const lerp = (a, b, k) => a + (b - a) * k;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const ease = k => k * k * (3 - 2 * k);
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };

  // ---------- Thèmes : couleurs (fond, sombre, accent, clair), décor, musique
  // root = note de base (Hz), scale = gamme (demi-tons), chord = accord de la nappe, voice = instrument de l'arpège
  const THEMES = {
    'Vyolis':   { c: ['#0d0517', '#4c1d95', '#c45cf0', '#f5d0fe'], scene: ['fog', 'shards', 'cracks'],        root: 220,   scale: [0, 3, 5, 7, 10], chord: [0, 7, 12, 15],       bpm: 92,  voice: 'pluck' },
    'Lumis':    { c: ['#16050f', '#9d174d', '#f39ad8', '#fff1f9'], scene: ['prism', 'rays', 'sparkles'],      root: 261.6, scale: [0, 2, 4, 7, 9],  chord: [0, 4, 7, 11],        bpm: 100, voice: 'ep' },
    'Nyx':      { c: ['#020208', '#1e1b4b', '#5b5fd6', '#c7d2fe'], scene: ['stars', 'eclipse', 'tendrils'],   root: 146.8, scale: [0, 3, 5, 7, 10], chord: [0, 7, 10, 15],       bpm: 70,  voice: 'pad' },
    'Astra':    { c: ['#07061a', '#2e2a63', '#f2c98f', '#fff7e6'], scene: ['stars', 'meteors', 'bigstar'],    root: 164.8, scale: [0, 2, 4, 7, 9],  chord: [0, 4, 7, 14],        bpm: 112, voice: 'bell' },
    'Kraïos':   { c: ['#03040f', '#1e1b6b', '#4f46e5', '#c7d2fe'], scene: ['clouds', 'rain', 'lightning'],    root: 185,   scale: [0, 3, 5, 7, 10], chord: [0, 7, 12],           bpm: 128, voice: 'pluck', thunder: true },
    'Koi':      { c: ['#07040f', '#3b1d4a', '#ff5a3c', '#fff1ec'], scene: ['water', 'bubbles', 'spiral'],    root: 196,   scale: [0, 2, 4, 7, 9],  chord: [0, 4, 7, 11, 14],    bpm: 96,  voice: 'bell' },
    'Néphéris': { c: ['#12030f', '#86198f', '#f0abfc', '#fdf4ff'], scene: ['nebula', 'runes', 'spiral'],      root: 233.1, scale: [0, 3, 5, 7, 10], chord: [0, 3, 7, 10, 14],    bpm: 84,  voice: 'choir' },
    'Zénith':   { c: ['#0b1120', '#64748b', '#e2e8f0', '#ffffff'], scene: ['skyup', 'sunrays', 'feathers'],   root: 293.7, scale: [0, 2, 4, 7, 9],  chord: [0, 4, 7, 11, 14],    bpm: 96,  voice: 'choir' },
    'Oblivion': { c: ['#010001', '#4c0519', '#fb7185', '#ffe4e6'], scene: ['vortex', 'disk', 'glitch'],       root: 138.6, scale: [0, 1, 5, 7, 8],  chord: [0, 6, 12],           bpm: 64,  voice: 'pad', sub: true },
    'Takoras':  { c: ['#000000', '#312e81', '#ffffff', '#fef3c7'], scene: ['galaxy', 'orbiters', 'pillar'],   root: 130.8, scale: [0, 2, 4, 7, 9],  chord: [0, 4, 7, 12, 16, 19], bpm: 88, voice: 'choir', epic: true },
  };
  const DEFAULT = j => ({ c: ['#05050a', '#312e81', j.glow || '#a78bfa', '#ffffff'], scene: ['stars', 'rays', 'sparkles'], root: 196, scale: [0, 2, 4, 7, 9], chord: [0, 4, 7, 12], bpm: 96, voice: 'ep' });

  // =====================================================================
  // Musique
  // =====================================================================
  function trackOf(name, D) {
    const url = FILES.music?.[name], A = sfx.audio();
    if (!url || !A.ok) return null;
    const el = new Audio(url), src = A.ctx.createMediaElementSource(el), g = A.ctx.createGain();
    g.gain.value = 1; src.connect(g).connect(A.out);
    void el.play().catch(() => {});
    const t = setTimeout(() => g.gain.linearRampToValueAtTime(0, A.ctx.currentTime + .6), Math.max(0, D * 1000 - 600));
    return { stop() { clearTimeout(t); el.pause(); } };
  }
  function music(th, D) {
    const A = sfx.audio(); if (!A.ok) return { stop() {} };
    const { ctx, out } = A, t0 = ctx.currentTime + .02, nodes = [];
    const bus = ctx.createGain(); bus.gain.value = .9; bus.connect(out);
    const hz = n => th.root * 2 ** (n / 12);
    const note = i => hz(th.scale[((i % th.scale.length) + th.scale.length) % th.scale.length] + 12 * Math.floor(i / th.scale.length));
    const mk = (type, f, t, dur, peak, attack, dest = bus, glide) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t); if (glide) o.frequency.exponentialRampToValueAtTime(glide, t + dur);
      g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(peak, t + attack); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      o.connect(g).connect(dest); o.start(t); o.stop(t + dur + .05); nodes.push(o); return o;
    };
    const noiseBuf = (() => { const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; })();
    const noise = (t, dur, peak, from, to, rise = false) => {
      const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = noiseBuf; s.loop = true; f.type = 'lowpass'; f.Q.value = 1.5;
      f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(to, t + dur);
      if (rise) { g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + dur * .95); g.gain.linearRampToValueAtTime(.0001, t + dur); }
      else { g.gain.setValueAtTime(peak, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur); }
      s.connect(f).connect(g).connect(bus); s.start(t); s.stop(t + dur + .05); nodes.push(s);
    };
    const voice = (f, t, dur, v) => {
      if (th.voice === 'mar') { mk('sine', f, t, dur * .6, v, .003); mk('sine', f * 3.9, t, dur * .12, v * .2, .002); }
      else if (th.voice === 'bell') { mk('sine', f, t, dur * 1.4, v * .8, .004); mk('sine', f * 2.76, t, dur * .5, v * .15, .003); }
      else if (th.voice === 'pluck') { mk('triangle', f, t, dur * .7, v, .004); mk('sine', f * 2, t, dur * .2, v * .2, .003); }
      else if (th.voice === 'choir' || th.voice === 'pad') { [-6, 6].forEach(c => { const o = mk('triangle', f, t, dur * 1.6, v * .55, dur * .3); o.detune.value = c; }); }
      else { mk('sine', f, t, dur, v, .008); mk('sine', f * 2, t, dur * .3, v * .25, .004); }
    };
    const T = p => t0 + p * D;

    // 0 : coupure — un gros coup sourd dans le noir
    mk('sine', 110, t0, 1.4, .7, .004, bus, 30);
    noise(t0, .9, .12, 700, 80);
    // Nappe : l'accord du thème, qui s'ouvre (filtre) et monte en volume jusqu'à la tension
    const padF = ctx.createBiquadFilter(); padF.type = 'lowpass'; padF.Q.value = .7; padF.connect(bus);
    padF.frequency.setValueAtTime(220, T(.06)); padF.frequency.exponentialRampToValueAtTime(1800, T(.86));
    th.chord.forEach(n => [-5, 5].forEach(c => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = th.voice === 'pad' ? 'sawtooth' : 'triangle'; o.frequency.value = hz(n - 12); o.detune.value = c;
      g.gain.setValueAtTime(.0001, T(.06)); g.gain.exponentialRampToValueAtTime(.035, T(.5)); g.gain.linearRampToValueAtTime(.05, T(.86)); g.gain.linearRampToValueAtTime(.0001, T(.9));
      o.connect(g).connect(padF); o.start(T(.06)); o.stop(T(.92)); nodes.push(o);
    }));
    // Sub grave continu (Oblivion, Takoras : encore plus lourd)
    if (th.sub || th.epic) { const o = mk('sine', hz(-24), T(.1), D * .78, th.sub ? .22 : .12, D * .4); }
    // Arpège : commence lent et grave, accélère et monte pendant la tension
    const beat = 60 / th.bpm;
    let t = T(.1), i = 0;
    while (t < T(.88)) {
      const p = (t - t0) / D, fast = p > .55 ? 4 : 2, oct = p > .55 ? 7 : 0;
      voice(note(i % 7 + oct + (i % 3 === 2 ? 2 : 0)), t, beat * 1.2, p > .55 ? .07 : .055);
      t += beat / fast; i++;
    }
    // Battements de cœur pendant la tension, de plus en plus rapprochés
    for (let p = .56, gap = .09; p < .87; p += gap, gap = Math.max(.035, gap * .86)) {
      mk('sine', 64, T(p), .22, .45, .004, bus, 40); mk('sine', 64, T(p) + .2, .22, .32, .004, bus, 40);
    }
    // Spécial thème
    if (th.thunder) [.3, .48, .66, .8].forEach(p => noise(T(p), 1.4, .28, 900, 60));
    if (th.clock) for (let p = .1, k = 0; p < .88; p += beat / D, k++) mk('sine', k % 2 ? 330 : 440, T(p), .08, .06, .002); // tic-tac boisé
    if (th.epic) [.25, .4, .55, .7].forEach((p, k) => th.chord.slice(0, 4).forEach((n, m) => voice(hz(n + k * 2), T(p) + m * .06, 1.8, .045)));
    // Riser : souffle qui monte + note qui glisse vers le haut
    noise(T(.5), D * .38, .2, 140, 3200, true);
    mk('triangle', hz(-12), T(.5), D * .38, .07, D * .35, bus, hz(12));
    // Aspiration : petite note à l'envers juste avant le silence
    noise(T(.86), D * .05, .1, 2000, 200);
    // Révélation : gros accord + coup + scintillement
    const R = T(.94);
    mk('sine', 90, R, 2.2, .75, .004, bus, 28);
    noise(R, 1.6, .14, 2400, 200);
    th.chord.forEach((n, k) => { voice(hz(n), R + k * .045, 2.6, .09); voice(hz(n + 12), R + .25 + k * .07, 1.8, .045); });
    return {
      stop(fade = .25) { const n = ctx.currentTime; bus.gain.cancelScheduledValues(n); bus.gain.setValueAtTime(bus.gain.value, n); bus.gain.linearRampToValueAtTime(0, n + fade); setTimeout(() => { nodes.forEach(o => { try { o.stop(); } catch {} }); bus.disconnect(); }, fade * 1000 + 100); },
      // passer la cinématique : on joue directement la révélation
      revealNow() { const n = ctx.currentTime; mk('sine', 90, n, 2, .7, .004, bus, 28); th.chord.forEach((m, k) => voice(hz(m), n + k * .04, 2.2, .08)); },
    };
  }

  // =====================================================================
  // Décors (dessinés dans un petit canvas : w × h « gros pixels »)
  // =====================================================================
  function makeState(th, w, h) {
    const st = { parts: [], stars: [], shards: [], meteors: [], drops: [], flakes: [], bolts: [], cracks: [] };
    for (let i = 0; i < Math.floor(w * h / 60); i++) st.stars.push({ x: Math.random() * w, y: Math.random() * h, z: Math.random(), tw: Math.random() * 6 });
    for (let i = 0; i < 26; i++) st.shards.push({ x: Math.random() * w, y: Math.random() * h, s: rnd(2, 6), v: rnd(.1, .5), r: rnd(0, 6) });
    for (let i = 0; i < 70; i++) st.drops.push({ x: Math.random() * w, y: Math.random() * h, v: rnd(2, 4) });
    for (let i = 0; i < 24; i++) st.flakes.push({ x: Math.random() * w, y: Math.random() * h, v: rnd(.15, .5), a: rnd(0, 6) });
    for (let i = 0; i < 8; i++) st.cracks.push({ a: i / 8 * Math.PI * 2 + rnd(-.3, .3), segs: Array.from({ length: 8 }, () => rnd(-.5, .5)) });
    return st;
  }
  const px = (x, X, Y, s, col) => { x.fillStyle = col; x.fillRect(Math.round(X), Math.round(Y), s, s); };
  const SCENES = {
    // brouillard violet qui respire
    fog(x, w, h, t, k, th) { for (let i = 0; i < 5; i++) { const cx = w / 2 + Math.sin(t * .3 + i) * w * .3, cy = h / 2 + Math.cos(t * .23 + i * 2) * h * .25, g = x.createRadialGradient(cx, cy, 0, cx, cy, w * .4); g.addColorStop(0, rgba(th.c[1], .35 * k)); g.addColorStop(1, rgba(th.c[1], 0)); x.fillStyle = g; x.fillRect(0, 0, w, h); } },
    // éclats de cristal qui flottent
    shards(x, w, h, t, k, th, st) { st.shards.forEach(s => { s.y -= s.v * (1 + k); if (s.y < -8) { s.y = h + 8; s.x = Math.random() * w; } const r = Math.round(s.s); for (let d = -r; d <= r; d++) { const l = r - Math.abs(d); x.fillStyle = rgba(d < 0 ? th.c[3] : th.c[2], .5 + .4 * k); x.fillRect(Math.round(s.x - l / 2), Math.round(s.y + d), Math.max(1, l), 1); } }); },
    // fissures lumineuses qui partent du centre
    cracks(x, w, h, t, k, th, st) { const L = Math.min(w, h) * .5 * k; x.fillStyle = th.c[3]; st.cracks.forEach(c => { let X = w / 2, Y = h / 2; c.segs.forEach((o, i) => { const len = L / 8, a = c.a + o; for (let s = 0; s < len; s++) { X += Math.cos(a); Y += Math.sin(a); if (i * len + s < L) x.fillRect(Math.round(X), Math.round(Y), 1, 1); } }); }); },
    // losanges concentriques qui s'élargissent (comme la texture de Lumis)
    prism(x, w, h, t, k, th) { for (let i = 0; i < 9; i++) { const r = ((t * 18 * (1 + k) + i * 14) % 130); x.strokeStyle = rgba(i % 2 ? th.c[2] : th.c[3], (1 - r / 130) * .7); x.lineWidth = 1; x.beginPath(); x.moveTo(w / 2, h / 2 - r); x.lineTo(w / 2 + r, h / 2); x.lineTo(w / 2, h / 2 + r); x.lineTo(w / 2 - r, h / 2); x.closePath(); x.stroke(); } },
    // rayons qui tournent depuis le centre
    rays(x, w, h, t, k, th) { x.save(); x.translate(w / 2, h / 2); x.rotate(t * .25); for (let i = 0; i < 12; i++) { x.rotate(Math.PI / 6); x.fillStyle = rgba(th.c[2], .07 + .1 * k); x.beginPath(); x.moveTo(0, 0); x.lineTo(w, -8 - k * 10); x.lineTo(w, 8 + k * 10); x.fill(); } x.restore(); },
    // petites étincelles
    sparkles(x, w, h, t, k, th) { for (let i = 0; i < 30 * k + 6; i++) { const X = (Math.sin(i * 91.7 + t * .7) * .5 + .5) * w, Y = (Math.cos(i * 37.3 + t * .5) * .5 + .5) * h; if ((i + Math.floor(t * 6)) % 4 === 0) { px(x, X, Y, 1, th.c[3]); px(x, X - 1, Y, 1, rgba(th.c[2], .6)); px(x, X + 1, Y, 1, rgba(th.c[2], .6)); px(x, X, Y - 1, 1, rgba(th.c[2], .6)); px(x, X, Y + 1, 1, rgba(th.c[2], .6)); } } },
    // ciel étoilé qui défile vers nous
    stars(x, w, h, t, k, th, st) { st.stars.forEach(s => { s.z -= .002 * (1 + k * 6); if (s.z <= 0) { s.z = 1; s.x = Math.random() * w; s.y = Math.random() * h; } const X = w / 2 + (s.x - w / 2) / s.z * .3, Y = h / 2 + (s.y - h / 2) / s.z * .3; if (X < 0 || X > w || Y < 0 || Y > h) return; const b = (Math.sin(t * 3 + s.tw) * .5 + .5) * (1 - s.z); px(x, X, Y, s.z < .25 ? 2 : 1, rgba(s.z < .3 ? th.c[3] : th.c[2], .3 + b * .7)); }); },
    // éclipse : un disque sombre glisse devant un halo
    eclipse(x, w, h, t, k, th) { const cx = w / 2, cy = h * .32, R = Math.min(w, h) * .14; const g = x.createRadialGradient(cx, cy, R * .8, cx, cy, R * 2.6); g.addColorStop(0, rgba(th.c[3], .5 * k + .2)); g.addColorStop(1, rgba(th.c[2], 0)); x.fillStyle = g; x.fillRect(0, 0, w, h); x.fillStyle = th.c[0]; x.beginPath(); x.arc(cx + lerp(R * 1.6, 0, ease(k)), cy, R, 0, 7); x.fill(); },
    // vrilles d'ombre qui rampent sur les bords
    tendrils(x, w, h, t, k, th) { for (let i = 0; i < 10; i++) { const side = i % 2 ? 0 : w, y0 = (i / 10) * h; let X = side, Y = y0; x.fillStyle = rgba(th.c[1], .8); for (let s = 0; s < 40 * k; s++) { X += (side ? -1 : 1) * 1.2; Y += Math.sin(s * .3 + t * 2 + i) * 1.2; x.fillRect(Math.round(X), Math.round(Y), 2, 2); } } },
    // étoiles filantes en diagonale
    meteors(x, w, h, t, k, th, st) { if (Math.random() < .08 + k * .25) st.meteors.push({ x: rnd(0, w * 1.2), y: -5, v: rnd(2, 4) * (1 + k) }); st.meteors = st.meteors.filter(m => { m.x -= m.v; m.y += m.v * .6; for (let i = 0; i < 14; i++) px(x, m.x + i, m.y - i * .6, 1, rgba(i < 2 ? th.c[3] : th.c[2], 1 - i / 14)); return m.y < h + 10; }); },
    // une grande étoile qui grossit au fond
    bigstar(x, w, h, t, k, th) { const cx = w / 2, cy = h * .3, r = 4 + k * 20; x.fillStyle = rgba(th.c[3], .9); for (let i = -r; i <= r; i++) { const l = Math.max(1, (r - Math.abs(i)) * .18); x.fillRect(Math.round(cx + i), Math.round(cy - l / 2), 1, Math.ceil(l)); x.fillRect(Math.round(cx - l / 2), Math.round(cy + i), Math.ceil(l), 1); } },
    // nuages d'orage sombres
    clouds(x, w, h, t, k, th) { for (let i = 0; i < 14; i++) { const X = ((i * 47 + t * 6) % (w + 60)) - 30, Y = (i % 4) * h * .08 + 4, g = x.createRadialGradient(X, Y, 0, X, Y, 28); g.addColorStop(0, rgba(th.c[1], .55)); g.addColorStop(1, rgba(th.c[1], 0)); x.fillStyle = g; x.fillRect(X - 30, Y - 30, 60, 60); } },
    // pluie
    rain(x, w, h, t, k, th, st) { x.fillStyle = rgba(th.c[3], .35); st.drops.forEach(d => { d.y += d.v * (1 + k); d.x -= .6; if (d.y > h) { d.y = -4; d.x = Math.random() * w * 1.2; } x.fillRect(Math.round(d.x), Math.round(d.y), 1, 3); }); },
    // éclairs (flash de tout l'écran au moment de la frappe)
    lightning(x, w, h, t, k, th, st, cine) { if (Math.random() < .015 + k * .05) { st.bolts.push({ x: rnd(w * .1, w * .9), life: 6 }); cine.flash = Math.max(cine.flash, .35); } st.bolts = st.bolts.filter(b => { let X = b.x, Y = 0; x.fillStyle = th.c[3]; while (Y < h * .7) { X += rnd(-2, 2); Y += 1; x.fillRect(Math.round(X), Math.round(Y), 1, 1); if (Math.random() < .03) { let bx = X, by = Y; for (let s = 0; s < 10; s++) { bx += rnd(-2, 2); by += 1; x.fillRect(Math.round(bx), Math.round(by), 1, 1); } } } return --b.life > 0; }); },
    // eau profonde : reflets qui ondulent
    water(x, w, h, t, k, th) { for (let y = 0; y < h; y += 3) { const a = .05 + .08 * Math.sin(y * .15 + t * 2) * (0.6 + k); x.fillStyle = rgba(th.c[1], Math.max(0, a)); x.fillRect(0, y, w, 2); } for (let i = 0; i < 14; i++) { const Y = (i * 23 + t * 5) % h, X = (Math.sin(i * 3 + t * .8) * .5 + .5) * w; x.fillStyle = rgba(th.c[3], .12 + .1 * k); x.fillRect(Math.round(X), Math.round(Y), 6 + (i % 3) * 3, 1); } },
    // bulles qui remontent
    bubbles(x, w, h, t, k, th, st) { st.flakes.forEach(f => { f.y -= f.v * 3 * (1 + k); f.a += .06; if (f.y < -4) { f.y = h + 4; f.x = Math.random() * w; } const X = f.x + Math.sin(f.a) * 3, r = 1 + (f.v > .35 ? 1 : 0); x.strokeStyle = rgba(th.c[3], .7); x.lineWidth = 1; x.beginPath(); x.arc(Math.round(X), Math.round(f.y), r + 1, 0, 7); x.stroke(); px(x, X - r / 2, f.y - r / 2, 1, '#ffffff'); }); },
    // engrenages qui tournent
    gears(x, w, h, t, k, th) { [[w / 2, h / 2, 46, 1], [w * .2, h * .3, 22, -1.8], [w * .82, h * .7, 28, 1.4], [w * .78, h * .22, 16, -2.2]].forEach(([cx, cy, R, sp]) => { const a0 = t * sp * (.4 + k); x.fillStyle = rgba(th.c[2], .25 + .35 * k); for (let i = 0; i < 24; i++) { const a = a0 + i / 24 * Math.PI * 2, r = i % 2 ? R : R + 3; x.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 2, 2); } for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2; x.fillRect(Math.round(cx + Math.cos(a) * (R - 3)), Math.round(cy + Math.sin(a) * (R - 3)), 1, 1); } }); },
    // aiguilles d'horloge géantes
    hands(x, w, h, t, k, th) { const cx = w / 2, cy = h / 2, R = Math.min(w, h) * .42; x.strokeStyle = rgba(th.c[3], .4 + .4 * k); x.lineWidth = 1; [[t * (1 + k * 8), R], [t * (1 + k * 8) / 12, R * .6]].forEach(([a, r]) => { x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a - Math.PI / 2) * r, cy + Math.sin(a - Math.PI / 2) * r); x.stroke(); }); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; px(x, cx + Math.cos(a) * R, cy + Math.sin(a) * R, 2, th.c[2]); } },
    // poussière dorée qui remonte le temps (tombe vers le haut)
    dust(x, w, h, t, k, th, st) { st.flakes.forEach(f => { f.y -= f.v * 2 * (1 + k); if (f.y < 0) { f.y = h; f.x = Math.random() * w; } px(x, f.x, f.y, 1, rgba(th.c[3], .7)); }); },
    // nébuleuse qui tourbillonne
    nebula(x, w, h, t, k, th) { for (let i = 0; i < 7; i++) { const a = t * .2 + i, cx = w / 2 + Math.cos(a) * w * .25, cy = h / 2 + Math.sin(a * 1.3) * h * .22, g = x.createRadialGradient(cx, cy, 0, cx, cy, w * .3); g.addColorStop(0, rgba(i % 2 ? th.c[2] : th.c[1], .28)); g.addColorStop(1, rgba(th.c[1], 0)); x.fillStyle = g; x.fillRect(0, 0, w, h); } },
    // cercle de runes qui tourne
    runes(x, w, h, t, k, th) { const cx = w / 2, cy = h / 2, R = Math.min(w, h) * (.3 + .1 * k); for (let i = 0; i < 16; i++) { const a = t * .5 + i / 16 * Math.PI * 2, X = cx + Math.cos(a) * R, Y = cy + Math.sin(a) * R; const pat = (i * 2654435761) >>> 0; for (let b = 0; b < 9; b++) if (pat >> b & 1) px(x, X - 1 + b % 3, Y - 1 + Math.floor(b / 3), 1, rgba(th.c[3], .5 + .5 * k)); } },
    // spirale de particules aspirée vers le centre
    spiral(x, w, h, t, k, th) { for (let i = 0; i < 90; i++) { const p = ((i / 90) + t * .15) % 1, a = p * 14 + i, r = (1 - p) * Math.min(w, h) * .55; px(x, w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r, 1, rgba(i % 3 ? th.c[2] : th.c[3], p)); } },
    // on monte à travers les nuages vers la lumière
    skyup(x, w, h, t, k, th) { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, rgba(th.c[3], .25 + .4 * k)); g.addColorStop(1, rgba(th.c[1], 0)); x.fillStyle = g; x.fillRect(0, 0, w, h); for (let i = 0; i < 12; i++) { const Y = ((i * 37 + t * 30 * (1 + k)) % (h + 40)) - 20, X = (i * 71) % w, gg = x.createRadialGradient(X, Y, 0, X, Y, 26); gg.addColorStop(0, rgba(th.c[2], .4)); gg.addColorStop(1, rgba(th.c[2], 0)); x.fillStyle = gg; x.fillRect(X - 30, Y - 30, 60, 60); } },
    // rayons de soleil venant d'en haut
    sunrays(x, w, h, t, k, th) { for (let i = 0; i < 9; i++) { const X = w / 2 + (i - 4) * w * .11 + Math.sin(t + i) * 4; x.fillStyle = rgba(th.c[3], .06 + .08 * k); x.beginPath(); x.moveTo(w / 2, -10); x.lineTo(X - 6, h); x.lineTo(X + 6, h); x.fill(); } },
    // plumes qui tombent en se balançant
    feathers(x, w, h, t, k, th, st) { st.flakes.forEach(f => { f.y += f.v; f.a += .05; if (f.y > h) { f.y = -4; f.x = Math.random() * w; } const X = f.x + Math.sin(f.a) * 4; px(x, X, f.y, 1, th.c[3]); px(x, X + 1, f.y + 1, 1, rgba(th.c[2], .8)); px(x, X + 2, f.y + 2, 1, rgba(th.c[2], .5)); }); },
    // trou noir : particules aspirées
    vortex(x, w, h, t, k, th, st) { for (let i = 0; i < 4 + k * 8; i++) { const a = rnd(0, 7), r = Math.max(w, h) * .6; st.parts.push({ a, r, v: rnd(.6, 1.4) }); } st.parts = st.parts.filter(p => { p.r -= p.v * (1 + k * 2); p.a += .04 * (1 + 60 / Math.max(10, p.r)); px(x, w / 2 + Math.cos(p.a) * p.r, h / 2 + Math.sin(p.a) * p.r * .55, 1, rgba(p.r < 40 ? th.c[3] : th.c[2], .9)); return p.r > 4; }); },
    // disque d'accrétion rouge
    disk(x, w, h, t, k, th) { for (let i = 0; i < 260; i++) { const a = i / 260 * Math.PI * 2 + t * 1.5, r = 30 + (i % 5) * 4 + k * 10; px(x, w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r * .35, 1, rgba(i % 3 ? th.c[2] : th.c[3], .6)); } x.fillStyle = '#000'; x.beginPath(); x.arc(w / 2, h / 2, 14 + k * 6, 0, 7); x.fill(); },
    // déchirures numériques (bandes décalées)
    glitch(x, w, h, t, k, th, st, cine) { if (Math.random() < k * .25) { const y = Math.floor(rnd(0, h)), hh = Math.floor(rnd(1, 5)); try { const img = x.getImageData(0, y, w, hh); x.putImageData(img, Math.floor(rnd(-8, 8)), y); } catch {} x.fillStyle = rgba(th.c[2], .5); x.fillRect(0, y, w, 1); } },
    // galaxie (Takoras) : spirale multicolore
    galaxy(x, w, h, t, k, th) { const cols = ['#c4b5fd', '#f0abfc', '#93c5fd', '#fde68a', '#86efac', '#fda4af', '#ffffff']; for (let i = 0; i < 500; i++) { const arm = i % 3, d = (i / 500) * Math.min(w, h) * .6, a = arm * 2.09 + d * .06 + t * .3; px(x, w / 2 + Math.cos(a) * d + Math.sin(i) * 3, h / 2 + Math.sin(a) * d * .6 + Math.cos(i) * 3, 1, rgba(cols[i % cols.length], .5 * (1 - d / (Math.min(w, h) * .6)) + .15)); } },
    // tous les autres jetons tournent autour (Takoras)
    orbiters(x, w, h, t, k, th, st, cine) { const imgs = cine.orbit; if (!imgs) return; imgs.forEach((im, i) => { if (!im.complete || !im.naturalWidth) return; const a = t * (.6 + k) + i / imgs.length * Math.PI * 2, R = Math.min(w, h) * (.42 - .12 * k), s = 12; x.globalAlpha = .85; x.drawImage(im, Math.round(w / 2 + Math.cos(a) * R - s / 2), Math.round(h / 2 + Math.sin(a) * R * .55 - s / 2), s, s); x.globalAlpha = 1; }); },
    // pilier de lumière divine
    pillar(x, w, h, t, k, th) { const W = 6 + k * 26, g = x.createLinearGradient(w / 2 - W, 0, w / 2 + W, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, `rgba(255,255,255,${.15 + .5 * k})`); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(w / 2 - W, 0, W * 2, h); },
  };

  // =====================================================================
  // Lecture
  // =====================================================================
  function play(j) {
    return new Promise(resolve => {
      const th = THEMES[j.name] || DEFAULT(j);
      const L = Math.log10(Math.max(1000, j.odds));
      const D = Math.max(2.2, (4 + 8 * (L - 3) / 3) * Math.max(.5, speed() || 1)); // secondes
      const root = document.createElement('div');
      root.className = 'cine';
      root.innerHTML = `<canvas class="cine-cv"></canvas><div class="cine-flash"></div><div class="cine-skip">${t('cine_skip')}</div>`;
      document.body.appendChild(root);
      const cv = root.querySelector('canvas'), fl = root.querySelector('.cine-flash'), skip = root.querySelector('.cine-skip');
      const w = Math.ceil(innerWidth / S), h = Math.ceil(innerHeight / S);
      cv.width = w; cv.height = h;
      const x = cv.getContext('2d'); x.imageSmoothingEnabled = false;
      const st = makeState(th, w, h);
      const cine = { flash: 0 };
      // le jeton : vraie image + silhouette (même dessin, rempli de la couleur sombre du thème)
      const img = new Image(); img.src = texOf(j);
      const G = j.grid || 64, TS = G / 64; // dessin plus grand (74×74) : silhouette à sa vraie grille, affiché un peu plus grand
      const sil = document.createElement('canvas'); sil.width = sil.height = G;
      img.onload = () => { const s = sil.getContext('2d'); s.imageSmoothingEnabled = false; s.drawImage(img, 0, 0, G, G); s.globalCompositeOperation = 'source-in'; s.fillStyle = th.c[0]; s.fillRect(0, 0, G, G); };
      if (th.scene.includes('orbiters')) cine.orbit = SERIES.Takoras.filter(o => o.name !== j.name && o.img).map(o => { const im = new Image(); im.src = o.img; return im; });
      // musique sous licence du jeton si elle existe (src/data/sounds.json), sinon la musique générée
      const mus = trackOf(j.name, D) || music(th, D);
      const t0 = performance.now();
      let ended = false, skipAt = t0 + 2000, jumped = false;
      requestAnimationFrame(() => root.classList.add('on'));

      function frame(now) {
        if (ended) return;
        let p = (now - t0) / (D * 1000);
        if (jumped) p = Math.max(p, .94);
        const tt = (now - t0) / 1000;
        skip.classList.toggle('on', now > skipAt && p < .9);
        // fond
        x.globalAlpha = 1; x.fillStyle = th.c[0]; x.fillRect(0, 0, w, h);
        // intensité de la scène selon la phase
        const build = clamp((p - .08) / .47), tense = clamp((p - .55) / .33), suck = clamp((p - .88) / .06);
        const k = clamp(build * .5 + tense * .5) * (1 - suck);
        if (p < .08) { const r = 1 + p / .08 * 2; x.fillStyle = th.c[3]; x.fillRect(Math.round(w / 2 - r / 2), Math.round(h / 2 - r / 2), Math.ceil(r), Math.ceil(r)); }
        else if (p < .94) {
          x.globalAlpha = clamp(build * 2) * (1 - suck * .8);
          th.scene.forEach(n => { x.save(); SCENES[n]?.(x, w, h, tt, k, th, st, cine); x.restore(); });
          x.globalAlpha = 1;
          // vignette
          const g = x.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .2, w / 2, h / 2, Math.max(w, h) * .7); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, rgba(th.c[0], .85)); x.fillStyle = g; x.fillRect(0, 0, w, h);
        }
        // le jeton au centre : silhouette qui tourne (de plus en plus vite), puis vrai jeton
        const cx = w / 2, cy = h / 2;
        if (p >= .08 && p < .94) {
          const size = lerp(10, Math.min(w, h) * .42, ease(clamp((p - .08) / .8))) * (1 - suck * .9);
          const spin = tt * (1.2 + tense * 9), sx = Math.cos(spin);
          // halo qui bat avec la tension
          const beat = tense ? (Math.sin(tt * (6 + tense * 14)) * .5 + .5) : .3;
          const gr = x.createRadialGradient(cx, cy, 0, cx, cy, size * (1 + .4 * beat));
          gr.addColorStop(0, rgba(th.c[2], .25 + .45 * k * beat)); gr.addColorStop(1, rgba(th.c[2], 0));
          x.fillStyle = gr; x.fillRect(0, 0, w, h);
          x.save(); x.translate(cx, cy); x.scale(Math.max(.06, Math.abs(sx)), 1);
          x.drawImage(tense > .85 ? img : sil, -size * TS / 2, -size * TS / 2, size * TS, size * TS); // le dessin se devine juste avant l'explosion
          x.restore();
          // contour lumineux de la silhouette (petits pixels autour)
          for (let i = 0; i < 24 * k; i++) { const a = rnd(0, 7), r = size * .5 * (.95 + Math.random() * .1); px(x, cx + Math.cos(a) * r * Math.abs(sx), cy + Math.sin(a) * r, 1, rgba(th.c[3], .8)); }
        }
        if (p >= .94) {
          // révélation : le jeton en couleur, grand, avec onde de choc
          const q = clamp((p - .94) / .06), size = Math.min(w, h) * (.5 + .1 * ease(q));
          if (!cine.revealed) { cine.revealed = true; cine.flash = 1; }
          x.fillStyle = th.c[0]; x.fillRect(0, 0, w, h);
          const gr = x.createRadialGradient(cx, cy, 0, cx, cy, size * 1.6); gr.addColorStop(0, rgba(th.c[2], .7)); gr.addColorStop(1, rgba(th.c[0], 0)); x.fillStyle = gr; x.fillRect(0, 0, w, h);
          x.strokeStyle = rgba(th.c[3], 1 - q); x.lineWidth = 2; x.beginPath(); x.arc(cx, cy, size * (.6 + q * 2.2), 0, 7); x.stroke();
          for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2 + i, r = size * (.5 + q * 1.8 + (i % 5) * .08); px(x, cx + Math.cos(a) * r, cy + Math.sin(a) * r, 1, rgba(i % 2 ? th.c[2] : th.c[3], 1 - q)); }
          x.drawImage(img, cx - size * TS / 2, cy - size * TS / 2, size * TS, size * TS);
        }
        // tremblement pendant la tension
        const sh = tense * (1 - suck) * 3;
        cv.style.transform = sh ? `translate(${rnd(-sh, sh)}px, ${rnd(-sh, sh)}px) scale(1.02)` : '';
        // flash (éclairs, révélation)
        if (cine.flash > 0) { fl.style.opacity = cine.flash; fl.style.background = cine.revealed ? '#fff' : th.c[3]; cine.flash = Math.max(0, cine.flash - .06); } else fl.style.opacity = 0;
        if (p >= 1) return finish();
        requestAnimationFrame(frame);
      }
      function finish() {
        if (ended) return; ended = true;
        mus.stop(1.2);
        root.classList.add('out');
        setTimeout(() => root.remove(), 700);
        resolve();
      }
      // passer : on saute directement à la révélation
      root.addEventListener('pointerdown', () => {
        if (performance.now() < skipAt || jumped) return;
        jumped = true; mus.stop(.15); mus.revealNow?.();
        D_jump();
      });
      function D_jump() { /* la frame suivante affiche la révélation (p forcé à .94) puis finit 0,6 s plus tard */ setTimeout(finish, 650); }
      // sécurité : si l'onglet est en arrière-plan (plus d'images dessinées), on termine quand même
      setTimeout(finish, D * 1000 + 1500);
      requestAnimationFrame(frame);
    });
  }

  return { play, THEMES };
})();

export { CINE };
