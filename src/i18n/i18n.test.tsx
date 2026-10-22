import { render } from '@testing-library/react';
import { translate } from './index';
import { Rich } from './Rich';
import { loadEn } from './index';

// l'anglais est chargé à la demande sur le site : on le charge avant les tests
beforeAll(() => loadEn());

test('traduit avec variables, en FR et en EN', () => {
  expect(translate('fr', 'ui.daily_got', { n: 500, s: 3 })).toContain('500');
  expect(translate('en', 'ui.daily_got', { n: 500, s: 3 })).toContain('coins');
});
test('Rich : <b> en gras, le reste en texte (pas de HTML injecté)', () => {
  const { container } = render(<Rich text={'Salut <b>toi</b> <img src=x onerror=alert(1)>'} />);
  expect(container.querySelector('b')?.textContent).toBe('toi');
  expect(container.querySelector('img')).toBeNull();
});
