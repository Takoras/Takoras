import { test } from '@playwright/test';
import { fakeSupabase } from '../e2e/fake-supabase';
test('accueil entier', async ({ page }, info) => {
  await fakeSupabase(page, {}, [], { tuto: false, pnSeen: 999 });
  await page.goto('/');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/private/tmp/claude-501/-Users-bilal-Library-Application-Support-Claude-scratch-workspaces-7d5aed36-e4a1-4e40-b6ef-0716187ccdce-960cc8e5-5541-4d28-8d17-175090b62a48-scratch-2026-10-15-6cc3f0/1ea43e78-bc8a-4936-b241-29c6eb50fddd/scratchpad/shots/' + info.project.name + '-home-full.png', fullPage: true });
});
