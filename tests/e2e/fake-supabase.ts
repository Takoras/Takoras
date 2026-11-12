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
    /** tirage au hasard (mode démo local) ; sans lui, tout sort en Mobu */
    pick?: () => string;
  } = {},
) {
  let revealed = false; // boutique mystère : la case de la vedette
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
    { item: 'hourglass', kind: 'hourglass', data: { minutes: 60 }, qty: 1 },
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
      sessionStorage.setItem('takoras-gate-skip', '1'); // pas d'écran « installe le raccourci » pendant les tests
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
      const results = draws.shift() ?? Array.from({ length: n }, () => opts.pick?.() ?? 'Mobu');
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
    // boutique mystère : 4 objets déjà révélés + une case mystère (la vedette, -40 %) qui cache une potion ×2
    const shopNow = () => ({
      reset_in: 7200,
      reveal_gain: 100,
      featured_slot: 5,
      featured: revealed ? 'potion2' : null,
      off: 40,
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
        revealed
          ? {
              slot: 5,
              id: 'potion2',
              kind: 'potion',
              data: { mult: 2, rolls: 6 },
              price: 180,
              base_price: 300,
              stock: 9,
              bought: 0,
              owned: false,
            }
          : { slot: 5, hidden: true, group: 'potion' },
      ],
    });
    if (rpc === 'shop_today') return json(shopNow());
    if (rpc === 'reveal_slot') {
      const gain = revealed ? 0 : 100;
      revealed = true;
      st.coins += gain;
      return json({ gain, item: 'potion2', state: { ...st }, shop: shopNow() });
    }
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
          cosmetics: [
            'n_or',
            'n_celeste',
            'n_ombre',
            'n_rose',
            'n_glace',
            'n_braise',
            'n_arc',
            'au_bleue',
            'au_or',
            'au_etoile',
            'au_flamme',
            'au_ombre',
            'fx_neige',
            'fx_braises',
          ],
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
          // cosmétiques portés (boutique)
          name_fx: 'n_arc',
          aura: 'au_flamme',
          banner_fx: 'fx_etoiles',
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
    if (rpc === 'equip_cosmetics') return json(null);
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
          free: (i + 1) % 5 ? { coins: 100 } : { item: 'hourglass', qty: 1 },
          prem:
            i + 1 === 30
              ? { item: 'b_yeux', qty: 1 }
              : i + 1 === 50
                ? { item: 'a_oeil', qty: 1 }
                : { item: 'potion10', qty: 1 },
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
    if (rpc === 'admin_dashboard') {
      const days_n = Number((JSON.parse(route.request().postData() ?? '{}') as { p_days?: number }).p_days ?? 30);
      const days = Array.from({ length: days_n }, (_, i) => ({
        d: new Date(Date.now() - (days_n - 1 - i) * 864e5).toISOString().slice(0, 10),
        signups: (i * 7) % 5,
        pulls: 200 + Math.round(Math.sin(i / 3) * 120 + i * 12),
        active: 3 + (i % 6),
        rares: 10 + (i % 9) * 3,
        variants: 4 + (i % 5),
        battles: i % 4,
        hours: 1 + (i % 7) / 2,
        earned: 40000 + i * 900,
        spent: 30000 + i * 700,
      }));
      const pull = (pseudo: string, jeton: string, odds: number, variant: string | null, eff: number) => ({
        pseudo,
        jeton,
        serie: 'Takoras',
        odds,
        variant,
        eff,
        at: new Date(Date.now() - 3600e3).toISOString(),
      });
      return json({
        kpi: {
          players: 152,
          banned: 2,
          new_today: 4,
          new_7d: 31,
          new_prev7d: 24,
          online: 7,
          online_15: 12,
          active_today: 48,
          active_7d: 96,
          pulls_today: 1316,
          pulls_yesterday: 1102,
          pulls_total: 48210,
          variants_today: 71,
          rares_today: 61,
          coins_total: 10226653,
          coins_avg: 67280,
          matches_today: 9,
          matches_total: 412,
          hours_today: 18.5,
          hours_total: 935.8,
          friendships: 211,
          fb_open: 1,
          reports_open: 2,
          items_owned: 2760,
          cosmetics_owned: 14,
          owned_tokens: 25970,
        },
        days,
        hours: [0, 0, 0, 0, 0, 0, 2, 165, 410, 74, 48, 20, 30, 60, 80, 90, 105, 204, 334, 442, 380, 210, 91, 24],
        best_today: [
          pull('Kreuy', 'Astra', 10000, 'celeste', 2000000),
          pull('DGT', 'Carmin', 400, 'ombre', 200000),
          pull('Ami', 'Vyolis', 5000, null, 5000),
        ],
        best_ever: [pull('Kreuy', 'Astra', 10000, 'celeste', 2000000), pull('Ami', 'Vyolis', 500000, null, 500000)],
        top_pullers: [
          { pseudo: 'Kreuy', n: 540 },
          { pseudo: 'DGT', n: 310 },
          { pseudo: 'Ami', n: 92 },
        ],
        top_rich: [
          { pseudo: 'Kreuy', coins: 70000000 },
          { pseudo: 'Ami', coins: 120000 },
        ],
        top_time: [
          { pseudo: 'DGT', h: 12.4 },
          { pseudo: 'Ami', h: 6.1 },
        ],
        rarity_7d: [
          { k: 0, n: 3200 },
          { k: 1, n: 1700 },
          { k: 2, n: 420 },
          { k: 3, n: 61 },
          { k: 4, n: 6 },
          { k: 5, n: 1 },
        ],
        variants_7d: { gold: 210, celeste: 22, ombre: 7, none: 5100 },
        series_7d: [
          { serie: 'Takoras', n: 4200 },
          { serie: 'Bodako', n: 1150 },
        ],
        top_jetons_7d: [
          { jeton: 'Mobu', serie: 'Takoras', odds: 2, n: 1800 },
          { jeton: 'Pikko', serie: 'Takoras', odds: 8, n: 900 },
        ],
        recent: [{ pseudo: 'Nouveau', created_at: new Date(Date.now() - 600e3).toISOString() }],
        online_list: [{ pseudo: 'Kreuy' }, { pseudo: 'Ami' }, { pseudo: 'DGT' }],
      });
    }
    if (rpc === 'admin_stats_cat') {
      const a = JSON.parse(route.request().postData() ?? '{}') as { p_cat: string; p_days?: number };
      const nd = Number(a.p_days ?? 30);
      const days = (f: (i: number) => Record<string, number>) =>
        Array.from({ length: nd }, (_, i) => ({
          d: new Date(Date.now() - (nd - 1 - i) * 864e5).toISOString().slice(0, 10),
          ...f(i),
        }));
      const who = (pseudo: string, extra: object = {}) => ({
        pseudo,
        avatar: 'default',
        is_admin: false,
        tester: false,
        ...extra,
      });
      const cats: Record<string, unknown> = {
        players: {
          dau: 12,
          wau: 41,
          mau: 96,
          days: days((i) => ({ nouveaux: (i * 3) % 7, revenus: 8 + (i % 9), minutes: 20 + (i % 5) * 4 })),
          cohorts: [0, 1, 2, 3, 4, 5].map((w) => ({
            w: new Date(Date.now() - w * 7 * 864e5).toISOString().slice(0, 10),
            taille: 20 - w,
            r1: 60 - w * 3,
            r7: w ? 35 - w * 2 : null,
            r30: w > 4 ? 12 : null,
          })),
          churn: { actifs: 30, risque: 12, decroches: 25, partis: 40, jamais: 45 },
          buckets: { b0: 45, b1: 30, b2: 50, b3: 22, b4: 5 },
          funnel: [
            ['Inscrits', 152],
            ['1er tirage', 107],
            ['10 tirages', 90],
            ['Revenu un autre jour', 70],
            ['100 tirages', 41],
            ['A un ami', 33],
            ['A joué en classé', 20],
            ['Actif 7 jours différents', 14],
          ].map(([k, n]) => ({ k, n })),
          playtime: { avg_h: 3.4, median_h: 0.8 },
        },
        luck: {
          base: 1914,
          tiers: [
            [0, 1496, 1657.5],
            [1, 234, 238.9],
            [2, 41, 14.7],
            [3, 52, 2.6],
            [4, 2, 0.3],
            [5, 0, 0.02],
          ].map(([k, obs, exp]) => ({ k, obs, exp })),
          variants: { n: 1914, gold: 96, celeste: 10, ombre: 4 },
          luck: { total: 2602, boosted: 688, avg: 12.4, l1: 1914, l2: 60, l3: 21, l4: 0, l5: 607 },
          discover: days((i) => ({ n: (i * 5) % 11 })),
          never: [{ serie: 'Takoras', name: 'Vyolis', odds: 500000 }],
          lucky: [{ ...who('Kreuy'), n: 900, rares: 40, ratio: 44.4 }],
          expected_rare: 2.9,
        },
        eco: {
          days: days((i) => ({ gagne: 40000 + i * 900, depense: 30000 + i * 1200, vendus: i % 6 })),
          supply: { total: 10226653, median: 4200, p90: 120000, gini: 0.86 },
          top10: 91,
          shop: [{ item: 'potion10', kind: 'potion', qty: 40, buyers: 12, coins: 360000 }],
          items: [
            { item: 'potion1', qty: 120, owners: 30 },
            { item: 'hourglass', qty: 40, owners: 12 },
          ],
          promo: [{ code: 'BETA', uses: 52, max_uses: 100, active: true }],
        },
        social: {
          days: days((i) => ({ matchs: i % 5, amities: i % 3, messages: (i * 7) % 13 })),
          ranked: { total: 120, finished: 104, avg_turns: 9.2, avg_min: 6.4 },
          why: [
            { k: 'ko', n: 80 },
            { k: 'forfait', n: 12 },
          ],
          friends: { with_friend: 33, players: 152, avg: 1.4, pending: 3 },
          pass: { players: 60, premium: 4, avg_xp: 5400, claims: 410 },
          feedback: [
            { k: 'bug', n: 10, open: 1 },
            { k: 'idee', n: 7, open: 0 },
          ],
          reports: [{ k: 'pseudo', n: 3, open: 2 }],
          cosmetics: { owners: 6, name: 4, aura: 3, bfx: 2 },
        },
        alerts: {
          gains: [who('Kreuy', { is_admin: true, gain: 51502900 }), who('DGT', { gain: 10003190 })],
          bursts: [who('DGT', { h: new Date().toISOString(), n: 540 })],
          rate: [{ k: 'open_pulls', n: 30, users: 3 }],
          pending: 0,
          banned: [],
          staff: [{ pseudo: 'Kreuy', admin: true, mod: false, tester: true }],
          lucky_odd: [who('DGT', { n: 600, best: 200000, big: 3 })],
        },
      };
      return json(cats[a.p_cat] ?? null);
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
          period_price: 300,
          stock: 7,
          sold: 1,
          active: true,
        },
        {
          id: 'potion10',
          kind: 'potion',
          data: { mult: 10, rolls: 4 },
          price: 2100,
          base_price: 3000,
          period_price: 3000,
          stock: 2,
          sold: 0,
          active: true,
          featured: true,
          off: 30,
          forced: false,
        },
        {
          id: 'hourglass',
          kind: 'hourglass',
          data: { minutes: 60 },
          price: 800,
          base_price: 800,
          period_price: 800,
          stock: 0,
          sold: 0,
          active: true,
        },
        {
          id: 'n_or',
          kind: 'name',
          data: {},
          price: 3000,
          base_price: 3000,
          period_price: 3000,
          stock: 1,
          sold: 0,
          active: true,
        },
        {
          id: 'au_flamme',
          kind: 'aura',
          data: {},
          price: 15000,
          base_price: 15000,
          period_price: 15000,
          stock: 0,
          sold: 0,
          active: false,
        },
        {
          id: 'a_oeil',
          kind: 'avatar',
          data: { pass_only: true },
          price: 20000,
          base_price: 20000,
          period_price: 20000,
          stock: 0,
          sold: 0,
          active: false,
          pass_only: true,
        },
      ]);
    if (rpc === 'admin_shop_feature') return json(null);
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
          page: '/inventory',
          device: '375×760',
          pseudo: 'Bob',
          status: 'new',
          created_at: '2026-10-20T10:00:00Z',
        },
      ]);
    if (rpc?.startsWith('admin_')) return json(rpc === 'admin_give' || rpc === 'admin_reset' ? 2 : null);
    if (rpc === 'live_feed' || rpc === 'avatars_of') return json([]);
    if (url.includes('/rest/v1/pulls')) return json([]);
    return json(null);
  });
  return { calls, state: st, ranked: rk };
}
