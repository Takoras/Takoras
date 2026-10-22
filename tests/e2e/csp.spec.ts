import fs from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { fakeSupabase } from './fake-supabase';

// Porte de la phase 11 : la CSP de public/_headers, appliquée pour de vrai (bloquante) sur le site construit,
// ne doit provoquer AUCUNE violation, sur toutes les pages et tous les moteurs (ouverture, Ring + IA, admin…).
const csp = /Content-Security-Policy(?:-Report-Only)?: (.+)/.exec(fs.readFileSync('public/_headers', 'utf8'))?.[1] ?? '';

async function enforce(page: Page) {
  expect(csp).toContain("script-src 'self'");
  await page.route(/localhost:4173\/(?!assets\/|img\/|@)[^.]*$/, async (route) => {
    const res = await route.fetch();
    await route.fulfill({ response: res, headers: { ...res.headers(), 'content-security-policy': csp } });
  });
  await page.addInitScript(() => {
    (window as unknown as { __csp: string[] }).__csp = [];
    document.addEventListener('securitypolicyviolation', (e) =>
      (window as unknown as { __csp: string[] }).__csp.push(`${e.violatedDirective} ${e.blockedURI}`),
    );
  });
}
const violations = (page: Page) => page.evaluate(() => (window as unknown as { __csp: string[] }).__csp);

test('CSP : aucune violation sur tout le site', async ({ page, isMobile }) => {
  test.setTimeout(120_000);
  await enforce(page);
  await fakeSupabase(page, {}, [], { deck: [11, 16, 17], admin: true });
  await page.addInitScript(() => localStorage.setItem('takoras-ring-tuto', '1'));
  const seen: string[] = [];
  const check = async (where: string) => {
    for (const v of await violations(page)) seen.push(`${where} : ${v}`);
  };
  // accueil + une ouverture de pull (moteur d'ouverture, cinématiques, sons)
  await page.goto('/');
  await expect(page.locator('main h1')).toBeVisible();
  // contrôle : la CSP est bien active (un script en ligne glissé dans la page est bloqué), puis on remet le compteur à zéro
  const blocked = await page.evaluate(async () => {
    const sc = document.createElement('script');
    sc.textContent = 'window.__injected = 1';
    document.body.appendChild(sc);
    await new Promise((r) => setTimeout(r, 50));
    const w = window as unknown as { __injected?: number; __csp: string[] };
    const ok = w.__injected === undefined && w.__csp.length > 0;
    w.__csp = [];
    return ok;
  });
  expect(blocked).toBe(true);
  await page.getByRole('button', { name: /Ouvrir 1/ }).first().click();
  await page.waitForTimeout(1500);
  await page.keyboard.press('Escape');
  await check('accueil');
  for (const path of ['/inventaire', '/inventaire/objets', '/boutique', '/profil', '/profil/Ami', '/amis', '/classement', '/admin']) {
    await page.goto(path);
    await expect(page.locator('main h1, main h2').first()).toBeVisible();
    await check(path);
  }
  // fiche jeton
  await page.goto('/inventaire');
  await page.getByRole('button', { name: /×4 Mobu/ }).click();
  await page.waitForTimeout(400);
  await check('fiche jeton');
  // Ring + IA (fil séparé)
  await page.goto('/combat');
  await page.getByRole('button', { name: /Entraînement/ }).click();
  await expect(page.locator('.rg.on canvas')).toBeVisible();
  await page.waitForTimeout(2500);
  await check('Ring');
  expect(seen, seen.join('\n')).toEqual([]);
  void isMobile;
});
