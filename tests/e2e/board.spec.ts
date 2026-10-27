import { test, expect } from '@playwright/test';
import { fakeSupabase } from './fake-supabase';

test('classement : podium, liste, moi en surbrillance, changer de catégorie', async ({ page }) => {
  const { calls } = await fakeSupabase(page);
  await page.goto('/classement');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Alpha' })).toBeVisible();
  await expect(page.getByText('(toi)')).toBeVisible(); // Testeur = moi, 3e
  // plus de « meilleur tirage » ni de variantes ; temps de jeu en plus
  await expect(page.getByRole('button', { name: /Meilleur/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Tirages ouverts' }).click();
  await page.getByRole('radio', { name: 'Depuis toujours' }).click();
  expect(calls.filter((c) => c === 'leaderboard').length).toBeGreaterThanOrEqual(3);
  await page.getByRole('button', { name: 'Temps de jeu' }).click();
  await expect(page.getByText('2 h 05').first()).toBeVisible();
});
