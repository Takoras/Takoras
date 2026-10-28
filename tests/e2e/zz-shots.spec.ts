import { test } from '@playwright/test';
import { fakeSupabase } from './fake-supabase';
// Captures d'écran pour relire le rendu (SHOTS=1), pas un vrai test
const OUT = 'test-results/shots';
test.skip(!process.env.SHOTS, 'captures seulement avec SHOTS=1');
test.use({ contextOptions: { reducedMotion: 'no-preference' } });
for (const p of ['/', '/inventaire', '/combat', '/profil', '/boutique', '/passe'])
  test(`shot ${p}`, async ({ page }, info) => {
    await fakeSupabase(page, {}, [], { deck: [11, 16, 17] });
    await page.goto(p);
    await page.waitForTimeout(1500);
    const name = `${OUT}/${info.project.name}${p.replace(/\//g, '_') === '_' ? '_home' : p.replace(/\//g, '_')}`;
    await page.screenshot({ path: `${name}.png`, fullPage: true });
    if (p === '/inventaire') {
      await page.locator('ul li[data-key] button').first().click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: `${name}_jeton.png` });
    }
  });
