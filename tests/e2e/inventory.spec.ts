import { test, expect } from '@playwright/test';
import { fakeSupabase } from './fake-supabase';

test('bestiaire : grille, filtres, fiche, vente, verrou, niveau', async ({ page }) => {
  const { calls } = await fakeSupabase(page, { coins: 100 });
  await page.goto('/inventaire');
  await expect(page.getByRole('heading', { level: 1, name: 'Ta collection' })).toBeVisible();
  await expect(page.locator('ul li[data-key]')).toHaveCount(17); // toute la collection, même les jetons jamais vus
  await expect(page.getByText('3/17')).toBeVisible(); // Mobu, Vyolis, Pikko déjà trouvés
  // « seulement ceux que j'ai »
  await page.getByRole('button', { name: /Possédés/ }).click();
  await expect(page.locator('ul li[data-key]')).toHaveCount(2);
  // onglet Doré
  await page.getByRole('tab', { name: /Doré/ }).click();
  await expect(page.locator('ul li[data-key]')).toHaveCount(1);
  await page.getByRole('tab', { name: /Normaux|Normal/ }).click();

  // fiche de Mobu : vendre 1, puis monter de niveau
  await page.getByRole('button', { name: 'Mobu ×4' }).click();
  const dlg = page.getByRole('dialog');
  await expect(dlg.getByText('Niv. 1/10')).toBeVisible();
  await dlg.getByRole('button', { name: /Vendre 1/ }).click();
  await expect(page.getByRole('button', { name: 'Mobu ×3' })).toBeVisible();
  await expect(page.getByLabel('Solde')).toContainText('101');
  await page.getByRole('button', { name: 'Mobu ×3' }).click();
  await page.getByRole('dialog').getByRole('button', { name: /Monter au niveau 2/ }).click();
  await expect(page.getByRole('status').getByText(/niveau 2/)).toBeVisible();

  // verrouiller Vyolis
  await page.getByRole('button', { name: 'Vyolis ×1' }).click();
  await page.getByRole('dialog').getByRole('button', { name: /Verrouiller/ }).click();
  expect(calls).toContain('lock_pulls');
});

test('bestiaire : sélection multiple et vente d’un rare avec confirmation', async ({ page }) => {
  const { calls } = await fakeSupabase(page);
  await page.goto('/inventaire');
  await page.getByRole('button', { name: 'Sélectionner' }).click();
  await page.getByRole('region', { name: 'Vendre' }).getByRole('button', { name: 'Tout' }).click();
  await expect(page.getByText('5 sélectionné(s)')).toBeVisible();
  await page.getByRole('region', { name: 'Vendre' }).getByRole('button', { name: 'Vendre', exact: true }).click();
  // Vyolis est 1/1000 : il faut confirmer
  await page.getByRole('dialog').getByRole('button', { name: 'Vendre' }).click();
  await expect(page.getByText(/5 jeton\(s\) vendu/)).toBeVisible();
  expect(calls).toContain('sell_pulls');
});

test('objets : utiliser une potion', async ({ page }) => {
  await fakeSupabase(page);
  await page.goto('/inventaire/objets');
  await expect(page.getByText('×3')).toBeVisible();
  await page.getByRole('button', { name: 'Tout utiliser' }).click();
  await expect(page.getByRole('heading', { level: 2 })).toHaveCount(1);
});
