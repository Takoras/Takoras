import { test, expect } from '@playwright/test';
import { fakeSupabase } from './fake-supabase';

// Les jetons gardent l'effet doodle et la couleur de leur variante sur toutes les pages (pas seulement pendant l'ouverture)
test('doodle partout et variantes visibles (vitrine, bestiaire)', async ({ page }) => {
  await fakeSupabase(page);
  await page.goto('/profil/Ami');
  const gold = page.locator('ul li img.v-gold').first(); // Mobu Doré dans la vitrine
  await expect(gold).toBeVisible();
  expect(await gold.evaluate((el) => getComputedStyle(el).animationName)).toBe('vGold');
  // une image normale (collection) a le doodle
  const normal = page.getByRole('button', { name: /^Mobu · 1\/2/ }).locator('img');
  expect(await normal.evaluate((el) => getComputedStyle(el).animationName)).toBe('doodle');
  // les filtres SVG existent dans la page
  await expect(page.locator('filter#dd0')).toHaveCount(1);
  await page.goto('/inventaire');
  await page.getByRole('tab', { name: /Doré/ }).click();
  const g2 = page.locator('ul li img.v-gold').first();
  expect(await g2.evaluate((el) => getComputedStyle(el).animationName)).toBe('vGold');
});

test('effets réduits : images fixes mais la variante garde sa couleur', async ({ page }) => {
  await fakeSupabase(page);
  await page.addInitScript(() => localStorage.setItem('takoras-settings', JSON.stringify({ fx: 'reduced' })));
  await page.goto('/profil/Ami');
  const gold = page.locator('ul li img.v-gold').first();
  await expect(gold).toBeVisible();
  const st = await gold.evaluate((el) => ({ a: getComputedStyle(el).animationName, f: getComputedStyle(el).filter }));
  expect(st.a).toBe('none');
  expect(st.f).toContain('sepia');
});
