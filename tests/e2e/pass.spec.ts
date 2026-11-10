import { test, expect } from '@playwright/test';
import { fakeSupabase } from './fake-supabase';

test('passe de combat : palier, récupérer une récompense gratuite, premium pas encore achetable', async ({ page }) => {
  const { calls } = await fakeSupabase(page);
  await page.goto('/pass');
  await expect(page.getByRole('heading', { name: 'Passe de combat' })).toBeVisible();
  await expect(page.getByText('Encore 500 XP pour le palier 4')).toBeVisible();
  // premium : on touche le panneau, la fenêtre montre les exclusivités ; pas de prix affiché, pas encore achetable
  await page.getByRole('button', { name: /premium/i }).first().click();
  const pd = page.getByRole('dialog', { name: 'Passe premium' });
  await expect(pd.getByText('Photo « Œil »')).toBeVisible();
  await expect(pd.getByRole('button', { name: /Débloquer/ })).toBeDisabled();
  await expect(pd.getByText(/€/)).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /^Récupérer ·/ }).first().click();
  // plus de notification : la case éclate et la récompense file vers le solde ou l'inventaire
  await expect.poll(() => calls).toContain('bp_claim');
  // plusieurs paliers prêts : « Tout récupérer » d'un coup
  await expect(page.getByRole('button', { name: /Tout récupérer/ })).toBeVisible();
});
