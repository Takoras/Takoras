import { test } from '@playwright/test';
import { fakeSupabase } from './fake-supabase';
test.skip(!process.env.SHOTS, '');
test('b3', async ({ page }) => {
  await fakeSupabase(page);
  await page.goto('/combat');
  await page.waitForTimeout(1200);
  await page.getByRole('region', { name: 'Équipe' }).getByRole('button').first().click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'test-results/b3-team.png' });
  await page.getByRole('dialog').getByRole('button', { name: 'Mobu' }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'test-results/b3-sheet.png' });
});
