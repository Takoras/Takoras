import { test } from '@playwright/test';
import { fakeSupabase } from './fake-supabase';
for (const p of (process.env.PAGES ?? '/').split(','))
  test(`page ${p}`, async ({ page }) => {
    await fakeSupabase(page, { coins: 5000, stock: 12, max: 20 }, [], { deck: [11, 16, 17] });
    await page.goto(p);
    await page.waitForTimeout(1800);
    const n = p === '/' ? 'home' : p.slice(1).replace(/\//g, '_');
    await page.screenshot({ path: `test-results/pages/${n}.png` });
    await page.screenshot({ path: `test-results/pages/${n}_full.png`, fullPage: true });
  });
