import { test, expect } from '@playwright/test';
import { fakeSupabase } from './fake-supabase';

test('boutique : catégories, stock, achat, prix modifié, code promo', async ({ page }) => {
  await fakeSupabase(page, { coins: 5000 });
  await page.goto('/boutique');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByText('+20%')).toBeVisible(); // potion ×10 plus chère que d'habitude
  await expect(page.getByText('Épuisé').first()).toBeVisible(); // sablier : 2/2 achetés
  // achat d'une potion ×1,3
  await page.getByRole('button', { name: /Acheter · .* · 300$/ }).click();
  await expect(page.getByLabel('Solde')).toContainText('4 700');
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
  await expect(page.getByLabel('Solde')).toContainText('5 700');
});
