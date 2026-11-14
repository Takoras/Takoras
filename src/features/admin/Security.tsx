import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/api';
import { Button } from '@/ui/Button';
import { fmt } from './shared';
import s from './Admin.module.css';

// Sécurité : ce qui sort de l'ordinaire. Les gains de pièces les plus gros des dernières 24 h (triche, faille),
// les joueurs qui envoient énormément de requêtes en 10 min (robot, spam), et le nombre de comptes bannis.
type Sus = {
  gains: { pseudo: string; gain: number; n: number }[];
  spam: { pseudo: string; n: number; ks: string[] }[];
  banned: number;
};
export function Security() {
  const q = useQuery({ queryKey: ['admin-sus'], queryFn: async () => (await adminApi.suspicious()) as unknown as Sus });
  const d = q.data;
  return (
    <div className={s.ptab}>
      <section className={s.box}>
        <h3>
          Gros gains de pièces <small className="muted">(24 dernières heures, hors admins)</small>
        </h3>
        {!d ? (
          <p className="muted" aria-busy>
            …
          </p>
        ) : d.gains.length ? (
          <table className={s.table}>
            <thead>
              <tr>
                <th>Joueur</th>
                <th>Pièces gagnées</th>
                <th>Opérations</th>
              </tr>
            </thead>
            <tbody>
              {d.gains.map((g) => (
                <tr key={g.pseudo}>
                  <td>{g.pseudo}</td>
                  <td>{fmt(g.gain)}</td>
                  <td>{fmt(g.n)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted">Rien sur les dernières 24 h.</p>
        )}
      </section>
      <section className={s.box}>
        <h3>
          Beaucoup de requêtes <small className="muted">(40 ou plus en 10 min)</small>
        </h3>
        {d && d.spam.length ? (
          <table className={s.table}>
            <thead>
              <tr>
                <th>Joueur</th>
                <th>Requêtes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {d.spam.map((x) => (
                <tr key={x.pseudo}>
                  <td>{x.pseudo}</td>
                  <td>{fmt(x.n)}</td>
                  <td>{x.ks.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : d ? (
          <p className="muted">Personne en ce moment.</p>
        ) : null}
        {d ? <p className="muted">Comptes bannis : {fmt(d.banned)}</p> : null}
        <Button size="sm" onClick={() => void q.refetch()}>
          Actualiser
        </Button>
      </section>
    </div>
  );
}
