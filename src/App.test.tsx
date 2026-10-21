import { render, screen } from '@testing-library/react';
import { App } from './App';

test("affiche le nom du jeu", () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Takoras' })).toBeInTheDocument();
});
