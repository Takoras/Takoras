import { test, expect, type Page } from '@playwright/test';
import { fakeSupabase } from './fake-supabase';

// (Projets « lab » : serveur de développement, accès à l'état du Ring.) Classé : tuto obligatoire, rang + route des rangs, recherche, match en ligne (écran tourné pour le camp 1), Elo à la fin.
type Body = { id: number; side: number; x: number; y: number; alive: boolean };
type RRing = {
  RNG: {
    me: number;
    st: { bodies: Body[]; turn: number } | null;
    phase: string;
    locked: boolean;
    cv: HTMLCanvasElement;
    view: { size: number; s: number };
  };
};
type W = { __ring?: RRing };

// Vise son jeton le plus proche de l'adversaire en tirant vers l'arrière À L'ÉCRAN (comme un vrai joueur), puis valide
async function aimAndGo(page: Page) {
  return page.evaluate(() => {
    const R = (window as unknown as W).__ring?.RNG;
    if (!R?.st) return null;
    const v = R.view,
      r = R.cv.getBoundingClientRect(),
      k = v.s * (R.me ? -1 : 1);
    const scr = (b: Body) => [r.left + v.size / 2 + b.x * k, r.top + v.size / 2 + b.y * k] as const;
    const me = R.st.bodies.find((b) => b.side === R.me && b.alive);
    if (!me) return null;
    const [sx, sy] = scr(me);
    const pt = { pointerId: 3, pointerType: 'mouse', isPrimary: true, bubbles: true, cancelable: true };
    document
      .querySelector('#rg-stage')
      ?.dispatchEvent(new PointerEvent('pointerdown', { ...pt, clientX: sx, clientY: sy }));
    // tirer vers le BAS de l'écran = tir vers le HAUT (vers l'adversaire, qui est toujours en haut)
    for (let i = 1; i <= 5; i++)
      window.dispatchEvent(new PointerEvent('pointermove', { ...pt, clientX: sx, clientY: sy + i * 25 }));
    window.dispatchEvent(new PointerEvent('pointerup', { ...pt, clientX: sx, clientY: sy + 125 }));
    (document.querySelector('#rg-go') as HTMLButtonElement).click();
    return sy > r.top + v.size / 2 ? 'bottom' : 'top'; // mon jeton est-il bien en bas de l'écran ?
  });
}

test('classé : le tuto du Ring est obligatoire avant de jouer', async ({ page }) => {
  const { calls } = await fakeSupabase(page, {}, [], { deck: [11, 16, 17], ranked: { tuto: false } });
  await page.goto('/combat');
  await expect(page.getByText('Fais d’abord le tuto du Ring')).toBeVisible();
  await expect(page.getByRole('button', { name: /Entraînement/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /JOUER/ })).toHaveCount(0);
  await page.getByRole('button', { name: /Commencer le tuto/ }).click();
  await expect(page.locator('.rg.on .rg-tip')).toBeVisible();
  await expect(page.locator('.rg-tip [data-t="skip"]')).toHaveCount(0); // pas de « Passer » la première fois
  expect(calls).not.toContain('ranked_tuto_done');
  // la fin du tuto (dernière bulle « Terminer ») débloque le classé
  await page.evaluate(() =>
    (window as unknown as { __ring: { RNG: { tuto: { onDone: () => void } } } }).__ring.RNG.tuto.onDone(),
  );
  await expect.poll(() => calls.includes('ranked_tuto_done')).toBe(true);
  // l'arène se referme toute seule et JOUER est débloqué
  await expect(page.locator('.rg')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /JOUER/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Entraînement/ })).toBeEnabled();
});

test('classé : rang, route des rangs, recherche puis match en ligne jusqu’à l’Elo gagné', async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const { calls, ranked } = await fakeSupabase(page, {}, [], { deck: [11, 16, 17] });
  await page.goto('/combat');
  // carte du rang (1000 Elo = Bois 1) et route des rangs
  await expect(page.getByText('Bois 1', { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/Encore 50 Elo pour Bois 2/)).toBeVisible();
  // près de toi au classement : devant / toi / derrière
  const around = page.getByRole('region', { name: 'Près de toi au classement' });
  await expect(around.getByText('#1')).toBeVisible();
  await expect(around.getByRole('link', { name: 'Alpha' })).toBeVisible();
  await expect(around.getByText('Bravo')).toBeVisible();
  // téléphone : la route des rangs est dans l'onglet « Classement »
  const tab = page.getByRole('radio', { name: 'Classement' });
  if (await tab.isVisible()) await tab.click();
  await expect(page.getByRole('heading', { name: 'Route des rangs' })).toBeVisible();
  await expect(page.locator('[aria-current="step"]')).toContainText('Bois 1');
  await expect(page.getByText('Takoras', { exact: true }).first()).toBeAttached();
  const play = page.getByRole('radio', { name: 'Jouer' });
  if (await play.isVisible()) await play.click();
  if (process.env.SHOT) await page.screenshot({ path: `${process.env.SHOT}/combat-ranked.png`, fullPage: true });
  // recherche : 1er passage en file, 2e = adversaire trouvé
  await page.getByRole('button', { name: /JOUER/ }).click();
  await expect(page.getByText(/Un joueur proche de ton Elo \(1000\)/)).toBeVisible();
  await page.waitForFunction(() => !!(window as unknown as W).__ring?.RNG.st, null, { timeout: 15_000 });
  expect(calls.filter((c) => c === 'ranked:join').length).toBeGreaterThanOrEqual(2);
  await expect(page.locator('.rg-names')).toContainText('Testeur');
  await expect(page.locator('.rg-names')).toContainText('Rival');
  // tour 1 : je suis le camp 1 côté serveur, mais mon jeton est EN BAS ; tirer vers le haut = vers l'adversaire
  await page.waitForFunction(() => (window as unknown as W).__ring?.RNG.phase === 'aim');
  if (process.env.SHOT) await page.screenshot({ path: `${process.env.SHOT}/ranked-aim.png` });
  expect(await aimAndGo(page)).toBe('bottom');
  await expect.poll(() => ranked.shots.length).toBe(1);
  const s1 = ranked.shots[0] as { ay: number; f: number };
  expect(s1.ay).toBeGreaterThan(0); // dans le monde du serveur, le camp 1 tire vers +y
  expect(s1.f).toBeGreaterThan(0.3);
  // tour 2 (après le rejeu du tour 1)
  await page.waitForFunction(
    () => {
      const R = (window as unknown as W).__ring?.RNG;
      return R?.st?.turn === 2 && R.phase === 'aim' && !R.locked;
    },
    null,
    { timeout: 30_000 },
  );
  await aimAndGo(page);
  // fin : victoire, +20 Elo
  await expect(page.locator('.rg-res h2')).toHaveText('Victoire !', { timeout: 30_000 });
  await expect(page.locator('.rg-elo')).toContainText('+20 Elo');
  if (process.env.SHOT) await page.screenshot({ path: `${process.env.SHOT}/ranked-end.png` });
  expect(errors).toEqual([]);
  await page.locator('.rg-res [data-back]').click();
  await expect(page.locator('.rg, .rg-res')).toHaveCount(0);
});

test('Ring : toucher un jeton adverse montre sa fiche, même avec mon jeton choisi ; le ring rétrécit', async ({
  page,
}) => {
  test.setTimeout(60_000);
  await fakeSupabase(page, {}, [], { deck: [11, 16, 17] });
  await page.goto('/combat');
  await page.getByRole('button', { name: /Entraînement/ }).click();
  await page.waitForFunction(() => (window as unknown as W).__ring?.RNG.phase === 'aim');
  const tap = (side: 'me' | 'foe') =>
    page.evaluate((side) => {
      const R = (window as unknown as W).__ring?.RNG;
      if (!R?.st) return;
      const v = R.view,
        r = R.cv.getBoundingClientRect(),
        k = v.s * (R.me ? -1 : 1);
      const b = R.st.bodies.find((x) => (side === 'me' ? x.side === R.me : x.side !== R.me) && x.alive);
      if (!b) return;
      const pt = {
        pointerId: 4,
        pointerType: 'mouse',
        isPrimary: true,
        bubbles: true,
        cancelable: true,
        clientX: r.left + v.size / 2 + b.x * k,
        clientY: r.top + v.size / 2 + b.y * k,
      };
      document.querySelector('#rg-stage')?.dispatchEvent(new PointerEvent('pointerdown', pt));
      window.dispatchEvent(new PointerEvent('pointerup', pt));
    }, side);
  await tap('me'); // mon jeton est choisi
  await expect(page.locator('#rg-pw')).not.toHaveText(/Choisis un jeton/);
  await tap('foe'); // simple toucher sur un jeton d'en face : sa fiche
  await expect(page.locator('.rg-info .rg-ic.foe')).toBeVisible();
  await expect(page.locator('.rg-info .rg-cmp')).toBeVisible(); // ses stats comparées aux miennes
  await page.locator('.rg-info').click();
  // le tour passe : le ring rétrécit (pas de compteur « Tour n/12 »)
  await expect(page.locator('#rg-turn')).toHaveText('');
  const R0 = await page.evaluate(
    () => (window as unknown as { __ring: { RNG: { st: { map: { R: number } } } } }).__ring.RNG.st.map.R,
  );
  await page.locator('#rg-go').click();
  await page.waitForFunction(
    (r0) => {
      const R = (window as unknown as { __ring?: { RNG: { st: { map: { R: number } } | null; phase: string } } }).__ring
        ?.RNG;
      return !!R?.st && R.st.map.R < r0 && R.phase === 'aim';
    },
    R0,
    { timeout: 30_000 },
  );
  if (process.env.SHOT) {
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${process.env.SHOT}/ring-shrink.png` });
  }
});

test('Ring : activer les pouvoirs de deux jetons dans le même tour (un seul tire)', async ({ page }) => {
  await fakeSupabase(page, {}, [], { deck: [11, 16, 17] });
  await page.goto('/combat');
  await page.getByRole('button', { name: /Entraînement/ }).click();
  await page.waitForFunction(() => (window as unknown as W).__ring?.RNG.phase === 'aim');
  // toucher un de mes jetons dans le coin (panneau), puis son pouvoir ; même chose pour un 2e jeton
  const pick = (i: number) =>
    page.evaluate((i) => {
      const R = (window as unknown as W).__ring?.RNG;
      const b = R?.st?.bodies.filter((x) => x.side === R.me)[i];
      if (!R || !b) return;
      const v = R.view,
        r = R.cv.getBoundingClientRect();
      const pt = {
        pointerId: 6,
        pointerType: 'mouse',
        isPrimary: true,
        bubbles: true,
        cancelable: true,
        clientX: r.left + v.size / 2 + b.x * v.s,
        clientY: r.top + v.size / 2 + b.y * v.s,
      };
      document.querySelector('#rg-stage')?.dispatchEvent(new PointerEvent('pointerdown', pt));
      window.dispatchEvent(new PointerEvent('pointerup', pt));
    }, i);
  await pick(0);
  await page.locator('#rg-pw').click();
  await pick(1);
  await page.locator('#rg-pw').click();
  await expect(page.locator('#rg-t0 .rg-tc.on')).toHaveCount(2);
  const shot = await page.evaluate(() => {
    const R = (window as unknown as { __ring: { RNG: { pows: Set<number> } } }).__ring.RNG;
    return R.pows.size;
  });
  expect(shot).toBe(2);
  await expect(page.locator('#rg-go')).toHaveText('Valider');
});
