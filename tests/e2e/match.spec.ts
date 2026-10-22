import { test, expect, type Page } from '@playwright/test';
import { fakeSupabase } from './fake-supabase';

// Porte de la phase 8 : une partie complète d'entraînement, jouée avec de vrais gestes (glisser = lance-pierre),
// au doigt en 375 px et à la souris sur PC, jusqu'à l'écran de fin. Mesure aussi la fluidité pendant les tirs.
type Body = { id: number; side: number; x: number; y: number; alive: boolean };
type Ring = { RNG: { st: { over: boolean; bodies: Body[] } | null; phase: string; locked: boolean; play: unknown; cv: HTMLCanvasElement; view: { size: number; s: number } } };
declare global { interface Window { __ring?: Ring } }

// Un tir : toucher un de ses jetons, tirer vers l'arrière (opposé au jeton adverse le plus proche), lâcher, valider
async function shoot(page: Page, touch: boolean) {
  return page.evaluate((touch) => {
    const R = window.__ring?.RNG;
    if (!R?.st) return 'none';
    const mine = R.st.bodies.filter((b) => b.side === 0 && b.alive), foes = R.st.bodies.filter((b) => b.side === 1 && b.alive);
    const me = mine[0], foe = foes.sort((a, b) => Math.hypot(a.x - (me?.x ?? 0), a.y - (me?.y ?? 0)) - Math.hypot(b.x - (me?.x ?? 0), b.y - (me?.y ?? 0)))[0];
    if (!me || !foe) return 'none';
    const r = R.cv.getBoundingClientRect(), v = R.view;
    const sx = r.left + v.size / 2 + me.x * v.s, sy = r.top + v.size / 2 + me.y * v.s;
    const d = Math.hypot(foe.x - me.x, foe.y - me.y) || 1, ux = (foe.x - me.x) / d, uy = (foe.y - me.y) / d;
    const pt = { pointerId: 7, pointerType: touch ? 'touch' : 'mouse', isPrimary: true, bubbles: true, cancelable: true };
    const stage = document.querySelector('#rg-stage') as HTMLElement;
    stage.dispatchEvent(new PointerEvent('pointerdown', { ...pt, clientX: sx, clientY: sy }));
    for (let k = 1; k <= 6; k++) window.dispatchEvent(new PointerEvent('pointermove', { ...pt, clientX: sx - ux * 22 * k, clientY: sy - uy * 22 * k }));
    window.dispatchEvent(new PointerEvent('pointerup', { ...pt, clientX: sx - ux * 132, clientY: sy - uy * 132 }));
    (document.querySelector('#rg-go') as HTMLButtonElement).click();
    return 'shot';
  }, touch);
}

test('Ring : partie complète contre l’IA, au doigt (375 px) et à la souris (PC)', async ({ page, isMobile }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await fakeSupabase(page, {}, [], { deck: [11, 16, 17] });
  await page.addInitScript(() => localStorage.setItem('takoras-ring-tuto', '1'));
  await page.goto('/combat');
  await page.getByRole('button', { name: /Entraînement/ }).click();
  await page.waitForFunction(() => !!window.__ring?.RNG.st);
  const fps: number[] = [];
  let turns = 0;
  for (; turns < 40; turns++) {
    // attendre la visée (ou la fin)
    await page.waitForFunction(() => { const R = window.__ring?.RNG; return !R?.st || R.st.over || (R.phase === 'aim' && !R.locked && !R.play); }, null, { timeout: 30_000 });
    const over = await page.evaluate(() => !window.__ring?.RNG.st || window.__ring.RNG.st.over);
    if (over) break;
    // captures pour vérifier la DA (visée, puis tir en cours)
    if (turns === 0) {
      // l'équipe adverse : pouvoirs et état, chrono en pause
      await page.locator('.rg [data-scout]').click();
      await expect(page.locator('.rg-scoutbox .rg-sc')).toHaveCount(3);
      if (process.env.SHOT) await page.screenshot({ path: `${process.env.SHOT}/ring-scout-${isMobile ? 'm' : 'd'}.png` });
      await page.locator('.rg-scoutbox .rg-icx').click();
    }
    if (turns === 1 && process.env.SHOT) await page.screenshot({ path: `${process.env.SHOT}/ring-aim-${isMobile ? 'm' : 'd'}.png` });
    expect(await shoot(page, isMobile)).toBe('shot');
    if (turns === 1 && process.env.SHOT) { await page.waitForTimeout(500); await page.screenshot({ path: `${process.env.SHOT}/ring-play-${isMobile ? 'm' : 'd'}.png` }); }
    // fluidité pendant l'animation du tir
    if (turns < 3)
      fps.push(await page.evaluate(() => new Promise<number>((res) => {
        let n = 0; const t0 = performance.now();
        const f = () => { n++; if (performance.now() - t0 < 1500) requestAnimationFrame(f); else res((n * 1000) / (performance.now() - t0)); };
        requestAnimationFrame(f);
      })));
  }
  await expect(page.locator('.rg-res')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('.rg-res h2')).toHaveText(/Victoire|Défaite|Égalité/);
  console.log(`[${isMobile ? 'mobile' : 'pc'}] partie terminée en ${turns} tours, fps pendant les tirs : ${fps.map((x) => x.toFixed(0)).join(' / ')}`);
  expect(errors).toEqual([]);
  // retour à la page Combat
  await page.locator('.rg-res [data-back]').click();
  await expect(page.locator('.rg, .rg-res')).toHaveCount(0);
});
