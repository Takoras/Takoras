import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { errorText, sandboxApi } from '@/api';
import { jetonOf, texOf } from '@/data/jetons';
import { Button } from '@/ui/Button';
import { confirm } from '@/ui/confirm';
import { Segmented } from '@/ui/Segmented';
import { toast } from '@/ui/toast';
import { fmt } from './shared';
import a from './Admin.module.css';
import s from './Sandbox.module.css';

// Test serveur (modos) : des « autres Takoras » pour tout tester. Chaque serveur est un monde à part (classements,
// joueurs en ligne, direct, amis) rempli de faux joueurs réalistes qui jouent vraiment tant que quelqu'un regarde le
// serveur ou joue dedans (connexion, tirages, revente, potions, bonus du jour) ; on suit chacun dans son journal.
// « Jouer dans ce serveur » ouvre ton propre compte du serveur (plein de pièces, tout débloqué) ; le week-end se règle ici.
type Srv = { id: number; name: string; weekend: 'auto' | 'on' | 'off'; players: number; online: number };
type List = { viewing: { id: string; pseudo: string; server: string; server_id: number } | null; servers: Srv[] };
type P = {
  id: string;
  pseudo: string;
  coins: number;
  bot: boolean;
  mine: boolean;
  online: boolean;
  hours: number;
  pulls: number;
  best: number | null;
  friends: number;
};
type Detail = {
  id: number;
  name: string;
  weekend: Srv['weekend'];
  me: string | null;
  online: number;
  players: P[];
  log: { id: number; at: string; msg: string; pseudo: string | null }[];
};
type One = {
  id: string;
  pseudo: string;
  coins: number;
  stock: number;
  stock_max: number;
  regen_s: number;
  online: boolean;
  hours: number;
  bot: { act: number; sess: number; sell: number; buy: number } | null;
  streak: number;
  cosmetics: number;
  owned: number;
  collection: number;
  best: { jeton: string; odds: number; variant: string | null } | null;
  friends: string[];
  log: { at: string; msg: string }[];
};
const time = (t: string) =>
  new Date(t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const VAR: Record<string, string> = { gold: 'Doré', celeste: 'Céleste', ombre: 'Ombre' };

export function Sandbox() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['sandbox'], queryFn: async () => (await sandboxApi.list()) as unknown as List });
  const [sel, setSel] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const cur = sel ?? list.data?.servers[0]?.id ?? null;
  const create = async () => {
    setBusy(true);
    try {
      const id = (await sandboxApi.create(name)) as unknown as number;
      setName('');
      await qc.invalidateQueries({ queryKey: ['sandbox'] });
      setSel(id);
    } catch (e) {
      toast(errorText(e, 'fr'), true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className={s.wrap}>
      {/* les serveurs, comme des rayons : on clique pour ouvrir sa fiche */}
      <aside className={s.side}>
        <div className={s.new}>
          <input
            className={a.input}
            placeholder="Nouveau serveur"
            maxLength={40}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && name.trim() && void create()}
          />
          <Button variant="primary" size="sm" loading={busy} disabled={!name.trim()} onClick={() => void create()}>
            Créer
          </Button>
        </div>
        {list.data?.servers.map((sv) => (
          <button
            key={sv.id}
            type="button"
            className={s.srv}
            aria-pressed={sv.id === cur}
            onClick={() => setSel(sv.id)}
          >
            <b>{sv.name}</b>
            <small>
              {fmt(sv.players)} joueurs · <span className={sv.online ? s.on : ''}>{fmt(sv.online)} en ligne</span>
              {sv.weekend === 'on' ? ' · week-end' : ''}
            </small>
          </button>
        ))}
        {list.data && !list.data.servers.length ? <p className="muted">Aucun serveur.</p> : null}
      </aside>
      {cur != null ? <ServerView key={cur} id={cur} onGone={() => setSel(null)} /> : null}
    </div>
  );
}

function ServerView({ id, onGone }: { id: number; onGone: () => void }) {
  const qc = useQueryClient();
  // le serveur vit tant que sa fiche est ouverte : un passage toutes les 20 s fait jouer ses faux joueurs
  const q = useQuery({
    queryKey: ['sandbox', id],
    queryFn: async () => {
      await sandboxApi.tick(id).catch(() => undefined);
      return (await sandboxApi.detail(id)) as unknown as Detail;
    },
    refetchInterval: 20_000,
  });
  const [n, setN] = useState(10);
  const [h, setH] = useState<[number, number]>([1, 80]);
  const [busy, setBusy] = useState('');
  const [pl, setPl] = useState<string | null>(null);
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
  const enter = (f: () => Promise<unknown>, k: string) =>
    run(k, f, () => {
      qc.clear();
      location.assign('/');
    });
  const d = q.data;
  if (!d)
    return (
      <p className="muted" aria-busy>
        …
      </p>
    );
  const bots = d.players.filter((p) => p.bot);
  const top = [...d.players].sort((x, y) => y.pulls - x.pulls).slice(0, 10);
  return (
    <div className={s.main}>
      <section className={`${a.box} ${s.head}`}>
        <div>
          <h3>{d.name}</h3>
          <small className="muted">
            {fmt(d.players.length)} joueurs · {fmt(d.online)} en ligne · le serveur vit tant que cette page est ouverte
            ou que tu joues dedans
          </small>
        </div>
        <Button variant="gold" loading={busy === 'me'} onClick={() => void enter(() => sandboxApi.me(id), 'me')}>
          Jouer dans ce serveur
        </Button>
      </section>

      <section className={a.box}>
        <h3>Réglages</h3>
        <div className={s.gen}>
          <b>Événement du week-end</b>
          <Segmented<Detail['weekend']>
            value={d.weekend}
            label="Événement du week-end"
            options={[
              ['auto', 'Comme le vrai jeu'],
              ['on', 'Activé'],
              ['off', 'Coupé'],
            ]}
            onChange={(m) => void run('w', () => sandboxApi.setWeekend(id, m))}
          />
        </div>
        <div className={s.gen}>
          <b>Générer</b>
          <input
            className={a.input}
            type="number"
            min={1}
            max={50}
            value={n}
            onChange={(e) => setN(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
            style={{ width: 70 }}
            aria-label="Nombre de joueurs"
          />
          <span className="muted">joueurs, de</span>
          <input
            className={a.input}
            type="number"
            min={0}
            max={500}
            value={h[0]}
            onChange={(e) => setH([Math.max(0, Number(e.target.value) || 0), h[1]])}
            style={{ width: 70 }}
            aria-label="Heures minimum"
          />
          <span className="muted">à</span>
          <input
            className={a.input}
            type="number"
            min={0}
            max={500}
            value={h[1]}
            onChange={(e) => setH([h[0], Math.max(0, Number(e.target.value) || 0)])}
            style={{ width: 70 }}
            aria-label="Heures maximum"
          />
          <span className="muted">h de jeu</span>
          <Button
            variant="primary"
            size="sm"
            loading={busy === 'gen'}
            onClick={() => void run('gen', () => sandboxApi.generate(id, n, h[0], Math.max(h[0], h[1])))}
          >
            Générer
          </Button>
        </div>
        <div className={s.gen}>
          <Button
            size="sm"
            variant="danger"
            loading={busy === 'del'}
            onClick={() =>
              void confirm(`Supprimer « ${d.name} » et ses ${d.players.length} joueurs ?`, { danger: true }).then(
                (ok) => {
                  if (ok) void run('del', () => sandboxApi.del(id), onGone);
                },
              )
            }
          >
            Supprimer le serveur
          </Button>
        </div>
      </section>

      <div className={s.cols}>
        <section className={a.box}>
          <h3>
            Joueurs <small className="muted">({fmt(bots.length)} faux joueurs)</small>
          </h3>
          <div className={s.players}>
            {d.players.map((p) => (
              <button key={p.id} type="button" className={s.pl} aria-pressed={pl === p.id} onClick={() => setPl(p.id)}>
                <i className={p.online ? s.dotOn : s.dot} />
                <b>{p.pseudo}</b>
                {p.mine ? <em>toi</em> : null}
                <small>
                  {fmt(p.hours)} h · {fmt(p.pulls)} tirages · {fmt(p.coins)} pièces · {fmt(p.friends)} amis
                </small>
              </button>
            ))}
          </div>
          <h3>Classement du serveur</h3>
          <ol className={s.top}>
            {top.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => setPl(p.id)}>
                  {p.pseudo}
                </button>
                <span>{fmt(p.pulls)} tirages</span>
              </li>
            ))}
          </ol>
        </section>
        <section className={a.box}>
          {pl ? (
            <PlayerView key={pl} id={pl} busy={busy} run={run} enter={enter} onGone={() => setPl(null)} />
          ) : (
            <>
              <h3>Ce qui se passe</h3>
              <ul className={s.log}>
                {d.log.map((l) => (
                  <li key={l.id}>
                    <time>{time(l.at)}</time> {l.pseudo ? <b>{l.pseudo}</b> : null} {l.msg}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function PlayerView({
  id,
  busy,
  run,
  enter,
  onGone,
}: {
  id: string;
  busy: string;
  run: (k: string, f: () => Promise<unknown>, after?: () => void) => Promise<void>;
  enter: (f: () => Promise<unknown>, k: string) => Promise<void>;
  onGone: () => void;
}) {
  const q = useQuery({
    queryKey: ['sandbox-player', id],
    queryFn: async () => (await sandboxApi.player(id)) as unknown as One,
    refetchInterval: 20_000,
  });
  const [hours, setHours] = useState(20);
  const p = q.data;
  if (!p)
    return (
      <p className="muted" aria-busy>
        …
      </p>
    );
  const j = p.best ? jetonOf(p.best.jeton) : null;
  return (
    <div className={s.one}>
      <div className={s.oneHead}>
        {j ? <img className="px" src={texOf(j)} alt="" width={48} height={48} /> : null}
        <div>
          <h3>
            <i className={p.online ? s.dotOn : s.dot} /> {p.pseudo}
          </h3>
          <small className="muted">
            {p.online ? 'en ligne' : 'hors ligne'} · {fmt(p.hours)} h · série {fmt(p.streak)} j
          </small>
        </div>
        <button type="button" className={s.x} onClick={onGone} aria-label="Fermer">
          ✕
        </button>
      </div>
      <table className={a.table}>
        <tbody>
          <tr>
            <td>Pièces · tirages en stock</td>
            <td>
              {fmt(p.coins)} · {p.stock}/{p.stock_max} (recharge {p.regen_s} s)
            </td>
          </tr>
          <tr>
            <td>Jetons gardés · collection</td>
            <td>
              {fmt(p.owned)} · {p.collection} jetons différents
            </td>
          </tr>
          <tr>
            <td>Meilleur jeton</td>
            <td>
              {p.best
                ? `${p.best.jeton}${p.best.variant ? ` ${VAR[p.best.variant] ?? ''}` : ''} 1/${fmt(p.best.odds)}`
                : '—'}
            </td>
          </tr>
          <tr>
            <td>Cosmétiques · amis</td>
            <td>
              {p.cosmetics} · {p.friends.length ? p.friends.join(', ') : 'aucun'}
            </td>
          </tr>
          {p.bot ? (
            <tr>
              <td>Façon de jouer</td>
              <td>
                se connecte {Math.round(p.bot.act * 100)} % · séances de {p.bot.sess} min · revend{' '}
                {Math.round(p.bot.sell * 100)} % · achète {Math.round(p.bot.buy * 100)} %
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
      <div className={a.btns}>
        <Button
          size="sm"
          variant="primary"
          loading={busy === `v${id}`}
          onClick={() => void enter(() => sandboxApi.view(id), `v${id}`)}
        >
          Jouer en tant que
        </Button>
        <Button
          size="sm"
          loading={busy === `r${id}`}
          onClick={() => void run(`r${id}`, () => sandboxApi.randomize(id, hours))}
        >
          Nouveau profil au hasard
        </Button>
        <input
          className={a.input}
          type="number"
          min={0}
          max={500}
          value={hours}
          onChange={(e) => setHours(Math.max(0, Math.min(500, Number(e.target.value) || 0)))}
          style={{ width: 70 }}
          aria-label="Heures de jeu du nouveau profil"
        />
        <Button
          size="sm"
          variant="danger"
          loading={busy === `x${id}`}
          onClick={() =>
            void confirm(`Supprimer ${p.pseudo} ?`, { danger: true }).then((ok) => {
              if (ok) void run(`x${id}`, () => sandboxApi.remove(id), onGone);
            })
          }
        >
          Supprimer
        </Button>
      </div>
      <h4>Son journal</h4>
      <ul className={s.log}>
        {p.log.map((l, i) => (
          <li key={i}>
            <time>{time(l.at)}</time> {l.msg}
          </li>
        ))}
        {!p.log.length ? <li className="muted">Rien pour l’instant.</li> : null}
      </ul>
    </div>
  );
}
