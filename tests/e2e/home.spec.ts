import { test, expect } from '@playwright/test';
import { fakeSupabase } from './fake-supabase';

test('accueil connecté : solde, stock et boutons', async ({ page }) => {
  await fakeSupabase(page, { coins: 5000, stock: 12, max: 20 });
  await page.goto('/');
  await expect(page.getByRole('status').filter({ hasText: '/20' })).toContainText('12');
  await expect(page.getByRole('button', { name: 'Ouvrir 1' })).toBeEnabled();
  await expect(page.getByRole('button', { name: /Tout ouvrir/ })).toContainText('12');
});

test('ouvrir 1 pull : transition, révélation au tap, retour', async ({ page }) => {
  const fake = await fakeSupabase(page, {}, [['Pikko']]);
  await page.goto('/');
  await page.getByRole('button', { name: 'Ouvrir 1' }).click();
  const opening = page.locator('#opening');
  await expect(opening).toHaveClass(/\bon\b/);
  expect(fake.calls).toContain('take_pulls');
  for (let i = 0; i < 40 && !(await opening.getAttribute('class'))?.includes('revealed'); i++) {
    await page.locator('#op-coin').dispatchEvent('pointerdown');
    await page.waitForTimeout(120);
  }
  await expect(opening).toHaveClass(/revealed/);
  await expect(page.locator('#op-name')).toContainText('Pikko');
  await page.keyboard.press('Escape'); // retour (même effet que le bouton « Retour »)
  await expect(opening).not.toHaveClass(/\bon\b/, { timeout: 5000 });
});

test('tout ouvrir : le mode auto s’arrête sur un jeton rare, puis récap groupé', async ({ page }) => {
  test.setTimeout(120_000); // cinématique de Nyx + pause avant révélation : c'est long, exprès
  // Nyx = 1/5 000 ≥ seuil 1/1 000 par défaut → arrêt
  await fakeSupabase(page, { stock: 6 }, [['Mobu', 'Mobu', 'Pikko', 'Nyx', 'Mobu', 'Givre']]);
  await page.goto('/');
  await page.getByRole('button', { name: /Tout ouvrir/ }).click();
  const opening = page.locator('#opening');
  await expect(opening).toHaveClass(/\bon\b/);
  await page.locator('#op-auto').dispatchEvent('click');
  // arrêt sur le 4e jeton (Nyx, 1/5 000 ≥ seuil 1/1 000 par défaut) : le joueur l'ouvre lui-même
  await expect(page.locator('#op-tag')).toContainText('4/6', { timeout: 15_000 });
  await expect(opening).not.toHaveClass(/turbo/);
  // on finit à la main jusqu'au récap
  for (let i = 0; i < 300 && !(await opening.getAttribute('class'))?.includes('recap'); i++) {
    const cls = (await opening.getAttribute('class')) ?? '';
    if (await page.locator('.cine').count()) await page.locator('.cine').dispatchEvent('click');
    else if (!cls.includes('revealed')) await page.locator('#op-coin').dispatchEvent('pointerdown');
    else if (await page.locator('#op-recap').isVisible()) await page.locator('#op-recap').dispatchEvent('click');
    else if (await page.locator('#op-next').isVisible()) await page.locator('#op-next').dispatchEvent('click');
    await page.waitForTimeout(100);
  }
  await expect(page.locator('#op-recap-grid .rc')).toHaveCount(4); // Mobu ×3 regroupés + Pikko + Nyx + Givre
  await expect(page.locator('#op-recap-grid')).toContainText('×3');
});

test('une ouverture interrompue reprend après un rechargement de la page', async ({ page }) => {
  await fakeSupabase(page, { stock: 3 }, [['Mobu', 'Pikko', 'Givre']]);
  await page.goto('/');
  await page.getByRole('button', { name: /Tout ouvrir/ }).click();
  await expect(page.locator('#op-tag')).toContainText('1/3');
  await page.reload();
  await expect(page.locator('#opening')).toHaveClass(/\bon\b/);
  await expect(page.locator('#op-tag')).toContainText('/3');
});
