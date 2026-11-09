import { test, expect } from '@playwright/test';
import { fakeSupabase } from './fake-supabase';

// Les classements vivent dans les pages : tirages ouverts sous « En direct » (accueil), temps de jeu en bas de l'inventaire
test('classements : tirages ouverts sur l’accueil, temps de jeu dans l’inventaire', async ({ page }) => {
  const { calls } = await fakeSupabase(page);
  await page.goto('/');
  const pulls = page.getByRole('region', { name: 'Tirages ouverts' });
  await expect(pulls.getByRole('link', { name: 'Alpha' })).toBeVisible();
  await pulls.getByRole('radio', { name: 'Depuis toujours' }).click();
  await expect.poll(() => calls.filter((c) => c === 'leaderboard').length).toBeGreaterThanOrEqual(2);
  await page.goto('/inventaire');
  const time = page.getByRole('region', { name: 'Temps de jeu' });
  await expect(time.getByText('2 h 05').first()).toBeVisible();
  // plus d'onglet Classement dans le menu
  await expect(page.getByRole('link', { name: 'Classement', exact: true })).toHaveCount(0);
});
