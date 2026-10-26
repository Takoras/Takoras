import { test, expect } from '@playwright/test';
import { fakeSupabase } from './fake-supabase';

test('passe de combat : palier, récupérer une récompense gratuite, premium pas encore achetable', async ({ page }) => {
  const { calls } = await fakeSupabase(page);
  await page.goto('/passe');
  await expect(page.getByRole('heading', { name: 'Passe de combat' })).toBeVisible();
  await expect(page.getByText('Encore 500 XP pour le palier 4')).toBeVisible();
  await expect(page.getByRole('button', { name: /5,00 €/ })).toBeDisabled();
  await page.getByRole('button', { name: 'Récupérer' }).first().click();
  await expect(page.getByRole('status').getByText(/Récompense récupérée/)).toBeVisible();
  expect(calls).toContain('bp_claim');
});
