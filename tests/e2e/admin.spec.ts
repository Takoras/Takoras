import { test, expect } from '@playwright/test';
import { fakeSupabase } from './fake-supabase';

test('joueur normal : /admin introuvable, le fichier admin n’est jamais téléchargé', async ({ page }) => {
  const files: string[] = [];
  page.on('request', (r) => files.push(r.url()));
  await fakeSupabase(page);
  await page.goto('/admin');
  await expect(page.getByText(/n’existe pas/)).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(files.filter((u) => /\/assets\/Admin-[\w-]+\.js/.test(u))).toEqual([]);
  await expect(page.getByRole('link', { name: 'Admin' })).toHaveCount(0); // pas de bouclier
});

test('admin : joueurs, don, ban avec confirmation, remise à zéro générale protégée par RESET', async ({ page, isMobile }) => {
  test.skip(isMobile, 'même panel, testé sur PC');
  const { calls } = await fakeSupabase(page, {}, [], { admin: true });
  await page.goto('/');
  await page.getByRole('link', { name: 'Admin' }).first().click();
  await expect(page.getByRole('heading', { name: 'Panel admin' })).toBeVisible();
  // fiche d'Alice, don de 1 000 pièces
  await page.getByRole('button', { name: 'Alice' }).click();
  await expect(page.getByText('alice@example.com')).toBeVisible();
  await page.getByRole('button', { name: '+1 000', exact: true }).click();
  await expect(page.getByRole('status').getByText(/Alice : \+1\s000 pièces/)).toBeVisible();
  // bannir : la confirmation du site d'abord ; annuler = rien envoyé
  await page.getByRole('button', { name: '⛔ Bannir' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Annuler' }).click();
  expect(calls).not.toContain('admin_ban');
  await page.getByRole('button', { name: '⛔ Bannir' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmer' }).click();
  await expect(page.getByRole('button', { name: '✅ Débannir' })).toBeVisible();
  // global : remise à zéro générale = taper RESET
  await page.getByRole('tab', { name: /Global/ }).click();
  await expect(page.getByText('312')).toBeVisible();
  await page.getByRole('button', { name: /Remettre TOUS/ }).click();
  const ok = page.getByRole('dialog').getByRole('button', { name: 'Confirmer' });
  await expect(ok).toBeDisabled();
  await page.getByRole('dialog').getByRole('textbox').fill('RESET');
  await ok.click();
  await expect(page.getByRole('status').getByText(/remis à zéro/)).toBeVisible();
  expect(calls).toContain('admin_reset');
});

test('admin : boutique, annonce, code promo, retours, patch notes FR+EN', async ({ page, isMobile }) => {
  test.skip(isMobile, 'même panel, testé sur PC');
  const { calls } = await fakeSupabase(page, {}, [], { admin: true });
  await page.goto('/admin');
  await page.getByRole('tab', { name: /Boutique/ }).click();
  await page.getByRole('spinbutton', { name: 'Prix de potion1' }).fill('250');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect(page.getByRole('status').getByText('potion1 mis à jour')).toBeVisible();
  await page.getByRole('tab', { name: /Annonces/ }).click();
  await page.getByRole('textbox', { name: /Message de l’annonce/ }).fill('Maintenance à 22 h');
  await page.getByRole('button', { name: 'Envoyer' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmer' }).click();
  await expect(page.getByRole('status').getByText(/Annonce envoyée/)).toBeVisible();
  await page.getByRole('tab', { name: /Codes/ }).click();
  await page.getByRole('textbox', { name: 'Code' }).fill('NOEL');
  await page.getByRole('spinbutton', { name: 'Pièces' }).fill('500');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByText('NOEL', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: /Retours/ }).click();
  await expect(page.getByText('Le bouton vendre bug')).toBeVisible();
  await page.getByRole('button', { name: '✅ Fait', exact: true }).click();
  await expect.poll(() => calls).toContain('admin_feedback_set');
  await page.getByRole('tab', { name: /Patch notes/ }).click();
  await page.getByRole('textbox', { name: 'Titre FR' }).fill('Version 0.14');
  await page.getByRole('textbox', { name: 'Lignes FR' }).fill('+ Panel admin en React');
  await page.getByRole('button', { name: 'Publier' }).click();
  await expect(page.getByRole('status').getByText(/version anglaise/)).toBeVisible(); // EN obligatoire
  await page.getByRole('textbox', { name: 'Titre EN' }).fill('Version 0.14');
  await page.getByRole('textbox', { name: 'Lignes EN' }).fill('+ Admin panel in React');
  await page.getByRole('button', { name: 'Publier' }).click();
  await expect(page.getByRole('status').getByText(/Patch note publiée/)).toBeVisible();
  expect(calls).toContain('admin_patchnote_save');
});

test('admin : pas de problème d’accessibilité grave', async ({ page }) => {
  const { default: AxeBuilder } = await import('@axe-core/playwright');
  await fakeSupabase(page, {}, [], { admin: true });
  await page.goto('/admin');
  await page.getByRole('button', { name: 'Alice' }).click();
  await expect(page.getByText('alice@example.com')).toBeVisible();
  const a11y = await new AxeBuilder({ page }).analyze();
  expect(a11y.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious').map((v) => `${v.id}: ${v.nodes[0]?.html.slice(0, 120)}`)).toEqual([]);
});
