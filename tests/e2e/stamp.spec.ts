import { test, expect } from '@playwright/test';
import { fakeSupabase } from './fake-supabase';
test('le tampon de mutation reste petit dans les étiquettes des écrans du jeu (ouverture, Ring)', async ({ page }) => {
  await fakeSupabase(page);
  await page.goto('/');
  await page.evaluate(() => {
    const d = document.createElement('div');
    d.id = 'op-test';
    d.innerHTML = '<span class="vtag v-gold"><img class="vstamp" src="/img/stamps/gold.png" alt="">Doré</span>';
    document.body.appendChild(d);
  });
  const box = await page.locator('#op-test .vstamp').boundingBox();
  expect(box?.width ?? 999).toBeLessThan(20);
});
