import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROUTES = ['/', '/inventaire', '/boutique', '/classement', '/combat', '/amis'];

for (const path of ROUTES) {
  test(`${path} : charge sans erreur ni problème d’accessibilité grave`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(path);
    await expect(page.locator('main h1')).toBeVisible();
    const a11y = await new AxeBuilder({ page }).analyze();
    expect(a11y.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious').map((v) => v.id)).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test('les anciens liens #… redirigent', async ({ page }) => {
  await page.goto('/#boutique');
  await expect(page).toHaveURL(/\/boutique$/);
});

test('la langue change sans recharger la page', async ({ page, isMobile }) => {
  test.skip(isMobile, 'le bouton Paramètres est dans le menu Plus sur mobile');
  await page.goto('/');
  await page.getByRole('button', { name: 'Paramètres' }).click();
  await page.getByRole('radio', { name: 'English' }).click();
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'Settings' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('connexion : la fenêtre propose Discord', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Connexion' }).first().click();
  await expect(page.getByRole('button', { name: /Discord/ })).toBeVisible();
});
