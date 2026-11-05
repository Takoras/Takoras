/* eslint-disable @typescript-eslint/no-non-null-assertion -- script d'enregistrement des vidéos (labo) */
import { test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// Vidéos d'exemple des pouvoirs (fiches jeton) : une vraie partie dans le vrai moteur du Ring, une mise en scène
// par pouvoir qui montre clairement ce qu'il fait. Aucun texte dans l'image (une seule vidéo pour toutes les
// langues) : on enregistre le canvas du jeu lui-même (les bandeaux HTML n'y sont pas) et RNG.noText cache
// les textes peints dans le jeu. Écrit directement public/video/pw/<pouvoir>.webm, sans ffmpeg.
// Lancé à la main seulement (pas un test) : RECORD=1 npx playwright test zz-record --project=lab
// Un seul pouvoir : RECORD=1 ONLY=jelly npx playwright test zz-record --project=lab
test.skip(!process.env.RECORD, 'enregistrement à la demande');
test.use({ viewport: { width: 420, height: 420 }, deviceScaleFactor: 2 });

type Shot = { i: number; ax: number; ay: number; f: number; pow: boolean } | null;
type Scene = {
  /** mes jetons [nom, x, y] (le premier porte le pouvoir) — y positif = en bas, terrain de rayon 1450 */
  mine: [string, number, number][];
  foes: [string, number, number][];
  /** un tour = [mon tir, tir ennemi] */
  turns: [Shot, Shot][];
};
const up = (f: number, pow = true, i = 0, ax = 0): Shot => ({ i, ax, ay: -1000, f, pow });
const down = (f: number, i = 0, ax = 0): Shot => ({ i, ax, ay: 1000, f, pow: false });
const still = (i = 0): Shot => ({ i, ax: 0, ay: -1, f: 0, pow: true });

// Une situation par pouvoir (nom du jeton qui le porte → mise en scène)
const SCENES: Record<string, Scene> = {
  // Gélatine : Mobu gonfle, l'ennemi fonce dessus et rebondit loin
  jelly: {
    mine: [['Mobu', 0, -250]],
    foes: [
      ['Carmin', 0, -1050],
      ['Nyx', 700, 300],
    ],
    turns: [[still(), down(1)]],
  },
  // Flipper : Pikko rebondit sur le bord (plusieurs fois) et va taper un ennemi
  pinball: {
    mine: [['Pikko', 1050, 0]],
    foes: [
      ['Rouillé', 350, 0],
      ['Nyx', 300, -900],
    ],
    turns: [[{ i: 0, ax: 1000, ay: 0, f: 1, pow: true }, null]],
  },
  // Rempart : Rouillé devient un mur, l'ennemi qui fonce dessus est renvoyé dehors
  rampart: {
    mine: [
      ['Rouillé', 0, 150],
      ['Mobu', 0, 550],
    ],
    foes: [['Carmin', 0, -650]],
    turns: [[still(), down(0.9)]],
  },
  // Patinoire : Givre trace une piste de glace, au tour suivant l'ennemi qui passe dessus file dehors
  icetrail: {
    mine: [['Givre', -950, 400]],
    foes: [
      ['Nyx', -700, -250],
      ['Carmin', 700, -900],
    ],
    turns: [[{ i: 0, ax: 1000, ay: -80, f: 0.6, pow: true }, down(0.6)]],
  },
  // Morceau de mousse : Mousse pose sa mousse en partant ; l'ennemi qui fonce dessus la ramasse (couronne de mousse = ralenti)
  moss: {
    mine: [['Mousse', -250, 250]],
    foes: [
      ['Nyx', -250, -700],
      ['Carmin', 750, -900],
    ],
    turns: [
      [{ i: 0, ax: 1000, ay: 300, f: 0.55, pow: true }, null],
      [null, down(0.7)],
      [null, null],
    ],
  },
  // Forêt vivante : Ronce fait pousser 3 buissons devant l'ennemi, qui fonce dedans, rebondit et reste piqué
  forest: {
    mine: [['Ronce', 0, 700]],
    foes: [
      ['Carmin', 0, -900],
      ['Nyx', 750, -300],
    ],
    turns: [
      [{ i: 0, ax: 0, ay: -1000, f: 0.55, pow: true }, down(0.9)],
      [null, null],
    ],
  },
  // Supernova : Soléo souffle les ennemis tout autour de lui
  nova: {
    mine: [['Soléo', 0, 250]],
    foes: [
      ['Carmin', -180, -120],
      ['Nyx', 330, 80],
      ['Rouillé', -120, 560],
    ],
    turns: [
      [still(), null],
      [null, null],
    ],
  },
  // Ressac : Azura ne bouge pas, une vague en cône emporte les ennemis
  surf: {
    mine: [['Azura', 0, 100]],
    foes: [
      ['Carmin', -200, -950],
      ['Nyx', 230, -1050],
    ],
    turns: [[up(1), null]],
  },
  // Rafale : Carmin frappe ×1,6, l'ennemi part très loin
  ora: {
    mine: [['Carmin', 0, 0]],
    foes: [
      ['Rouillé', 0, -700],
      ['Nyx', 650, 600],
    ],
    turns: [[up(0.8), null]],
  },
  // Téléportation : Vyolis apparaît directement derrière l'ennemi
  blink: {
    mine: [['Vyolis', 0, 850]],
    foes: [
      ['Carmin', 0, 150],
      ['Nyx', -600, -600],
    ],
    turns: [[up(0.95), null]],
  },
  // Miroir : l'allié près de Lumis ne bouge pas et l'ennemi qui le tape est renvoyé
  mirror: {
    mine: [
      ['Lumis', -120, 520],
      ['Mobu', 160, 250],
    ],
    foes: [['Carmin', 160, -600]],
    turns: [[still(), down(0.9)]],
  },
  // Ombre : Nyx traverse le premier ennemi et tape celui de derrière
  shade: {
    mine: [['Nyx', 0, 800]],
    foes: [
      ['Rouillé', 0, 250],
      ['Carmin', 0, -350],
    ],
    turns: [[up(0.7), null]],
  },
  // Pluie d'étoiles : les étoiles tombent sur un groupe d'ennemis et le soufflent
  starfall: {
    mine: [['Astra', 0, -100]],
    foes: [
      ['Carmin', -170, -1150],
      ['Nyx', 170, -1180],
      ['Rouillé', 0, -1320],
    ],
    turns: [[up(1), null]],
  },
  // Tentacules : Kraïos agrippe l'ennemi et l'emmène dans le vide
  grab: {
    mine: [['Kraïos', 0, -350]],
    foes: [
      ['Rouillé', 0, -900],
      ['Nyx', 700, 300],
    ],
    turns: [[up(1), null]],
  },
  // Contre-courant : Koi tape et revient à sa place
  current: {
    mine: [['Koi', 0, 750]],
    foes: [
      ['Rouillé', 0, 250],
      ['Nyx', -650, -700],
    ],
    turns: [[up(0.9), null]],
  },
  // Anneau : l'ennemi qui fonce s'arrête net dans l'anneau
  ring: {
    mine: [['Néphéris', 0, 850]],
    foes: [
      ['Carmin', 0, -1000],
      ['Nyx', 600, -500],
    ],
    turns: [[up(0.95), down(0.9)]],
  },
  // Rayon : le rayon frappe le premier jeton sur sa route et l'éjecte
  beam: {
    mine: [['Zénith', 0, 900]],
    foes: [
      ['Carmin', 0, -750],
      ['Nyx', 600, -400],
    ],
    turns: [[up(1), null]],
  },
  // Faille : son trajet se fissure, au tour suivant la faille avale les ennemis restés dessus
  rift: {
    mine: [['Oblivion', -250, 520]],
    foes: [
      ['Carmin', 0, -100],
      ['Nyx', 260, -360],
    ],
    turns: [
      [{ i: 0, ax: 0, ay: -1000, f: 0.75, pow: true }, null],
      [null, null],
    ],
  },
  // Dévoreur : Takoras se coupe en deux, avale l'ennemi, puis le recrache vers le bord
  devour: {
    mine: [['Takoras', 0, 750]],
    foes: [
      ['Carmin', 0, 50],
      ['Nyx', -650, -700],
    ],
    turns: [
      [up(0.75), null],
      [{ i: 0, ax: 1000, ay: -200, f: 1, pow: false }, null],
    ],
  },
};

const OUT = 'public/video/pw';
const SHOTS = process.env.SHOTS_DIR; // captures d'écran de contrôle (facultatif)
for (const [pw, sc] of Object.entries(SCENES)) {
  if (process.env.ONLY && !process.env.ONLY.split(',').includes(pw)) continue;
  test(`film ${pw}`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.addInitScript(() => {
      localStorage.setItem('takoras-tuto-done', '1');
      localStorage.setItem('takoras-pn-seen', '999999');
      localStorage.setItem('takoras-ring-tuto', '1');
    });
    await page.goto('/__lab');
    await page.waitForFunction(() => !!window.__lab);
    await page.evaluate((sc) => {
      const team = (l: [string, number, number][]) => {
        const names = l.map((x) => x[0]);
        while (names.length < 3) names.push(names.includes('Mobu') ? 'Pikko' : 'Mobu');
        return names.map((n) => ({ name: n, lvl: 1, variant: '' }));
      };
      window.__lab!.startRing([team(sc.mine), team(sc.foes)], { ai: 'still', map: 'arene' } as never);
      window.__lab!.RNG.noText = true;
      const st = window.__lab!.RNG.st!;
      const place = (side: number, l: [string, number, number][]) =>
        st.bodies
          .filter((b) => b.side === side)
          .forEach((b) => {
            const p = l[b.i];
            b.alive = !!p;
            if (p) {
              b.x = p[1];
              b.y = p[2];
            }
          });
      place(0, sc.mine);
      place(1, sc.foes);
    }, sc);
    // les bandeaux et équipes (HTML) ne sont pas dans la vidéo : on les cache aussi pour les captures de contrôle
    await page.addStyleTag({ content: '.rg-banner,.rg-team{display:none!important}' });
    await page.waitForTimeout(3200); // l'arène s'ouvre
    // enregistre le canvas du jeu (sans les bandeaux HTML)
    await page.evaluate(() => {
      const cv = document.querySelector('.rg canvas') as HTMLCanvasElement;
      const rec = new MediaRecorder(cv.captureStream(30), {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 700_000,
      });
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.start(100);
      (window as unknown as { __stop: () => Promise<string> }).__stop = () =>
        new Promise((res) => {
          rec.onstop = async () => {
            const u = new Uint8Array(await new Blob(chunks, { type: 'video/webm' }).arrayBuffer());
            let s = '';
            for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
            res(btoa(s));
          };
          rec.stop();
        });
    });
    await page.waitForTimeout(500); // on voit la situation avant le tir
    for (const [k, turn] of sc.turns.entries()) {
      if (k > 0) {
        await page.waitForFunction(() => window.__lab!.RNG.phase === 'aim', null, { timeout: 40_000 });
        await page.waitForTimeout(350);
      }
      await page.evaluate((s) => window.__lab!.playTurn(s as never), turn);
      await page.waitForFunction(() => window.__lab!.RNG.phase !== 'aim', null, { timeout: 5_000 });
      if (SHOTS) {
        // planche de contrôle : une image toutes les 0,4 s pendant le tour
        await page.waitForTimeout(500);
        for (let n = 0; n < 6; n++) {
          await page
            .locator('.rg canvas')
            .first()
            .screenshot({ path: path.join(SHOTS, `${pw}-${k}-${n}.png`) });
          await page.waitForTimeout(400);
        }
      }
    }
    // fin du tour (retour à la visée) ou fin de partie (tous les ennemis dehors)
    await page
      .waitForFunction(() => ['aim', 'end'].includes(window.__lab!.RNG.phase as string), null, { timeout: 20_000 })
      .catch(() => {});
    await page.waitForTimeout(700);
    if (SHOTS)
      await page
        .locator('.rg canvas')
        .first()
        .screenshot({ path: path.join(SHOTS, `${pw}-end.png`) });
    const b64 = await page.evaluate(() => (window as unknown as { __stop: () => Promise<string> }).__stop());
    fs.writeFileSync(path.join(OUT, `${pw}.webm`), Buffer.from(b64, 'base64'));
  });
}
