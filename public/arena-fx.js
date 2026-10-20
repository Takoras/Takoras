// Combat : une animation propre à la capacité de chaque jeton (lancée quand le jeton est posé avec sa capacité).
// Tout est fait en éléments HTML animés (pas d'image à charger). ABFX[nom](c) renvoie une promesse (~0,9 s).
// c = { me, foe : cartes des jetons ; mySlot, foeSlot : jetons posés ; lanes : les 3 endroits ; myBar, foeBar : barres de PV ;
//       myCards, foeCards : cartes de chaque équipe ; col : couleur de l'élément }

const ABFX = (() => {
  const layer = () => $('arena');
  const center = el => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; };
  const wait = ms => new Promise(r => setTimeout(r, ms));
  function mk(css, html = '') {
    const d = document.createElement('div');
    d.className = 'fx'; d.style.cssText = 'position:fixed;left:0;top:0;pointer-events:none;z-index:96;' + css;
    d.innerHTML = html; layer().appendChild(d); return d;
  }
  const go = (el, kf, o) => el.animate(kf, { fill: 'forwards', ...o }).finished.then(() => el.remove()).catch(() => el.remove());
  // petits carrés « pixel » qui partent d'un point
  function burst(p, col, n = 16, dist = 70, size = 6, ms = 600) {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2, d = dist * (.4 + Math.random() * .8), s = mk(`width:${size}px;height:${size}px;background:${col};box-shadow:0 0 8px ${col}`);
      go(s, [{ transform: `translate(${p.x}px,${p.y}px)`, opacity: 1 }, { transform: `translate(${p.x + Math.cos(a) * d}px,${p.y + Math.sin(a) * d}px) scale(.3)`, opacity: 0 }], { duration: ms * (.7 + Math.random() * .5), easing: 'cubic-bezier(.2,.8,.3,1)' });
    }
  }
  // objets (emoji ou carrés) qui volent de a vers b
  function fly(a, b, html, n = 8, ms = 520, spread = 30) {
    for (let k = 0; k < n; k++) {
      const s = mk('font-size:18px;', html), dx = (Math.random() - .5) * spread, dy = (Math.random() - .5) * spread;
      go(s, [{ transform: `translate(${a.x + dx}px,${a.y + dy}px) scale(.6)`, opacity: 0 }, { opacity: 1, offset: .2 }, { transform: `translate(${b.x + dx * .3}px,${b.y + dy * .3}px) scale(1)`, opacity: 0 }], { duration: ms, delay: k * 50, easing: 'cubic-bezier(.4,0,.2,1)' });
    }
  }
  function ring(p, col, size = 120, ms = 700, fill = 'transparent') {
    const r = mk(`width:${size}px;height:${size}px;margin:${-size / 2}px 0 0 ${-size / 2}px;border-radius:50%;border:3px solid ${col};background:${fill};box-shadow:0 0 24px ${col}, inset 0 0 24px ${col}`);
    go(r, [{ transform: `translate(${p.x}px,${p.y}px) scale(.2)`, opacity: 1 }, { transform: `translate(${p.x}px,${p.y}px) scale(1)`, opacity: .9, offset: .5 }, { transform: `translate(${p.x}px,${p.y}px) scale(1.15)`, opacity: 0 }], { duration: ms, easing: 'ease-out' });
  }
  function tint(col, o = .35, ms = 500) { const f = mk(`inset:0;width:100%;height:100%;background:${col}`); go(f, [{ opacity: o }, { opacity: 0 }], { duration: ms }); }
  function shake(power = 8, ms = 350) { const a = layer(); a.animate([0, 1, 2, 3, 4, 5].map(i => ({ transform: `translate(${(i % 2 ? 1 : -1) * power * (1 - i / 6)}px, ${(i % 3 - 1) * power * .4}px)` })), { duration: ms }); }
  const rand = (a, b) => a + Math.random() * (b - a);

  const FX = {
    // Bulle : grosse bulle bleue qui enveloppe le jeton
    Mobu: async c => {
      const p = center(c.mySlot || c.me);
      const b = mk(`width:110px;height:110px;margin:-55px 0 0 -55px;border-radius:50%;background:radial-gradient(circle at 35% 30%, rgba(255,255,255,.7), rgba(56,189,248,.25) 40%, rgba(56,189,248,.05) 70%);border:2px solid rgba(186,230,253,.9);box-shadow:0 0 30px rgba(56,189,248,.6)`);
      go(b, [{ transform: `translate(${p.x}px,${p.y}px) scale(0)` }, { transform: `translate(${p.x}px,${p.y}px) scale(1.1)`, offset: .3 }, { transform: `translate(${p.x}px,${p.y}px) scale(.95,1.05)`, offset: .6 }, { transform: `translate(${p.x}px,${p.y}px) scale(1)`, opacity: .9, offset: .85 }, { opacity: 0 }], { duration: 1100 });
      await wait(900);
    },
    // Épines : des épines vertes volent vers le joueur d'en face
    Pikko: async c => { const a = center(c.mySlot || c.me), b = center(c.foeBar); fly(a, b, '<span style="color:#4ade80;text-shadow:0 0 8px #22c55e">✦</span>', 12, 500, 60); await wait(500); burst(b, '#4ade80', 18); await wait(300); },
    // Rouille : des éclats de rouille tourbillonnent autour du jeton adverse
    Rouillé: async c => {
      const p = center(c.foe);
      for (let k = 0; k < 16; k++) {
        const s = mk(`width:7px;height:7px;background:${['#b45309', '#d97706', '#78350f'][k % 3]}`), a0 = rand(0, 6.28);
        go(s, [0, .25, .5, .75, 1].map(f => ({ transform: `translate(${p.x + Math.cos(a0 + f * 6) * 50 * (1 - f * .6)}px,${p.y + Math.sin(a0 + f * 6) * 50 * (1 - f * .6)}px)`, opacity: 1 - f * .8 })), { duration: 900, delay: k * 20 });
      }
      c.foe.animate([{ filter: 'sepia(1) saturate(2) hue-rotate(-20deg)' }, { filter: 'none' }], { duration: 1000 });
      await wait(900);
    },
    // Gel : des cristaux de glace recouvrent l'endroit
    Givre: async c => {
      const L = c.myLane || c.lanes[1], r = L.getBoundingClientRect();
      const frost = mk(`left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;border-radius:16px;background:linear-gradient(160deg, rgba(224,242,254,.55), rgba(125,211,252,.2));box-shadow:inset 0 0 30px #e0f2fe`);
      go(frost, [{ opacity: 0 }, { opacity: 1, offset: .3 }, { opacity: .8, offset: .8 }, { opacity: 0 }], { duration: 1100 });
      for (let k = 0; k < 10; k++) { const s = mk('font-size:20px;color:#e0f2fe;text-shadow:0 0 10px #7dd3fc', '❄'), x = r.left + rand(10, r.width - 20), y = r.top + rand(10, r.height - 20); go(s, [{ transform: `translate(${x}px,${y}px) scale(0) rotate(0)` }, { transform: `translate(${x}px,${y}px) scale(1.2) rotate(90deg)`, offset: .4 }, { transform: `translate(${x}px,${y}px) scale(1) rotate(120deg)`, opacity: 0 }], { duration: 1000, delay: k * 40 }); }
      await wait(900);
    },
    // Soleil : un soleil se lève et fait pleuvoir des étincelles de soin sur l'équipe
    Soléo: async c => {
      const p = center(c.lanes[1]), sun = mk('width:90px;height:90px;margin:-45px 0 0 -45px;border-radius:50%;background:radial-gradient(circle, #fff7ae, #fbbf24 55%, rgba(251,146,60,0) 72%);box-shadow:0 0 60px #fbbf24');
      go(sun, [{ transform: `translate(${p.x}px,${p.y + 60}px) scale(.3)`, opacity: 0 }, { transform: `translate(${p.x}px,${p.y - 20}px) scale(1)`, opacity: 1, offset: .4 }, { transform: `translate(${p.x}px,${p.y - 30}px) scale(1.4) rotate(40deg)`, opacity: 0 }], { duration: 1100 });
      tint('rgba(251,191,36,.25)', 1, 700);
      await wait(400); c.myCards.forEach(el => burst(center(el), '#fde68a', 10, 40, 5)); await wait(500);
    },
    // Raz-de-marée : une vague balaie les 3 endroits
    Azura: async c => {
      const a = c.lanes[0].getBoundingClientRect(), b = c.lanes[2].getBoundingClientRect();
      const w = mk(`left:0;top:${a.top}px;width:120px;height:${a.height}px;border-radius:40% 60% 60% 40%;background:linear-gradient(90deg, rgba(56,189,248,0), rgba(56,189,248,.75), rgba(224,242,254,.9));box-shadow:0 0 40px #38bdf8`);
      go(w, [{ transform: `translateX(${a.left - 140}px)`, opacity: 0 }, { opacity: 1, offset: .15 }, { transform: `translateX(${b.right}px)`, opacity: 0 }], { duration: 900, easing: 'cubic-bezier(.4,0,.2,1)' });
      await wait(450); shake(6); burst(center(c.foe), '#38bdf8', 16); await wait(450);
    },
    // Saignée : une entaille rouge en diagonale + gouttes
    Carmin: async c => {
      const p = center(c.foeSlot || c.foe), s = mk(`width:160px;height:6px;margin:-3px 0 0 -80px;background:linear-gradient(90deg, transparent, #fecaca, #dc2626, transparent);box-shadow:0 0 18px #dc2626;border-radius:3px`);
      go(s, [{ transform: `translate(${p.x}px,${p.y}px) rotate(-35deg) scaleX(0)` }, { transform: `translate(${p.x}px,${p.y}px) rotate(-35deg) scaleX(1)`, offset: .35 }, { transform: `translate(${p.x}px,${p.y}px) rotate(-35deg) scaleX(1)`, opacity: 0 }], { duration: 700 });
      await wait(250); shake(7); burst(p, '#dc2626', 20, 60, 6, 800);
      fly(p, center(c.mySlot || c.me), '<span style="color:#f87171">●</span>', 6, 600, 20); await wait(650);
    },
    // Barrière : un dôme violet hexagonal protège le joueur
    Vyolis: async c => {
      const p = center(c.myBar), d = mk(`width:${p.w + 30}px;height:70px;margin:-35px 0 0 ${-(p.w + 30) / 2}px;clip-path:polygon(10% 0,90% 0,100% 50%,90% 100%,10% 100%,0 50%);background:linear-gradient(180deg, rgba(196,181,253,.55), rgba(124,58,237,.2));box-shadow:0 0 30px #8b5cf6`);
      go(d, [{ transform: `translate(${p.x}px,${p.y}px) scaleY(0)`, opacity: 0 }, { transform: `translate(${p.x}px,${p.y}px) scaleY(1)`, opacity: 1, offset: .35 }, { opacity: .8, offset: .8 }, { opacity: 0 }], { duration: 1100 });
      await wait(900);
    },
    // Éblouir : flash blanc et étoiles sur le jeton adverse
    Lumis: async c => { tint('#fff', .8, 450); const p = center(c.foe); for (let k = 0; k < 6; k++) { const s = mk('font-size:22px;color:#fff;text-shadow:0 0 12px #f9a8d4', '✧'); go(s, [{ transform: `translate(${p.x}px,${p.y}px) scale(0)` }, { transform: `translate(${p.x + rand(-50, 50)}px,${p.y + rand(-40, 40)}px) scale(1.3) rotate(180deg)`, opacity: 0 }], { duration: 800, delay: k * 60 }); } await wait(800); },
    // Ombre : le jeton se dissout en fumée noire et des yeux violets apparaissent
    Nyx: async c => {
      const p = center(c.mySlot || c.me);
      for (let k = 0; k < 14; k++) { const s = mk(`width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50%;background:radial-gradient(circle, rgba(30,27,75,.95), rgba(30,27,75,0))`); go(s, [{ transform: `translate(${p.x}px,${p.y}px) scale(.5)`, opacity: 1 }, { transform: `translate(${p.x + rand(-60, 60)}px,${p.y + rand(-70, 20)}px) scale(2.2)`, opacity: 0 }], { duration: 900, delay: k * 25 }); }
      const eyes = mk('font-size:22px;letter-spacing:6px;color:#c084fc;text-shadow:0 0 12px #a855f7', '● ●');
      go(eyes, [{ transform: `translate(${p.x - 22}px,${p.y - 14}px)`, opacity: 0 }, { opacity: 1, offset: .3 }, { opacity: 1, offset: .7 }, { opacity: 0 }], { duration: 1000 });
      await wait(950);
    },
    // Étoile filante : une étoile traverse l'écran jusqu'à la cible
    Astra: async c => {
      const b = center(c.foeSlot || c.foe), a = { x: b.x - 220, y: b.y - 260 };
      const s = mk('font-size:30px;color:#fde68a;text-shadow:0 0 16px #fbbf24, 0 0 30px #fff', '★');
      go(s, [{ transform: `translate(${a.x}px,${a.y}px) rotate(0)` }, { transform: `translate(${b.x - 15}px,${b.y - 18}px) rotate(540deg)` }], { duration: 520, easing: 'cubic-bezier(.5,0,.9,.6)' });
      for (let k = 0; k < 10; k++) { const t = mk('width:6px;height:6px;background:#fde68a;box-shadow:0 0 8px #fbbf24'); const f = k / 10; go(t, [{ transform: `translate(${a.x + (b.x - a.x) * f}px,${a.y + (b.y - a.y) * f}px)`, opacity: 0 }, { opacity: 1, offset: .1 }, { opacity: 0 }], { duration: 600, delay: f * 520 }); }
      await wait(520); shake(9); burst(b, '#fde68a', 24, 90); await wait(400);
    },
    // Tempête : l'écran s'assombrit, des éclairs frappent les 3 endroits
    Kraïos: async c => {
      tint('rgba(15,23,42,.8)', 1, 900);
      for (const L of c.lanes) {
        const r = L.getBoundingClientRect(), x = r.left + r.width / 2;
        const bolt = mk(`left:${x - 3}px;top:${r.top - 140}px;width:6px;height:${r.height + 140}px;background:linear-gradient(#e0e7ff, #818cf8);clip-path:polygon(50% 0,100% 30%,40% 45%,100% 70%,0 100%,40% 55%,0 40%);box-shadow:0 0 20px #818cf8`);
        go(bolt, [{ opacity: 0 }, { opacity: 1, offset: .1 }, { opacity: .2, offset: .3 }, { opacity: 1, offset: .4 }, { opacity: 0 }], { duration: 500, delay: Math.random() * 300 });
      }
      await wait(350); shake(10, 450); await wait(500);
    },
    // Courant : des poissons de feu nagent vers les alliés
    Koi: async c => { const a = center(c.mySlot || c.me); c.myCards.forEach(el => fly(a, center(el), '<span style="filter:drop-shadow(0 0 6px #ff5a3c)">🐟</span>', 3, 700, 40)); await wait(800); },
    // Malédiction : brume rose et crânes qui montent
    Néphéris: async c => {
      const p = center(c.foeSlot || c.foe);
      ring(p, '#f0abfc', 140, 900, 'rgba(240,171,252,.15)');
      for (let k = 0; k < 7; k++) { const s = mk('font-size:18px;filter:drop-shadow(0 0 6px #e879f9)', '💀'); go(s, [{ transform: `translate(${p.x + rand(-40, 30)}px,${p.y + 10}px)`, opacity: 0 }, { opacity: 1, offset: .3 }, { transform: `translate(${p.x + rand(-40, 30)}px,${p.y - 80}px)`, opacity: 0 }], { duration: 1000, delay: k * 70 }); }
      await wait(950);
    },
    // Aube : un rayon doré tombe du ciel avec un halo
    Zénith: async c => {
      const p = center(c.mySlot || c.me), beam = mk(`left:${p.x - 40}px;top:0;width:80px;height:${p.y + 40}px;background:linear-gradient(180deg, rgba(255,255,255,0), rgba(254,240,138,.85) 70%, #fff);filter:blur(2px)`);
      go(beam, [{ opacity: 0, transform: 'scaleX(.2)' }, { opacity: 1, transform: 'scaleX(1)', offset: .3 }, { opacity: 0, transform: 'scaleX(1.4)' }], { duration: 1000 });
      ring(p, '#fde68a', 130, 900); await wait(350); burst(p, '#fff7ae', 20, 80); await wait(600);
    },
    // Néant : un trou noir aspire la lumière puis implose
    Oblivion: async c => {
      const p = center(c.foeSlot || c.foe), h = mk('width:100px;height:100px;margin:-50px 0 0 -50px;border-radius:50%;background:radial-gradient(circle, #000 40%, rgba(76,5,25,.9) 55%, rgba(251,113,133,0) 72%);box-shadow:0 0 40px #fb7185');
      go(h, [{ transform: `translate(${p.x}px,${p.y}px) scale(0) rotate(0)` }, { transform: `translate(${p.x}px,${p.y}px) scale(1.2) rotate(180deg)`, offset: .6 }, { transform: `translate(${p.x}px,${p.y}px) scale(0) rotate(360deg)` }], { duration: 1100, easing: 'ease-in' });
      for (let k = 0; k < 18; k++) { const a = rand(0, 6.28), s = mk('width:5px;height:5px;background:#fda4af'); go(s, [{ transform: `translate(${p.x + Math.cos(a) * 110}px,${p.y + Math.sin(a) * 110}px)`, opacity: 1 }, { transform: `translate(${p.x}px,${p.y}px)`, opacity: 0 }], { duration: 700, delay: k * 20, easing: 'ease-in' }); }
      await wait(1000); tint('#000', .6, 300); shake(12, 400); await wait(300);
    },
    // Jugement : piliers de lumière sur les 3 endroits + couronne
    Takoras: async c => {
      tint('#fff', .5, 600);
      c.lanes.forEach((L, k) => { const r = L.getBoundingClientRect(), pil = mk(`left:${r.left + r.width / 2 - 26}px;top:0;width:52px;height:${r.bottom}px;background:linear-gradient(180deg, rgba(255,255,255,0), rgba(255,255,255,.95));box-shadow:0 0 40px #fff`); go(pil, [{ opacity: 0, transform: 'scaleX(0)' }, { opacity: 1, transform: 'scaleX(1)', offset: .25 }, { opacity: 0 }], { duration: 900, delay: k * 120 }); });
      const p = center(c.mySlot || c.me), crown = mk('font-size:44px;filter:drop-shadow(0 0 14px #fde68a)', '👑');
      go(crown, [{ transform: `translate(${p.x - 22}px,${p.y - 60}px) scale(0)` }, { transform: `translate(${p.x - 22}px,${p.y - 80}px) scale(1.2)`, offset: .4 }, { transform: `translate(${p.x - 22}px,${p.y - 90}px) scale(1)`, opacity: 0 }], { duration: 1100 });
      await wait(500); shake(10); await wait(600);
    },
  };
  return name => (reducedFx() ? async () => {} : FX[name] || (async c => { burst(center(c.me), c.col, 20); await wait(500); }));
})();
