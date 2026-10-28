import { test, expect } from '@playwright/test';
import { fakeSupabase } from './fake-supabase';

// Plus de page Classement : l'ancienne adresse mène au Combat, où vit le classement Elo
test('classement : /classement mène au Combat, classement Elo fusionné (top + autour de moi)', async ({
  page,
}, info) => {
  await fakeSupabase(page, {}, [], { deck: [11, 16, 17] });
  await page.goto('/classement');
  await expect(page).toHaveURL(/\/combat$/);
  if (info.project.name === 'mobile') await page.getByRole('radio', { name: 'Classement' }).click();
  const board = page.getByRole('region', { name: 'Classement Elo' });
  await expect(board.getByRole('link', { name: 'Alpha' })).toBeVisible();
  await expect(board.getByText('Topaze 1')).toBeVisible();
});
