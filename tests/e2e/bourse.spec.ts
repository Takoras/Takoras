import { test, expect } from '@playwright/test';
import { fakeSupabase } from './fake-supabase';

test('bourse : acheter, vendre, paie du jour et classement', async ({ page, isMobile }) => {
  const { calls } = await fakeSupabase(page);
  await page.goto('/bourse');
  await expect(page.getByRole('heading', { level: 1, name: 'Bourse' })).toBeVisible();
  await expect(page.getByRole('option')).toHaveCount(3);
  await expect(page.getByRole('option', { name: /\?\?\?/ })).toHaveAttribute('aria-disabled', 'true'); // jeton jamais eu
  await page.getByRole('button', { name: /^Acheter/ }).click();
  await expect(page.getByRole('option', { name: /Mobu/ })).toContainText('×10');
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
  await expect(page.getByText('70 Elo avant Argent I')).toBeVisible();
  if (isMobile) expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('bourse verrouillée sous 10 jetons différents', async ({ page }) => {
  const { calls } = await fakeSupabase(page, {}, [], { bourseHave: 6 });
  await page.goto('/bourse');
  await expect(page.getByText('6/10 jetons différents')).toBeVisible();
  await expect(page.getByRole('option')).toHaveCount(0);
  expect(calls).not.toContain('bourse_board');
});

test('boutique en Koo : choix de la monnaie et achat', async ({ page }) => {
  const { calls } = await fakeSupabase(page);
  await page.goto('/shop');
  await page
    .getByRole('radio', { name: 'Koo' })
    .or(page.getByRole('tab', { name: 'Koo' }))
    .or(page.getByRole('button', { name: 'Koo', exact: true }))
    .first()
    .click();
  await page.getByRole('button', { name: 'Acheter' }).click();
  await expect.poll(() => calls).toContain('bourse_shop_buy');
  await expect(page.getByRole('button', { name: 'Acheter' })).toBeDisabled();
});
