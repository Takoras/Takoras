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
  // Inventaire de test : 4 Mobu (niveau 1), 1 Mobu Doré, 1 Vyolis (rare : vente confirmée)
  const inv = [
    { jeton: 'Mobu', serie: 'Takoras', variant: null, odds: 2, ids: [11, 12, 13, 14], free: [11, 12, 13, 14], shown: 0, deck: 0, last: '2026-10-20T10:00:00Z', best_luck: 1 },
    { jeton: 'Mobu', serie: 'Takoras', variant: 'gold', odds: 2, ids: [15], free: [15], shown: 0, deck: 0, last: '2026-10-20T11:00:00Z', best_luck: 1 },
    { jeton: 'Vyolis', serie: 'Takoras', variant: null, odds: 1000, ids: [16], free: [16], shown: 0, deck: 0, last: '2026-10-20T12:00:00Z', best_luck: 1 },
  ];
  let lvl = 1;
  const prof: { avatar: string; bio: string; banner: string | null; showcase: (number | null)[] } = { avatar: 'default', bio: '', banner: null, showcase: [] };
  const items = [
    { item: 'potion1', kind: 'potion', data: { mult: 1.3, rolls: 5 }, qty: 3 },
    { item: 'instant', kind: 'instant', data: {}, qty: 1 },
  ];
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
    if (rpc === 'my_quests') return json({ reset_in: 3600, quests: [
      { id: 'q1', stat: 'pulls', target: 10, value: 10, claimed: false, coins: 300, item: null, qty: 0 },
      { id: 'q2', stat: 'sold', target: 5, value: 2, claimed: false, coins: 0, item: 'potion1', qty: 1 },
      { id: 'q3', stat: 'rares', target: 1, value: 1, claimed: true, coins: 500, item: null, qty: 0 },
    ] });
    if (rpc === 'shop_today') return json({ reset_in: 7200, items: [
      { id: 'potion1', kind: 'potion', data: { mult: 1.3, rolls: 5 }, price: 300, base_price: 300, stock: 7, bought: 0, owned: false },
      { id: 'potion10', kind: 'potion', data: { mult: 10, rolls: 1 }, price: 60000, base_price: 50000, stock: 1, bought: 0, owned: false },
      { id: 'hourglass', kind: 'hourglass', data: { minutes: 60 }, price: 2000, base_price: 2000, stock: 2, bought: 2, owned: false },
      { id: 'b_plaine', kind: 'banner', data: {}, price: 5000, base_price: 5000, stock: 1, bought: 0, owned: true },
    ] });
    if (rpc === 'buy_item') { st.coins -= 300; return json({ ...st }); }
    if (rpc === 'redeem_code') {
      const code = (JSON.parse(route.request().postData() ?? '{}') as { p_code: string }).p_code;
      if (code !== 'BONJOUR') return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ message: 'code_invalid', code: 'P0001' }) });
      st.coins += 1000; return json({ coins: 1000, pulls: 0, items: [], state: { ...st } });
    }
    if (rpc === 'my_daily') return json({ available: true, amount: 750, next_streak: 3, tomorrow: 1000 });
    if (rpc === 'claim_daily') { st.coins += 750; return json({ amount: 750, streak: 3, state: { ...st } }); }
    if (rpc === 'claim_quest') { st.coins += 300; return json({ ...st }); }
    if (rpc === 'my_inventory_groups') return json(inv.filter((g) => g.ids.length));
    if (rpc === 'my_collection') return json([
      { jeton: 'Mobu', serie: 'Takoras', variant: null, total: 6, owned: 4 },
      { jeton: 'Mobu', serie: 'Takoras', variant: 'gold', total: 1, owned: 1 },
      { jeton: 'Vyolis', serie: 'Takoras', variant: null, total: 1, owned: 1 },
      { jeton: 'Pikko', serie: 'Takoras', variant: null, total: 2, owned: 0 },
    ]);
    if (rpc === 'my_levels') return json([{ jeton: 'Mobu', serie: 'Takoras', lvl: lvl }]);
    if (rpc === 'sell_pulls') {
      const ids = (JSON.parse(route.request().postData() ?? '{}') as { ids: number[] }).ids;
      inv.forEach((g) => { g.ids = g.ids.filter((i) => !ids.includes(i)); g.free = g.free.filter((i) => !ids.includes(i)); });
      st.coins += ids.length; return json({ sold: ids.length, coins: ids.length, state: { ...st } });
    }
    if (rpc === 'lock_pulls') {
      const b = JSON.parse(route.request().postData() ?? '{}') as { ids: number[]; p_locked: boolean };
      inv.forEach((g) => { if (b.ids.some((i) => g.ids.includes(i))) g.free = b.p_locked ? [] : [...g.ids]; });
      return json(b.ids.length);
    }
    if (rpc === 'level_up') { lvl += 1; const g = inv[0]; if (g) { g.ids = g.ids.slice(lvl - 1); g.free = [...g.ids]; } return json({ lvl }); }
    if (rpc === 'my_items') return json(items.filter((i) => i.qty > 0));
    if (rpc === 'use_items') {
      const b = JSON.parse(route.request().postData() ?? '{}') as { p_item: string; p_qty: number };
      const it = items.find((i) => i.item === b.p_item); if (it) it.qty -= b.p_qty;
      return json({ used: b.p_qty, state: { ...st } });
    }
    if (rpc === 'profile_public') {
      const who = (JSON.parse(route.request().postData() ?? '{}') as { p_pseudo: string }).p_pseudo;
      const base = { num: 42, streak: 3, beta: true, wins: 2, losses: 1, avatar: 'default', banner: null, bio: '', joined: '2026-09-01T00:00:00Z', pulls: 120, collection: 3, owned: 6,
        best_pull: { jeton: 'Vyolis', odds: 1000, variant: null, eff: 1000 } };
      if (who.toLowerCase() === st.pseudo.toLowerCase())
        return json({ ...base, pseudo: st.pseudo, avatar: prof.avatar, bio: prof.bio, banner: prof.banner, banners: ['plaine'], avatars: [], email: 'test@example.com', provider: 'discord', pseudo_free: false, pseudo_next: null,
          showcase: [prof.showcase[0] ? { id: 16, jeton: 'Vyolis', odds: 1000, variant: null } : null, null, null, null, null] });
      if (who === 'Ami') return json({ ...base, pseudo: 'Ami', bio: 'Salut !', showcase: [{ id: 99, jeton: 'Mobu', odds: 2, variant: 'gold' }, null, null, null, null] });
      return json(null);
    }
    if (rpc === 'update_profile') {
      const b = JSON.parse(route.request().postData() ?? '{}') as { p_avatar: string; p_banner: string | null; p_bio: string; p_showcase: (number | null)[] };
      if (b.p_banner === '') return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ message: 'bad_banner', code: 'P0001' }) });
      Object.assign(prof, { avatar: b.p_avatar, banner: b.p_banner, bio: b.p_bio, showcase: b.p_showcase });
      return json(null);
    }
    if (rpc === 'collection_of') return json([{ jeton: 'Mobu', serie: 'Takoras', variant: 'gold', total: 1 }, { jeton: 'Mobu', serie: 'Takoras', variant: null, total: 5 }]);
    if (rpc === 'friend_status') return json({ id: 'u-ami', status: null, incoming: false });
    if (rpc === 'friend_request') return json('sent');
    if (rpc === 'live_feed' || rpc === 'avatars_of') return json([]);
    if (url.includes('/rest/v1/pulls')) return json([]);
    return json(null);
  });
  return { calls, state: st };
}
