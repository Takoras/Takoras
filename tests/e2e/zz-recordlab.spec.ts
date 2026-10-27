/* eslint-disable @typescript-eslint/no-non-null-assertion -- script d enregistrement des vidéos (labo) */
import { test } from '@playwright/test';
import fs from 'node:fs';
import { RCFG } from '../../src/engines/ring-config.js';

// Enregistre une vraie partie (vrai écran du combat, tous les effets) pour chaque pouvoir : vidéos d'exemple des fiches.
// Lancé à la main seulement (pas un test) : RECORD=1 npx playwright test zz-record --project=lab
test.skip(!process.env.RECORD, 'enregistrement à la demande');
test.use({ viewport: { width: 760, height: 760 }, video: { mode: 'on', size: { width: 760, height: 760 } } });
const DEFENSE = new Set(['rampart', 'mirror', 'sun']);
const META: Record<string, { video: string; t0: number; box: number[] }> = {};
for (const name of Object.keys(RCFG.TOKENS))
  test(`film ${name}`, async ({ page }) => {
    const start = Date.now();
    await page.addInitScript(() => {
      localStorage.setItem('takoras-tuto-done', '1');
      localStorage.setItem('takoras-pn-seen', '999999');
      localStorage.setItem('takoras-ring-tuto', '1');
    });
    await page.goto('/__lab');
    await page.waitForFunction(() => !!window.__lab);
    const pw = (RCFG.TOKENS as Record<string, { pw: string }>)[name]?.pw ?? '';
    await page.evaluate(
      ([n, def, pw]) => {
        const T = (a: string[]) => a.map((x) => ({ name: x, lvl: 1, variant: '' }));
        window.__lab!.startRing([T([n as string, 'Mobu', 'Pikko']), T(['Carmin', 'Rouillé', 'Nyx'])], {
          ai: 'still',
          map: 'arene',
        } as never);
        const st = window.__lab!.RNG.st!;
        // Flipper (Pikko) : placé près du bord, il rebondit dessus avant de taper (on voit vraiment son pouvoir)
        const pos = def
          ? [0, 250, 0, -600, 420, -300]
          : pw === 'pinball'
            ? [900, 0, 0, -100, 260, -360]
            : [0, 520, 0, -100, 260, -360];
        st.bodies.forEach((b) => {
          b.alive = (b.side === 0 && b.i === 0) || (b.side === 1 && b.i < 2);
        });
        [
          [0, 0],
          [1, 0],
          [1, 1],
        ].forEach(([side, i], k) => {
          const b = st.bodies.find((x) => x.side === side && x.i === i)!;
          b.x = pos[k * 2]!;
          b.y = pos[k * 2 + 1]!;
        });
      },
      [name, DEFENSE.has(pw), pw] as const,
    );
    await page.waitForTimeout(3200); // l'arène s'ouvre
    const f = pw === 'starfall' || pw === 'ring' ? 0.55 : pw === 'blink' ? 0.6 : 0.85;
    const shots = DEFENSE.has(pw)
      ? [
          { i: 0, ax: 0, ay: -1, f: 0, pow: true },
          { i: 0, ax: 0, ay: 1000, f: 0.85, pow: false },
        ]
      : pw === 'pinball'
        ? [{ i: 0, ax: 899, ay: -438, f: 1, pow: true }, null]
        : [{ i: 0, ax: 0, ay: -1000, f, pow: true }, null];
    const box = await page.evaluate(() => {
      const r = document.querySelector('.rg canvas')!.getBoundingClientRect();
      return [r.left, r.top, r.width, r.height];
    });
    const t0 = Date.now() - start;
    await page.evaluate((s) => window.__lab!.playTurn(s as never), shots);
    await page.waitForTimeout(5600);
    const video = await page.video()?.path();
    const file = 'test-results/record-meta.json';
    const old = fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, 'utf8')) as typeof META) : {};
    fs.writeFileSync(file, JSON.stringify({ ...old, ...META, [pw]: { video: video ?? '', t0, box } }));
  });
