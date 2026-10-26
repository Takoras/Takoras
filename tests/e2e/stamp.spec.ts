import { test, expect } from '@playwright/test';
import { fakeSupabase } from './fake-supabase';

// Les tampons de mutation gardent une taille fixe (≤ 28 px) partout, même dans un bloc qui agrandit ses images
test('tampon de mutation : taille fixe partout (étiquettes du jeu et du site)', async ({ page }) => {
  await fakeSupabase(page);
  await page.goto('/');
  await page.evaluate(() => {
    const d = document.createElement('div');
    d.id = 'op-test';
    // bloc piège : toutes les images à 300 px
    d.innerHTML =
      '<style>#op-test img, #op-test i { width: 300px; height: 300px; }</style><span class="vtag v-gold"><i class="vstamp" style="background-image:url(/img/stamps/gold.png)"></i>Doré</span>';
    document.body.appendChild(d);
  });
  const box = await page.locator('#op-test .vstamp').boundingBox();
  expect(box?.width ?? 999).toBeLessThanOrEqual(16);
  // profil : jetons de la vitrine avec leur mutation
  await page.goto('/profil/Ami');
  const stamps = page.locator('[class*="stamp_"]');
  await expect(stamps.first()).toBeVisible();
  for (const b of await stamps.all()) expect((await b.boundingBox())?.width ?? 999).toBeLessThanOrEqual(28);
});
