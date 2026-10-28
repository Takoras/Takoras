// Laboratoire de sons de Takoras : 3 prototypes secs, mécaniques et numériques, synthétisés ici (aucun échantillon externe).
// Lancer : node sound-lab/gen.mjs   → sound-lab/out/*.wav (48 kHz, 24 bits), reel.wav, cue-sheet.csv, report.json
// Tout est déterministe (même graine = mêmes fichiers).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SR = 48000;
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'out');
fs.mkdirSync(OUT, { recursive: true });

// ---------- Outils de base
let seed = 12345;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1; // bruit blanc déterministe
const buf = (sec) => new Float64Array(Math.round(sec * SR));
const db = (x) => 20 * Math.log10(Math.max(1e-12, x));
const fromDb = (d) => 10 ** (d / 20);

// Filtre biquad (formules RBJ) appliqué en place
function biquad(x, type, f, q = 0.707, gainDb = 0) {
  const w = (2 * Math.PI * f) / SR,
    cs = Math.cos(w),
    sn = Math.sin(w),
    al = sn / (2 * q),
    A = 10 ** (gainDb / 40);
  let b0, b1, b2, a0, a1, a2;
  if (type === 'lp') [b0, b1, b2, a0, a1, a2] = [(1 - cs) / 2, 1 - cs, (1 - cs) / 2, 1 + al, -2 * cs, 1 - al];
  else if (type === 'hp') [b0, b1, b2, a0, a1, a2] = [(1 + cs) / 2, -(1 + cs), (1 + cs) / 2, 1 + al, -2 * cs, 1 - al];
  else if (type === 'bp') [b0, b1, b2, a0, a1, a2] = [al, 0, -al, 1 + al, -2 * cs, 1 - al];
  else if (type === 'hs')
    [b0, b1, b2, a0, a1, a2] = [
      A * (A + 1 + (A - 1) * cs + 2 * Math.sqrt(A) * al),
      -2 * A * (A - 1 + (A + 1) * cs),
      A * (A + 1 + (A - 1) * cs - 2 * Math.sqrt(A) * al),
      A + 1 - (A - 1) * cs + 2 * Math.sqrt(A) * al,
      2 * (A - 1 - (A + 1) * cs),
      A + 1 - (A - 1) * cs - 2 * Math.sqrt(A) * al,
    ];
  let x1 = 0,
    x2 = 0,
    y1 = 0,
    y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const y = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1;
    x1 = x[i];
    y2 = y1;
    y1 = y;
    x[i] = y;
  }
  return x;
}
// Grain de bruit filtré, avec attaque et décroissance exponentielle, ajouté dans `out` à l'instant t (s)
function grain(out, t, { dur, f, q = 1, type = 'bp', amp = 1, attack = 0.0004, decay }) {
  const n = Math.round(dur * SR),
    g = new Float64Array(n);
  for (let i = 0; i < n; i++) g[i] = rnd();
  biquad(g, type, f, q);
  const k = Math.round(t * SR),
    dc = decay ?? dur / 5;
  for (let i = 0; i < n && k + i < out.length; i++) {
    const s = i / SR,
      env = Math.min(1, s / attack) * Math.exp(-s / dc);
    out[k + i] += g[i] * env * amp;
  }
}
// Mode résonant très amorti (une « matière », pas une note : il meurt en quelques millisecondes)
function mode(out, t, f, amp, decay) {
  const k = Math.round(t * SR),
    n = Math.min(out.length - k, Math.round(decay * 8 * SR)),
    ph = rnd() * Math.PI;
  for (let i = 0; i < n; i++) out[k + i] += Math.sin((2 * Math.PI * f * i) / SR + ph) * amp * Math.exp(-i / SR / decay);
}
// Petit écrêtage numérique : maintien d'échantillon (rend le grain plus « digital »)
function hold(x, rate) {
  const step = SR / rate;
  let acc = 0,
    v = 0;
  for (let i = 0; i < x.length; i++) {
    if (acc <= 0) {
      v = x[i];
      acc += step;
    }
    acc--;
    x[i] = v;
  }
  return x;
}
// Fin propre : coupe-bas 20 Hz (pas de courant continu) + fondu cosinus sur les derniers ms
function finish(x, fadeMs = 4) {
  biquad(x, 'hp', 20, 0.707);
  const n = Math.round((fadeMs / 1000) * SR);
  for (let i = 0; i < n; i++) x[x.length - n + i] *= 0.5 + 0.5 * Math.cos((Math.PI * i) / n);
  return x;
}

// ---------- Les 3 prototypes
// A · micro-cut « tik » : double contact très court (clic large bande + bruit aigu filtré), 40 ms
function tik() {
  const x = buf(0.04);
  x[24] += 0.9;
  x[25] -= 0.6; // impulsion
  grain(x, 0.0005, { dur: 0.02, f: 4800, q: 0.9, amp: 0.9, decay: 0.0025 });
  grain(x, 0.0095, { dur: 0.012, f: 6800, q: 1.4, amp: 0.28, decay: 0.0015 }); // 2e contact, plus faible
  biquad(x, 'hp', 900, 0.7);
  hold(x, 16000);
  return { name: 'A_micro-cut_tik', fn: 'micro-cut', st: [finish(x, 5)] };
}
// B · verrou « klak » : loquet qui s'enclenche puis la pièce qui se pose (bruit grave + modes inharmoniques très courts), 140 ms
function klak() {
  const x = buf(0.14);
  grain(x, 0.001, { dur: 0.03, f: 2400, q: 1.1, amp: 0.8, decay: 0.004 }); // loquet
  grain(x, 0.021, { dur: 0.09, f: 260, q: 0.8, type: 'lp', amp: 1.6, decay: 0.018 }); // appui
  grain(x, 0.021, { dur: 0.03, f: 1500, q: 1.2, amp: 0.55, decay: 0.006 });
  // matière : modes non harmoniques (rapports 1 / 2.31 / 3.89), morts en < 30 ms
  [
    [640, 0.18, 0.012],
    [1478, 0.12, 0.008],
    [2490, 0.08, 0.005],
  ].forEach(([f, a, d]) => mode(x, 0.021, f, a, d));
  biquad(x, 'hp', 70, 0.7);
  hold(x, 22000);
  return { name: 'B_object-lock_klak', fn: 'object lock', st: [finish(x, 6)] };
}
// C · texture « crr » : cliquet d'engrenage qui accélère puis ralentit, grains aigus alternés gauche/droite + souffle léger, 480 ms (stéréo)
function crr() {
  const L = buf(0.48),
    R = buf(0.48);
  const N = 22;
  for (let i = 0; i < N; i++) {
    const p = i / (N - 1),
      t = 0.004 + 0.44 * (p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2); // accélère puis freine
    const f = 2600 + ((i * 1371) % 3200),
      a = 0.55 * (0.6 + 0.4 * Math.sin(Math.PI * p));
    const pan = i % 2 ? 0.25 : -0.25; // léger, pour rester compatible mono
    // le MÊME grain dans les deux canaux, juste plus fort d'un côté : rien ne s'annule en mono
    const one = buf(0.48);
    grain(one, t, { dur: 0.012, f, q: 1.6, amp: a, decay: 0.0018 });
    for (let k = 0; k < one.length; k++) {
      L[k] += one[k] * (1 - pan);
      R[k] += one[k] * (1 + pan);
    }
  }
  // souffle granuleux (le « mouvement de texture »), commun aux deux canaux
  const bed = buf(0.48);
  for (let i = 0; i < bed.length; i++) bed[i] = rnd() * 0.05 * Math.sin((Math.PI * i) / bed.length);
  biquad(bed, 'bp', 3800, 0.6);
  for (let i = 0; i < bed.length; i++) {
    L[i] += bed[i];
    R[i] += bed[i];
  }
  [L, R].forEach((c) => {
    biquad(c, 'hp', 1200, 0.7);
    hold(c, 18000);
    finish(c, 8);
  });
  return { name: 'C_texture_crr', fn: 'texture movement', st: [L, R] };
}

// ---------- Mesures
// Crête réelle approchée : suréchantillonnage ×4 par sinc fenêtré (Hann, 32 points)
function truePeak(ch) {
  let m = 0;
  for (const x of ch) {
    for (let i = 0; i < x.length; i++) {
      m = Math.max(m, Math.abs(x[i]));
      for (let k = 1; k < 4; k++) {
        const fr = k / 4;
        let s = 0;
        for (let j = -16; j <= 16; j++) {
          const n = i + j;
          if (n < 0 || n >= x.length) continue;
          const d = j - fr,
            sinc = d === 0 ? 1 : Math.sin(Math.PI * d) / (Math.PI * d),
            w = 0.5 + 0.5 * Math.cos((Math.PI * d) / 17);
          s += x[n] * sinc * w;
        }
        m = Math.max(m, Math.abs(s));
      }
    }
  }
  return m;
}
// Sonie « momentanée » maximale (pondération K de la BS.1770, fenêtre glissante de 400 ms), en LUFS
function maxMomentary(ch, win = 0.4) {
  const k = ch.map((c) => biquad(biquad(Float64Array.from(c), 'hs', 1681.97, 0.7072, 4), 'hp', 38.13, 0.5003));
  const W = Math.round(win * SR),
    len = k[0].length,
    pad = Math.max(len, W);
  let best = -Infinity;
  for (let start = 0; start + W <= pad; start += Math.round(0.01 * SR)) {
    let e = 0;
    for (const c of k) for (let i = start; i < start + W; i++) if (i < len) e += c[i] * c[i];
    best = Math.max(best, -0.691 + 10 * Math.log10(Math.max(1e-12, e / W)));
  }
  return best;
}
function check(s) {
  const tp = truePeak(s.st),
    n = s.st[0].length;
  const tail = Math.round(0.001 * SR);
  const endRms = Math.sqrt(
    s.st.reduce((a, c) => a + c.slice(n - tail).reduce((b, v) => b + v * v, 0), 0) / (tail * s.st.length),
  );
  const dc = Math.max(...s.st.map((c) => Math.abs(c.reduce((a, v) => a + v, 0) / n)));
  let mono = null;
  if (s.st.length === 2) {
    const [L, R] = s.st,
      M = L.map((v, i) => (v + R[i]) / 2);
    let lr = 0,
      ll = 0,
      rr = 0;
    for (let i = 0; i < n; i++) {
      lr += L[i] * R[i];
      ll += L[i] ** 2;
      rr += R[i] ** 2;
    }
    mono = {
      correlation: +(lr / Math.sqrt(ll * rr)).toFixed(3),
      monoLossDb: +(maxMomentary([M, M]) - maxMomentary(s.st)).toFixed(2),
    };
  }
  return {
    truePeakDbTP: +db(tp).toFixed(2),
    maxMomentaryLUFS: +maxMomentary(s.st).toFixed(1),
    endRmsDbFS: +db(endRms).toFixed(1),
    dcOffset: +dc.toExponential(1),
    mono,
  };
}

// ---------- Écriture WAV 24 bits
function wav(file, ch) {
  const n = ch[0].length,
    nc = ch.length,
    data = Buffer.alloc(n * nc * 3);
  for (let i = 0; i < n; i++)
    for (let c = 0; c < nc; c++) {
      const v = Math.max(-1, Math.min(1, ch[c][i])),
        q = Math.round(v * 8388607);
      data.writeIntLE(q, (i * nc + c) * 3, 3);
    }
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(nc, 22);
  h.writeUInt32LE(SR, 24);
  h.writeUInt32LE(SR * nc * 3, 28);
  h.writeUInt16LE(nc * 3, 32);
  h.writeUInt16LE(24, 34);
  h.write('data', 36);
  h.writeUInt32LE(data.length, 40);
  fs.writeFileSync(file, Buffer.concat([h, data]));
}

// ---------- Fabrication
const sounds = [tik(), klak(), crr()];
const PEAK = -1.5; // dBTP visé pour chaque fichier seul
const report = {};
for (const s of sounds) {
  const g = fromDb(PEAK) / truePeak(s.st);
  s.st = s.st.map((c) => c.map((v) => v * g));
  wav(path.join(OUT, `${s.name}.wav`), s.st);
  report[s.name] = {
    function: s.fn,
    durationMs: Math.round((s.st[0].length / SR) * 1000),
    channels: s.st.length,
    ...check(s),
  };
}
// Bobine d'écoute : chaque son 3 fois (0,6 s d'écart), 1,2 s entre deux sons, même niveau perçu.
// Égalisation sur la sonie pondérée K max en fenêtre de 100 ms (plus juste que 400 ms pour des sons de 40 à 500 ms).
const WIN = 0.1;
const TARGET = -18,
  GAP = 0.6,
  BETWEEN = 1.2,
  LEAD = 0.5;
const cues = [];
let t = LEAD;
const parts = sounds.map((s) => {
  const st2 = s.st.length === 2 ? s.st : [s.st[0], s.st[0]]; // les sons mono sont posés au centre
  const g = fromDb(TARGET - maxMomentary(st2, WIN));
  const items = [0, 1, 2].map((r) => {
    const at = t;
    t += GAP;
    cues.push({ at, name: s.name, fn: s.fn, take: r + 1 });
    return at;
  });
  t += BETWEEN - GAP;
  return { st2: st2.map((c) => c.map((v) => v * g)), items };
});
const reel = [buf(t + 0.5), buf(t + 0.5)];
for (const p of parts)
  for (const at of p.items) {
    const k = Math.round(at * SR);
    p.st2.forEach((c, ci) =>
      c.forEach((v, i) => {
        reel[ci][k + i] += v;
      }),
    );
  }
const rp = truePeak(reel);
// si une crête dépasse -1 dBTP, toute la bobine baisse d'autant (les sons restent égaux entre eux)
const trim = db(rp) > -1 ? fromDb(-1) / rp : 1;
if (trim !== 1) {
  reel.forEach((c) =>
    c.forEach((v, i) => {
      c[i] = v * trim;
    }),
  );
  parts.forEach((p) => {
    p.st2 = p.st2.map((c) => c.map((v) => v * trim));
  });
}
wav(path.join(OUT, 'reel.wav'), reel);
const tc = (s) =>
  `00:00:${String(Math.floor(s)).padStart(2, '0')}.${String(Math.round((s % 1) * 1000)).padStart(3, '0')}`;
fs.writeFileSync(
  path.join(OUT, 'cue-sheet.csv'),
  [
    'timecode,seconds,sound,function,take',
    ...cues.map((c) => `${tc(c.at)},${c.at.toFixed(3)},${c.name},${c.fn},${c.take}`),
  ].join('\n') + '\n',
);
report.reel = {
  durationS: +(reel[0].length / SR).toFixed(2),
  truePeakDbTP: +db(truePeak(reel)).toFixed(2),
  levelMatchTargetLUFS: TARGET,
  trimDb: +db(trim).toFixed(2),
  matchWindowMs: WIN * 1000,
  perSoundLoudness100msInReel: Object.fromEntries(
    parts.map((p, i) => [sounds[i].name, +maxMomentary(p.st2, WIN).toFixed(1)]),
  ),
};
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
