import { test, expect } from '@playwright/test';
import { fakeSupabase } from './fake-supabase';

test('bourse : acheter, vendre, paie du jour et classement', async ({ page, isMobile }) => {
  const { calls } = await fakeSupabase(page);
  await page.goto('/market');
  await expect(page.getByRole('heading', { level: 1, name: 'Market' })).toBeVisible();
  await expect(page.getByRole('option')).toHaveCount(3);
  await expect(page.getByRole('option', { name: /\?\?\?/ })).toHaveAttribute('aria-disabled', 'true'); // jeton jamais eu
  await page.getByRole('button', { name: /^Acheter/ }).click();
  await expect(page.getByRole('option', { name: /Mobu/ })).toContainText('×10');
  await expect(page.getByText('Tu perds')).toBeVisible(); // juste après l'achat, les frais sont à payer
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

test('bourse : la fenêtre explique le marché', async ({ page }) => {
  await fakeSupabase(page);
  await page.goto('/market');
  await page.getByRole('button', { name: /Comment ça marche/ }).click();
  await expect(page.getByRole('dialog', { name: 'Comment marche le Market' })).toContainText('Les tirages');
});

test('bourse verrouillée sous 10 jetons différents', async ({ page }) => {
  const { calls } = await fakeSupabase(page, {}, [], { bourseHave: 6 });
  await page.goto('/market');
  await expect(page.getByText('6/10 jetons différents')).toBeVisible();
  await expect(page.getByRole('option')).toHaveCount(0);
  expect(calls).not.toContain('bourse_board');
});

test('boutique en Koo : même page, prix et nom qui changent', async ({ page }) => {
  const { calls } = await fakeSupabase(page);
  await page.goto('/shop');
  const buy = page.getByRole('button', { name: /^Acheter ·/ }).first();
  await buy.waitFor();
  const cards = await page.getByRole('button', { name: /^Acheter ·/ }).count();
  await page
    .getByRole('radio', { name: 'Market Coin' })
    .or(page.getByRole('tab', { name: 'Market Coin' }))
    .or(page.getByRole('button', { name: 'Market Coin', exact: true }))
    .first()
    .click();
  await expect(page.getByRole('heading', { level: 1, name: 'Market Shop' })).toBeVisible();
  await expect(page.getByText('à dépenser')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Acheter ·/ })).toHaveCount(cards);
  await buy.click();
  await expect.poll(() => calls).toContain('bourse_shop_buy');
  expect(calls).not.toContain('buy_item');
});

test('Black Market : même boutique, cases à ouvrir', async ({ page }) => {
  const { calls } = await fakeSupabase(page);
  await page.goto('/shop');
  await page
    .getByRole('radio', { name: 'Black Market' })
    .or(page.getByRole('tab', { name: 'Black Market' }))
    .or(page.getByRole('button', { name: 'Black Market', exact: true }))
    .first()
    .click();
  await expect(page.getByRole('heading', { level: 1, name: 'Black Market' })).toBeVisible();
  await page.locator('[data-key="1"] button[class*="cover"]').click();
  await expect.poll(() => calls).toContain('black_market_reveal');
  await page.getByRole('button', { name: /^Acheter · Potion de chance ×1,5/ }).click();
  await expect.poll(() => calls).toContain('black_market_buy');
});
