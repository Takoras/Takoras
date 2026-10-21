import { errorText, RpcError } from './rpc';

test('les erreurs du serveur sont traduites, et une erreur inconnue donne le message générique', () => {
  expect(errorText(new RpcError('not_enough_coins', 'x'), 'fr')).not.toBe('ui.err_coins');
  expect(errorText(new RpcError('not_enough_coins', 'x'), 'en')).not.toEqual(errorText(new RpcError('not_enough_coins', 'x'), 'fr'));
  expect(errorText({ message: 'P0001: pseudo_taken' }, 'fr')).toEqual(errorText(new RpcError('pseudo_taken', ''), 'fr'));
  expect(errorText(new Error('boom'), 'fr')).toEqual(errorText(new RpcError('generic', ''), 'fr'));
});
