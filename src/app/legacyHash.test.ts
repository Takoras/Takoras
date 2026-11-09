import { redirectLegacyHash } from './legacyHash';

test('anciens liens #… → nouvelles adresses', () => {
  expect(redirectLegacyHash({ hash: '#inventaire' })).toBe('/inventory');
  expect(redirectLegacyHash({ hash: '#inventaire/objets' })).toBe('/inventory/items');
  expect(redirectLegacyHash({ hash: '#profil/Snomi' })).toBe('/profile/Snomi');
  expect(redirectLegacyHash({ hash: '#bestiaire' })).toBe('/inventory');
  expect(redirectLegacyHash({ hash: '#access_token=abc' })).toBeNull();
  expect(redirectLegacyHash({ hash: '' })).toBeNull();
});
