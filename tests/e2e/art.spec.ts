import { test, expect } from '@playwright/test';
import { fakeSupabase } from './fake-supabase';

// Les jetons gardent l'effet doodle et la couleur de leur variante sur toutes les pages (pas seulement pendant l'ouverture)
test('doodle partout et variantes visibles (vitrine, bestiaire)', async ({ page }) => {
  await fakeSupabase(page);
  await page.goto('/profil/Ami');
  const gold = page.locator('ul li img.v-gold').first(); // Mobu Doré dans la vitrine
  await expect(gold).toBeVisible();
  expect(await gold.evaluate((el) => getComputedStyle(el).animationName)).toBe('vGold');
  // une image normale (bestiaire du joueur, affiché directement sous ses séries) a le doodle
  const normal = page.getByRole('button', { name: /#01 Mobu 1\/2/ }).locator('img');
  expect(await normal.evaluate((el) => getComputedStyle(el).animationName)).toBe('doodle');
  // le filtre est vraiment appliqué (une couleur invalide dans --df l'annulait sans bruit)
  const applied = async (sel: ReturnType<typeof page.locator>) => sel.evaluate((el) => getComputedStyle(el).filter);
  expect(await applied(normal)).toMatch(/url\(.*#dd\d.*drop-shadow/);
  const nyx = page.getByRole('button', { name: /Nyx/ }).first().locator('img'); // jeton normal de la vitrine
  expect(await applied(nyx)).toMatch(/url\(.*#dd\d.*drop-shadow/);
  // le logo reste fixe
  expect(await page.locator('nav img[src$="logo.png"]').evaluate((el) => getComputedStyle(el).animationName)).toBe(
    'none',
  );
  // les filtres SVG existent dans la page
  await expect(page.locator('filter#dd0')).toHaveCount(1);
  await page.goto('/inventaire');
  await page.getByRole('tab', { name: /Doré/ }).click();
  const g2 = page.locator('ul li img.v-gold').first();
  expect(await g2.evaluate((el) => getComputedStyle(el).animationName)).toBe('vGold');
  await page.getByRole('tab', { name: /Normaux/ }).click();
  const mobu = page.getByRole('button', { name: /×4 Mobu/ }).locator('img');
  expect(await mobu.evaluate((el) => getComputedStyle(el).filter)).toMatch(/url\(.*#dd\d.*drop-shadow/);
});

test('effets réduits : images fixes mais la variante garde sa couleur', async ({ page }) => {
  await fakeSupabase(page);
  await page.addInitScript(() => localStorage.setItem('takoras-settings', JSON.stringify({ fx: 'reduced' })));
  await page.goto('/profil/Ami');
  const gold = page.locator('ul li img.v-gold').first();
  await expect(gold).toBeVisible();
  const st = await gold.evaluate((el) => ({ a: getComputedStyle(el).animationName, f: getComputedStyle(el).filter }));
  expect(st.a).toBe('none');
  expect(st.f).toContain('vgold'); // la palette dorée reste, sans le doodle
});

// Les classes de variante des CSS Modules existent bien (une config les renommait en camelCase et les vidait)
test('mutations : vrais tampons dans l’éditeur d’équipe, onglets colorés dans le Bestiaire', async ({ page }) => {
  await fakeSupabase(page, {}, [], { deck: [15, 16, 17] });
  await page.goto('/combat');
  // toucher un jeton de l'équipe ouvre tout de suite l'éditeur, cette place visée
  await page
    .getByRole('region', { name: 'Équipe' })
    .getByRole('button', { name: /Changer ce jeton/ })
    .first()
    .click();
  // les tampons sont dans la fiche du jeton (même fiche que le bestiaire)
  await page.getByRole('dialog').getByRole('button', { name: 'Mobu', exact: true }).click();
  const b = page.getByRole('dialog').getByRole('button', { name: 'Doré' });
  expect(
    await b
      .locator('span')
      .first()
      .evaluate((el) => getComputedStyle(el).backgroundImage),
  ).toContain('stamps/gold.png');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await page.goto('/inventaire');
  const tab = page.getByRole('tab', { name: /Doré/ });
  await tab.click();
  expect(await tab.evaluate((el) => getComputedStyle(el).borderTopColor)).toBe('rgb(250, 204, 21)');
});
