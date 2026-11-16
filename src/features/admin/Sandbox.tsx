import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { errorText, sandboxApi } from '@/api';
import { Button } from '@/ui/Button';
import { confirm } from '@/ui/confirm';
import { Segmented } from '@/ui/Segmented';
import { toast } from '@/ui/toast';
import { fmt } from './shared';
import s from './Admin.module.css';

// Test serveur (modos) : des serveurs de test isolés du vrai jeu, avec des joueurs fantômes (pseudo « T.… »).
// On peut leur donner un profil réaliste au hasard (jetons tirés comme en vrai, améliorations, cosmétiques, PP…),
// régler l'événement du week-end par serveur, et se mettre dans leur peau : tout le site s'affiche comme pour eux.
type Player = { id: string; pseudo: string; coins: number; hours: number; pulls: number };
type Server = { id: number; name: string; weekend: 'auto' | 'on' | 'off'; players: Player[] };
type List = { viewing: { id: string; pseudo: string; server: string } | null; servers: Server[] };

export function Sandbox() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['sandbox'], queryFn: async () => (await sandboxApi.list()) as unknown as List });
  const [name, setName] = useState('');
  const [busy, setBusy] = useState('');
  const run = async (k: string, f: () => Promise<unknown>, after?: () => void) => {
    setBusy(k);
    try {
      await f();
      await qc.invalidateQueries({ queryKey: ['sandbox'] });
      after?.();
    } catch (e) {
      toast(errorText(e, 'fr'), true);
    } finally {
      setBusy('');
    }
  };
  // se mettre dans la peau d'un joueur : tout le site se recharge à sa place
  const play = (p: Player) =>
    run(`v${p.id}`, () => sandboxApi.view(p.id), () => {
      qc.clear();
      location.assign('/');
    });
  const d = q.data;
  return (
    <div className={s.ptab}>
      <section className={s.box}>
        <h3>Nouveau serveur de test</h3>
        <div className={s.row}>
          <input
            className={s.input}
            placeholder="Nom du serveur"
            maxLength={40}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button
            variant="primary"
            size="sm"
            loading={busy === 'new'}
            disabled={!name.trim()}
            onClick={() => void run('new', () => sandboxApi.create(name), () => setName(''))}
          >
            Créer
          </Button>
        </div>
      </section>
      {!d ? (
        <p className="muted" aria-busy>
          …
        </p>
      ) : (
        d.servers.map((sv) => <ServerBox key={sv.id} sv={sv} busy={busy} run={run} play={play} />)
      )}
    </div>
  );
}

function ServerBox({
  sv,
  busy,
  run,
  play,
}: {
  sv: Server;
  busy: string;
  run: (k: string, f: () => Promise<unknown>, after?: () => void) => Promise<void>;
  play: (p: Player) => Promise<void>;
}) {
  const [pseudo, setPseudo] = useState('');
  const [hours, setHours] = useState(20);
  const add = () =>
    run(`add${sv.id}`, async () => {
      const id = (await sandboxApi.addPlayer(sv.id, pseudo)) as unknown as string;
      if (hours > 0) await sandboxApi.randomize(id, hours);
    }, () => setPseudo(''));
  return (
    <section className={s.box}>
      <h3>
        {sv.name} <small className="muted">· {sv.players.length} joueur(s)</small>
      </h3>
      <div className={s.row}>
        <b>Événement du week-end</b>
        <Segmented<Server['weekend']>
          value={sv.weekend}
          label="Événement du week-end"
          options={[
            ['auto', 'Comme le vrai jeu'],
            ['on', 'Activé'],
            ['off', 'Coupé'],
          ]}
          onChange={(m) => void run(`w${sv.id}`, () => sandboxApi.setWeekend(sv.id, m))}
        />
      </div>
      <div className={s.row}>
        <input
          className={s.input}
          placeholder="Pseudo du joueur"
          maxLength={14}
          value={pseudo}
          onChange={(e) => setPseudo(e.target.value)}
        />
        <label className="muted">
          Heures jouées{' '}
          <input
            className={s.input}
            type="number"
            min={0}
            max={500}
            value={hours}
            onChange={(e) => setHours(Math.max(0, Math.min(500, Number(e.target.value) || 0)))}
            style={{ width: 90 }}
          />
        </label>
        <Button variant="primary" size="sm" loading={busy === `add${sv.id}`} onClick={() => void add()}>
          Ajouter un joueur
        </Button>
      </div>
      {sv.players.length ? (
        <table className={s.table}>
          <thead>
            <tr>
              <th>Joueur</th>
              <th>Heures</th>
              <th>Tirages</th>
              <th>Pièces</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {sv.players.map((p) => (
              <tr key={p.id}>
                <td>{p.pseudo}</td>
                <td>{fmt(p.hours)}</td>
                <td>{fmt(p.pulls)}</td>
                <td>{fmt(p.coins)}</td>
                <td className={s.btns}>
                  <Button size="sm" variant="primary" loading={busy === `v${p.id}`} onClick={() => void play(p)}>
                    Jouer en tant que
                  </Button>
                  <Button
                    size="sm"
                    loading={busy === `r${p.id}`}
                    onClick={() => void run(`r${p.id}`, () => sandboxApi.randomize(p.id, hours))}
                  >
                    Profil au hasard ({hours} h)
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    loading={busy === `x${p.id}`}
                    onClick={() =>
                      void confirm(`Supprimer ${p.pseudo} ?`, { danger: true }).then(
                        (ok) => {
                          if (ok) void run(`x${p.id}`, () => sandboxApi.remove(p.id));
                        },
                      )
                    }
                  >
                    Supprimer
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      <div className={s.row}>
        <Button
          size="sm"
          variant="danger"
          loading={busy === `d${sv.id}`}
          onClick={() =>
            void confirm(`Supprimer le serveur « ${sv.name} » et ses ${sv.players.length} joueur(s) ?`, {
              danger: true,
            }).then((ok) => {
              if (ok) void run(`d${sv.id}`, () => sandboxApi.del(sv.id));
            })
          }
        >
          Supprimer le serveur
        </Button>
      </div>
    </section>
  );
}
