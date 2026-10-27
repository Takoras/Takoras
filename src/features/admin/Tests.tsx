import { useEffect } from 'react';
import { TestPulls } from '@/features/beta/Beta';
import { installOpeningHost, openPulls } from '@/features/eco/openPulls';
import { Button } from '@/ui/Button';
import s from './Admin.module.css';

// Tests : tirages forcés (chance, jeton, variante), et on lance l'ouverture tout de suite d'ici pour voir l'animation.
// Le serveur ne les accepte que d'un admin ou d'un testeur. Ça utilise de vrais tirages de ton stock.
export function Tests() {
  useEffect(installOpeningHost, []);
  return (
    <section className={s.box}>
      <h3>Tirages de test</h3>
      <p className="muted">Choisis le jeton, la variante ou la chance, puis ouvre directement ici.</p>
      <TestPulls />
      <div className={s.row}>
        <Button variant="primary" onClick={() => void openPulls(1)}>
          Ouvrir 1 tirage test
        </Button>
        <Button onClick={() => void openPulls('all')}>Tout ouvrir (test)</Button>
      </div>
    </section>
  );
}
