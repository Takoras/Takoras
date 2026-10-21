import type { Page } from '@playwright/test';

// Supabase simulé : une fausse session dans le navigateur + de fausses réponses aux RPC.
// Aucun appel ne part vers le vrai serveur pendant ces tests.
const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
const exp = Math.floor(Date.now() / 1000) + 3600;
const user = { id: '00000000-0000-0000-0000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'test@example.com' };
const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: user.id, role: 'authenticated', exp })}.sig`;

export type FakeState = { coins: number; stock: number; max: number; pseudo: string; step: number; next_in: number; regen: number };
export async function fakeSupabase(page: Page, state: Partial<FakeState> = {}, draws: string[][] = []) {
  const st: FakeState = { coins: 5000, stock: 12, max: 20, pseudo: 'Testeur', step: 180, next_in: 100, regen: 180, ...state };
  const calls: string[] = [];
  await page.addInitScript(([key, session]) => localStorage.setItem(key, session), [
    'sb-joyskjoofihwhycyreyn-auth-token',
    JSON.stringify({ access_token: jwt, refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: exp, user }),
  ] as const);
  await page.route('**/joyskjoofihwhycyreyn.supabase.co/**', async (route) => {
    const url = route.request().url();
    const rpc = /\/rpc\/([a-z_]+)/.exec(url)?.[1];
    calls.push(rpc ?? url);
    const json = (body: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    if (rpc === 'eco_state') return json({ ...st, admin: false, banned: false, beta: true, tester: false, streak: 2, streak_today: true, potions: [], luck: 1 });
    if (rpc === 'take_pulls') {
      const n = (JSON.parse(route.request().postData() ?? '{}') as { n: number }).n;
      const results = draws.shift() ?? Array.from({ length: n }, () => 'Mobu');
      st.stock -= results.length;
      return json({ state: { ...st }, results, variants: results.map(() => null), lucks: results.map(() => 1), ids: results.map((_, i) => i + 1) });
    }
    if (rpc === 'refund_pulls') return json({ refunded: 0 });
    if (rpc === 'live_feed' || rpc === 'avatars_of') return json([]);
    if (url.includes('/rest/v1/pulls')) return json([]);
    return json(null);
  });
  return { calls, state: st };
}
