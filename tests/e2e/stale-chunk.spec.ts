import { test, expect } from '@playwright/test';
import { fakeSupabase } from './fake-supabase';
// Ancienne version : le code du Market n'existe plus sur le serveur (Cloudflare renvoie la page HTML)
test('nav stale', async ({ page }) => {
  await fakeSupabase(page, {}, [], { deck: [11, 16, 17] });
  let failed = false;
  await page.route(/\/assets\/Bourse-[^/]+\.js$/, (r) => {
    if (failed) return r.continue();
    failed = true;
    return r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><html></html>' });
  });
  await page.goto('/inventory');
  await page.waitForTimeout(1500);
  await page.getByRole('link', { name: 'Market' }).first().click();
  await expect(page).toHaveURL(/\/market$/, { timeout: 15000 });
  await expect(page.getByRole('heading', { level: 1, name: 'Market' })).toBeVisible({ timeout: 15000 });
  expect(failed).toBe(true);
});
