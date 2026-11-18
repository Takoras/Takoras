import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi, bourseApi, errorText } from '@/api';
import { useBetaOpen } from '@/features/beta/Beta';
import { Button } from '@/ui/Button';
import { confirm } from '@/ui/confirm';
import { Segmented } from '@/ui/Segmented';
import { toast } from '@/ui/toast';
import { act, fmt, forgetLocalProgress } from './shared';
import s from './Admin.module.css';

type Stats = {
  players: number;
  pulls_today: number;
  pulls_total: number;
  coins_total: number;
  best_today: number | null;
};

type EventMode = 'auto' | 'on' | 'off';
type Events = Record<'weekend' | 'blackmarket', { mode: EventMode; on: boolean }>;

// Week-end et Black Market : automatiques, ou forcés pour tester sans attendre
function EventSwitches() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['adm-events'], queryFn: async () => (await bourseApi.events()) as Events });
  const set = async (k: keyof Events, mode: EventMode) => {
    try {
      qc.setQueryData(['adm-events'], await bourseApi.setEvent(k, mode));
      void qc.invalidateQueries({ queryKey: ['me'] });
      void qc.invalidateQueries({ queryKey: ['black-market'] });
    } catch (e) {
      toast(errorText(e, 'fr'), true);
    }
  };
  if (!q.data) return null;
  const rows: [keyof Events, string][] = [
    ['weekend', 'Week-end'],
    ['blackmarket', 'Black Market'],
  ];
  return (
    <section className={s.card}>
      <h3>Événements</h3>
      {rows.map(([k, label]) => (
        <div key={k} className={s.row}>
          <b>{label}</b>
          <span>{q.data[k].on ? 'Actif' : 'Inactif'}</span>
          <Segmented
            value={q.data[k].mode}
            onChange={(m) => void set(k, m)}
            label={label}
            options={[
              ['auto', 'Auto'],
              ['on', 'Forcé'],
              ['off', 'Coupé'],
            ]}
          />
        </div>
      ))}
    </section>
  );
}

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
      <EventSwitches />
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
          {beta.data ? 'Bêta ouverte — la fermer' : 'Bêta fermée — la rouvrir'}
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
