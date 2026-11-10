import { test } from '@playwright/test';
import { fakeSupabase } from '../e2e/fake-supabase';
// Fenêtre de dev : le vrai site local, connecté avec un faux compte (aucun appel au vrai Supabase).
// Elle reste ouverte jusqu'à ce que tu la fermes. Fichier temporaire de la refonte.
// animations actives et fenêtre redimensionnable (la config des captures coupe les animations)
test.use({ viewport: { width: 1440, height: 860 }, contextOptions: { reducedMotion: 'no-preference' }, launchOptions: { args: ['--start-maximized'] } });

test('fenêtre connectée', async ({ page }) => {
  test.setTimeout(0);
  await fakeSupabase(page, { stock: 20 }, [['Vyolis'], ['Mobu'], ['Néphéris']], { tuto: false, pnSeen: 999 });
  await page.goto('/');
  await page.waitForEvent('close', { timeout: 0 });
});
