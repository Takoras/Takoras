import { test, expect } from '@playwright/test';
import { fakeSupabase } from './fake-supabase';

test('visite guidée de la première visite : suivant, passer (une seule fois)', async ({ page }) => {
  await fakeSupabase(page, {}, [], { tuto: true, pnSeen: -1 });
  // un vrai nouveau joueur n'a encore rien vu
  await page.goto('/');
  const d = page.getByRole('dialog', { name: 'Ton tirage' });
  await expect(d).toBeVisible({ timeout: 6000 });
  await d.getByRole('button', { name: 'Suivant' }).click();
  const d2 = page.getByRole('dialog', { name: 'Les tirages' });
  await expect(d2).toBeVisible();
  await d2.getByRole('button', { name: 'Passer' }).click();
  await expect(d2).toBeHidden();
  expect(await page.evaluate(() => localStorage.getItem('takoras-tuto-done'))).toBe('1');
});

test('patch notes : popup de la nouveauté, puis toutes les notes via le menu « … »', async ({ page, isMobile }) => {
  await fakeSupabase(page, {}, [], { pnSeen: 11 });
  await page.goto('/');
  const d = page.getByRole('dialog');
  await expect(d.getByRole('heading', { name: 'Version 0.13' })).toBeVisible({ timeout: 6000 });
  await expect(d.getByText('Le site passe en React')).toBeVisible();
  await d.getByRole('button', { name: /Toutes les patch notes/ }).click();
  await expect(d.getByText('Ring plus rapide')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.reload();
  await page.waitForTimeout(2000);
  await expect(page.getByRole('dialog')).toBeHidden(); // déjà vue
  void isMobile;
  // plus de pied de page : les nouveautés sont dans le menu « … » de la barre latérale
  await page.getByRole('button', { name: 'Plus', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Patch notes|Nouveautés/ })
    .click();
  await expect(page.getByRole('dialog').getByText('Version 0.12')).toBeVisible();
});

test('donner un avis', async ({ page }) => {
  const { calls } = await fakeSupabase(page);
  await page.goto('/');
  // bouton en bas à gauche (bulle 💡 sur téléphone)
  await page.getByRole('button', { name: /Donner un avis/ }).click();
  const d = page.getByRole('dialog');
  await d.getByRole('radio', { name: /Bug/ }).click();
  await d.getByRole('textbox').fill('ok');
  await d.getByRole('button', { name: 'Envoyer' }).click();
  await expect(page.getByRole('status').getByText(/5 caractères/)).toBeVisible();
  await d.getByRole('textbox').fill('Le bouton vendre ne répond pas');
  await d.getByRole('button', { name: 'Envoyer' }).click();
  await expect(page.getByRole('status').getByText(/Merci/)).toBeVisible();
  expect(calls).toContain('send_feedback');
});

test('plus de menu testeur ni de menu bêta', async ({ page }) => {
  await fakeSupabase(page, { coins: 100 }, [], { tester: true });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Menu testeur' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'bêta' })).toHaveCount(0);
});
