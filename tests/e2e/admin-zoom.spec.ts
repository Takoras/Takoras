import { expect, test } from '@playwright/test';
import { fakeSupabase } from './fake-supabase';
test('zoom de la courbe', async ({ page, isMobile }) => {
  test.skip(isMobile, 'PC');
  await fakeSupabase(page, {}, [], { admin: true });
  await page.goto('/admin');
  const svg = page.getByRole('img', { name: /par jour/ });
  await expect(svg).toBeVisible();
  const b = (await svg.boundingBox())!;
  await page.mouse.move(b.x + b.width * 0.3, b.y + b.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width * 0.5, b.y + b.height * 0.5, { steps: 8 });
  await page.mouse.move(b.x + b.width * 0.7, b.y + b.height * 0.5, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByRole('button', { name: 'Tout voir' })).toBeVisible();
  if (process.env.SHOTS) await page.screenshot({ path: 'test-results/shots/zoom.png', clip: { x: 440, y: 360, width: 600, height: 320 } });
  await page.getByRole('button', { name: 'Tout voir' }).click();
  await expect(page.getByRole('button', { name: 'Tout voir' })).toHaveCount(0);
});
