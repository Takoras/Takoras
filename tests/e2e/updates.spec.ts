import { test, expect } from '@playwright/test';
import { fakeSupabase } from './fake-supabase';

// Nouvelle version en ligne → la page se recharge toute seule, mais jamais au milieu d'une ouverture de pulls
test('mise à jour : rechargement automatique, en attendant la fin d’une ouverture', async ({ page }) => {
  test.setTimeout(60_000);
  await fakeSupabase(page, { stock: 3 }, [['Mobu']]);
  let newer = false;
  await page.route('**/version.json*', (r) => (newer ? r.fulfill({ json: { id: 'nouvelle-version' } }) : r.continue()));
  let loads = 0;
  page.on('load', () => loads++);
  await page.goto('/');
  await expect(page.locator('main h1')).toBeVisible();
  const before = loads;
  // une ouverture est en cours quand la nouvelle version arrive : on n'interrompt pas
  await page.getByRole('button', { name: 'Ouvrir 1' }).click();
  await expect(page.locator('#opening')).toHaveClass(/\bon\b/);
  newer = true;
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await page.waitForTimeout(2000);
  expect(loads).toBe(before);
  // fin de l'ouverture → rechargement
  const opening = page.locator('#opening');
  for (let i = 0; i < 100 && !(await opening.getAttribute('class'))?.includes('revealed'); i++) {
    await page.locator('#op-coin').dispatchEvent('pointerdown');
    await page.waitForTimeout(100);
  }
  await page.locator('#op-back').dispatchEvent('click');
  await expect(opening).not.toHaveClass(/\bon\b/);
  await expect.poll(() => loads, { timeout: 15_000 }).toBeGreaterThan(before);
});
