import { test } from '@playwright/test';
import { fakeSupabase } from './fake-supabase';
// Captures de l'ouverture et de la cinématique Takoras (SHOTS=1), pas un vrai test
test.skip(!process.env.SHOTS, 'captures seulement avec SHOTS=1');
test.use({ contextOptions: { reducedMotion: 'no-preference' } });
for (const [who, n, gap] of [
  ['Pikko', 8, 110],
  ['Takoras', 14, Number(process.env.GAP ?? 900)],
] as const)
  test(`shot ouverture ${who}`, async ({ page }, info) => {
    test.setTimeout(90_000);
    await fakeSupabase(page, {}, [[who]]);
    await page.goto('/');
    await page.getByRole('button', { name: 'Ouvrir 1' }).click();
    const opening = page.locator('#opening');
    for (let i = 0; i < 40 && !(await opening.getAttribute('class'))?.includes('revealed'); i++) {
      if (await page.locator('.cine').count()) break;
      await page.locator('#op-coin').dispatchEvent('pointerdown');
      await page.waitForTimeout(120);
    }
    if (who === 'Takoras') await page.waitForTimeout(Number(process.env.WAIT ?? 0));
    if (process.env.DEBUG)
      console.log(
        'DBG',
        await page.evaluate(() =>
          [...document.querySelectorAll('#op-coin img.face, #op-coin img.back')].map((i) => [
            (i as HTMLImageElement).src,
            i.className,
            getComputedStyle(i).filter,
            getComputedStyle(i).animationName,
          ]),
        ),
      );
    for (let i = 0; i < n; i++) {
      if (process.env.DEBUG)
        console.log(
          'SPIN',
          i,
          await page.evaluate(() => {
            const sp = document.querySelector('#op-coin .spin');
            const im = [...document.querySelectorAll('#op-coin img')] as HTMLImageElement[];
            return [
              sp && getComputedStyle(sp).transform,
              im.map((x) => `${x.className}:${x.complete}:${x.naturalWidth}`).join(' '),
            ];
          }),
        );
      await page.screenshot({
        path: `${process.env.SHOTS_DIR ?? 'test-results/shots'}/open-${who}-${info.project.name}-${i}.png`,
      });
      await page.waitForTimeout(gap);
    }
  });
