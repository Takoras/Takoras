import { redirectLegacyHash } from './legacyHash';

test('anciens liens #… → nouvelles adresses', () => {
  expect(redirectLegacyHash({ hash: '#inventaire' })).toBe('/inventaire');
  expect(redirectLegacyHash({ hash: '#inventaire/objets' })).toBe('/inventaire/objets');
  expect(redirectLegacyHash({ hash: '#profil/Snomi' })).toBe('/profil/Snomi');
  expect(redirectLegacyHash({ hash: '#bestiaire' })).toBe('/inventaire');
  expect(redirectLegacyHash({ hash: '#access_token=abc' })).toBeNull();
  expect(redirectLegacyHash({ hash: '' })).toBeNull();
});
