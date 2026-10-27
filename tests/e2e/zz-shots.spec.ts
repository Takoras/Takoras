import { test } from '@playwright/test';
import { fakeSupabase } from './fake-supabase';
// Captures d'écran temporaires (pas un vrai test)
const OUT = 'test-results/shots';
test.use({ contextOptions: { reducedMotion: 'no-preference' } });
for (const p of ['/', '/inventaire', '/inventaire/objets'])
  test(`shot ${p}`, async ({ page }, info) => {
    await fakeSupabase(page);
    await page.goto(p);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${OUT}/${info.project.name}${p.replace(/\//g, '_') || '_home'}.png` });
    if (p === '/inventaire') {
      await page.locator('[aria-selected]').filter({ hasText: 'Doré' }).first().click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${OUT}/${info.project.name}_gold.png` });
      await page.locator('ul li[data-key] button').first().click();
      await page.waitForTimeout(700);
      await page.screenshot({ path: `${OUT}/${info.project.name}_jeton.png` });
    }
  });
