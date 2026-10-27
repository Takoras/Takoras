import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api';
import { useBetaOpen } from '@/features/beta/Beta';
import { Button } from '@/ui/Button';
import { confirm } from '@/ui/confirm';
import { act, fmt, forgetLocalProgress } from './shared';
import s from './Admin.module.css';

type Stats = {
  players: number;
  pulls_today: number;
  pulls_total: number;
  coins_total: number;
  best_today: number | null;
};

// Global : stats du site, don à tous, bêta ouverte / fermée, remise à zéro générale (taper RESET)
export function Global() {
  const qc = useQueryClient();
  const stats = useQuery({
    queryKey: ['adm-stats'],
    queryFn: async () => (await adminApi.stats()) as unknown as Stats,
  });
  const beta = useBetaOpen();
  const [coins, setCoins] = useState('');
  const [pulls, setPulls] = useState('');
  const S = stats.data;
  const refresh = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ['adm-stats'] }),
      qc.invalidateQueries({ queryKey: ['me'] }),
      qc.invalidateQueries({ queryKey: ['adm-players'] }),
    ]);
  return (
    <div className={s.stack}>
      <dl className={s.stats}>
        {S ? (
          (
            [
              ['Joueurs', fmt(S.players)],
              ['Tirages aujourd’hui', fmt(S.pulls_today)],
              ['Tirages au total', fmt(S.pulls_total)],
              ['Pièces en circulation', fmt(S.coins_total)],
              ['Meilleur tirage du jour', S.best_today ? `1/${fmt(S.best_today)}` : '—'],
            ] as const
          ).map(([l, v]) => (
            <div key={l}>
              <dt>{l}</dt>
              <dd>{v}</dd>
            </div>
          ))
        ) : (
          <p className="muted" aria-busy>
            …
          </p>
        )}
      </dl>
      <section className={s.box}>
        <h3>Donner à tous les joueurs</h3>
        <form
          className={s.row}
          onSubmit={async (e) => {
            e.preventDefault();
            const c = Math.trunc(+coins || 0),
              p = Math.trunc(+pulls || 0);
            if (!c && !p) return;
            if (!(await confirm(`Donner ${fmt(c)} pièces et ${p} pulls à TOUS les joueurs ?`))) return;
            if (await act(() => adminApi.give(null, c, p), 'Donné à tous les joueurs')) {
              setCoins('');
              setPulls('');
              await refresh();
            }
          }}
        >
          <input
            className={s.input}
            type="number"
            value={coins}
            onChange={(e) => setCoins(e.target.value)}
            placeholder="Pièces"
            aria-label="Pièces pour tous"
          />
          <input
            className={s.input}
            type="number"
            value={pulls}
            onChange={(e) => setPulls(e.target.value)}
            placeholder="Pulls"
            aria-label="Pulls pour tous"
          />
          <Button type="submit" variant="primary" size="sm">
            Donner à tous
          </Button>
        </form>
      </section>
      <section className={s.box}>
        <h3>Bêta</h3>
        <p className="muted">
          Tant que la bêta est ouverte : « bêta » à côté du logo, les testeurs choisis ont le menu testeur. En la
          fermant, le badge β reste mais le menu testeur disparaît.
        </p>
        <Button
          size="sm"
          onClick={async () => {
            const on = !!beta.data;
            if (
              on &&
              !(await confirm('Fermer la bêta ? Le menu testeur disparaît (le badge β reste).', { danger: true }))
            )
              return;
            if (await act(() => adminApi.setBeta(!on), on ? 'Bêta fermée' : 'Bêta rouverte'))
              await qc.invalidateQueries({ queryKey: ['beta-open'] });
          }}
        >
          {beta.data ? '✅ Bêta ouverte — la fermer' : '⛔ Bêta fermée — la rouvrir'}
        </Button>
      </section>
      <section className={`${s.box} ${s.mod}`}>
        <h3>Zone dangereuse</h3>
        <Button
          variant="danger"
          onClick={async () => {
            if (
              !(await confirm('Remettre TOUS les joueurs à zéro ? Tape RESET pour confirmer.', {
                typed: 'RESET',
                danger: true,
              }))
            )
              return;
            if (await act(() => adminApi.reset(null), 'Tous les joueurs ont été remis à zéro')) {
              forgetLocalProgress(); // toi aussi : tu revois le tuto comme un nouveau joueur
              await refresh();
            }
          }}
        >
          Remettre TOUS les joueurs à zéro
        </Button>
      </section>
    </div>
  );
}
