// Ouverture d'un pull : le jeton « ? » et le compteur de chance qui monte à chaque clic (1/1 → 1/X).
// Le résultat est tiré dès l'ouverture ; les clics ne font que le révéler. On peut spammer pour aller vite.

// Jetons de la série Takoras — PROVISOIRES : même texture (template), seule la couleur du glow change.
const TEMPLATE = 'img/jetons/template.png'; // texture par défaut tant qu'un jeton n'a pas son dessin
const texOf = j => j.img || TEMPLATE;
const SERIES = {
  Takoras: [
    { name: 'Mobu', odds: 2, glow: '#8fb3c4', img: 'img/jetons/serie-takoras/mobu.png' },
    { name: 'Pikko', odds: 4, glow: '#a8a29e' },
    { name: 'Rouillé', odds: 10, glow: '#c2703d' },
    { name: 'Givre', odds: 25, glow: '#cbd5e1' },
    { name: 'Soléo', odds: 60, glow: '#f59e0b' },
    { name: 'Azura', odds: 150, glow: '#0ea5e9' },
    { name: 'Carmin', odds: 400, glow: '#e11d48' },
    { name: 'Vyolis', odds: 1000, glow: '#a855f7' },
    { name: 'Lumis', odds: 2500, glow: '#ec4899' },
    { name: 'Nyx', odds: 5000, glow: '#6366f1' },
    { name: 'Astra', odds: 10000, glow: '#22d3ee' },
    { name: 'Kraïos', odds: 25000, glow: '#2563eb' },
    { name: 'Chronos', odds: 50000, glow: '#facc15' },
    { name: 'Takoras Prime', odds: 100000, glow: '#f0abfc' },
    { name: 'Zénith', odds: 250000, glow: '#e2e8f0' },
    { name: 'Oblivion', odds: 500000, glow: '#fb7185' },
    { name: 'Takoras Ω', odds: 1000000, glow: '#c084fc' },
  ],
};
const SKIP = 1 / 5; // environ 1 clic sur 5 saute discrètement une étape

// Couleur du compteur selon la rareté atteinte
const TIERS = [[10, '200, 200, 210'], [50, '74, 222, 128'], [200, '56, 189, 248'], [1000, '167, 139, 250'], [5000, '251, 191, 36'], [25000, '244, 114, 182'], [Infinity, '240, 240, 255']];
const FAST = 60;   // en dessous de 1/60 : retournement direct, pas de pause
const RARE = 1000; // à partir de 1/1000 : zoom plus fort et révélation plus spectaculaire
// Pendant le compteur : pas de couleur, juste du blanc de plus en plus lumineux
const tierOf = () => '235, 235, 255';
const MYTHIC = 100000, GOD = 1000000; // mise en scène spéciale à partir de 1/100 000, et encore plus pour 1/1 000 000
const hexRGB = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).join(', ');
const jetonHTML = (j, size) =>
  `<img class="jeton" src="${texOf(j)}" alt="${j.name}" style="width:${size}px;height:${size}px;filter:drop-shadow(0 0 ${Math.max(4, size / 8)}px ${j.glow})">`;

// Réglages de test (menu debug)
const debug = { luck: 1, force: '' };

// Tirage « 1 chance sur X », du plus rare au plus commun. La luck multiplie chaque chance.
function draw(list) {
  if (debug.force) return list.find(j => j.name === debug.force);
  const byRarity = [...list].sort((a, b) => b.odds - a.odds);
  return byRarity.find(j => Math.random() < debug.luck / j.odds) || byRarity[byRarity.length - 1];
}

// Valeurs affichées à chaque clic : monte doucement puis accélère (8 à 15 clics pour les jetons rares).
function steps(X) {
  if (X <= 1) return [];
  const n = Math.min(X - 1, Math.min(15, Math.round(4 + Math.log2(X) * .9)));
  const out = [];
  for (let i = 1; i <= n; i++) {
    const v = i === n ? X : Math.round(1 + (X - 1) * (i / n) ** 2.2 * (.9 + Math.random() * .2));
    out.push(Math.min(X, Math.max(v, (out[out.length - 1] || 1) + 1)));
  }
  return out.filter((v, i) => i === out.length - 1 || i === 0 || Math.random() > SKIP);
}

let run = null;
const opCoin = $('op-coin');
const MYSTERE = 'img/jetons/mystere.png';

// Le « ? » apparaît tout petit et grossit en douceur
function spawn() {
  opCoin.animate([{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 520, easing: 'cubic-bezier(.16, 1, .3, 1)' });
}
// Jeton en volume : la face devant, quelques copies assombries derrière pour la tranche, et un dos.
// Ce ne sont que des images empilées en 3D (pas de calcul), donc ça ne fait pas ramer le navigateur.
const DEPTH = 8; // nombre de couches de la tranche
function coin3D(src, alt, style = '') {
  let edge = '';
  for (let i = 1; i <= DEPTH; i++) edge += `<img class="edge" src="${src}" alt="" style="transform:translateZ(${-i * 2}px)">`;
  return `<img class="face" src="${src}" alt="${alt}" style="${style}">${edge}<img class="back" src="${src}" alt="" style="transform:translateZ(${-(DEPTH + 1) * 2}px) rotateY(180deg)">`;
}
function setGlareMask(src) {
  opCoin.querySelectorAll('.glare, .shine').forEach(g => { g.style.webkitMaskImage = g.style.maskImage = `url(${src})`; });
}
// Onde de choc qui part du jeton
function wave() {
  const r = opCoin.getBoundingClientRect(), w = document.createElement('div');
  w.className = 'op-wave';
  w.style.cssText = `left:${r.left + r.width / 2}px;top:${r.top + r.height / 2}px;width:${r.width}px;height:${r.width}px`;
  opening.appendChild(w);
  w.animate([{ transform: 'translate(-50%,-50%) scale(.6)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(9)', opacity: 0 }],
    { duration: 1000, easing: 'cubic-bezier(.1,.7,.3,1)' }).finished.then(() => w.remove());
}

// Session d'ouverture (1 ou 10 pulls), sauvegardée dans le navigateur pour reprendre après un refresh
const SAVE_KEY = 'takoras-session';
let sess = null;
function save() { try { sess ? localStorage.setItem(SAVE_KEY, JSON.stringify(sess)) : localStorage.removeItem(SAVE_KEY); } catch {} }
function startSession(n) { sess = { pull: current, total: n, idx: 0, results: [], cur: null }; save(); }
function endSession() { sess = null; save(); }
const seriesOf = () => SERIES[PULLS[sess.pull].name] || SERIES.Takoras;
const findJeton = name => seriesOf().find(j => j.name === name);

// Prépare le jeton « ? » courant. Sans état sauvegardé, on tire un nouveau jeton.
function startOpening() {
  if (!sess) startSession(1);
  if (!sess.cur) {
    const result = draw(seriesOf());
    sess.cur = { name: result.name, queue: steps(result.odds), shown: 1, phase: 'count' };
    save();
  }
  const c = sess.cur, p = PULLS[sess.pull];
  run = { result: findJeton(c.name), queue: c.queue, shown: c.shown, done: false };
  $('op-tag').textContent = 'Pull ' + p.name + (sess.total > 1 ? ` · ${sess.idx + 1}/${sess.total}` : '');
  $('op-odds').classList.remove('bump');
  $('op-price').textContent = (p.price * sess.total).toLocaleString('fr');
  $('op-odds').textContent = '1/' + c.shown.toLocaleString('fr');
  stopBg();
  opening.classList.remove('hold', 'rare', 'revealed', 'recap', 'spinning', 'mythic', 'god', 'cinema');
  setTier(c.shown);
  opCoin.className = 'op-coin';
  opCoin.innerHTML = `<div class="zoom"><div class="tilt3d"><div class="spin">${coin3D(MYSTERE, 'Jeton mystère')}</div><i class="glare"></i><i class="shine"></i>${'<b class="tw"></b>'.repeat(7)}</div></div>`;
  setGlareMask(MYSTERE);
  if (c.phase === 'count' && c.shown === 1) spawn(); // le « ? » arrive en grossissant
  $('op-hint').textContent = 'Clique sur le jeton';
  $('op-stats').innerHTML = '';
  if (c.phase === 'hold') hold(true);
  if (c.phase === 'revealed') reveal(true);
}

function setTier(v) {
  opening.style.setProperty('--tier', tierOf(v));
  // Dès 1/2500 pendant le compteur : rayons pixel + poussière derrière le jeton
  if (v >= 2500 && bg.mode !== 'hold' && !opening.classList.contains('revealed')) {
    const [r, g, b] = tierOf(v).split(', ').map(Number);
    startBg({ odds: RARE, glow: '#' + [r, g, b].map(n => n.toString(16).padStart(2, '0')).join('') }, 'hold');
  }
  if (v < 2500 && bg.mode === 'hold') { stopBg(); bg.mode = ''; }
  opening.classList.toggle('t1000', v >= 1000);
  opening.classList.toggle('t2500', v >= 2500);
  opCoin.style.setProperty('--boost', v >= 50 ? Math.min(1.6, Math.log10(v / 50) * .4) : 0); // le halo grandit avec la rareté
}

// Le compteur roule vite vers la nouvelle valeur ; un nouveau clic reprend là où il en est
let countAnim = 0;
function countTo(from, to, ms = 110) {
  const t0 = performance.now(), el = $('op-odds'), id = ++countAnim;
  el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
  (function step(t) {
    if (id !== countAnim) return;
    const k = Math.min(1, (t - t0) / ms);
    el.textContent = '1/' + Math.round(from + (to - from) * k).toLocaleString('fr');
    if (k < 1) requestAnimationFrame(step);
  })(t0);
}

// Tremblement très rapide qui s'amortit (à partir de 1/500)
function shake(power = 1) {
  const a = 9 * power, f = [1, -.8, .6, -.45, .3, -.18, .08, 0];
  opening.animate(f.map((k, i) => ({ transform: `translate(${a * k}px, ${a * k * (i % 2 ? .6 : -.6)}px)` })), { duration: 260, easing: 'ease-in' });
}

// Flash blanc doux (à partir de 1/5000)
function flash(power = .45, ms = 500) {
  opening.querySelectorAll('.op-flash').forEach(f => f.remove());
  const f = document.createElement('div');
  f.className = 'op-flash';
  f.style.cssText = 'position:absolute;inset:0;background:#fff;pointer-events:none';
  opening.appendChild(f);
  f.animate([{ opacity: power }, { opacity: 0 }], { duration: ms, easing: 'ease-out' }).finished.then(() => f.remove());
}

function burst(n = 5) {
  const r = opCoin.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
  const col = `rgb(${getComputedStyle(opening).getPropertyValue('--tier')})`;
  for (let i = 0; i < n; i++) {
    const s = document.createElement('i'), a = Math.random() * Math.PI * 2, d = r.width * (.55 + Math.random() * .3);
    s.className = 'op-spark';
    s.style.cssText = `left:${x}px;top:${y}px;background:${col}`;
    opening.appendChild(s);
    s.animate([{ transform: 'translate(-50%,-50%)', opacity: 1 }, { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d}px)) scale(.3)`, opacity: 0 }],
      { duration: 380, easing: 'cubic-bezier(.2,.7,.3,1)' }).finished.then(() => s.remove());
  }
}

// Effets selon le palier atteint par le clic
function effects(v) {
  if (v >= 500) shake(v >= 2500 ? 1.4 : 1);
  if (v >= 5000 && !run.flashed) { run.flashed = true; flash(); } // une seule fois par ouverture
  burst(v >= 100000 ? 16 : v >= 10000 ? 12 : v >= 1000 ? 9 : v >= 200 ? 6 : 4);
}

// Fiche du jeton (stats provisoires : plus il est rare, plus elles sont hautes)
function fillInfo(j) {
  const lvl = Math.log10(j.odds) / 6; // 0 → 1 pour 1/1 → 1/1 000 000
  const stat = (n, base) => { const v = Math.round(base * (.35 + lvl * .65) * (.85 + Math.random() * .3)); return [n, v, Math.min(100, v / base * 100)]; };
  $('op-name').textContent = j.name;
  $('op-rarity').textContent = '1/' + j.odds.toLocaleString('fr');
  sess.cur.stats ||= [stat('PV', 500), stat('Attaque', 120), stat('Défense', 120), stat('Vitesse', 100)];
  $('op-stats').innerHTML = sess.cur.stats
    .map(([n, v, w]) => `<div class="stat"><span class="muted">${n}</span><div class="bar"><i data-w="${w}"></i></div><b>${v}</b></div>`).join('');
  requestAnimationFrame(() => requestAnimationFrame(() => $('op-stats').querySelectorAll('i').forEach(i => { i.style.width = i.dataset.w + '%'; })));
}

// Pause finale : le haut disparaît, zoom sur le jeton qui tremble, on clique pour révéler
function hold(restored) {
  const r = run;
  r.holding = true;
  sess.cur.phase = 'hold'; save();
  opening.classList.add('hold');
  opening.classList.toggle('rare', r.result.odds >= RARE);
  opening.classList.toggle('cinema', r.result.odds >= MYTHIC); // bandes noires façon film + battement de cœur
  opCoin.classList.remove('hit');
  if (!restored) flash(.18, 260); // mini flash : le compteur ne montera plus
  $('op-hint').textContent = 'Clique pour révéler';
  setTimeout(() => { if (run === r) r.canReveal = true; }, 450); // évite de révéler par accident en spammant
}

// Révélation : le jeton tourne en se penchant, la face change à mi-chemin, puis il glisse à gauche et la fiche arrive
// Fond de la révélation, dessiné en pixel art en direct sur un petit canvas agrandi sans lissage.
// Plus le jeton est rare, plus le fond est chargé : bandes → rayons + poussière → étoiles + reflets.
const bg = { canvas: null, ctx: null, raf: 0, level: 0, rgb: [255, 255, 255], dust: [], stars: [] };
const PX = 6; // taille d'un « pixel » du fond à l'écran
function bgLevel(odds) { return odds >= GOD ? 5 : odds >= MYTHIC ? 4 : odds >= 10000 ? 3 : odds >= RARE ? 2 : odds >= FAST ? 1 : 0; }

function startBg(j, mode = 'reveal') {
  bg.mode = mode;
  if (!bg.canvas) {
    bg.canvas = document.createElement('canvas');
    $('op-bg').appendChild(bg.canvas);
    bg.ctx = bg.canvas.getContext('2d');
  }
  bg.canvas.width = Math.ceil(innerWidth / PX);
  bg.canvas.height = Math.ceil(innerHeight / PX);
  bg.level = bgLevel(j.odds);
  bg.rgb = hexRGB(j.glow).split(', ').map(Number);
  const W = bg.canvas.width, H = bg.canvas.height;
  bg.dust = Array.from({ length: [0, 0, 26, 50, 80, 120][bg.level] }, () => ({ x: Math.random() * W, y: Math.random() * H, v: .04 + Math.random() * .1, a: Math.random() }));
  bg.stars = Array.from({ length: [0, 0, 0, 40, 55, 75][bg.level] }, () => ({ x: Math.random() * W | 0, y: Math.random() * H | 0, p: Math.random() * 6 }));
  cancelAnimationFrame(bg.raf);
  const t0 = performance.now();
  const loop = t => { drawBg((t - t0) / 1000); bg.raf = requestAnimationFrame(loop); };
  bg.raf = requestAnimationFrame(loop);
}
function stopBg() { cancelAnimationFrame(bg.raf); bg.mode = ''; }

function drawBg(t) {
  const { ctx, level } = bg, W = bg.canvas.width, H = bg.canvas.height, [r, g, b] = bg.rgb;
  // 1/1 000 000 : les couleurs défilent en arc-en-ciel
  const col = level >= 5 ? a => `hsla(${(t * 50) % 360},90%,72%,${a})` : a => `rgba(${r},${g},${b},${a})`;
  ctx.fillStyle = 'rgb(35,32,52)';
  ctx.fillRect(0, 0, W, H);

  // Centre des rayons : le jeton (il est à gauche une fois révélé)
  const c = opCoin.getBoundingClientRect(), cx = (c.left + c.width / 2) / PX, cy = (c.top + c.height / 2) / PX;

  // Rayons de lumière qui tournent lentement (à partir de 1/1000)
  if (level >= 2) {
    const n = level >= 4 ? 16 : 12, R = Math.hypot(W, H), turn = t * (level >= 4 ? .14 : .08);
    for (let i = 0; i < n; i++) {
      const a0 = turn + i / n * Math.PI * 2, a1 = a0 + Math.PI / n * .55;
      ctx.fillStyle = col(level >= 4 ? .13 + .07 * Math.sin(t * 3 + i) : level >= 3 ? .10 + .05 * Math.sin(t * 2 + i) : .08);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a0) * R, cy + Math.sin(a0) * R);
      ctx.lineTo(cx + Math.cos(a1) * R, cy + Math.sin(a1) * R);
      ctx.fill();
    }
  }

  // Bandes en escalier qui glissent doucement (l'escalier vient de l'agrandissement sans lissage)
  const slope = -.1, thick = Math.max(10, H * .09);
  const bands = level === 0 ? [[.2, .35]] : level >= 3 ? [[.16, 1], [.86, 1], [.5, .25], [.03, .3]] : [[.18, 1], [.84, 1]];
  if (bg.mode !== 'hold') bands.forEach(([pos, alpha], k) => {
    const shift = Math.sin(t * .35 + k) * 3;
    const y0 = H * pos + shift - slope * W / 2;
    ctx.fillStyle = col(alpha * (level === 0 ? 1 : .95));
    ctx.beginPath();
    ctx.moveTo(0, y0); ctx.lineTo(W, y0 + slope * W); ctx.lineTo(W, y0 + slope * W + thick); ctx.lineTo(0, y0 + thick);
    ctx.fill();
    // Reflet blanc qui parcourt la bande (à partir de 1/10 000)
    if (level >= 3 && alpha === 1) {
      const x = ((t * 40 + k * W / 2) % (W + 60)) - 30;
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      ctx.beginPath();
      ctx.moveTo(x, y0 + slope * x); ctx.lineTo(x + 8, y0 + slope * (x + 8)); ctx.lineTo(x + 2, y0 + slope * (x + 2) + thick); ctx.lineTo(x - 6, y0 + slope * (x - 6) + thick);
      ctx.fill();
    }
  });

  // Poussière de pixels qui monte (à partir de 1/1000)
  bg.dust.forEach(d => {
    d.y -= d.v; if (d.y < -2) { d.y = H + 2; d.x = Math.random() * W; }
    ctx.fillStyle = col(.35 + .35 * Math.sin(t * 2 + d.a * 6));
    ctx.fillRect(d.x | 0, d.y | 0, 1, 1);
  });

  // Mythique (1/100 000+) : anneaux de pixels en orbite, ondes de choc ; 1/1 000 000 : éclairs en plus
  if (level >= 4 && bg.mode !== 'hold') {
    const R0 = c.width / PX * .78;
    [[1, 22, .9], ...(level >= 5 ? [[-1.4, 14, 1.25]] : [])].forEach(([dir, n, k]) => {
      for (let i = 0; i < n; i++) {
        const a = t * .9 * dir + i / n * Math.PI * 2, R = R0 * k + Math.sin(t * 3 + i) * 1.5;
        ctx.fillStyle = i % 3 ? col(.9) : 'rgba(255,255,255,.95)';
        ctx.fillRect(cx + Math.cos(a) * R | 0, cy + Math.sin(a) * R * .92 | 0, i % 4 ? 1 : 2, i % 4 ? 1 : 2);
      }
    });
    const period = level >= 5 ? 1.2 : 1.8, ph = (t % period) / period;
    ctx.strokeStyle = col(.8 * (1 - ph)); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, R0 + ph * W * .55, 0, Math.PI * 2); ctx.stroke();
    if (level >= 5 && (t % 1.4) < .12) {
      let x = cx + (Math.random() - .5) * W * .6, y = 0;
      ctx.fillStyle = 'rgba(255,255,255,.95)';
      while (y < cy - R0) { const nx = x + (Math.random() - .5) * 6; for (let k = 0; k < 4; k++) ctx.fillRect((x + (nx - x) * k / 4) | 0, (y + k) | 0, 1, 1); x = nx; y += 4; }
    }
  }

  // Étoiles qui scintillent en croix (à partir de 1/10 000)
  bg.stars.forEach(s => {
    const k = Math.max(0, Math.sin(t * 1.6 + s.p));
    if (k < .3) return;
    ctx.fillStyle = `rgba(255,255,255,${k})`;
    ctx.fillRect(s.x, s.y, 1, 1);
    if (k > .85) { ctx.fillRect(s.x - 1, s.y, 3, 1); ctx.fillRect(s.x, s.y - 1, 1, 3); }
  });
}

// Révélation : clic → la face change direct, le jeton part à gauche d'un coup sec, la fiche apparaît à droite
function reveal(restored) {
  const r = run, j = r.result;
  r.done = true;
  opening.classList.remove('hold');
  opCoin.classList.add('done');
  $('op-hint').textContent = '';
  opening.style.setProperty('--tier', hexRGB(j.glow));
  startBg(j);
  const spin = opCoin.querySelector('.spin');
  spin.innerHTML = coin3D(texOf(j), j.name); // pas d'ombre sur l'image (elle serait coupée en carré en 3D) : le halo est derrière
  setGlareMask(texOf(j));
  // Le jeton se retourne très vite puis ralentit longtemps (plus il est rare, plus ça dure)
  if (!restored) {
    const turns = j.odds >= GOD ? 10 : j.odds >= MYTHIC ? 8 : j.odds >= RARE ? 6 : j.odds >= FAST ? 4 : 3;
    const ms = j.odds >= GOD ? 5200 : j.odds >= MYTHIC ? 4200 : j.odds >= RARE ? 3200 : j.odds >= FAST ? 2400 : 1600;
    spin.animate([{ transform: 'rotateY(0)' }, { transform: `rotateY(${turns * 360}deg)` }], { duration: ms, easing: 'cubic-bezier(.05, .9, .1, 1)' });
    // Impossible de passer à la suite tant que le jeton tourne
    r.spinEnd = performance.now() + ms;
    opening.classList.add('spinning');
    setTimeout(() => { if (run === r) opening.classList.remove('spinning'); }, ms);
  }
  fillInfo(j);
  opening.classList.toggle('rare', j.odds >= RARE);
  opening.classList.toggle('mythic', j.odds >= MYTHIC); // jeton animé : halo qui pulse, reflet qui passe, étincelles
  opening.classList.toggle('god', j.odds >= GOD);       // + couleurs arc-en-ciel
  opening.classList.toggle('cinema', j.odds >= GOD);
  opening.style.setProperty('--jg', j.glow);
  opening.classList.add('revealed');
  opCoin.style.setProperty('--boost', j.odds >= MYTHIC ? 1.6 : j.odds >= RARE ? 1 : .5);
  updateActions();
  r.revealedAt = performance.now();
  if (restored) return;
  sess.cur.phase = 'revealed';
  sess.results.push(j.name);
  save();
  if (j.odds >= MYTHIC) {
    flash(j.odds >= GOD ? .85 : .65, 900);
    shake(1.8);
    wave(); if (j.odds >= GOD) setTimeout(wave, 180);
    burst(j.odds >= GOD ? 40 : 28);
    setTimeout(() => { if (run === r) { shake(1); burst(16); } }, 350);
  } else {
    burst(j.odds >= RARE ? 14 : 8);
    if (j.odds >= RARE) flash(.3, 350);
    setTimeout(() => { if (run === r) shake(j.odds >= RARE ? .8 : .45); }, 300); // impact à l'arrivée
  }
  addToHistory(j);
}

// Boutons sous la fiche : Suivant (pendant un ×10), Récap (à la fin d'un ×10), ou Pull encore / Retour
function updateActions() {
  const last = sess.idx >= sess.total - 1, multi = sess.total > 1;
  if (typeof ecoDecorate === 'function') setTimeout(ecoDecorate);
  $('op-next').hidden = last;
  $('op-next').innerHTML = `Suivant · ${sess.idx + 2}/${sess.total}`;
  $('op-recap').hidden = !(last && multi);
  $('op-again').hidden = $('op-back').hidden = !(last && !multi);
}
const spinning = () => run && performance.now() < (run.spinEnd || 0);
function next() {
  if (!sess || sess.idx >= sess.total - 1 || !opening.classList.contains('revealed') || spinning()) return;
  sess.idx++;
  sess.cur = null;
  save();
  startOpening();

}

// Récap des 10 jetons, le plus rare mis en avant
function showRecap() {
  if (spinning()) return;
  sess.recap = true;
  save();
  stopBg();
  const list = sess.results.map(findJeton), best = list.reduce((a, b) => (b.odds > a.odds ? b : a));
  opening.style.setProperty('--tier', hexRGB(best.glow));
  startBg(best);
  $('op-recap-grid').innerHTML = list.map((j, i) =>
    `<div class="rc${j === best ? ' best' : ''}" style="--g:${hexRGB(j.glow)};animation-delay:${i * 45}ms">${j === best ? '<span class="rc-tag">Meilleur tirage</span>' : ''}${jetonHTML(j, 72)}<b>${j.name}</b><small>1/${j.odds.toLocaleString('fr')}</small></div>`).join('');
  $('op-recap-tag').textContent = `Récap · ${sess.total} pulls`;
  $('op-recap-title').textContent = `Tes ${sess.total} jetons`;
  if (typeof ecoDecorate === 'function') ecoDecorate();
  opening.classList.remove('revealed', 'hold');
  opening.classList.add('recap');
}

// On ne peut quitter qu'à la fin (pour ne pas perdre les pulls achetés)
function canClose() { return !sess || sess.recap || (sess.total === 1 && opening.classList.contains('revealed')); }

function addToHistory(j) {
  const row = document.createElement('div');
  row.className = 'h-row';
  row.innerHTML = `${jetonHTML(j, 26)}<div>${j.name}<small>à l'instant</small></div><span class="muted">1/${j.odds.toLocaleString('fr')}</span>`;
  $('hist').prepend(row);
  while ($('hist').children.length > 6) $('hist').lastElementChild.remove();
}

function tap() {
  if (!run || run.done) return;
  if (run.holding) { if (run.canReveal) reveal(); return; }
  if (!run.queue.length) return; // entre le dernier palier et la pause
  const next = run.queue.shift();
  countTo(run.shown, next);
  run.shown = next;
  sess.cur.queue = run.queue; sess.cur.shown = next; save();
  setTier(next);
  opCoin.classList.remove('hit'); void opCoin.offsetWidth; opCoin.classList.add('hit');
  effects(next);
  $('op-hint').textContent = '';
  if (!run.queue.length) {
    if (run.result.odds < FAST) { run.done = true; setTimeout(reveal, 120); }
    else setTimeout(hold, 200);
  }
}

opCoin.addEventListener('pointerdown', e => { e.preventDefault(); tap(); }); // pointerdown = réagit dès l'appui, idéal pour spammer
addEventListener('keydown', e => {
  if (!opening.classList.contains('on') || (e.key !== ' ' && e.key !== 'Enter') || e.target.closest?.('select, .debug') || (e.key === 'Enter' && e.target.closest?.('button:not(#op-coin)'))) return;
  e.preventDefault();
  if (opening.classList.contains('revealed')) { if (!$('op-next').hidden) next(); else if (!$('op-recap').hidden) showRecap(); return; }
  tap();
});

function buy(n) { closeOpening(); startSession(n); runTransition(); }
$('op-next').addEventListener('click', next);
// Pendant un ×10 : un clic n'importe où sur l'écran passe au jeton suivant
opening.addEventListener('click', e => {
  if (e.target.closest?.('button, select, .debug') || $('op-next').hidden || !opening.classList.contains('revealed')) return;
  next();
});
$('op-recap').addEventListener('click', showRecap);
$('op-again').addEventListener('click', () => openPulls(1));
$('op-back').addEventListener('click', leave);
$('op-recap-again').addEventListener('click', () => openPulls('all'));
$('op-recap-back').addEventListener('click', leave);

// Retour à l'accueil : tout s'envole hors de l'écran, les bandes noires repartent, puis l'accueil revient en douceur
let leaving = false;
async function leave() {
  if (leaving || !opening.classList.contains('on') || !canClose()) return;
  leaving = true;
  const out = 'cubic-bezier(.6, 0, .85, .2)', anims = [];
  // N'anime que ce qui est visible, en partant de son opacité actuelle (sinon un élément caché réapparaîtrait)
  const fly = (el, kf, opt) => {
    if (!el || el.offsetParent === null) return;
    const o = +getComputedStyle(el).opacity;
    if (o === 0) return;
    kf[0] = { ...kf[0], opacity: o };
    anims.push(el.animate(kf, { fill: 'forwards', easing: out, ...opt }));
  };
  opening.classList.add('leaving');
  opening.classList.remove('cinema');
  fly(opening.querySelector('.op-coin-col'), [{ transform: getComputedStyle(opening.querySelector('.op-coin-col')).transform }, { transform: 'translate(-70vw, 8vh) rotate(-35deg)', opacity: 0 }], { duration: 520 });
  fly($('op-info'), [{ transform: 'none', opacity: 1 }, { transform: 'translateX(60vw)', opacity: 0 }], { duration: 480, delay: 40 });
  fly(opening.querySelector('.op-top'), [{ opacity: 1 }, { transform: 'translateY(-14vh)', opacity: 0 }], { duration: 400 });
  opening.querySelectorAll('.rc').forEach((c, i) =>
    fly(c, [{ transform: 'none', opacity: 1 }, { transform: `translate(${(i % 5 - 2) * 18}vw, ${i < 5 ? -60 : 60}vh) rotate(${(i % 2 ? 1 : -1) * 25}deg)`, opacity: 0 }], { duration: 520, delay: i * 25 }));
  fly(opening.querySelector('.op-recap-view h2'), [{ opacity: 1 }, { transform: 'translateY(-10vh)', opacity: 0 }], { duration: 400 });
  opening.querySelectorAll('.op-recap-view .eyebrow, .op-recap-view .op-actions').forEach(el => fly(el, [{ opacity: 1 }, { opacity: 0, transform: 'translateY(20px)' }], { duration: 300 }));
  ['.op-bg', '.op-glow', '.op-vignette'].forEach(q => fly(opening.querySelector(q), [{ opacity: getComputedStyle(opening.querySelector(q)).opacity }, { opacity: 0 }], { duration: 600, easing: 'ease-in', delay: 120 }));
  await done(560);
  // L'écran d'ouverture s'efface et l'accueil revient avec un léger zoom
  await Promise.all([
    opening.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, easing: 'ease-out', fill: 'forwards' }).finished,
    document.querySelector('main').animate([{ opacity: .3, transform: 'scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 520, easing: 'cubic-bezier(.16, 1, .3, 1)' }).finished,
  ]);
  closeOpening();
  opening.getAnimations().forEach(a => a.cancel());
  anims.forEach(a => a.cancel());
  opening.classList.remove('leaving');
  leaving = false;
}

// Menu debug
const LUCKS = [1, 2, 5, 10, 100, 1000];
const FX = [['Shake', () => shake()], ['Vignette', () => opening.classList.toggle('t1000')], ['Rayons', () => opening.classList.toggle('t2500')], ['Flash', flash]];
function renderDebug() {
  $('dbg-luck').innerHTML = LUCKS.map(l => `<button class="${l === debug.luck ? 'on' : ''}" data-l="${l}">×${l}</button>`).join('');
  $('dbg-force').innerHTML = '<option value="">Aléatoire</option>' + SERIES.Takoras.map(j =>
    `<option value="${j.name}"${j.name === debug.force ? ' selected' : ''}>${j.name} · 1/${j.odds.toLocaleString('fr')}</option>`).join('');
  $('dbg-fx').innerHTML = FX.map(([n], i) => `<button data-f="${i}">${n}</button>`).join('');
}
$('dbg-luck').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { debug.luck = +b.dataset.l; renderDebug(); } });
$('dbg-force').addEventListener('change', e => { debug.force = e.target.value; });
$('dbg-fx').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (!opening.classList.contains('on')) { startSession(1); showOpening(); }
  FX[+b.dataset.f][1]();
});
$('dbg-open').addEventListener('click', () => buy(1));

// Reprise après un refresh : on revient exactement où on en était
(function restore() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch {}
  if (!saved || !PULLS[saved.pull] || (saved.cur && !(SERIES[PULLS[saved.pull].name] || SERIES.Takoras).some(j => j.name === saved.cur.name))) { endSession(); return; }
  sess = saved;
  select(sess.pull);
  if (!sess.cur && !sess.recap) { endSession(); return; }
  showOpening();
  if (sess.recap) showRecap();
})();

// Hover : le jeton du pull penche vers la souris avec un reflet de lumière (comme sur l'accueil)
(function tiltLoop() {
  let over = false, mx = .5, my = .5;
  const cur = { rx: 0, ry: 0, g: 0 };
  opCoin.addEventListener('pointermove', e => {
    const r = opCoin.getBoundingClientRect();
    mx = (e.clientX - r.left) / r.width; my = (e.clientY - r.top) / r.height; over = true;
  });
  opCoin.addEventListener('pointerleave', () => { over = false; });
  (function frame() {
    const t = opCoin.querySelector('.tilt3d');
    if (t && opening.classList.contains('on')) {
      const tgt = over ? { rx: (.5 - my) * 40, ry: (mx - .5) * 40, g: 1 } : { rx: 0, ry: 0, g: 0 };
      for (const k in cur) cur[k] += (tgt[k] - cur[k]) * (over ? .12 : .06);
      t.style.transform = `rotateX(${cur.rx.toFixed(2)}deg) rotateY(${cur.ry.toFixed(2)}deg)`;
      opCoin.style.setProperty('--mx', (mx * 100).toFixed(1) + '%');
      opCoin.style.setProperty('--my', (my * 100).toFixed(1) + '%');
      opCoin.style.setProperty('--g', cur.g.toFixed(3));
    }
    requestAnimationFrame(frame);
  })();
})();

// Hover sur les jetons du récap
$('op-recap-grid').addEventListener('pointermove', e => {
  const card = e.target.closest('.rc'); if (!card) return;
  const img = card.querySelector('img'), r = img.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
  img.style.transform = `perspective(400px) rotateX(${(-y * 36).toFixed(1)}deg) rotateY(${(x * 36).toFixed(1)}deg) scale(1.08)`;
});
$('op-recap-grid').addEventListener('pointerout', e => {
  const card = e.target.closest('.rc'); if (card && !card.contains(e.relatedTarget)) card.querySelector('img').style.transform = '';
});
