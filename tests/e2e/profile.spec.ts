import { test, expect } from '@playwright/test';
import { fakeSupabase } from './fake-supabase';

test('mon profil : stats, vitrine, modifier la bio et la photo', async ({ page }) => {
  const { calls } = await fakeSupabase(page);
  await page.goto('/profil');
  await expect(page.getByRole('heading', { level: 1, name: /Testeur/ })).toBeVisible();
  await expect(page.getByText('120')).toBeVisible();
  await expect(page.getByText('test@example.com')).toBeVisible(); // zone privée (seulement sur mon profil)
  // vitrine : case 1 → toute la collection de la série, Vyolis → sa fiche → « Mettre en vitrine »
  await page.getByRole('button', { name: 'Vitrine · case 1' }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Vyolis/ })
    .click();
  await page.getByRole('button', { name: 'Mettre en vitrine' }).click();
  await expect(page.getByRole('button', { name: /Vyolis/ }).first()).toBeVisible();
  // modifier : bio + photo, sans bannière (envoyée comme null, pas '')
  await page.getByRole('button', { name: /Modifier le profil/ }).click();
  await page.getByLabel(/Bio/).fill('Coucou');
  await page.getByRole('button', { name: 'bleu', exact: true }).click();
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByText('Coucou')).toBeVisible();
  expect(calls.filter((c) => c === 'update_profile')).toHaveLength(2);
});

test('profil d’un autre joueur : vitrine, collection, demande d’ami', async ({ page }) => {
  await fakeSupabase(page);
  await page.goto('/profil/Ami');
  await expect(page.getByRole('heading', { level: 1, name: /Ami/ })).toBeVisible();
  await expect(page.getByText('test@example.com')).toHaveCount(0);
  await page.getByRole('button', { name: /Mobu/ }).first().click();
  await expect(page.getByRole('dialog').getByRole('heading', { name: /Mobu/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /Ajouter en ami/ }).click();
  await expect(page.getByRole('status').getByText('Demande envoyée à Ami')).toBeVisible();
});

test('profil introuvable', async ({ page }) => {
  await fakeSupabase(page);
  await page.goto('/profil/Personne');
  await expect(page.getByRole('heading', { name: 'Joueur introuvable' })).toBeVisible();
});
