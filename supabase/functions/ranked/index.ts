// Classé du Ring : appariement par Elo, tirs cachés, tours calculés ICI (jamais par les navigateurs).
// Le moteur (ring-engine.js + ring-config.js) est une copie EXACTE de src/engines : le test ranked-engine.test.ts le vérifie.
// Changer le moteur ou ses valeurs = recopier les deux fichiers ici et redéployer la fonction.
// Clé de service : seulement dans l'environnement de la fonction (jamais côté site).
// @ts-nocheck -- Deno (pas le TypeScript du site)
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { RG } from './ring-engine.js';
import { RCFG } from './ring-config.js';

const URL = Deno.env.get('SUPABASE_URL');
const KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const db = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });

const AIM_MS = RCFG.AIM_S * 1000;
const FIRST_MS = AIM_MS + 6000; // 1er tour : le temps d'ouvrir l'arène
const ANIM_MS = 9000; // les tours suivants : le temps de voir l'animation
const GRACE_MS = 2500; // un tir qui arrive juste après la fin du chrono compte encore
const MAX_MISSES = 3; // 3 tours sans jouer d'affilée = abandon

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const out = (body, status = 200) =>
  new Response(JSON.stringify({ ...body, now: Date.now() }), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const fail = (error, status = 400) => out({ error }, status);
const iso = (ms) => new Date(ms).toISOString();

// Un tir valide : { i 0..2, ax, ay entiers, f 0..1 (au centième), pow }, ou null (passer)
function cleanShot(s) {
  if (s == null) return null;
  if (typeof s !== 'object') throw 'bad_shot';
  const { i, ax, ay, f, pow } = s;
  if (![0, 1, 2].includes(i) || !Number.isInteger(ax) || !Number.isInteger(ay) || typeof f !== 'number' || typeof pow !== 'boolean') throw 'bad_shot';
  if (Math.abs(ax) > 100000 || Math.abs(ay) > 100000 || !(f >= 0 && f <= 1)) throw 'bad_shot';
  if (!ax && !ay && f > 0) throw 'bad_shot';
  return { i, ax, ay, f: Math.round(f * 100) / 100, pow };
}

const live = async (uid) =>
  (await db.from('ranked_matches').select('*').eq('status', 'live').or(`p1.eq.${uid},p2.eq.${uid}`).order('created_at', { ascending: false }).limit(1)).data?.[0] ?? null;
const sideOf = (m, uid) => (m.p1 === uid ? 0 : m.p2 === uid ? 1 : -1);

async function end(m, winner, why) {
  const { error } = await db.rpc('_ranked_end', { p_match: m.id, p_winner: winner, p_why: why });
  if (error) throw error.message;
}

// Calcule le tour en cours (les deux ont tiré, ou le chrono est fini). Un seul appel gagne (comparaison sur « turn »).
async function resolve(m) {
  const { data: rows } = await db.from('ranked_shots').select('side, shot').eq('match_id', m.id).eq('turn', m.turn);
  const has = [0, 1].map((s) => rows?.find((r) => r.side === s));
  const shots = has.map((r) => r?.shot ?? null);
  const misses = [m.misses1, m.misses2].map((n, s) => (has[s] ? 0 : n + 1));
  const before = m.state, st = RG.clone(before);
  let over = null;
  if (misses[0] >= MAX_MISSES || misses[1] >= MAX_MISSES) {
    over = misses[0] >= MAX_MISSES && misses[1] >= MAX_MISSES ? { w: null, why: 'afk' } : { w: misses[0] >= MAX_MISSES ? 1 : 0, why: 'afk' };
  } else {
    const { ev } = RG.resolve(st, shots);
    if (st.over) over = { w: st.winner, why: ev.find((e) => e.t === 'end')?.why ?? 'turns' };
  }
  const { data: upd } = await db
    .from('ranked_matches')
    .update({
      state: over?.why === 'afk' ? before : st,
      turn: m.turn + 1,
      ready1: false,
      ready2: false,
      misses1: misses[0],
      misses2: misses[1],
      last: over?.why === 'afk' ? null : { turn: m.turn, shots, before },
      deadline: iso(Date.now() + ANIM_MS + AIM_MS),
      updated_at: iso(Date.now()),
    })
    .eq('id', m.id)
    .eq('turn', m.turn)
    .eq('status', 'live')
    .select('id');
  if (!upd?.length) return false; // quelqu'un d'autre l'a déjà fait
  await db.from('ranked_shots').delete().eq('match_id', m.id).lte('turn', m.turn);
  if (over) await end(m, over.w, over.why);
  return true;
}

async function join(uid) {
  const m = await live(uid);
  if (m) return out({ match: m.id });
  const { data: r } = await db.from('ranked').select('elo, tuto_done').eq('user_id', uid).maybeSingle();
  if (!r?.tuto_done) return fail('tuto_required');
  const { data: prof } = await db.from('profiles').select('pseudo, banned').eq('id', uid).single();
  if (!prof?.pseudo || prof.banned) return fail('not_allowed', 403);
  const { data: team } = await db.rpc('_ranked_team', { uid });
  if (!Array.isArray(team) || team.length !== 3) return fail('deck_size');
  const mine = team.map(({ name, lvl, variant }) => ({ name, lvl, variant }));
  const elo = r.elo ?? 1000;
  const { data: p, error } = await db.rpc('_ranked_pair', { uid, p_elo: elo, p_team: mine });
  if (error) return fail(error.message, 500);
  if (!p.foe) return out({ queued: true, window: p.window, elo });
  // adversaire trouvé : celui qui attendait est le joueur 1 (en haut côté serveur ; chacun se voit en bas)
  const { data: foe } = await db.from('profiles').select('pseudo').eq('id', p.foe).single();
  const map = RCFG.MAPS[Math.floor(Math.random() * RCFG.MAPS.length)].id;
  const state = RG.create([p.foe_team, mine], map);
  const { data: row, error: e2 } = await db
    .from('ranked_matches')
    .insert({ p1: p.foe, p2: uid, names: [foe?.pseudo ?? '?', prof.pseudo], map, state, deadline: iso(Date.now() + FIRST_MS) })
    .select('id')
    .single();
  if (e2) return fail(e2.message, 500);
  return out({ match: row.id });
}

async function shoot(uid, body) {
  let shot;
  try {
    shot = cleanShot(body.shot);
  } catch {
    return fail('bad_shot');
  }
  const { data: m } = await db.from('ranked_matches').select('*').eq('id', body.match).maybeSingle();
  if (!m || m.status !== 'live') return fail('not_live', 409);
  const side = sideOf(m, uid);
  if (side < 0) return fail('not_player', 403);
  if (body.turn !== m.turn) return fail('wrong_turn', 409);
  if (Date.now() > Date.parse(m.deadline) + GRACE_MS) return fail('too_late', 409);
  const { error } = await db.from('ranked_shots').upsert({ match_id: m.id, turn: m.turn, side, shot });
  if (error) return fail(error.message, 500);
  await db.from('ranked_matches').update({ [side ? 'ready2' : 'ready1']: true }).eq('id', m.id).eq('turn', m.turn);
  const { count } = await db.from('ranked_shots').select('side', { count: 'exact', head: true }).eq('match_id', m.id).eq('turn', m.turn);
  if (count === 2) await resolve({ ...m });
  return out({ ok: true });
}

// Chrono fini : n'importe lequel des deux joueurs peut demander le calcul du tour
async function tick(uid, body) {
  const { data: m } = await db.from('ranked_matches').select('*').eq('id', body.match).maybeSingle();
  if (!m || m.status !== 'live') return out({ ok: true });
  if (sideOf(m, uid) < 0) return fail('not_player', 403);
  if (Date.now() <= Date.parse(m.deadline) + GRACE_MS) return out({ ok: false, wait: Date.parse(m.deadline) + GRACE_MS - Date.now() });
  await resolve(m);
  return out({ ok: true });
}

async function forfeit(uid, body) {
  const { data: m } = await db.from('ranked_matches').select('*').eq('id', body.match).maybeSingle();
  if (!m || m.status !== 'live') return out({ ok: true });
  const side = sideOf(m, uid);
  if (side < 0) return fail('not_player', 403);
  await end(m, 1 - side, 'forfeit');
  return out({ ok: true });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return fail('method', 405);
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: au } = jwt ? await db.auth.getUser(jwt) : { data: null };
  const uid = au?.user?.id;
  if (!uid) return fail('not_logged_in', 401);
  let body;
  try {
    body = await req.json();
  } catch {
    return fail('bad_json');
  }
  try {
    switch (body?.op) {
      case 'join':
        return await join(uid);
      case 'cancel':
        await db.from('ranked_queue').delete().eq('user_id', uid);
        return out({ ok: true });
      case 'shoot':
        return await shoot(uid, body);
      case 'tick':
        return await tick(uid, body);
      case 'forfeit':
        return await forfeit(uid, body);
      default:
        return fail('bad_op');
    }
  } catch (e) {
    console.error(e);
    return fail('server', 500);
  }
});
