import { test, expect } from '@playwright/test';
import { fakeSupabase } from './fake-supabase';

test('classement : podium, liste, moi en surbrillance, changer de catégorie', async ({ page }) => {
  const { calls } = await fakeSupabase(page);
  await page.goto('/classement');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Alpha' })).toBeVisible();
  await expect(page.getByText('(toi)')).toBeVisible(); // Testeur = moi, 3e
  await page.getByRole('button', { name: /Meilleur/ }).click();
  await expect(page.getByText('Nyx · 1/5 000').first()).toBeVisible();
  await page.getByRole('radio', { name: 'Depuis toujours' }).click();
  expect(calls.filter((c) => c === 'leaderboard').length).toBeGreaterThanOrEqual(3);
});
