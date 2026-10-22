import { test, expect } from '@playwright/test';
import { fakeSupabase } from './fake-supabase';

test('tuto de première visite : suivant, retour, terminer (une seule fois)', async ({ page }) => {
  await fakeSupabase(page, {}, [], { tuto: true, pnSeen: -1 });
  // un vrai nouveau joueur n'a encore rien vu
  await page.goto('/');
  const d = page.getByRole('dialog');
  await expect(d.getByRole('heading', { name: 'Bienvenue sur Takoras !' })).toBeVisible({ timeout: 6000 });
  await d.getByRole('button', { name: /Suivant/ }).click();
  await expect(d.getByRole('heading', { name: 'Tes pulls' })).toBeVisible();
  await d.getByRole('button', { name: /Retour/ }).click();
  await d.getByRole('button', { name: 'Passer' }).click();
  await expect(d).toBeHidden();
  expect(await page.evaluate(() => localStorage.getItem('takoras-tuto-done'))).toBe('1');
});

test('patch notes : popup de la nouveauté, puis toutes les notes via la puce bêta', async ({ page, isMobile }) => {
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
  if (!isMobile) {
    await page.getByRole('button', { name: 'bêta' }).click();
    await expect(page.getByRole('dialog').getByText('Version 0.12')).toBeVisible();
  }
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

test('menu testeur : seulement pour les testeurs, donne des pièces', async ({ page, isMobile }) => {
  test.skip(isMobile, 'même menu sur téléphone (dans Plus)');
  await fakeSupabase(page, { coins: 100 }, [], { tester: true });
  await page.goto('/');
  await page.getByRole('button', { name: 'Menu testeur' }).click();
  await page.getByRole('dialog').getByRole('button', { name: '+10 000', exact: true }).click();
  await expect(page.getByLabel('Solde')).toContainText('10 100');
});

test('menu testeur absent pour un joueur normal', async ({ page, isMobile }) => {
  test.skip(isMobile);
  await fakeSupabase(page);
  await page.goto('/');
  await expect(page.getByLabel('Solde')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Menu testeur' })).toHaveCount(0);
});
