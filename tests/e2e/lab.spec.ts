import { test, expect } from '@playwright/test';

// Porte de la phase 5 : les moteurs portés tournent dans React et ne laissent rien derrière eux.
test('Ring : 50 montages / démontages sans fuite', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/__lab');
  await page.waitForFunction(() => !!window.__lab);
  const rep = await page.evaluate(() => window.__lab?.leakTest(50));
  expect(rep).toEqual({ rounds: 50, overlays: 0, listenersLeft: 0, rafAfterClose: 0 });
  expect(errors).toEqual([]);
});

test('Ring : un tour complet se joue (visée, validation, résolution)', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/__lab');
  await page.getByRole('button', { name: 'Ring contre l’IA' }).click();
  await expect(page.locator('.rg canvas')).toBeVisible();
  const turn = await page.evaluate(async () => {
    const lab = window.__lab;
    if (!lab?.RNG.st) return -1;
    const me = lab.RNG.st.bodies.find((b) => b.side === 0);
    Object.assign(lab.RNG, { sel: me?.id, aim: { ax: 0, ay: -1000, f: 0.8 } });
    (document.querySelector('#rg-go') as HTMLButtonElement | null)?.click();
    for (let i = 0; i < 100 && lab.RNG.st.turn === 1; i++) await new Promise((r) => setTimeout(r, 100));
    return lab.RNG.st.turn;
  });
  expect(turn).toBeGreaterThanOrEqual(2);
  expect(errors).toEqual([]);
});

test('cinématique : s’affiche puis se ferme seule', async ({ page }) => {
  await page.goto('/__lab');
  await page.getByRole('button', { name: 'Cinématique Nyx' }).click();
  await expect(page.locator('.cine canvas')).toBeVisible();
  await expect(page.locator('.cine')).toHaveCount(0, { timeout: 20_000 });
});
