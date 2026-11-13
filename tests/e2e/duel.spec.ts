import { test, expect } from '@playwright/test';
import { fakeSupabase } from './fake-supabase';

test('duel : attaquer, l’ordi répond, puis c’est de nouveau à moi', async ({ page }) => {
  await fakeSupabase(page, {}, [], { deck: [11, 16, 17] });
  await page.goto('/duel');
  await expect(page.getByText('À toi')).toBeVisible();
  const foeHp = page.locator('[class*="spotFoe"] [class*="hpN"]');
  const before = await foeHp.innerText();
  await page.getByRole('button', { name: /Attaquer/ }).click({ force: true });
  await expect(foeHp).not.toHaveText(before);
  await expect(page.getByText('À toi')).toBeVisible({ timeout: 8000 });
});
