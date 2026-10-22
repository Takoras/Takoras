import { TestPulls } from '@/features/beta/Beta';
import s from './Admin.module.css';

// Tests : tirages forcés (chance, jeton, variante) pour tes prochains pulls. Le serveur ne les accepte que d'un admin ou d'un testeur.
export function Tests() {
  return (
    <section className={s.box}>
      <h3>Tirages de test</h3>
      <p className="muted">Ces réglages s’appliquent à tes prochains pulls (accueil).</p>
      <TestPulls />
    </section>
  );
}
