import { test, expect } from '@playwright/test';
import { fakeSupabase } from './fake-supabase';

test('boutique : catégories, stock, achat, prix modifié, code promo', async ({ page }) => {
  await fakeSupabase(page, { coins: 5000 });
  await page.goto('/shop');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByText('+20%').first()).toBeVisible(); // potion ×10 plus chère que d'habitude
  // achat d'une potion ×1,3 (rayon Potions, ouvert par défaut)
  await page.getByRole('button', { name: /Acheter · .* · 300$/ }).first().click();
  await expect(page.getByLabel('Solde')).toContainText('4 700');
  // la vedette est une case mystère : la révéler rapporte 100 pièces et montre l'objet (Potion ×2 à -40 %)
  await page.getByRole('button', { name: /Révéler la case/ }).first().click();
  await expect(page.getByLabel('Solde')).toContainText('4 800');
  await expect(page.getByRole('heading', { name: /Potion de chance ×2/ }).first()).toBeVisible();
  // rayon « Tirages » : le sablier est épuisé (2/2 achetés)
  await page.getByRole('button', { name: /Tirages/ }).click();
  await expect(page.getByText('Épuisé').first()).toBeVisible();
  // filtre « Cosmétiques »
  await page.getByRole('button', { name: 'Cosmétiques' }).click();
  await expect(page.locator('li h3')).toHaveCount(1);
  // code promo invalide puis valide
  const code = page.getByRole('textbox', { name: 'Code promo' });
  await code.fill('FAUX');
  await page.getByRole('button', { name: 'Utiliser' }).click();
  await expect(page.getByRole('status').getByText('Ce code n’existe pas')).toBeVisible();
  await code.fill('bonjour');
  await page.getByRole('button', { name: 'Utiliser' }).click();
  await expect(page.getByLabel('Solde')).toContainText('5 800');
});
