// @ts-nocheck
// Fonction serveur « battle » : arbitre des combats entre amis.
// Actions : invite, respond, cancel, act, tick (temps écoulé), forfeit, get.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { ENGINE } from './engine.js';

const URL_ = Deno.env.get('SUPABASE_URL');
const ADMIN = createClient(URL_, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
const TURN_S = 60, INVITE_S = 45;
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const out = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const fail = code => out({ error: code }, 200);
const soon = s => new Date(Date.now() + s * 1000).toISOString();

async function deckOf(uid) {
  const { data: p } = await ADMIN.from('profiles').select('deck, pseudo, banned').eq('id', uid).single();
  const ids = (p?.deck || []).slice(0, 3);
  if (ids.length < 3) return { error: 'deck_incomplete', p };
  const { data: rows } = await ADMIN.from('pulls').select('id, jeton, odds').in('id', ids).eq('user_id', uid).is('sold_at', null);
  if ((rows || []).length < 3) return { error: 'deck_incomplete', p };
  return { deck: ids.map(id => rows.find(r => r.id === id)).map(r => ({ name: r.jeton, odds: r.odds })), p };
}
async function friends(a, b) {
  const [x, y] = a < b ? [a, b] : [b, a];
  const { data } = await ADMIN.from('friendships').select('status').eq('a', x).eq('b', y).maybeSingle();
  return data?.status === 'accepted';
}
// Écrit le nouvel état seulement si personne n'a joué entre-temps (version)
async function save(b, patch) {
  const { data, error } = await ADMIN.from('battles').update({ ...patch, version: b.version + 1, updated_at: new Date().toISOString() })
    .eq('id', b.id).eq('version', b.version).select().maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('conflict');
  return data;
}
async function finish(b, st) {
  const win = st.winner === 0 ? b.p1 : b.p2, lose = st.winner === 0 ? b.p2 : b.p1;
  await ADMIN.rpc('battle_result', { p_win: win, p_lose: lose });
  return win;
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const token = (req.headers.get('Authorization') || '').replace('Bearer ', '');
    const { data: auth } = await ADMIN.auth.getUser(token);
    const me = auth?.user?.id;
    if (!me) return fail('not_logged_in');
    const body = await req.json();
    const { action } = body;

    if (action === 'invite') {
      const other = body.friend;
      if (!other || other === me) return fail('bad_friend');
      if (!(await friends(me, other))) return fail('not_friends');
      const mine = await deckOf(me);
      if (mine.error) return fail('deck_incomplete');
      if (mine.p?.banned) return fail('banned');
      const { data: busy } = await ADMIN.from('battles').select('id').eq('status', 'live').or(`p1.eq.${me},p2.eq.${me},p1.eq.${other},p2.eq.${other}`).gt('deadline', new Date(Date.now() - 5 * 60e3).toISOString());
      if ((busy || []).length) return fail('busy');
      await ADMIN.from('battles').update({ status: 'cancelled' }).eq('p1', me).eq('status', 'invite');
      const { data, error } = await ADMIN.from('battles').insert({ p1: me, p2: other, status: 'invite', deadline: soon(INVITE_S) }).select().single();
      if (error) throw error;
      return out(data);
    }

    const { data: b } = await ADMIN.from('battles').select('*').eq('id', body.id).maybeSingle();
    if (!b || (b.p1 !== me && b.p2 !== me)) return fail('no_battle');
    const side = b.p1 === me ? 0 : 1;
    if (action === 'get') return out(b);

    if (action === 'cancel') {
      if (b.status !== 'invite' || b.p1 !== me) return fail('bad_state');
      return out(await save(b, { status: 'cancelled' }));
    }
    if (action === 'respond') {
      if (b.status !== 'invite' || b.p2 !== me) return fail('bad_state');
      if (new Date(b.deadline) < new Date()) { await save(b, { status: 'cancelled' }); return fail('invite_expired'); }
      if (!body.accept) return out(await save(b, { status: 'declined' }));
      const [d1, d2] = await Promise.all([deckOf(b.p1), deckOf(b.p2)]);
      if (d1.error || d2.error) return fail('deck_incomplete');
      const { state, events } = ENGINE.create([d1.deck, d2.deck]);
      return out(await save(b, { status: 'live', state, events, deadline: soon(TURN_S + 3) }));
    }
    if (b.status !== 'live') return fail('bad_state');
    const st = b.state;

    if (action === 'act') {
      if (st.turn !== side) return fail('not_your_turn');
      let events;
      try { events = ENGINE.act(st, side, +body.unit, +body.target, !!body.abil); } catch (e) { return fail(e.message); }
      const patch = { state: st, events, deadline: soon(TURN_S) };
      if (st.over) { patch.status = 'done'; patch.winner = await finish(b, st); }
      return out(await save(b, patch));
    }
    if (action === 'tick') {
      if (new Date(b.deadline) > new Date()) return out(b); // pas encore l'heure
      const events = ENGINE.timeout(st);
      const patch = { state: st, events, deadline: soon(TURN_S) };
      if (st.over) { patch.status = 'done'; patch.winner = await finish(b, st); }
      return out(await save(b, patch));
    }
    if (action === 'forfeit') {
      const events = ENGINE.forfeit(st, side);
      return out(await save(b, { state: st, events, status: 'done', winner: await finish(b, st) }));
    }
    return fail('bad_action');
  } catch (e) {
    return fail(e?.message === 'conflict' ? 'conflict' : 'server_error:' + (e?.message || e));
  }
});
