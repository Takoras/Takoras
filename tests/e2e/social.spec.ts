import { test, expect } from '@playwright/test';
import { fakeSupabase } from './fake-supabase';

test('amis : pastille, accepter une demande, plus de chat', async ({ page, isMobile }) => {
  await fakeSupabase(page);
  await page.goto('/friends');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  // 1 demande (les messages ne comptent plus : le chat est retiré)
  // PC : Amis est dans la barre latérale. Téléphone debout : dans l'onglet « Plus » (qui montre la pastille aussi)
  if (isMobile) {
    await expect(page.getByRole('button', { name: /^Plus/ })).toContainText(/\d/); // somme des pastilles (amis + succès…)
    await page.getByRole('button', { name: /^Plus/ }).dispatchEvent('click');
  }
  await expect(page.getByRole('link', { name: /Amis/ }).first()).toContainText('1');
  if (isMobile) await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /Accepter/ }).click();
  // plus de notification : la demande part de la liste
  await expect(page.getByRole('heading', { name: /Demandes reçues/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Discuter|Chat/ })).toHaveCount(0);
});

test('annonces : plein écran pour une annonce ratée, bandeau, historique', async ({ page }) => {
  const now = new Date().toISOString();
  await fakeSupabase(page, {}, [], {
    ann: [{ id: 7, body: 'Nouvelle saison !', author: 'Admin', banner: true, fullscreen: true, created_at: now }],
  });
  await page.goto('/');
  const full = page.getByRole('dialog');
  await expect(full.getByText('Nouvelle saison !')).toBeVisible();
  await full.getByRole('button').click();
  await expect(full).toBeHidden();
  // bandeau en haut, qu'on peut fermer
  const bar = page.getByRole('region', { name: /Annonce/ });
  await expect(bar).toContainText('Nouvelle saison !');
  await bar.getByRole('button').click();
  await expect(bar).toBeHidden();
  // déjà lue : plus de plein écran au rechargement
  await page.reload();
  await expect(page.getByRole('main').getByRole('heading').first()).toBeVisible();
  await expect(page.getByRole('dialog')).toBeHidden();
});
