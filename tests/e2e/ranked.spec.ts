import { test, expect } from '@playwright/test';
import { fakeSupabase } from './fake-supabase';

test('classement : onglet Elo du classé', async ({ page }) => {
  await fakeSupabase(page);
  await page.goto('/classement');
  await page.getByRole('button', { name: 'Elo (classé)' }).click();
  await expect(page.getByText(/Topaze 1 · 1\s?480 Elo/)).toBeVisible();
});
