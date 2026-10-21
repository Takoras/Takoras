// « Ring » : la mise en scène des pouvoirs. Chaque pouvoir a son intro (le temps se fige, le jeton s'illumine,
// un cercle de runes tourne), son aura pendant le tir, son effet au moment clé et son propre son, fabriqué en direct.
// Utilisé par ring-ui.js (dessin sur le canvas du ring).

// ---------- Sons des pouvoirs (Web Audio, passent par le volume et le filtre du site)
const RSND = (() => {
  const A = () => { const a = sfx.audio?.(); return a && a.ok ? a : null; };
  function tone(type, f0, f1, dur, vol, delay = 0, attack = .005) {
    const a = A(); if (!a) return;
    const t = a.ctx.currentTime + delay, o = a.ctx.createOscillator(), g = a.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g).connect(a.out); o.start(t); o.stop(t + dur + .05);
  }
  let nbuf = null;
  function noise(dur, vol, f0, f1, delay = 0, type = 'bandpass', q = 1.2) {
    const a = A(); if (!a) return;
    if (!nbuf) { nbuf = a.ctx.createBuffer(1, a.ctx.sampleRate * 2, a.ctx.sampleRate); const d = nbuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const t = a.ctx.currentTime + delay, s = a.ctx.createBufferSource(), f = a.ctx.createBiquadFilter(), g = a.ctx.createGain();
    s.buffer = nbuf; f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(f).connect(g).connect(a.out); s.start(t, Math.random()); s.stop(t + dur + .05);
  }
  const S = {
    // intro commune : le temps se fige et ça se charge
    charge() { noise(.55, .12, 300, 2600, 0, 'bandpass', 2); tone('triangle', 140, 420, .5, .05); },
    grow() { [0, .07, .14, .22].forEach((d, i) => tone('sine', 260 + i * 90, 700 + i * 120, .12, .12, d)); tone('sine', 90, 60, .5, .25, .25); },
    bounce() { tone('sine', 170, 560, .18, .22); tone('sine', 560, 260, .25, .14, .16); },
    scrap() { [520, 1370, 2110].forEach((f, i) => tone('square', f, f * .97, .35, .035, i * .01)); noise(.25, .18, 3000, 1500, 0, 'highpass'); tone('sine', 80, 40, .4, .35); },
    slide() { noise(.8, .1, 5000, 7000, 0, 'highpass', .7); tone('sine', 1300, 1900, .5, .05); tone('sine', 1950, 2600, .4, .03, .1); },
    eruption() { tone('sine', 130, 35, .9, .55); noise(1, .4, 900, 90, 0, 'lowpass'); for (let k = 0; k < 8; k++) noise(.05, .12, 2500, 1800, .1 + k * .07, 'highpass'); },
    curve() { noise(.6, .18, 350, 1300, 0, 'bandpass', 3); tone('sine', 300, 520, .5, .06); },
    double() { [0, .13].forEach(d => { tone('sine', 170, 45, .22, .55, d); noise(.09, .25, 1800, 600, d, 'bandpass'); }); },
    ghost() { tone('triangle', 440, 260, 1, .07); tone('triangle', 447, 266, 1, .07); tone('sine', 880, 520, .8, .025, .1); },
    rescue() { [880, 1320, 1760].forEach((f, i) => tone('sine', f, f, .7, .07, i * .08)); noise(.5, .06, 2000, 5000, 0, 'bandpass', 4); },
    shrink() { tone('square', 1300, 140, .28, .05); noise(.3, .12, 2000, 300, .02); },
    magnet() { tone('sawtooth', 70, 150, .7, .05); tone('sine', 300, 900, .7, .05); tone('sine', 90, 40, .3, .4, .7); },
    anchor() { tone('sine', 75, 32, .8, .6); noise(.6, .3, 500, 80, 0, 'lowpass'); [0, .09, .18].forEach(d => tone('square', 2400, 2300, .08, .025, .25 + d)); },
    second() { noise(.5, .25, 300, 3000, 0, 'bandpass', 1.5); tone('sawtooth', 200, 600, .35, .04); },
    roots() { noise(.9, .16, 150, 1100, 0, 'lowpass'); tone('sawtooth', 95, 70, .9, .05); for (let k = 0; k < 6; k++) noise(.04, .12, 4000, 2500, .15 + k * .11, 'highpass'); },
    snap() { noise(.06, .3, 5000, 2500, 0, 'highpass'); tone('triangle', 900, 300, .07, .1); },
    shield() { [1046, 1318, 1568, 2093].forEach((f, i) => tone('sine', f, f, .9, .05, i * .05)); },
    void() { tone('sine', 220, 28, 1.3, .55); tone('sawtooth', 55, 40, 1.2, .07); noise(1.2, .2, 600, 60, 0, 'lowpass'); },
    split() { [523, 659, 784, 1046, 1318].forEach((f, i) => tone('triangle', f, f, .3, .07, i * .055)); noise(.4, .08, 3000, 6000, 0, 'bandpass', 3); },
    boing() { tone('sine', 220, 620, .14, .2); tone('sine', 620, 300, .22, .12, .12); },
    punch() { tone('sine', 150, 45, .25, .5); noise(.1, .3, 1500, 500); },
    blackhole() { tone('sine', 160, 30, 1, .5); noise(.9, .25, 300, 50, 0, 'lowpass'); },
    flame() { noise(.45, .3, 600, 2400, 0, 'bandpass', 1); tone('sawtooth', 160, 420, .3, .04); },
    chime() { tone('sine', 1568, 1568, .4, .06); tone('sine', 2093, 2093, .35, .04, .04); },
    hum() { tone('sawtooth', 60, 140, .6, .05); tone('sine', 400, 1200, .6, .04); tone('sine', 80, 40, .3, .45, .6); },
  };
  return S;
})();

// ---------- Effets visuels des pouvoirs
const RFX = (() => {
  let active = {}, ground = [], vines = null, intro = null;
  const rand = (a, b) => a + Math.random() * (b - a);
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${a})`; };
  function part(o) { RNG.parts.push({ life: 1, size: 3, vx: 0, vy: 0, ...o }); }
  function burst(x, y, n, col, sp, o = {}) { for (let k = 0; k < (reducedFx() ? n / 3 : n); k++) { const a = rand(0, 6.283), v = rand(.4, 1) * sp; part({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, col, size: rand(2, 4.5), ...o }); } }

  // Au début de l'animation d'un tour : on note les pouvoirs actifs et on prépare les intros
  function start(P) {
    active = {}; ground = []; vines = null; intro = null;
    P.intros = P.r.ev.filter(e => e.t === 'power');
    P.intros.forEach(e => { active[e.id] = e.pw; });
    // les doubles de Dédoublement gardent l'aura dorée
    P.r.ev.filter(e => e.t === 'split').forEach(e => { active[e.cid] = 'split'; });
  }
  // Intro d'un pouvoir : temps figé ~0,8 s, cercle de runes, nom du pouvoir, son
  function introStart(e, P) {
    const b = P.bodies.find(x => x.id === e.id); if (!b) return;
    intro = { e, b, t: 0 };
    RSND.charge(); setTimeout(() => RSND[e.pw]?.(), 280);
    const [x, y] = w2s(b.x, b.y), col = PW_COL[e.pw];
    rgBanner(`<small>${b.side ? '⚠️ ' : ''}${jnH(b.name)}</small>✦ ${rtL().pw[e.pw][0]}`, col, false, 950);
    burst(x, y, 30, col, 3.5);
    if (e.pw === 'roots') vines = { side: b.side, t: 0, flash: [] };
    if (e.pw === 'anchor') { RNG.shake = 12; for (let k = 0; k < 24; k++) { const a = k / 24 * 6.283; part({ x, y, vx: Math.cos(a) * 3.2, vy: Math.sin(a) * 3.2, col: '#93c5fd', size: 4 }); } }
    if (e.pw === 'rescue') { const r = P.r.ev.find(z => z.t === 'rescue'); if (r) intro.rescue = P.bodies.find(z => z.id === r.id); }
    if (e.pw === 'grow' || e.pw === 'scrap') RNG.shake = 6;
  }
  // Évènements pendant le tir
  function event(e, P) {
    const body = id => P.bodies.find(b => b.id === id);
    if (e.t === 'edge') {
      const [x, y] = w2s(e.x, e.y), b = body(e.id);
      if (vines && b && b.side === vines.side) { vines.flash.push({ a: Math.atan2(e.y, e.x), t: 1 }); burst(x, y, 22, '#4ade80', 3); burst(x, y, 8, '#f0abfc', 2.5); RSND.snap(); RNG.shake = 6; }
      else { burst(x, y, 18, PW_COL.bounce, 3.2); RNG.parts.push({ ring: true, x, y, col: PW_COL.bounce, size: 1.4, life: 1 }); RSND.boing(); }
    }
    if (e.t === 'eruption') {
      const [x, y] = w2s(e.x, e.y), rad = RG.kit(body(e.id).name).p.radius * RNG.view.s;
      RNG.parts.push({ wave: true, x, y, col: '#f97316', rad, life: 1 });
      burst(x, y, 60, '#fb923c', 6); burst(x, y, 30, '#fde047', 4.5); burst(x, y, 20, '#7f1d1d', 3, { size: 6 });
      RNG.shake = 16; rgFlashCol('#f97316'); RSND.eruption();
    }
    if (e.t === 'magnet') {
      const [x, y] = w2s(e.x, e.y), rad = RG.kit(body(e.id).name).p.radius * RNG.view.s;
      for (let k = 0; k < 40; k++) { const a = rand(0, 6.283), d = rand(rad * .5, rad); part({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, sink: [x, y], col: k % 2 ? '#fde68a' : '#fff', size: rand(2, 4) }); }
      RNG.parts.push({ wave: true, x, y, col: '#fde68a', rad, life: 1, inward: true });
      RNG.shake = 8; RSND.hum();
    }
    if (e.t === 'double') {
      const o = body(e.to), [x, y] = w2s(o.x, o.y);
      RNG.parts.push({ star: true, x, y, col: '#f43f5e', life: 1, size: 40 });
      RNG.parts.push({ text: '×2 !', x, y: y - 20, col: '#fecdd3', life: 1, size: 30 });
      burst(x, y, 40, '#f43f5e', 6); RNG.shake = 14; RSND.punch(); setTimeout(() => RSND.punch(), 110);
    }
    if (e.t === 'void') {
      const o = body(e.to), s = body(e.id), [x, y] = w2s(o.x, o.y), [sx, sy] = w2s(s.x, s.y);
      RNG.parts.push({ bolt: [sx, sy, x, y], col: '#c084fc', life: 1 });
      RNG.parts.push({ hole: true, x, y, life: 1, size: 34 });
      burst(x, y, 30, '#a855f7', 5); burst(x, y, 20, '#1e1b4b', 4, { size: 6 });
      RNG.shake = 16; rgFlashCol('#3b0764'); RSND.blackhole();
    }
    if (e.t === 'split') { const b = body(e.id), [x, y] = w2s(b.x, b.y); burst(x, y, 40, '#fde68a', 4.5); for (let k = 0; k < 18; k++) part({ x, y, vx: rand(-3, 3), vy: rand(-3, 3), col: `hsl(${k * 20},90%,75%)`, size: 3 }); rgFlashCol('#fde68a'); RSND.split(); }
    if (e.t === 'boost') { const b = body(e.id), [x, y] = w2s(b.x, b.y); burst(x, y, 36, '#fb7185', 5); burst(x, y, 20, '#fdba74', 4); RNG.shake = 8; RSND.flame(); }
    if (e.t === 'hit') {
      for (const id of [e.a, e.b]) {
        const pw = active[id]; if (!pw) continue;
        const [x, y] = w2s(e.x, e.y);
        if (pw === 'scrap') { burst(x, y, 26, '#fb923c', 5); burst(x, y, 10, '#fde047', 3); RSND.scrap(); }
        if (pw === 'shield') { RNG.parts.push({ hex: true, x, y, col: '#f8fafc', life: 1, size: 30 }); RSND.chime(); }
        if (pw === 'grow') { burst(x, y, 16, '#7dd3fc', 3); }
      }
    }
  }
  // Sol : traînée de glace de Glissade, ronces autour du ring
  function under(c, list, t, dt) {
    const V = RNG.view, R = RCFG.RING_R * V.s, mid = V.size / 2;
    for (const b of list) if (active[b.id] === 'slide' && RNG.play) ground.push({ x: b.x, y: b.y, r: b.r, life: 1 });
    ground = ground.filter(g => (g.life -= dt * .35) > 0);
    for (const g of ground) { const [x, y] = w2s(g.x, g.y); c.fillStyle = `rgba(186,230,253,${g.life * .12})`; c.beginPath(); c.arc(x, y, g.r * V.s * .9, 0, 7); c.fill(); }
    if (vines) drawVines(c, mid, R, t, dt);
  }
  // Les ronces poussent tout autour du bord : tige ondulée, épines, fleurs, lueur verte
  function drawVines(c, mid, R, t, dt) {
    vines.t += dt;
    if (vines.out != null && (vines.out += dt) > .6) { vines = null; return; }
    const grow = Math.min(1, vines.t / .7) * (vines.out != null ? 1 - vines.out / .6 : 1), end = grow * 6.2832, N = 140;
    c.save(); c.lineCap = 'round';
    for (const [w, col, blur] of [[9, 'rgba(22,101,52,.9)', 0], [4, '#4ade80', 14]]) {
      c.lineWidth = w; c.strokeStyle = col; c.shadowColor = '#22c55e'; c.shadowBlur = blur;
      c.beginPath();
      for (let k = 0; k <= N; k++) { const a = -1.5708 + k / N * end, rr = R + Math.sin(k * .9 + t * 3) * 4 + Math.sin(k * .37) * 3; const x = mid + Math.cos(a) * rr, y = mid + Math.sin(a) * rr; k ? c.lineTo(x, y) : c.moveTo(x, y); }
      c.stroke();
    }
    c.shadowBlur = 0;
    for (let k = 0; k < 48; k++) {
      const a = -1.5708 + k / 48 * 6.2832; if (a + 1.5708 > end) break;
      const fl = vines.flash.reduce((m, f) => Math.max(m, f.t * Math.max(0, 1 - Math.abs(Math.atan2(Math.sin(a - f.a), Math.cos(a - f.a))) * 3)), 0);
      const out = k % 2 ? 1 : -1, len = 9 + fl * 10, bx = mid + Math.cos(a) * R, by = mid + Math.sin(a) * R, nx = Math.cos(a) * out, ny = Math.sin(a) * out;
      c.fillStyle = fl > .1 ? '#bbf7d0' : '#15803d';
      c.beginPath(); c.moveTo(bx - Math.sin(a) * 4, by + Math.cos(a) * 4); c.lineTo(bx + Math.sin(a) * 4, by - Math.cos(a) * 4); c.lineTo(bx + nx * len, by + ny * len); c.fill();
      if (k % 6 === 3) { c.fillStyle = '#f0abfc'; c.beginPath(); c.arc(bx + nx * 3, by + ny * 3, 3.5 + Math.sin(t * 4 + k) * .8, 0, 7); c.fill(); }
    }
    vines.flash.forEach(f => { f.t -= dt * 1.5; }); vines.flash = vines.flash.filter(f => f.t > 0);
    c.restore();
  }
  // Aura d'un jeton dont le pouvoir est actif (dessinée sous le jeton)
  function aura(c, b, x, y, rr, t) {
    const pw = active[b.id]; if (!pw || !RNG.play) return;
    const col = PW_COL[pw];
    c.save();
    if (pw === 'eruption' || pw === 'second') { for (let k = 0; k < 12; k++) { const a = k / 12 * 6.283 + t * 2, f = 1.25 + .2 * Math.sin(t * 20 + k * 3); c.fillStyle = k % 2 ? '#fb923c' : '#fde047'; c.beginPath(); c.moveTo(x + Math.cos(a - .2) * rr, y + Math.sin(a - .2) * rr); c.lineTo(x + Math.cos(a) * rr * f, y + Math.sin(a) * rr * f); c.lineTo(x + Math.cos(a + .2) * rr, y + Math.sin(a + .2) * rr); c.fill(); } }
    if (pw === 'magnet' || pw === 'split') { for (let k = 0; k < 5; k++) { const a = t * 2.5 + k * 1.257; c.fillStyle = pw === 'split' ? `hsl(${(t * 120 + k * 72) % 360},90%,75%)` : '#fde68a'; c.beginPath(); c.arc(x + Math.cos(a) * rr * 1.45, y + Math.sin(a) * rr * 1.45, 2.6, 0, 7); c.fill(); } }
    if (pw === 'shield') { c.strokeStyle = 'rgba(248,250,252,.85)'; c.lineWidth = 2; c.shadowColor = '#fff'; c.shadowBlur = 12; c.beginPath(); for (let k = 0; k <= 6; k++) { const a = k / 6 * 6.283 + t * .8; const px = x + Math.cos(a) * rr * 1.45, py = y + Math.sin(a) * rr * 1.45; k ? c.lineTo(px, py) : c.moveTo(px, py); } c.stroke(); c.fillStyle = 'rgba(248,250,252,.08)'; c.fill(); }
    if (pw === 'anchor') { c.strokeStyle = '#94a3b8'; c.lineWidth = 3; c.setLineDash([5, 4]); c.lineDashOffset = -t * 20; c.beginPath(); c.arc(x, y, rr * 1.35, 0, 7); c.stroke(); c.setLineDash([]); c.font = `${rr}px serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.globalAlpha = .9; c.fillText('⚓', x, y - rr * 1.6); }
    if (pw === 'void') { const g = c.createRadialGradient(x, y, rr * .5, x, y, rr * 2); g.addColorStop(0, 'rgba(10,0,25,.9)'); g.addColorStop(1, 'rgba(88,28,135,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, rr * 2, 0, 7); c.fill(); c.strokeStyle = '#a855f7'; c.lineWidth = 2; for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(x, y, rr * (1.2 + k * .25), t * (3 + k) + k * 2, t * (3 + k) + k * 2 + 2.2); c.stroke(); } }
    if (pw === 'double') { c.strokeStyle = '#f43f5e'; c.lineWidth = 3; c.shadowColor = '#f43f5e'; c.shadowBlur = 18; c.globalAlpha = .6 + .4 * Math.sin(t * 14); c.beginPath(); c.arc(x, y, rr * 1.3, 0, 7); c.stroke(); }
    if (pw === 'ghost') { const tr = RNG.trails[b.id] || []; tr.slice(-12).forEach((p, k) => { if (k % 3) return; const [gx, gy] = w2s(p[0], p[1]); c.globalAlpha = .12 + k / 12 * .2; c.fillStyle = '#c4b5fd'; c.beginPath(); c.arc(gx, gy, rr, 0, 7); c.fill(); }); }
    if (pw === 'curve') { c.strokeStyle = 'rgba(96,165,250,.8)'; c.lineWidth = 2.5; for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(x, y, rr * (1.25 + k * .18), -t * 5 + k * 2, -t * 5 + k * 2 + 1.6); c.stroke(); } }
    if (pw === 'grow') { c.strokeStyle = 'rgba(125,211,252,.7)'; c.lineWidth = 2; c.beginPath(); c.arc(x, y, rr * (1.15 + .06 * Math.sin(t * 9)), 0, 7); c.stroke(); }
    if (pw === 'scrap') { c.fillStyle = 'rgba(120,53,15,.35)'; c.beginPath(); c.arc(x, y, rr * 1.3, 0, 7); c.fill(); }
    if (pw === 'shrink') { c.fillStyle = 'rgba(49,46,129,.45)'; c.beginPath(); c.arc(x, y, rr * 1.5, 0, 7); c.fill(); }
    if (pw === 'bounce' || pw === 'rescue' || pw === 'slide' || pw === 'roots') { c.strokeStyle = rgba(col, .75); c.lineWidth = 2.5; c.shadowColor = col; c.shadowBlur = 12; c.beginPath(); c.arc(x, y, rr * 1.22, 0, 7); c.stroke(); }
    c.restore();
  }
  // Particules d'aura pendant le trajet (bulles, étincelles, flocons, flammes…)
  function emit(b, x, y, rr, moving) {
    const pw = active[b.id]; if (!pw || !RNG.play || reducedFx() || Math.random() > .6) return;
    const j = (s = 1) => rand(-rr, rr) * s;
    if (pw === 'grow') part({ x: x + j(), y: y + j(), vx: 0, vy: -rand(.5, 1.4), col: 'rgba(186,230,253,.9)', size: rand(2, 5), bubble: true });
    if (pw === 'scrap' && moving) part({ x: x + j(.6), y: y + j(.6), vx: rand(-1.5, 1.5), vy: rand(-1.5, 1.5), col: Math.random() < .5 ? '#fb923c' : '#fde047', size: 2 });
    if (pw === 'slide' && moving) part({ x: x + j(), y: y + j(), vx: rand(-.4, .4), vy: rand(-.4, .4), col: '#e0f2fe', size: rand(1.5, 3) });
    if ((pw === 'eruption' || pw === 'second') && moving) part({ x: x + j(.5), y: y + j(.5), vx: rand(-1, 1), vy: rand(-1, 1), col: Math.random() < .5 ? '#f97316' : '#fde047', size: rand(2, 4) });
    if (pw === 'curve' && moving) part({ x: x + j(), y: y + j(), vx: rand(-.6, .6), vy: rand(-.6, .6), col: '#93c5fd', size: rand(2, 3.5) });
    if (pw === 'shrink' && moving) part({ x: x + j(.7), y: y + j(.7), vx: rand(-.3, .3), vy: rand(-.3, .3), col: 'rgba(76,29,149,.8)', size: rand(4, 8) });
    if (pw === 'ghost') part({ x: x + j(), y: y + j(), vx: 0, vy: -rand(.3, .8), col: 'rgba(196,181,253,.8)', size: rand(2, 4) });
    if (pw === 'void') part({ x: x + j(1.6), y: y + j(1.6), sink: [x, y], col: '#a855f7', size: 2.5 });
    if (pw === 'split' || pw === 'magnet') part({ x: x + j(1.2), y: y + j(1.2), vx: 0, vy: 0, col: '#fef3c7', size: 2 });
    if (pw === 'double') part({ x: x + j(.8), y: y + j(.8), vx: rand(-.5, .5), vy: rand(-.5, .5), col: '#fb7185', size: 2.5 });
  }
  // Par-dessus : l'intro (fond assombri, cercle de runes qui tourne autour du jeton, faisceau de Sauvetage)
  function over(c, t, dt) {
    if (!intro) return;
    intro.t += dt;
    const V = RNG.view, k = Math.min(1, intro.t / .25), out = Math.max(0, (intro.t - .65) / .2), a = k * (1 - out);
    const b = intro.b, [x, y] = w2s(b.x, b.y), rr = b.r * V.s, col = PW_COL[intro.e.pw];
    c.save();
    c.fillStyle = `rgba(5,3,12,${.55 * a})`; c.fillRect(-20, -20, V.size + 40, V.size + 40);
    if (intro.rescue) { const [rx, ry] = w2s(intro.rescue.x, intro.rescue.y); c.strokeStyle = rgba(col, a); c.lineWidth = 6 * a + 2; c.shadowColor = col; c.shadowBlur = 20; c.beginPath(); c.moveTo(x, y); c.lineTo(rx, ry); c.stroke(); c.beginPath(); c.arc(rx, ry, intro.rescue.r * V.s * 1.3, 0, 7); c.stroke(); }
    rgToken(c, b, t, false);
    c.globalAlpha = a; c.strokeStyle = col; c.shadowColor = col; c.shadowBlur = 22; c.lineWidth = 3;
    const R1 = rr * (1.5 + .5 * k);
    c.beginPath(); c.arc(x, y, R1, 0, 7); c.stroke();
    c.lineWidth = 1.5; c.beginPath(); c.arc(x, y, R1 + 9, 0, 7); c.stroke();
    c.fillStyle = col; c.font = `bold ${Math.max(9, rr * .35)}px "Space Grotesk", sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (let i = 0; i < 12; i++) { const an = i / 12 * 6.283 + intro.t * 2.2; c.save(); c.translate(x + Math.cos(an) * (R1 + 4.5), y + Math.sin(an) * (R1 + 4.5)); c.rotate(an + 1.57); c.fillText('✦◆✧◇'[i % 4], 0, 0); c.restore(); }
    for (let i = 0; i < 8; i++) { const an = i / 8 * 6.283 - intro.t * 3; c.beginPath(); c.moveTo(x + Math.cos(an) * rr * 1.1, y + Math.sin(an) * rr * 1.1); c.lineTo(x + Math.cos(an) * R1 * .95, y + Math.sin(an) * R1 * .95); c.stroke(); }
    c.restore();
    if (intro.t > .85) intro = null;
  }
  const busy = () => !!intro;
  // fin du tour : les ronces se rétractent, les auras s'éteignent
  function endTurn() { active = {}; if (vines) vines.out = 0; }
  function reset() { active = {}; ground = []; vines = null; intro = null; }
  return { start, introStart, event, under, aura, emit, over, busy, reset, endTurn, isActive: id => active[id] };
})();
