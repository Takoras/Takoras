import { test, expect } from '@playwright/test';
import { fakeSupabase } from './fake-supabase';

test('combat : monter son équipe (ajouter, version, enregistrer, plus de budget)', async ({ page }) => {
  const { calls } = await fakeSupabase(page);
  await page.goto('/combat');
  await expect(page.getByText('Ton rang')).toBeVisible();
  await expect(page.getByRole('button', { name: /Entraînement/ })).toBeDisabled(); // pas encore 3 jetons
  // plus de bouton « Modifier » : on touche une case vide de l'équipe
  await page.getByRole('region', { name: 'Équipe' }).getByRole('button').first().click();
  const d = page.getByRole('dialog');
  // la carte ouvre la grande fiche (stats, jeton sur son socle, pouvoir + vraie vidéo) ; on ajoute depuis la fiche
  await d.getByRole('button', { name: 'Mobu', exact: true }).click();
  const sheet = page.getByRole('dialog', { name: 'Mobu' });
  await expect(sheet.locator('video')).toHaveCount(1);
  await sheet.getByRole('button', { name: 'Ajouter à l’équipe' }).click();
  // plus de « + » sur les cartes : jeton → fiche → « Ajouter à l'équipe »
  for (const n of ['Pikko', 'Vyolis']) {
    await d.getByRole('button', { name: n, exact: true }).click();
    await page.getByRole('dialog', { name: n }).getByRole('button', { name: 'Ajouter à l’équipe' }).click();
  }
  // un 4e jeton : équipe pleine (toast)
  await expect(d.getByText(/Budget/)).toHaveCount(0); // plus de limite de points
  // Mobu existe aussi en Doré : pris en Doré par défaut (la meilleure mutation), on peut repasser en normal avec les tampons
  await expect(d.getByRole('radio', { name: 'Doré' })).toHaveAttribute('aria-checked', 'true');
  await expect(d.getByText('Doré +3 %')).toBeVisible();
  await d.getByRole('radio', { name: 'Normal' }).click();
  await expect(d.getByRole('radio', { name: 'Normal' })).toHaveAttribute('aria-checked', 'true');
  // chaque jeton montre ce que fait son pouvoir
  await expect(d.getByText('Gélatine').first()).toBeVisible();
  // plus de bouton « Valider » : l'équipe s'enregistre toute seule, on ferme simplement
  await expect.poll(() => calls.includes('set_deck')).toBe(true);
  await page.keyboard.press('Escape');
  await expect(d).toBeHidden();
  await expect(page.getByRole('button', { name: /Entraînement/ })).toBeEnabled();
  // fiche d'un jeton de l'équipe : le petit « i » (toucher le jeton = le changer)
  await page.getByRole('button', { name: 'Fiche de Vyolis' }).click();
  await expect(page.getByRole('dialog').getByText('Téléportation')).toBeVisible();
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
