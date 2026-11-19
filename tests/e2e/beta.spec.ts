import { test, expect } from '@playwright/test';
import { fakeSupabase } from './fake-supabase';

test('première visite : pas de visite guidée, seulement la nouveauté', async ({ page }) => {
  await fakeSupabase(page, {}, [], { tuto: true, pnSeen: -1 });
  await page.goto('/');
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'Version 0.13' })).toBeVisible({ timeout: 6000 });
  await expect(page.getByRole('dialog', { name: 'Ton tirage' })).toHaveCount(0);
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
  // clic direct : avec le zoom des petits écrans, Playwright calcule mal le point de clic quand la machine est chargée
  await page.getByRole('button', { name: 'Plus', exact: true }).dispatchEvent('click');
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
  await expect(d).toBeHidden(); // envoyé : la fenêtre se ferme (plus de message quand tout va bien)
  expect(calls).toContain('send_feedback');
});

test('menu testeur : la fiole apparaît pour un testeur', async ({ page }) => {
  await fakeSupabase(page, { coins: 100 }, [], { tester: true });
  await page.goto('/');
  await page.getByRole('button', { name: 'Menu testeur' }).click();
  await expect(page.getByRole('dialog', { name: 'Menu testeur' })).toBeVisible();
});

test('menu testeur : absent pour un joueur normal, et plus de menu bêta', async ({ page }) => {
  await fakeSupabase(page, { coins: 100 });
  await page.goto('/');
  await expect(page.getByLabel('Solde')).toContainText('100'); // le compte est chargé : l'absence veut dire quelque chose
  await expect(page.getByRole('button', { name: 'Menu testeur' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'bêta' })).toHaveCount(0);
});
