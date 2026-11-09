import { test } from '@playwright/test';
import { fakeSupabase } from '../e2e/fake-supabase';
test('shot ouverture', async ({ page }, info) => {
  await fakeSupabase(page, { stock: 3 }, [['Vyolis']], { tuto: false, pnSeen: 999 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Ouvrir 1' }).click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: '/private/tmp/claude-501/-Users-bilal-Library-Application-Support-Claude-scratch-workspaces-7d5aed36-e4a1-4e40-b6ef-0716187ccdce-960cc8e5-5541-4d28-8d17-175090b62a48-scratch-2026-10-15-6cc3f0/1ea43e78-bc8a-4936-b241-29c6eb50fddd/scratchpad/shots/' + info.project.name + '-open1.png' });
  const op = page.locator('#opening');
  for (let i = 0; i < 100 && !(await op.getAttribute('class'))?.includes('revealed'); i++) {
    await page.locator('#op-coin').dispatchEvent('pointerdown');
    await page.waitForTimeout(80);
  }
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/private/tmp/claude-501/-Users-bilal-Library-Application-Support-Claude-scratch-workspaces-7d5aed36-e4a1-4e40-b6ef-0716187ccdce-960cc8e5-5541-4d28-8d17-175090b62a48-scratch-2026-10-15-6cc3f0/1ea43e78-bc8a-4936-b241-29c6eb50fddd/scratchpad/shots/' + info.project.name + '-open2.png' });
});
