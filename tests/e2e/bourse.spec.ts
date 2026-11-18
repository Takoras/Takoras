import { test, expect } from '@playwright/test';
import { fakeSupabase } from './fake-supabase';

test('bourse : acheter, vendre, paie du jour et classement', async ({ page, isMobile }) => {
  const { calls } = await fakeSupabase(page);
  await page.goto('/bourse');
  await expect(page.getByRole('heading', { level: 1, name: 'Bourse' })).toBeVisible();
  await expect(page.getByRole('option', { name: /\?\?\?/ })).toBeVisible(); // jeton jamais eu : pas dévoilé
  await page.getByRole('button', { name: /^Acheter/ }).click();
  await expect(page.getByRole('cell', { name: /Mobu/ })).toBeVisible(); // arrive dans « Mes positions »
  await page.getByRole('cell', { name: /Mobu/ }).click(); // passe le ticket en vente
  await page.getByRole('button', { name: /^Vendre/ }).click();
  await expect.poll(() => calls.filter((c) => c === 'bourse_trade').length).toBe(2);
  await page.getByRole('button', { name: 'Récupérer' }).click();
  await expect(page.getByText('Paie reçue')).toBeVisible();
  await page
    .getByRole('radio', { name: 'Classement' })
    .or(page.getByRole('tab', { name: 'Classement' }))
    .or(page.getByRole('button', { name: 'Classement' }))
    .first()
    .click();
  await expect(page.getByRole('link', { name: /Kaz/ }).first()).toBeVisible();
  await expect(page.getByText('60 Elo avant Argent')).toBeVisible();
  if (isMobile) expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
