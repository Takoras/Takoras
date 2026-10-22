import { test, expect } from '@playwright/test';
import { fakeSupabase } from './fake-supabase';

test('amis : pastille, accepter une demande, chat (lire, envoyer)', async ({ page }) => {
  const { calls } = await fakeSupabase(page);
  await page.goto('/amis');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  // 1 demande + 2 messages non lus
  await expect(page.getByRole('link', { name: /Amis/ }).first()).toContainText('3');
  await page.getByRole('button', { name: /Accepter/ }).click();
  await expect(page.getByRole('status').getByText(/Nouveau/)).toBeVisible();
  // ouvrir le chat avec Ami
  await page.getByRole('listitem').filter({ hasText: 'Ami' }).first().getByRole('button', { name: /Discuter|Chat/ }).click();
  const dock = page.getByRole('region', { name: /Discussions|Messages|Chats/ });
  await expect(dock.getByText('Moi oui !')).toBeVisible();
  expect(calls).toContain('mark_read');
  await dock.getByRole('textbox').fill('Pas encore');
  await dock.getByRole('button', { name: /Envoyer/ }).click();
  await expect(dock.getByText('Pas encore')).toBeVisible();
});

test('annonces : plein écran pour une annonce ratée, bandeau, historique', async ({ page }) => {
  const now = new Date().toISOString();
  await fakeSupabase(page, {}, [], { ann: [
    { id: 7, body: 'Nouvelle saison !', author: 'Admin', banner: true, fullscreen: true, created_at: now },
  ] });
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
