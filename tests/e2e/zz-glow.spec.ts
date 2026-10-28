import { test } from '@playwright/test';
import { fakeSupabase } from './fake-supabase';
// Captures zoomées des halos (SHOTS=1), pas un vrai test
test.skip(!process.env.SHOTS, '');
test.use({ contextOptions: { reducedMotion: 'no-preference' }, deviceScaleFactor: 2 });
const OUT = process.env.SHOTS_DIR ?? 'test-results/shots';
test('glows', async ({ page }) => {
  await fakeSupabase(page, {}, [], { deck: [15, 16, 17] });
  await page.goto('/inventaire');
  await page.getByRole('tab', { name: /Doré/ }).click();
  await page.waitForTimeout(900);
  await page
    .locator('ul li[data-key]')
    .first()
    .screenshot({ path: `${OUT}/g-card.png` });
  await page.locator('ul li[data-key] button').first().click();
  await page.waitForTimeout(900);
  await page.getByRole('dialog').screenshot({ path: `${OUT}/g-sheet.png` });
  await page.keyboard.press('Escape');
  await page.goto('/combat');
  await page.waitForTimeout(900);
  await page.getByRole('region', { name: 'Équipe' }).screenshot({ path: `${OUT}/g-team.png` });
  await page.goto('/profil/Ami');
  await page.waitForTimeout(900);
  await page
    .locator('ul')
    .filter({ has: page.locator('img.v-gold') })
    .first()
    .screenshot({ path: `${OUT}/g-show.png` });
});
