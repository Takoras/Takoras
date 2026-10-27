import type { Page } from '@playwright/test';
import { RG } from '../../src/engines/ring-engine.js';

// Supabase simulé : une fausse session dans le navigateur + de fausses réponses aux RPC.
// Aucun appel ne part vers le vrai serveur pendant ces tests.
const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
const exp = Math.floor(Date.now() / 1000) + 3600;
const user = {
  id: '00000000-0000-0000-0000-000000000001',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'test@example.com',
};
const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: user.id, role: 'authenticated', exp })}.sig`;

export type FakeState = {
  coins: number;
  stock: number;
  max: number;
  pseudo: string;
  step: number;
  next_in: number;
  regen: number;
};
export type FakeAnn = {
  id: number;
  body: string;
  author: string | null;
  banner: boolean;
  fullscreen: boolean;
  created_at: string;
};
export async function fakeSupabase(
  page: Page,
  state: Partial<FakeState> = {},
  draws: string[][] = [],
  opts: {
    ann?: FakeAnn[];
    tuto?: boolean;
    pnSeen?: number;
    tester?: boolean;
    deck?: number[];
    admin?: boolean;
    ranked?: { tuto?: boolean };
  } = {},
) {
  const st: FakeState = {
    coins: 5000,
    stock: 12,
    max: 20,
    pseudo: 'Testeur',
    step: 180,
    next_in: 100,
    regen: 180,
    ...state,
  };
  const calls: string[] = [];
  // Inventaire de test : 4 Mobu (niveau 1), 1 Mobu Doré, 1 Vyolis (rare : vente confirmée)
  const inv = [
    {
      jeton: 'Mobu',
      serie: 'Takoras',
      variant: null,
      odds: 2,
      ids: [11, 12, 13, 14],
      free: [11, 12, 13, 14],
      shown: 0,
      deck: 0,
      last: '2026-10-20T10:00:00Z',
      best_luck: 1,
    },
    {
      jeton: 'Mobu',
      serie: 'Takoras',
      variant: 'gold',
      odds: 2,
      ids: [15],
      free: [15],
      shown: 0,
      deck: 0,
      last: '2026-10-20T11:00:00Z',
      best_luck: 1,
    },
    {
      jeton: 'Vyolis',
      serie: 'Takoras',
      variant: null,
      odds: 1000,
      ids: [16],
      free: [16],
      shown: 0,
      deck: 0,
      last: '2026-10-20T12:00:00Z',
      best_luck: 1,
    },
    {
      jeton: 'Pikko',
      serie: 'Takoras',
      variant: null,
      odds: 4,
      ids: [17],
      free: [17],
      shown: 0,
      deck: 0,
      last: '2026-10-19T12:00:00Z',
      best_luck: 1,
    },
  ];
  let lvl = 1;
  let admBanned = false;
  const codes: Record<string, unknown>[] = [];
  let deck: number[] = opts.deck ?? [];
  const friends = [
    { id: 'u-ami', pseudo: 'Ami', status: 'accepted', incoming: false, last_at: '2026-10-20T10:00:00Z', unread: 2 },
    { id: 'u-nouveau', pseudo: 'Nouveau', status: 'pending', incoming: true, last_at: null, unread: 0 },
  ];
  const msgs = [
    { id: 1, mine: false, body: 'Salut, tu as eu Nyx ?', created_at: '2026-10-20T10:00:00Z' },
    { id: 2, mine: false, body: 'Moi oui !', created_at: '2026-10-20T10:01:00Z' },
  ];
  const prof: { avatar: string; bio: string; banner: string | null; showcase: (number | null)[] } = {
    avatar: 'default',
    bio: '',
    banner: null,
    showcase: [],
  };
  const items = [
    { item: 'potion1', kind: 'potion', data: { mult: 1.3, rolls: 5 }, qty: 3 },
    { item: 'instant', kind: 'instant', data: {}, qty: 1 },
  ];
  // Classé simulé : moi = le camp 1 (« p2 », pour vérifier l'écran tourné), « Rival » passe toujours son tour.
  // 1er et 2e « join » : en file ; 3e : match trouvé. 2e tir : le serveur déclare la victoire (+20 Elo).
  const rk = { tuto: opts.ranked?.tuto ?? true, elo: 1000, joins: 0, shots: [] as unknown[] };
  type FMatch = {
    id: string;
    p1: string;
    p2: string;
    names: string[];
    map: string;
    state: ReturnType<typeof RG.create>;
    turn: number;
    ready1: boolean;
    ready2: boolean;
    deadline: string;
    status: string;
    winner: number | null;
    why: string | null;
    elo: unknown;
    last: unknown;
  };
  let match: FMatch | null = null;
  const team = (names: string[]) => names.map((name) => ({ name, lvl: 1, variant: '' }));
  const resolveTurn = (m: FMatch, mine: unknown) => {
    const shots = [null, mine],
      before = RG.clone(m.state);
    RG.resolve(m.state, shots as never);
    Object.assign(m, {
      turn: m.turn + 1,
      ready1: false,
      ready2: false,
      last: { turn: m.turn, shots, before },
      deadline: new Date(Date.now() + 39_000).toISOString(),
    });
    if (m.turn === 3)
      Object.assign(m, { status: 'done', winner: 1, why: 'out', elo: { before: [1000, 1000], after: [980, 1020] } });
  };
  // Tuto de première visite et popup de patch note : déjà vus, sauf si le test les veut
  await page.addInitScript(
    ([tuto, pn]) => {
      if (tuto !== '1') localStorage.setItem('takoras-tuto-done', '1');
      if (pn !== '-1' && localStorage.getItem('takoras-pn-seen') === null) localStorage.setItem('takoras-pn-seen', pn);
    },
    [opts.tuto ? '1' : '0', String(opts.pnSeen ?? 99)] as const,
  );
  await page.addInitScript(([key, session]) => localStorage.setItem(key, session), [
    'sb-joyskjoofihwhycyreyn-auth-token',
    JSON.stringify({
      access_token: jwt,
      refresh_token: 'r',
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: exp,
      user,
    }),
  ] as const);
  await page.route('**/joyskjoofihwhycyreyn.supabase.co/**', async (route) => {
    const url = route.request().url();
    const rpc = /\/rpc\/([a-z_]+)/.exec(url)?.[1];
    calls.push(rpc ?? url);
    const json = (body: unknown) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    if (rpc === 'ranked_me')
      return json({
        elo: rk.elo,
        games: 4,
        wins: 3,
        losses: 1,
        draws: 0,
        best_elo: 1040,
        tuto_done: rk.tuto,
        top: 2,
        live: match?.status === 'live' ? match.id : null,
        queued: false,
      });
    if (rpc === 'ranked_around')
      return json([
        { pos: 1, pseudo: 'Alpha', elo: 1480, me: false },
        { pos: 2, pseudo: st.pseudo, elo: rk.elo, me: true },
        { pos: 3, pseudo: 'Bravo', elo: 990, me: false },
      ]);
    if (rpc === 'ranked_tuto_done') {
      rk.tuto = true;
      return json(null);
    }
    if (rpc === 'ranked_top')
      return json([
        { pseudo: 'Alpha', elo: 1480, games: 30, wins: 22 },
        { pseudo: 'Testeur', elo: 1060, games: 4, wins: 3 },
        { pseudo: 'Bravo', elo: 990, games: 8, wins: 3 },
      ]);
    if (url.includes('/functions/v1/ranked')) {
      if (route.request().method() === 'OPTIONS')
        return route.fulfill({
          status: 200,
          headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' },
        });
      const b = JSON.parse(route.request().postData() ?? '{}') as { op: string; shot?: unknown; turn?: number };
      calls.push(`ranked:${b.op}`);
      const now = Date.now();
      if (b.op === 'join') {
        if (!rk.tuto) return json({ error: 'tuto_required', now });
        if (++rk.joins < 3) return json({ queued: true, window: 75, now });
        match ??= {
          id: '11111111-2222-3333-4444-555555555555',
          p1: 'u-rival',
          p2: user.id,
          names: ['Rival', st.pseudo],
          map: 'volcan',
          state: RG.create([team(['Rouillé', 'Givre', 'Azura']), team(['Mobu', 'Vyolis', 'Pikko'])], 'volcan'),
          turn: 1,
          ready1: false,
          ready2: false,
          deadline: new Date(now + 36_000).toISOString(),
          status: 'live',
          winner: null,
          why: null,
          elo: null,
          last: null,
        };
        return json({ match: match.id, now });
      }
      if (b.op === 'shoot' && match) {
        rk.shots.push(b.shot);
        if (b.turn === match.turn) resolveTurn(match, b.shot);
        return json({ ok: true, now });
      }
      if (b.op === 'forfeit' && match) {
        Object.assign(match, { status: 'done', winner: 0, why: 'forfeit' });
        return json({ ok: true, now });
      }
      return json({ ok: true, now });
    }
    if (url.includes('/rest/v1/ranked_matches')) {
      const one = (route.request().headers().accept ?? '').includes('pgrst.object');
      return json(one ? match : match ? [match] : []);
    }
    if (rpc === 'eco_state')
      return json({
        ...st,
        admin: !!opts.admin,
        banned: false,
        beta: true,
        tester: !!opts.tester,
        streak: 2,
        streak_today: true,
        potions: [],
        luck: 1,
      });
    if (rpc === 'take_pulls') {
      const n = (JSON.parse(route.request().postData() ?? '{}') as { n: number }).n;
      const results = draws.shift() ?? Array.from({ length: n }, () => 'Mobu');
      st.stock -= results.length;
      return json({
        state: { ...st },
        results,
        variants: results.map(() => null),
        lucks: results.map(() => 1),
        ids: results.map((_, i) => i + 1),
      });
    }
    if (rpc === 'refund_pulls') return json({ refunded: 0 });
    if (rpc === 'my_quests')
      return json({
        reset_in: 3600,
        quests: [
          { id: 'q1', stat: 'pulls', target: 10, value: 10, claimed: false, coins: 300, item: null, qty: 0 },
          { id: 'q2', stat: 'sold', target: 5, value: 2, claimed: false, coins: 0, item: 'potion1', qty: 1 },
          { id: 'q3', stat: 'rares', target: 1, value: 1, claimed: true, coins: 500, item: null, qty: 0 },
        ],
      });
    if (rpc === 'shop_today')
      return json({
        reset_in: 7200,
        items: [
          {
            id: 'potion1',
            kind: 'potion',
            data: { mult: 1.3, rolls: 5 },
            price: 300,
            base_price: 300,
            stock: 7,
            bought: 0,
            owned: false,
          },
          {
            id: 'potion10',
            kind: 'potion',
            data: { mult: 10, rolls: 1 },
            price: 60000,
            base_price: 50000,
            stock: 1,
            bought: 0,
            owned: false,
          },
          {
            id: 'hourglass',
            kind: 'hourglass',
            data: { minutes: 60 },
            price: 2000,
            base_price: 2000,
            stock: 2,
            bought: 2,
            owned: false,
          },
          { id: 'b_plaine', kind: 'banner', data: {}, price: 5000, base_price: 5000, stock: 1, bought: 0, owned: true },
        ],
      });
    if (rpc === 'buy_item') {
      st.coins -= 300;
      return json({ ...st });
    }
    if (rpc === 'redeem_code') {
      const code = (JSON.parse(route.request().postData() ?? '{}') as { p_code: string }).p_code;
      if (code !== 'BONJOUR')
        return route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'code_invalid', code: 'P0001' }),
        });
      st.coins += 1000;
      return json({ coins: 1000, pulls: 0, items: [], state: { ...st } });
    }
    if (rpc === 'my_daily') return json({ available: true, amount: 750, next_streak: 3, tomorrow: 1000 });
    if (rpc === 'claim_daily') {
      st.coins += 750;
      return json({ amount: 750, streak: 3, state: { ...st } });
    }
    if (rpc === 'claim_quest') {
      st.coins += 300;
      return json({ ...st });
    }
    if (rpc === 'my_inventory_groups') return json(inv.filter((g) => g.ids.length));
    if (rpc === 'my_collection')
      return json([
        { jeton: 'Mobu', serie: 'Takoras', variant: null, total: 6, owned: 4 },
        { jeton: 'Mobu', serie: 'Takoras', variant: 'gold', total: 1, owned: 1 },
        { jeton: 'Vyolis', serie: 'Takoras', variant: null, total: 1, owned: 1 },
        { jeton: 'Pikko', serie: 'Takoras', variant: null, total: 2, owned: 0 },
      ]);
    if (rpc === 'my_levels') return json([{ jeton: 'Mobu', serie: 'Takoras', lvl: lvl }]);
    if (rpc === 'sell_pulls') {
      const ids = (JSON.parse(route.request().postData() ?? '{}') as { ids: number[] }).ids;
      inv.forEach((g) => {
        g.ids = g.ids.filter((i) => !ids.includes(i));
        g.free = g.free.filter((i) => !ids.includes(i));
      });
      st.coins += ids.length;
      return json({ sold: ids.length, coins: ids.length, state: { ...st } });
    }
    if (rpc === 'lock_pulls') {
      const b = JSON.parse(route.request().postData() ?? '{}') as { ids: number[]; p_locked: boolean };
      inv.forEach((g) => {
        if (b.ids.some((i) => g.ids.includes(i))) g.free = b.p_locked ? [] : [...g.ids];
      });
      return json(b.ids.length);
    }
    if (rpc === 'level_up') {
      lvl += 1;
      const g = inv[0];
      if (g) {
        g.ids = g.ids.slice(lvl - 1);
        g.free = [...g.ids];
      }
      return json({ lvl });
    }
    if (rpc === 'my_items') return json(items.filter((i) => i.qty > 0));
    if (rpc === 'use_items') {
      const b = JSON.parse(route.request().postData() ?? '{}') as { p_item: string; p_qty: number };
      const it = items.find((i) => i.item === b.p_item);
      if (it) it.qty -= b.p_qty;
      return json({ used: b.p_qty, state: { ...st } });
    }
    if (rpc === 'profile_public') {
      const who = (JSON.parse(route.request().postData() ?? '{}') as { p_pseudo: string }).p_pseudo;
      const base = {
        num: 42,
        streak: 3,
        beta: true,
        wins: 2,
        losses: 1,
        avatar: 'default',
        banner: null,
        bio: '',
        joined: '2026-09-01T00:00:00Z',
        pulls: 120,
        collection: 3,
        owned: 6,
        best_pull: { jeton: 'Vyolis', odds: 1000, variant: null, eff: 1000 },
      };
      if (who.toLowerCase() === st.pseudo.toLowerCase())
        return json({
          ...base,
          pseudo: st.pseudo,
          avatar: prof.avatar,
          bio: prof.bio,
          banner: prof.banner,
          banners: ['plaine'],
          avatars: [],
          email: 'test@example.com',
          provider: 'discord',
          pseudo_free: false,
          pseudo_next: null,
          showcase: [
            prof.showcase[0] ? { id: 16, jeton: 'Vyolis', odds: 1000, variant: null } : null,
            null,
            null,
            null,
            null,
          ],
        });
      if (who === 'Ami')
        return json({
          ...base,
          pseudo: 'Ami',
          bio: 'Salut !',
          showcase: [
            { id: 99, jeton: 'Mobu', odds: 2, variant: 'gold' },
            { id: 98, jeton: 'Vyolis', odds: 1000, variant: 'ombre' },
            { id: 97, jeton: 'Pikko', odds: 4, variant: 'celeste' },
            { id: 96, jeton: 'Nyx', odds: 5000, variant: null },
            null,
          ],
        });
      return json(null);
    }
    if (rpc === 'update_profile') {
      const b = JSON.parse(route.request().postData() ?? '{}') as {
        p_avatar: string;
        p_banner: string | null;
        p_bio: string;
        p_showcase: (number | null)[];
      };
      if (b.p_banner === '')
        return route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'bad_banner', code: 'P0001' }),
        });
      Object.assign(prof, { avatar: b.p_avatar, banner: b.p_banner, bio: b.p_bio, showcase: b.p_showcase });
      return json(null);
    }
    if (rpc === 'ranked_of') return json({ elo: 1026, games: 12 });
    if (rpc === 'collection_of')
      return json([
        { jeton: 'Mobu', serie: 'Takoras', variant: 'gold', total: 1 },
        { jeton: 'Mobu', serie: 'Takoras', variant: null, total: 5 },
      ]);
    if (rpc === 'friend_status') return json({ id: 'u-ami', status: null, incoming: false });
    if (rpc === 'friend_request') return json('sent');
    if (rpc === 'my_friends') return json(friends);
    if (rpc === 'my_conversation') return json(msgs);
    if (rpc === 'mark_read') {
      friends.forEach((f) => {
        f.unread = 0;
      });
      return json(null);
    }
    if (rpc === 'send_message') {
      const b = JSON.parse(route.request().postData() ?? '{}') as { p_body: string };
      const id = 100 + msgs.length;
      msgs.push({ id, mine: true, body: b.p_body, created_at: new Date().toISOString() });
      return json(id);
    }
    if (rpc === 'friend_respond') {
      const b = JSON.parse(route.request().postData() ?? '{}') as { p_other: string; p_accept: boolean };
      const f = friends.find((x) => x.id === b.p_other);
      if (f) {
        if (b.p_accept) {
          f.status = 'accepted';
          f.incoming = false;
        } else friends.splice(friends.indexOf(f), 1);
      }
      return json(null);
    }
    if (rpc === 'friend_remove') {
      const i = friends.findIndex(
        (x) => x.id === (JSON.parse(route.request().postData() ?? '{}') as { p_other: string }).p_other,
      );
      if (i >= 0) friends.splice(i, 1);
      return json(null);
    }
    if (url.includes('/rest/v1/announcements')) return json(opts.ann ?? []);
    if (url.includes('/rest/v1/patchnotes'))
      return json([
        {
          id: 12,
          title: 'Version 0.13',
          title_en: 'Version 0.13',
          created_at: '2026-10-21T10:00:00Z',
          lines: [
            { t: 'new', x: 'Le site passe en React' },
            { t: 'fix', x: 'Stock max corrigé' },
          ],
          lines_en: [{ t: 'new', x: 'The site moves to React' }],
        },
        {
          id: 11,
          title: 'Version 0.12',
          title_en: null,
          created_at: '2026-10-10T10:00:00Z',
          lines: [{ t: 'change', x: 'Ring plus rapide' }],
          lines_en: null,
        },
      ]);
    if (url.includes('/rest/v1/site_settings')) return json({ v: 'on' });
    if (url.includes('/rest/v1/shop_items'))
      return json([{ id: 'potion1', kind: 'potion', price: 300, data: { mult: 1.3, rolls: 5 } }]);
    if (rpc === 'send_feedback') return json(null);
    if (rpc === 'my_deck')
      return json(
        deck
          .map((id) => {
            const g = inv.find((x) => x.ids.includes(id));
            return g ? { id, jeton: g.jeton, lvl: 1, odds: g.odds, serie: g.serie, variant: g.variant } : null;
          })
          .filter(Boolean),
      );
    if (rpc === 'set_deck') {
      deck = (JSON.parse(route.request().postData() ?? '{}') as { ids: number[] }).ids;
      return json(null);
    }
    if (rpc === 'bp_state')
      return json({
        season: 1,
        xp: 3500,
        premium: false,
        claimed: [],
        pclaimed: [],
        pull_xp: 120,
        ends_in: 40 * 86400,
        tiers: Array.from({ length: 50 }, (_, i) => ({
          t: i + 1,
          free: (i + 1) % 5 ? { coins: 100 } : { item: 'instant', qty: 1 },
          prem: (i + 1) % 10 === 0 ? { item: 'b_plaine', qty: 1 } : { item: 'potion10', qty: 1 },
        })),
      });
    if (rpc === 'bp_claim') {
      st.coins += 500;
      return json({ reward: { coins: 500 }, state: st });
    }
    if (rpc === 'leaderboard_elo')
      return json(['Alpha', 'Testeur', 'Bravo'].map((pseudo, i) => ({ pseudo, value: 1480 - i * 420 })));
    if (rpc === 'leaderboard_wins') return json([{ pseudo: 'Alpha', value: 12 }]);
    if (rpc === 'leaderboard_time')
      return json(['Alpha', 'Testeur'].map((pseudo, i) => ({ pseudo, value: 7500 - i * 3000 })));
    if (rpc === 'leaderboard') {
      const kind = (JSON.parse(route.request().postData() ?? '{}') as { kind: string }).kind;
      return json(
        ['Alpha', 'Bravo', 'Testeur', 'Delta', 'Echo'].map((pseudo, i) => ({
          pseudo,
          value: kind === 'gain' ? 5000 - i * 1000 : 500 - i * 50,
          jeton: 'Nyx',
          odds: 5000,
        })),
      );
    }
    if (rpc === 'beta_give') {
      const b = JSON.parse(route.request().postData() ?? '{}') as { p_coins?: number; p_pulls?: number };
      st.coins += b.p_coins ?? 0;
      st.stock += b.p_pulls ?? 0;
      return json({ ...st });
    }
    // ----- admin (seulement si opts.admin ; sinon le vrai serveur refuserait)
    if (rpc?.startsWith('admin_') && !opts.admin)
      return route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'not_admin', code: 'P0001' }),
      });
    if (rpc === 'admin_players')
      return json([
        {
          id: 'u-1',
          pseudo: 'Alice',
          coins: 1200,
          stock: 4,
          stock_max: 20,
          pulls: 300,
          best_odds: 5000,
          created_at: '2026-09-01T00:00:00Z',
          banned: false,
        },
        {
          id: 'u-2',
          pseudo: 'Bob',
          coins: 50,
          stock: 0,
          stock_max: 10,
          pulls: 12,
          best_odds: 60,
          created_at: '2026-10-01T00:00:00Z',
          banned: false,
        },
      ]);
    if (rpc === 'admin_player')
      return json({
        pseudo: 'Alice',
        is_admin: false,
        email: 'alice@example.com',
        created_at: '2026-09-01T00:00:00Z',
        coins: 1200,
        stock: 4,
        stock_max: 20,
        potions: [],
        luck: 1,
        fast_until: null,
        banner: null,
        banned: admBanned,
        tester: false,
        items: [{ item: 'potion1', qty: 2 }],
        recent: [{ jeton: 'Nyx', odds: 5000, at: '2026-10-20T10:00:00Z', sold: false }],
      });
    if (rpc === 'admin_inventory')
      return json([
        { id: 501, jeton: 'Nyx', odds: 5000, locked: false, showcased: false },
        { id: 502, jeton: 'Mobu', odds: 2, locked: true, showcased: false },
      ]);
    if (rpc === 'admin_ban') {
      admBanned = (JSON.parse(route.request().postData() ?? '{}') as { p_ban: boolean }).p_ban;
      return json(null);
    }
    if (rpc === 'admin_stats')
      return json({ players: 2, pulls_today: 40, pulls_total: 312, coins_total: 1250, best_today: 5000 });
    if (rpc === 'admin_shop')
      return json([
        {
          id: 'potion1',
          kind: 'potion',
          data: { mult: 1.3, rolls: 5 },
          price: 300,
          base_price: 300,
          stock: 7,
          sold: 1,
          active: true,
        },
      ]);
    if (rpc === 'admin_codes') return json(codes);
    if (rpc === 'admin_code_save') {
      const b = JSON.parse(route.request().postData() ?? '{}') as { p_code: string; p_coins: number };
      codes.push({
        code: b.p_code,
        coins: b.p_coins,
        pulls: 0,
        items: [],
        max_uses: null,
        uses: 0,
        expires_at: null,
        active: true,
      });
      return json(null);
    }
    if (rpc === 'admin_feedback')
      return json([
        {
          id: 1,
          kind: 'bug',
          body: 'Le bouton vendre bug',
          page: '/inventaire',
          device: '375×760',
          pseudo: 'Bob',
          status: 'new',
          created_at: '2026-10-20T10:00:00Z',
        },
      ]);
    if (rpc === 'admin_messages') return json([]);
    if (rpc?.startsWith('admin_')) return json(rpc === 'admin_give' || rpc === 'admin_reset' ? 2 : null);
    if (rpc === 'live_feed' || rpc === 'avatars_of') return json([]);
    if (url.includes('/rest/v1/pulls')) return json([]);
    return json(null);
  });
  return { calls, state: st, ranked: rk };
}
