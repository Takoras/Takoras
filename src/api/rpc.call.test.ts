import { afterEach, expect, test, vi } from 'vitest';
import { rpc, RpcError } from './rpc';

afterEach(() => vi.unstubAllGlobals());

test('rpc() envoie vraiment la requête à Supabase et renvoie les données', async () => {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ coins: 42, pseudo: 'Kreuy' }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
  vi.stubGlobal('fetch', fetchMock);
  const data = await rpc('eco_state');
  expect(data).toEqual({ coins: 42, pseudo: 'Kreuy' });
  expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toContain('/rest/v1/rpc/eco_state');
});

test('rpc() transforme une erreur du serveur en RpcError avec son code', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ message: 'not_enough_coins', code: 'P0001' }), { status: 400, headers: { 'Content-Type': 'application/json' } })));
  await expect(rpc('buy_item', { p_item: 'potion1' })).rejects.toMatchObject({ code: 'not_enough_coins' });
  await expect(rpc('buy_item', { p_item: 'potion1' })).rejects.toBeInstanceOf(RpcError);
});
