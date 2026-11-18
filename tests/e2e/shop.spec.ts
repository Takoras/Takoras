import { test, expect } from '@playwright/test';
import { fakeSupabase } from './fake-supabase';

test('boutique : catégories, stock, achat, prix modifié, code promo', async ({ page }) => {
  await fakeSupabase(page, { coins: 5000 });
  await page.goto('/shop');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByText('+20%').first()).toBeVisible(); // potion ×10 plus chère que d'habitude
  // achat d'une potion ×1,3 (rayon Potions, ouvert par défaut)
  await page
    .getByRole('button', { name: /Acheter · .* · 300$/ })
    .first()
    .click();
  await expect(page.getByLabel('Solde')).toContainText('4 700');
  // la vedette est une case mystère : la révéler rapporte 100 pièces et montre l'objet (Potion ×2 à -40 %)
  await page
    .getByRole('button', { name: /Révéler la case/ })
    .first()
    .click();
  await expect(page.getByLabel('Solde')).toContainText('4 800');
  await expect(page.getByRole('heading', { name: /Potion de chance ×2/ }).first()).toBeVisible();
  // rayon « Tirages » : le sablier est épuisé (2/2 achetés)
  await page.getByRole('button', { name: /Tirages/ }).click();
  await expect(page.getByText('Épuisé').first()).toBeVisible();
  // filtre « Cosmétiques »
  await page.getByRole('button', { name: 'Cosmétiques' }).click();
  await expect(page.locator('li h3')).toHaveCount(1);
  // code promo invalide puis valide
  const code = page.getByRole('textbox', { name: 'Code promo' });
  await code.fill('FAUX');
  await page.getByRole('button', { name: 'Utiliser' }).click();
  await expect(page.getByRole('status').getByText('Ce code n’existe pas')).toBeVisible();
  await code.fill('bonjour');
  await page.getByRole('button', { name: 'Utiliser' }).click();
  await expect(page.getByLabel('Solde')).toContainText('5 800');
});

test('ouvrir plusieurs cases à la fois : aucune ne se referme', async ({ page }) => {
  await fakeSupabase(page);
  const item = (slot: number) => ({
    slot,
    id: `potion${slot}`,
    kind: 'potion',
    data: { mult: 2, rolls: 5 },
    price: 300,
    base_price: 300,
    stock: 1,
    bought: 0,
    owned: false,
  });
  const hidden = (slot: number) => ({ slot, hidden: true, group: 'potion' });
  const shop = (items: object[]) => ({ reset_in: 7200, reveal_gain: 100, items });
  await page.route('**/rpc/shop_today', (r) =>
    r.fulfill({ contentType: 'application/json', body: JSON.stringify(shop([hidden(1), hidden(2)])) }),
  );
  await page.route('**/rpc/reveal_slot', async (r) => {
    const { p_slot: slot } = JSON.parse(r.request().postData() ?? '{}') as { p_slot: number };
    // la case 1 répond en retard, avec une photo où la case 2 est encore cachée
    if (slot === 1) await new Promise((ok) => setTimeout(ok, 500));
    const items = slot === 1 ? [item(1), hidden(2)] : [hidden(1), item(2)];
    await r.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ gain: 100, state: { coins: 5000 + slot * 100 }, shop: shop(items) }),
    });
  });
  await page.goto('/shop');
  const covers = page.locator('[data-key] button[class*="cover"]');
  await expect(covers).toHaveCount(2);
  await covers.nth(0).click();
  await covers.nth(1).click();
  await expect(page.getByRole('button', { name: /^Acheter ·/ })).toHaveCount(2);
  await page.waitForTimeout(300);
  await expect(page.getByRole('button', { name: /^Acheter ·/ })).toHaveCount(2);
});
