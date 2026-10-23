import { test, expect } from '@playwright/test';
import { fakeSupabase } from './fake-supabase';

test('combat : monter son équipe (ajouter, version, enregistrer, plus de budget)', async ({ page }) => {
  const { calls } = await fakeSupabase(page);
  await page.goto('/combat');
  await expect(page.getByText('Ton rang')).toBeVisible();
  await expect(page.getByRole('button', { name: /Entraînement/ })).toBeDisabled(); // pas encore 3 jetons
  await page.getByRole('button', { name: /Modifier/ }).click();
  const d = page.getByRole('dialog');
  for (const n of ['Mobu', 'Pikko', 'Vyolis'])
    await d
      .getByRole('button', { name: new RegExp(`^.*${n}`) })
      .first()
      .click();
  // un 4e jeton : équipe pleine (toast)
  await expect(d.getByText(/Budget/)).toHaveCount(0); // plus de limite de points
  // Mobu existe aussi en Doré : on change de version
  await d.getByRole('radio', { name: 'Doré' }).click();
  await expect(d.getByRole('radio', { name: 'Doré' })).toHaveAttribute('aria-checked', 'true');
  await expect(d.getByText('+5 %', { exact: true })).toBeVisible();
  // Mobu (Tank) + Pikko (Soutien) + Vyolis (Combattant) : trio complet
  await expect(d.getByText(/✓ Trio complet/)).toBeVisible();
  await d.getByRole('button', { name: 'Valider l’équipe' }).click();
  await expect(d).toBeHidden();
  expect(calls).toContain('set_deck');
  await expect(page.getByRole('button', { name: /Entraînement/ })).toBeEnabled();
  // fiche d'un jeton de l'équipe
  await page.getByRole('button', { name: /Vyolis/ }).click();
  await expect(page.getByRole('dialog').getByText(/Niv\. 1\/10/)).toBeVisible();
});

test('combat : l’entraînement lance le Ring, abandon avec la confirmation du site', async ({ page }) => {
  await fakeSupabase(page, {}, [], { deck: [11, 16, 17] });
  await page.addInitScript(() => localStorage.setItem('takoras-ring-tuto', '1'));
  await page.goto('/combat');
  await page.getByRole('button', { name: /Entraînement/ }).click();
  await expect(page.locator('.rg.on canvas')).toBeVisible();
  await page.locator('.rg [data-quit]').click();
  const d = page.getByRole('dialog');
  await expect(d).toBeVisible(); // plus de confirm() natif
  await d.getByRole('button', { name: 'Confirmer' }).click();
  await expect(page.locator('.rg')).toHaveCount(0);
});

test('combat sans compte : essayer le tuto du Ring', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('takoras-tuto-done', '1'));
  await page.goto('/combat');
  await page.getByRole('button', { name: /Essayer le Ring/ }).click();
  await expect(page.locator('.rg.on .rg-tip')).toBeVisible();
});
