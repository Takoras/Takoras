import { test, expect } from '@playwright/test';
import { fakeSupabase } from './fake-supabase';

test('accueil connecté : solde, stock et boutons', async ({ page }) => {
  await fakeSupabase(page, { coins: 5000, stock: 12, max: 20 });
  await page.goto('/');
  await expect(page.getByRole('status').filter({ hasText: '/20' })).toContainText('12');
  await expect(page.getByRole('button', { name: 'Ouvrir 1' })).toBeEnabled();
});

test('ouvrir 1 pull : transition, révélation au tap, retour', async ({ page }) => {
  const fake = await fakeSupabase(page, {}, [['Pikko']]);
  await page.goto('/');
  await page.getByRole('button', { name: 'Ouvrir 1' }).click();
  const opening = page.locator('#opening');
  await expect(opening).toHaveClass(/\bon\b/);
  expect(fake.calls).toContain('take_pulls');
  // on tape vite jusqu'à la révélation, puis on ralentit : le « clic de trop » (on voulait s'arrêter) n'ouvre rien de plus.
  // Tout se joue dans la page : le rythme des clics compte à la milliseconde près.
  await page.evaluate(
    () =>
      new Promise<void>((done) => {
        const box = document.getElementById('opening') as HTMLElement;
        const coin = document.getElementById('op-coin') as HTMLElement;
        const tap = () => coin.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        const timer = setInterval(() => {
          if (!box.classList.contains('revealed')) return tap();
          clearInterval(timer);
          setTimeout(() => {
            tap();
            setTimeout(done, 200);
          }, 300);
        }, 120);
      }),
  );
  await expect(opening).toHaveClass(/revealed/);
  await expect(page.locator('#op-name')).toContainText('Pikko');
  await page.keyboard.press('Escape'); // retour (même effet que le bouton « Retour »)
  await expect(opening).not.toHaveClass(/\bon\b/, { timeout: 5000 });
});

test('toucher le jeton révélé ouvre le tirage suivant', async ({ page }) => {
  const fake = await fakeSupabase(page, { stock: 3 }, [['Mobu'], ['Pikko']]);
  await page.goto('/');
  await page.getByRole('button', { name: 'Ouvrir 1' }).click();
  const opening = page.locator('#opening');
  const reveal = async () => {
    for (let i = 0; i < 60 && !(await opening.getAttribute('class'))?.includes('revealed'); i++) {
      await page.locator('#op-coin').dispatchEvent('pointerdown');
      await page.waitForTimeout(120);
    }
    await expect(opening).toHaveClass(/revealed/);
  };
  await reveal();
  await expect(page.locator('#op-name')).toContainText('Mobu');
  await page.waitForTimeout(800); // un clic posé après la révélation (les clics qui traînent ne comptent pas)
  await page.locator('#op-coin').dispatchEvent('pointerdown');
  await expect.poll(() => fake.calls.filter((c) => c === 'take_pulls').length).toBe(2);
  await expect(opening).not.toHaveClass(/revealed/);
  await reveal();
  await expect(page.locator('#op-name')).toContainText('Pikko');
});

test('une ouverture interrompue reprend après un rechargement de la page', async ({ page }) => {
  await fakeSupabase(page, { stock: 3 }, [['Mobu']]);
  await page.goto('/');
  await page.getByRole('button', { name: 'Ouvrir 1' }).click();
  await expect(page.locator('#opening')).toHaveClass(/\bon\b/);
  await page.reload();
  await expect(page.locator('#opening')).toHaveClass(/\bon\b/, { timeout: 15_000 }); // le moteur se recharge d'abord
});

test('bonus du jour et quêtes : récupérer met à jour le solde', async ({ page }) => {
  await fakeSupabase(page, { coins: 5000 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Quêtes du jour' })).toBeVisible();
  await page.getByRole('button', { name: /\+750/ }).click();
  await expect(page.getByLabel('Solde')).toContainText('5 750');
  await page.getByRole('button', { name: 'Récupérer' }).click();
  await expect(page.getByLabel('Solde')).toContainText('6 050');
});

test('« Probas & infos » : la somme des probabilités affichées et le choix de chance', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('takoras-gate-skip', '1'));
  await page.goto('/');
  await page.getByRole('button', { name: 'Probas & infos' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Probas & infos' })).toBeVisible();
  await expect(dialog.locator('tbody tr')).toHaveCount(17 + 3);
  await dialog.getByRole('button', { name: '×500' }).click();
  await expect(dialog.getByRole('button', { name: '×500' })).toHaveAttribute('aria-pressed', 'true');
});
