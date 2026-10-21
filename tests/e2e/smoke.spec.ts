import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('la page charge sans erreur ni problème d’accessibilité grave', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Takoras' })).toBeVisible();
  const a11y = await new AxeBuilder({ page }).analyze();
  expect(a11y.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
  expect(errors).toEqual([]);
});
