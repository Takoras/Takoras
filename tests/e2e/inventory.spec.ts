import { test, expect } from '@playwright/test';
import { fakeSupabase } from './fake-supabase';

test('bestiaire : grille, filtres, fiche, vente, verrou', async ({ page }) => {
  const { calls } = await fakeSupabase(page, { coins: 100 });
  await page.goto('/inventory');
  await expect(page.getByRole('heading', { level: 1, name: 'Ta collection' })).toBeVisible();
  await expect(page.locator('ul li[data-key]')).toHaveCount(17); // toute la collection, même les jetons jamais vus
  await expect(page.getByText('3/17')).toBeVisible(); // Mobu, Vyolis, Pikko déjà trouvés
  // « seulement ceux que j'ai »
  await page.getByRole('button', { name: /Possédés/ }).click();
  await expect(page.locator('ul li[data-key]')).toHaveCount(3);
  // « avec mutation » : seulement Mobu (il a un Doré)
  await page.getByRole('button', { name: /Avec mutation/ }).click();
  await expect(page.locator('ul li[data-key]')).toHaveCount(1);
  await page.getByRole('button', { name: /Avec mutation/ }).click();
  await expect(page.locator('ul li[data-key]')).toHaveCount(3);

  // fiche de Mobu (5 en tout, dont 4 normaux) : vendre 1 (plus de montée de niveau pour l'instant)
  await page.getByRole('button', { name: /×5 Mobu/ }).click({ force: true });
  const dlg = page.getByRole('dialog');
  await expect(dlg.getByText('Gélatine')).toBeVisible();
  await dlg.getByRole('button', { name: /Vendre 1/ }).click();
  // la fiche reste ouverte et se met à jour
  await expect(dlg.getByText('Tu en as 3')).toBeVisible();
  await expect(page.getByLabel('Solde')).toContainText('101');
  await expect(dlg.getByRole('button', { name: /Monter au niveau/ })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: /×4 Mobu/ })).toBeVisible(); // 1 vendu

  // verrouiller Vyolis (une fois la fiche de Mobu refermée)
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: /×1 Vyolis/ }).click({ force: true });
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Verrouiller/ })
    .click({ force: true }); // la fiche flotte (animation continue) : pas d'attente de stabilité
  await expect.poll(() => calls.includes('lock_pulls')).toBe(true);
});

test('bestiaire : sélection multiple et vente d’un rare avec confirmation', async ({ page }) => {
  const { calls } = await fakeSupabase(page);
  await page.goto('/inventory');
  await page.getByRole('button', { name: 'Sélectionner' }).click();
  await page.getByRole('region', { name: 'Vendre' }).getByRole('button', { name: 'Tout' }).click();
  await expect(page.getByText('6 sélectionné(s)')).toBeVisible();
  await page.getByRole('region', { name: 'Vendre' }).getByRole('button', { name: 'Vendre', exact: true }).click();
  // Vyolis est 1/1000 : il faut confirmer
  await page.getByRole('dialog').getByRole('button', { name: 'Vendre' }).click();
  // vendu (pas de message en cas de succès : la sélection se vide et les pièces montent)
  await expect.poll(() => calls.includes('sell_pulls')).toBe(true);
  await expect(page.getByText('6 sélectionné(s)')).toHaveCount(0);
});

test('objets : utiliser une potion', async ({ page }) => {
  await fakeSupabase(page);
  await page.goto('/inventory/items');
  await expect(page.getByText('×3')).toBeVisible();
  await page.getByRole('button', { name: 'Tout utiliser' }).click();
  // la potion est partie : plus que les objets utiles (sablier)
  await expect(page.getByRole('heading', { name: 'Potions' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Objets utiles' })).toBeVisible();
});
