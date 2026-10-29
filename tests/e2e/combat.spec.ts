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
  // la fiche est celle du bestiaire (+ la vidéo du pouvoir) ; les tampons choisissent la mutation
  const sheet = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'Mobu' }) });
  await expect(sheet.locator('video')).toHaveCount(1);
  await expect(sheet.getByRole('button', { name: 'Doré' })).toHaveAttribute('aria-pressed', 'true');
  await expect(sheet.getByRole('button', { name: 'Ombre' })).toBeDisabled();
  await sheet.getByRole('button', { name: 'Doré' }).click(); // retour en normal
  await sheet.getByRole('button', { name: 'Ajouter à l’équipe' }).click();
  // plus de « + » sur les cartes : jeton → fiche → « Ajouter à l'équipe »
  for (const n of ['Pikko', 'Vyolis']) {
    await d.getByRole('button', { name: n, exact: true }).click();
    await page
      .getByRole('dialog')
      .filter({ has: page.getByRole('heading', { name: n }) })
      .getByRole('button', { name: 'Ajouter à l’équipe' })
      .click();
  }
  // un 4e jeton : équipe pleine (toast)
  await expect(d.getByText(/Budget/)).toHaveCount(0); // plus de limite de points
  // plus de choix de mutation dans les places du haut : Mobu a été pris en normal depuis la fiche
  await expect(d.getByRole('radio', { name: 'Doré' })).toHaveCount(0);
  await expect(d.getByText('Normal').first()).toBeVisible();
  // les jetons pas encore trouvés sont des « ? »
  await expect(d.getByText('???').first()).toBeVisible();
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
  await page.addInitScript(() => {
    localStorage.setItem('takoras-tuto-done', '1');
    sessionStorage.setItem('takoras-gate-skip', '1');
  });
  await page.goto('/combat');
  await page.getByRole('button', { name: /Essayer le Ring/ }).click();
  await expect(page.locator('.rg.on .rg-tip')).toBeVisible();
});
