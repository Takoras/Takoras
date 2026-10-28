// Cinématiques des jetons rares. Repris de legacy/cinema.js ; ce fichier est maintenant la référence (plus régénéré).
import { LOCALE, SERIES, jn, sfx, speed, texOf, t } from './env';
const MYSTERE = '/img/jetons/mystere.png';
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
  const S = 3; // taille d'un pixel à l'écran (plus fin qu'avant : rendu plus net)
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const lerp = (a, b, k) => a + (b - a) * k;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const ease = k => k * k * (3 - 2 * k);
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };

  // ---------- Thèmes : couleurs (fond, sombre, accent, clair), décor, musique
  // root = note de base (Hz), scale = gamme (demi-tons), chord = accord de la nappe, voice = instrument de l'arpège
  const THEMES = {
    'Vyolis':   { c: ['#0e0718', '#5b3a8c', '#c9a6f2', '#ffffff'], scene: ['dust', 'orbitals'],          root: 220,   scale: [0, 3, 5, 7, 10], chord: [0, 7, 12, 15],       bpm: 92,  voice: 'pluck' },
    'Lumis':    { c: ['#16050f', '#a33a76', '#f7a8d8', '#fff0f8'], scene: ['dust', 'diamonds'],          root: 261.6, scale: [0, 2, 4, 7, 9],  chord: [0, 4, 7, 11],        bpm: 100, voice: 'ep' },
    'Nyx':      { c: ['#05051a', '#2f2a8f', '#7c8cf8', '#dbe4ff'], scene: ['stars', 'shardring'],        root: 146.8, scale: [0, 3, 5, 7, 10], chord: [0, 7, 10, 15],       bpm: 70,  voice: 'pad' },
    'Astra':    { c: ['#06071a', '#2b3a67', '#f6d39a', '#ffffff'], scene: ['stars', 'comets'],           root: 164.8, scale: [0, 2, 4, 7, 9],  chord: [0, 4, 7, 14],        bpm: 112, voice: 'bell' },
    'Kraïos':   { c: ['#02030c', '#1a1a5c', '#3d3fa8', '#a8b4ff'], scene: ['deep', 'tentacles', 'bubbles'], root: 185, scale: [0, 3, 5, 7, 10], chord: [0, 7, 12],          bpm: 128, voice: 'pluck' },
    'Koi':      { c: ['#08050d', '#2b2433', '#f0453a', '#fff4ee'], scene: ['ripples', 'koipair'],        root: 196,   scale: [0, 2, 4, 7, 9],  chord: [0, 4, 7, 11, 14],    bpm: 96,  voice: 'bell' },
    'Néphéris': { c: ['#140a05', '#7a3a14', '#f08a3c', '#fff6ea'], scene: ['dust', 'atom'],              root: 233.1, scale: [0, 3, 5, 7, 10], chord: [0, 3, 7, 10, 14],    bpm: 84,  voice: 'choir' },
    'Zénith':   { c: ['#120306', '#6e1424', '#d9364f', '#ffd6dc'], scene: ['embers', 'emberstorm'],     root: 293.7, scale: [0, 1, 5, 7, 8],  chord: [0, 4, 7, 11, 14],    bpm: 76,  voice: 'choir' },
    'Oblivion': { c: ['#020b0d', '#14524f', '#3fc7b6', '#e6fffb'], scene: ['stars', 'vortex', 'disk', 'glitch'], root: 138.6, scale: [0, 1, 5, 7, 8], chord: [0, 6, 12],     bpm: 64,  voice: 'pad', sub: true },
    // couleurs du sprite : bord cyan et bleu roi, blanc, violet sombre, langue rose
    'Takoras':  { c: ['#04030c', '#1d3fae', '#3cc8ea', '#ffffff'], gal: ['#3cc8ea', '#1d3fae', '#ffffff', '#ff7aa2', '#8b5cf6', '#e8d5d0'], rim: ['#1d3fae', '#3cc8ea'], scene: ['galaxy', 'jaws', 'orbiters', 'pillar'], root: 130.8, scale: [0, 2, 4, 7, 9], chord: [0, 4, 7, 12, 16, 19], bpm: 88, voice: 'choir', epic: true },
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
    galaxy(x, w, h, t, k, th) { const cols = th.gal || ['#c4b5fd', '#f0abfc', '#93c5fd', '#fde68a', '#86efac', '#fda4af', '#ffffff']; for (let i = 0; i < 500; i++) { const arm = i % 3, d = (i / 500) * Math.min(w, h) * .6, a = arm * 2.09 + d * .06 + t * .3; px(x, w / 2 + Math.cos(a) * d + Math.sin(i) * 3, h / 2 + Math.sin(a) * d * .6 + Math.cos(i) * 3, 1, rgba(cols[i % cols.length], .5 * (1 - d / (Math.min(w, h) * .6)) + .15)); } },
    // Takoras : une mâchoire géante (ses deux moitiés cyan et bleues) qui s'ouvre et claque de plus en plus vite, lueur rose entre les deux
    jaws(x, w, h, t, k, th) { const cx = w / 2, cy = h / 2, R = Math.min(w, h) * (.46 - .06 * k), bite = Math.pow(Math.abs(Math.sin(t * (1.2 + k * 5))), 3), gap = R * (.18 + .5 * (1 - bite)) * (1 - k * .4); const g = x.createRadialGradient(cx, cy, 0, cx, cy, R); g.addColorStop(0, rgba('#ff7aa2', .1 + .3 * k * bite)); g.addColorStop(1, rgba('#ff7aa2', 0)); x.fillStyle = g; x.fillRect(0, 0, w, h); [[-1, th.c[2]], [1, th.c[1]]].forEach(([sg, col]) => { x.strokeStyle = rgba(col, .45 + .45 * k); x.lineWidth = 3; x.beginPath(); x.arc(cx, cy + sg * gap, R, sg < 0 ? Math.PI * 1.08 : Math.PI * .08, sg < 0 ? Math.PI * 1.92 : Math.PI * .92); x.stroke(); for (let i = 1; i < 8; i++) { const a = (sg < 0 ? Math.PI : 0) + i / 8 * Math.PI, X = cx + Math.cos(a) * R * .96, Y = cy + sg * gap + Math.sin(a) * R * .96; x.fillStyle = rgba('#ffffff', .5 + .5 * k); x.beginPath(); x.moveTo(X - 2, Y); x.lineTo(X + 2, Y); x.lineTo(X, Y - sg * (4 + 3 * k)); x.fill(); } }); },
    // tous les autres jetons tournent autour (Takoras)
    orbiters(x, w, h, t, k, th, st, cine) { const imgs = cine.orbit; if (!imgs) return; imgs.forEach((im, i) => { if (!im.complete || !im.naturalWidth) return; const a = t * (.6 + k) + i / imgs.length * Math.PI * 2, R = Math.min(w, h) * (.42 - .12 * k), s = 12; x.globalAlpha = .85; x.drawImage(im, Math.round(w / 2 + Math.cos(a) * R - s / 2), Math.round(h / 2 + Math.sin(a) * R * .55 - s / 2), s, s); x.globalAlpha = 1; }); },
    // ---------- Scènes « signature » : chacune reprend le motif dessiné sur le jeton ----------
    // Vyolis : orbites blanches qui tournent autour de la sphère, avec des comètes au bout
    orbitals(x, w, h, t, k, th) { const cx = w / 2, cy = h / 2, R = Math.min(w, h) * .36; for (let o = 0; o < 3; o++) { const tilt = o * 1.05 + t * .15, sp = t * (1.2 + k * 3) + o * 2; x.strokeStyle = rgba(o === 1 ? th.c[3] : th.c[2], .55 + .4 * k); x.lineWidth = 2; x.beginPath(); for (let i = 0; i <= 80; i++) { const a = i / 80 * Math.PI * 2, X = Math.cos(a) * R, Y = Math.sin(a) * R * .32; x.lineTo(cx + X * Math.cos(tilt) - Y * Math.sin(tilt), cy + X * Math.sin(tilt) + Y * Math.cos(tilt)); } x.stroke(); for (let tr = 0; tr < 8; tr++) { const a = sp - tr * .06, X = Math.cos(a) * R, Y = Math.sin(a) * R * .32; px(x, cx + X * Math.cos(tilt) - Y * Math.sin(tilt), cy + X * Math.sin(tilt) + Y * Math.cos(tilt), tr ? 1 : 2, rgba(th.c[3], 1 - tr / 8)); } } },
    // Lumis : losanges concentriques, nets, qui battent comme le motif du jeton
    diamonds(x, w, h, t, k, th) { const cx = w / 2, cy = h / 2, M = Math.min(w, h) * .55; for (let i = 0; i < 7; i++) { const r = ((t * 14 * (1 + k * 2) + i * M / 7) % M); x.strokeStyle = rgba(i % 2 ? th.c[2] : th.c[3], (1 - r / M) * (.4 + .5 * k)); x.lineWidth = i % 2 ? 1 : 2; x.beginPath(); x.moveTo(cx, cy - r); x.lineTo(cx + r, cy); x.lineTo(cx, cy + r); x.lineTo(cx - r, cy); x.closePath(); x.stroke(); } },
    // Nyx : éclats anguleux (comme les cristaux du jeton) qui tournent en couronne
    shardring(x, w, h, t, k, th) { const cx = w / 2, cy = h / 2, R = Math.min(w, h) * (.4 - .1 * k); for (let i = 0; i < 9; i++) { const a = t * (.4 + k * 1.6) + i / 9 * Math.PI * 2, X = cx + Math.cos(a) * R, Y = cy + Math.sin(a) * R, s = 5 + (i % 3) * 2; x.fillStyle = rgba(i % 2 ? th.c[2] : th.c[3], .55 + .4 * k); x.beginPath(); x.moveTo(X + Math.cos(a) * s * 1.6, Y + Math.sin(a) * s * 1.6); x.lineTo(X + Math.cos(a + 2.2) * s * .6, Y + Math.sin(a + 2.2) * s * .6); x.lineTo(X - Math.cos(a) * s * .4, Y - Math.sin(a) * s * .4); x.lineTo(X + Math.cos(a - 2.2) * s * .6, Y + Math.sin(a - 2.2) * s * .6); x.fill(); } },
    // Astra : grandes comètes dorées en diagonale, traînées longues et propres
    comets(x, w, h, t, k, th, st) { if (Math.random() < .05 + k * .2) st.meteors.push({ x: rnd(w * .3, w * 1.3), y: rnd(-20, h * .3), v: rnd(2.5, 4) * (1 + k) }); st.meteors = st.meteors.filter(m => { m.x -= m.v; m.y += m.v * .55; const L = 34; for (let i = 0; i < L; i++) { const a = 1 - i / L; px(x, m.x + i, m.y - i * .55, i < 3 ? 2 : 1, rgba(i < 4 ? th.c[3] : th.c[2], a * .9)); } return m.x > -40 && m.y < h + 20; }); },
    // Kraïos : eau très sombre, et des tentacules qui montent des profondeurs et ondulent
    deep(x, w, h, t, k, th) { for (let y = 0; y < h; y += 2) { const a = .04 + .05 * Math.sin(y * .08 + t * 1.2); x.fillStyle = rgba(th.c[1], Math.max(0, a * (1 + k))); x.fillRect(0, y, w, 1); } },
    shadowfish(x, w, h, t, k, th) { const L = Math.min(w, h) * .9, p = ((t * .12) % 1.4) - .2, cx = lerp(-L, w + L, p), cy = h * .55 + Math.sin(t * .8) * 6; x.fillStyle = rgba(th.c[1], .7 + .2 * k); x.strokeStyle = rgba(th.c[2], .5 + .3 * k); x.lineWidth = 1; x.beginPath(); x.ellipse(cx, cy, L * .5, L * .16, 0, 0, 7); x.fill(); x.stroke(); x.beginPath(); x.moveTo(cx - L * .45, cy); x.lineTo(cx - L * .75, cy - L * .18); x.lineTo(cx - L * .75, cy + L * .18); x.closePath(); x.fill(); x.stroke(); px(x, cx + L * .36, cy - L * .04, 2, rgba(th.c[3], .5 + .5 * k)); },
    // Koi : deux carpes (rouge et blanche) qui tournent l'une autour de l'autre, comme le yin-yang du jeton
    ripples(x, w, h, t, k, th) { for (let i = 0; i < 5; i++) { const r = ((t * 10 + i * 18) % 90) * Math.min(w, h) / 90; x.strokeStyle = rgba(th.c[3], (1 - r / Math.min(w, h)) * .25); x.lineWidth = 1; x.beginPath(); x.arc(w / 2, h / 2, r, 0, 7); x.stroke(); } },
    koipair(x, w, h, t, k, th) { const cx = w / 2, cy = h / 2, R = Math.min(w, h) * (.3 - .08 * k); [[th.c[2], 0], [th.c[3], Math.PI]].forEach(([col, off]) => { for (let i = 0; i < 26; i++) { const a = t * (1 + k * 2.5) + off - i * .07, r = R + Math.sin(i * .5) * 2, s = Math.max(1, 5 - i * .18); x.fillStyle = rgba(col, 1 - i / 30); x.fillRect(Math.round(cx + Math.cos(a) * r - s / 2), Math.round(cy + Math.sin(a) * r - s / 2), Math.ceil(s), Math.ceil(s)); } }); },
    // Néphéris : un atome, trois anneaux orange qui se croisent, électrons crème
    atom(x, w, h, t, k, th) { const cx = w / 2, cy = h / 2, R = Math.min(w, h) * .38; for (let o = 0; o < 3; o++) { const tilt = o * Math.PI / 3 + t * .1; x.strokeStyle = rgba(th.c[2], .6 + .4 * k); x.lineWidth = 2; x.beginPath(); x.ellipse(cx, cy, R, R * .3, tilt, 0, 7); x.stroke(); const a = t * (2 + k * 4) + o * 2.1; px(x, cx + Math.cos(a) * R * Math.cos(tilt) - Math.sin(a) * R * .3 * Math.sin(tilt) - 1, cy + Math.cos(a) * R * Math.sin(tilt) + Math.sin(a) * R * .3 * Math.cos(tilt) - 1, 3, th.c[3]); } },
    // Zénith : braises rouges qui tourbillonnent et se resserrent en cyclone autour du jeton
    veins(x, w, h, t, k, th) { x.strokeStyle = rgba(th.c[1], .5 + .4 * k); x.lineWidth = 1; for (let i = 0; i < 12; i++) { let X = i % 2 ? 0 : w, Y = (i / 12) * h; x.beginPath(); x.moveTo(X, Y); for (let s = 0; s < 14; s++) { X += (i % 2 ? 1 : -1) * (3 + k * 2); Y += Math.sin(s * .9 + i) * 2; x.lineTo(X, Y); } x.stroke(); } },
    eye(x, w, h, t, k, th) { const cx = w / 2, cy = h * .24, W = Math.min(w, h) * .42, open = clamp(k * 1.3) * W * .26; x.fillStyle = rgba(th.c[3], .9); x.beginPath(); x.moveTo(cx - W / 2, cy); x.quadraticCurveTo(cx, cy - open * 2, cx + W / 2, cy); x.quadraticCurveTo(cx, cy + open * 2, cx - W / 2, cy); x.fill(); if (open > 2) { x.fillStyle = '#1f6f78'; x.beginPath(); x.arc(cx + Math.sin(t) * 3, cy, Math.min(open, W * .14), 0, 7); x.fill(); x.fillStyle = '#0a0a12'; x.beginPath(); x.arc(cx + Math.sin(t) * 3, cy, Math.min(open, W * .14) * .5, 0, 7); x.fill(); } x.strokeStyle = th.c[2]; x.lineWidth = 2; x.beginPath(); x.moveTo(cx - W / 2, cy); x.quadraticCurveTo(cx, cy - open * 2, cx + W / 2, cy); x.quadraticCurveTo(cx, cy + open * 2, cx - W / 2, cy); x.stroke(); },
    // Oblivion : horizon d'une planète turquoise, et une faille de lumière qui la fend
    planet(x, w, h, t, k, th) { const R = w * 1.1, cy = h + R * .78; x.fillStyle = th.c[1]; x.beginPath(); x.arc(w / 2, cy, R, 0, 7); x.fill(); x.strokeStyle = rgba(th.c[2], .8); x.lineWidth = 2; x.beginPath(); x.arc(w / 2, cy, R, Math.PI * 1.15, Math.PI * 1.85); x.stroke(); },
    rift(x, w, h, t, k, th) { if (k < .15) return; const L = h * clamp((k - .15) * 1.6); x.strokeStyle = rgba(th.c[3], .9); x.lineWidth = 1 + k * 2; x.beginPath(); let X = w / 2, Y = 0; x.moveTo(X, Y); for (let s = 0; s < 16 && Y < L; s++) { X += Math.sin(s * 2.3) * 4; Y += L / 16; x.lineTo(X, Y); } x.stroke(); const g = x.createLinearGradient(w / 2 - 20, 0, w / 2 + 20, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.5, rgba(th.c[2], .25 * k)); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(w / 2 - 20, 0, 40, L); },
    tentacles(x, w, h, t, k, th) {
      const N = 6;
      for (let i = 0; i < N; i++) {
        const bx = (i + .5) / N * w + Math.sin(i * 7.3) * 8, len = h * (.35 + .35 * k) * (.75 + (i % 3) * .15), seg = 22;
        let X = bx, Y = h + 4, a = -Math.PI / 2;
        for (let s = 0; s < seg; s++) {
          const f = s / seg, wv = Math.sin(t * (1.6 + i * .2) + s * .35 + i) * (.18 + .25 * f);
          a = -Math.PI / 2 + wv + (bx < w / 2 ? .25 : -.25) * f * f; // les pointes s'enroulent vers le centre
          const nx = X + Math.cos(a) * len / seg, ny = Y + Math.sin(a) * len / seg, wd = Math.max(1, (1 - f) * 7);
          x.strokeStyle = rgba(th.c[1], .95); x.lineWidth = wd + 2; x.lineCap = 'round'; x.beginPath(); x.moveTo(X, Y); x.lineTo(nx, ny); x.stroke();
          x.strokeStyle = rgba(th.c[2], .9); x.lineWidth = wd; x.beginPath(); x.moveTo(X, Y); x.lineTo(nx, ny); x.stroke();
          if (s % 3 === 1 && wd > 2) px(x, nx + Math.cos(a + 1.57) * wd * .4, ny + Math.sin(a + 1.57) * wd * .4, 1, rgba(th.c[3], .8)); // ventouses
          X = nx; Y = ny;
        }
      }
    },
    embers(x, w, h, t, k, th) { for (let i = 0; i < 40; i++) { const X = (i * 53.7 + t * (6 + i % 5)) % w, Y = h - ((i * 31.3 + t * (10 + i % 7) * (1 + k)) % h); px(x, X, Y, i % 4 ? 1 : 2, rgba(i % 3 ? th.c[2] : th.c[3], .35 + .4 * ((i * 13) % 10) / 10)); } },
    emberstorm(x, w, h, t, k, th) { const cx = w / 2, cy = h / 2, M = Math.min(w, h) * .55; for (let i = 0; i < 420; i++) { const p = (i / 420 + t * (.06 + k * .18)) % 1, r = M * (1 - p) * (.35 + .65 * (1 - k * .5)), a = i * 2.399 + t * (1.5 + k * 4) + (1 - p) * 4; const col = i % 5 === 0 ? th.c[3] : i % 2 ? th.c[2] : th.c[1]; px(x, cx + Math.cos(a) * r, cy + Math.sin(a) * r * .9, i % 7 === 0 ? 2 : 1, rgba(col, .4 + .6 * p)); } x.strokeStyle = rgba(th.c[2], .25 + .35 * k); x.lineWidth = 1; x.beginPath(); x.arc(cx, cy, M * (.3 + .1 * Math.sin(t * 3)), 0, 7); x.stroke(); },
    // pilier de lumière divine
    pillar(x, w, h, t, k, th) { const W = 6 + k * 26, g = x.createLinearGradient(w / 2 - W, 0, w / 2 + W, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, `rgba(255,255,255,${.15 + .5 * k})`); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(w / 2 - W, 0, W * 2, h); },
  };

  // =====================================================================
  // Faux jeton 3D (dessiné en pixel art) : tranche épaisse, face qui s'écrase avec le cosinus de l'angle,
  // dos plus sombre, reflet qui glisse sur la face quand il tourne. ang = angle autour de l'axe vertical.
  // =====================================================================
  function coin3d(x, im, cx, cy, size, ang, rim) {
    const c = Math.cos(ang), sn = Math.sin(ang), rx = Math.max(.6, Math.abs(c) * size / 2), ry = size / 2;
    const T = size * .1, off = sn * T; // épaisseur de la tranche, vue de côté
    // tranche : des ellipses empilées de l'arrière (cx - off/2) vers l'avant (cx + off/2), bord sombre, liseré clair
    const n = Math.ceil(Math.abs(off)), dir = Math.sign(off) || 1;
    for (let i = 0; i <= n; i++) {
      const X = Math.round(cx - off / 2 + dir * i);
      x.fillStyle = i === 0 || i === n ? rim[1] : rim[0];
      x.beginPath(); x.ellipse(X, cy, rx, ry, 0, 0, 7); x.fill();
      if (i % 2 && i < n) { x.fillStyle = 'rgba(255,255,255,.16)'; x.fillRect(X + (c >= 0 ? -rx : rx) * dir * .97, Math.round(cy - ry * .55), 1, Math.round(ry * 1.1)); } // stries
    }
    const fx = Math.round(cx + off / 2);
    x.save(); x.translate(fx, cy); x.scale(Math.max(.02, Math.abs(c)), 1);
    if (im && im.complete && im.naturalWidth) x.drawImage(im, -size / 2, -size / 2, size, size);
    x.restore();
    // dos : même dessin assombri
    if (c < 0) { x.fillStyle = 'rgba(0,0,0,.35)'; x.beginPath(); x.ellipse(fx, cy, rx * .98, ry * .98, 0, 0, 7); x.fill(); }
    // reflet : une bande claire qui traverse la face selon l'angle
    x.save(); x.beginPath(); x.ellipse(fx, cy, rx * .96, ry * .96, 0, 0, 7); x.clip();
    const sx = fx + Math.sin(ang * 2) * rx * 1.3, gr = x.createLinearGradient(sx - size * .22, cy - ry, sx + size * .22, cy + ry);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.5, `rgba(255,255,255,${.12 + .3 * Math.abs(sn)})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr; x.fillRect(fx - rx, cy - ry, rx * 2, ry * 2);
    x.restore();
  }
  // Rotation du jeton par à-coups : il marque une pause, puis fait un demi-tour avec un ease in-out bien fluide.
  // Plus la tension monte, plus les demi-tours s'enchaînent vite.
  const easeIO = k => k < .5 ? 16 * k ** 5 : 1 - (-2 * k + 2) ** 5 / 2;
  function flipAngle(st, dt, period) {
    st.ph = (st.ph || 0) + dt / period;
    const n = Math.floor(st.ph), f = st.ph - n, move = clamp((f - .3) / .7);
    return (n + easeIO(move)) * Math.PI;
  }
  const easeOutBack = k => 1 + 2.7 * (k - 1) ** 3 + 1.7 * (k - 1) ** 2;

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
      root.innerHTML = `<canvas class="cine-cv"></canvas><div class="cine-flash"></div><div class="cine-title"><b></b><small></small></div><div class="cine-skip">${t('cine_skip')}</div>`;
      root.style.setProperty('--cc', th.c[2]);
      root.querySelector('.cine-title b').textContent = jn(j.name);
      root.querySelector('.cine-title small').textContent = '1/' + j.odds.toLocaleString(LOCALE());
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
      const mys = new Image(); mys.src = MYSTERE;
      const sil = document.createElement('canvas'); sil.width = sil.height = G;
      { const s = sil.getContext('2d'); s.fillStyle = th.c[1]; s.beginPath(); s.arc(G / 2, G / 2, G * .45, 0, 7); s.fill(); } // repli : un disque, jamais la forme du jeton
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
          const g = x.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .2, w / 2, h / 2, Math.max(w, h) * .7); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, rgba(th.c[0], .6)); x.fillStyle = g; x.fillRect(0, 0, w, h);
        }
        // le jeton au centre : silhouette qui tourne (de plus en plus vite), puis vrai jeton
        const cx = w / 2, cy = h / 2;
        if (p >= .08 && p < .94) {
          const size = lerp(10, Math.min(w, h) * .42, ease(clamp((p - .08) / .8))) * (1 - suck * .9);
          // vrai jeton en volume : demi-tours fluides avec une pause entre deux, de plus en plus serrés
          const ang = flipAngle(cine, Math.min(.05, (now - (cine.last ?? now)) / 1000), lerp(1.2, .22, tense) * (suck ? .4 : 1)), sx = Math.cos(ang);
          cine.last = now;
          // halo qui bat avec la tension
          const beat = tense ? (Math.sin(tt * (6 + tense * 14)) * .5 + .5) : .3;
          const gr = x.createRadialGradient(cx, cy, 0, cx, cy, size * (1 + .4 * beat));
          gr.addColorStop(0, rgba(th.c[2], .25 + .45 * k * beat)); gr.addColorStop(1, rgba(th.c[2], 0));
          x.fillStyle = gr; x.fillRect(0, 0, w, h);
          coin3d(x, mys.complete && mys.naturalWidth ? mys : sil, cx, cy, size, ang, th.rim || ['#1c1a2e', '#4a4568']);
          // contour lumineux de la silhouette (petits pixels autour)
          for (let i = 0; i < 24 * k; i++) { const a = rnd(0, 7), r = size * .5 * (1.02 + Math.random() * .1); px(x, cx + Math.cos(a) * r * Math.max(.3, Math.abs(sx)), cy + Math.sin(a) * r, 1, rgba(th.c[3], .8)); }
        }
        if (p >= .94) {
          const ry = h * .42; // un peu plus haut : le nom s'affiche dessous
          // RÉVÉLATION façon jeu vidéo : flash, le jeton arrive de profil et fait 1,5 tour en freinant (ease out),
          // gros « pop » d'échelle qui dépasse puis se pose, rayons qui tournent, double onde de choc, confettis aux couleurs du jeton
          if (!cine.revealed) {
            cine.revealed = true; cine.revAt = now; cine.flash = 1; root.classList.add('named');
            const cols = th.gal || [th.c[2], th.c[3], th.c[1]];
            cine.conf = Array.from({ length: 140 }, (_, i) => { const a = rnd(0, 7), v = rnd(1.5, 5.5); return { x: cx, y: ry, vx: Math.cos(a) * v, vy: Math.sin(a) * v - rnd(.5, 2.5), c: cols[i % cols.length], s: i % 5 ? 1 : 2, life: rnd(.7, 1.4) }; });
          }
          const ms = now - cine.revAt, q = clamp(ms / 450), turn = clamp(ms / 900);
          const size = Math.min(w, h) * .5 * (.55 + .45 * easeOutBack(clamp(ms / 520)));
          x.fillStyle = th.c[0]; x.fillRect(0, 0, w, h);
          // rayons qui tournent derrière le jeton
          const nR = 14, R = Math.hypot(w, h);
          for (let i = 0; i < nR; i++) { const a0 = ms / 1000 * .5 + i / nR * Math.PI * 2, a1 = a0 + Math.PI / nR * .6; x.fillStyle = rgba(i % 2 ? th.c[2] : th.c[3], .1 + .1 * (1 - turn)); x.beginPath(); x.moveTo(cx, ry); x.lineTo(cx + Math.cos(a0) * R, ry + Math.sin(a0) * R); x.lineTo(cx + Math.cos(a1) * R, ry + Math.sin(a1) * R); x.fill(); }
          const gr = x.createRadialGradient(cx, ry, 0, cx, ry, size * 1.6); gr.addColorStop(0, rgba(th.c[2], .7)); gr.addColorStop(1, rgba(th.c[0], 0)); x.fillStyle = gr; x.fillRect(0, 0, w, h);
          [0, .25].forEach(d => { const qq = clamp((ms / 1000 - d) / .55); if (qq <= 0 || qq >= 1) return; x.strokeStyle = rgba(d ? th.c[2] : th.c[3], 1 - qq); x.lineWidth = d ? 2 : 3; x.beginPath(); x.arc(cx, ry, size * (.55 + qq * 2.4), 0, 7); x.stroke(); });
          // confettis (petite gravité)
          (cine.conf || []).forEach(c => { c.vy += .06; c.vx *= .985; c.x += c.vx; c.y += c.vy; c.life -= .012; if (c.life > 0) px(x, c.x, c.y, c.s, rgba(c.c, Math.min(1, c.life))); });
          // le jeton : 1,5 tour qui freine pour finir pile de face, puis il flotte doucement
          const ang = (1 - (1 - turn) ** 3) * Math.PI * 3 + Math.PI, bob = Math.sin(ms / 1000 * 2.4) * 2 * turn;
          coin3d(x, img, cx, ry + bob, size * TS, ang, th.rim || [th.c[1], th.c[2]]);
          if (q < 1) for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2 + i, r = size * (.5 + q * 1.8 + (i % 5) * .08); px(x, cx + Math.cos(a) * r, ry + Math.sin(a) * r, 1, rgba(i % 2 ? th.c[2] : th.c[3], 1 - q)); }
          // secousse d'impact au moment du flash
          cv.style.transform = ms < 260 ? `translate(${rnd(-6, 6)}px, ${rnd(-6, 6)}px) scale(${1.06 - ms / 260 * .04})` : '';
        }
        // tremblement pendant la tension
        const sh = tense * (1 - suck) * 3;
        if (p < .94) cv.style.transform = sh ? `translate(${rnd(-sh, sh)}px, ${rnd(-sh, sh)}px) scale(1.02)` : '';
        // flash (éclairs, révélation)
        if (cine.flash > 0) { fl.style.opacity = cine.flash; fl.style.background = cine.revealed ? '#fff' : th.c[3]; cine.flash = Math.max(0, cine.flash - .06); } else fl.style.opacity = 0;
        if (p >= 1 && now - (cine.revAt ?? now) > 1500) return finish(); // on garde le jeton et son nom un instant à l'écran
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
