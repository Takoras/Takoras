import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { errorText, sandboxApi } from '@/api';
import { jetonOf, texOf } from '@/data/jetons';
import { Button } from '@/ui/Button';
import { confirm } from '@/ui/confirm';
import { Modal } from '@/ui/Modal';
import { Segmented } from '@/ui/Segmented';
import { toast } from '@/ui/toast';
import { fmt } from './shared';
import a from './Admin.module.css';
import s from './Sandbox.module.css';

// Test serveur (modos) : des « autres Takoras » pour tout tester. Chaque serveur est un monde à part (classements,
// joueurs en ligne, direct, amis) rempli de faux joueurs réalistes qui jouent vraiment tant que quelqu'un regarde le
// serveur ou joue dedans (connexion, tirages, revente, potions, bonus du jour). « Jouer dans ce serveur » ouvre ton
// compte du serveur (plein de pièces, tout débloqué) ; les événements se règlent sur la fiche du serveur.
type Mode = 'auto' | 'on' | 'off';
type Srv = { id: number; name: string; weekend: Mode; players: number; online: number };
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
  weekend: Mode;
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
// le week-end « comme le vrai jeu » : du vendredi 12 h au dimanche minuit (heure de Paris)
const realWeekend = () => {
  const p = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris',
    weekday: 'short',
    hour: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const wd = p.find((x) => x.type === 'weekday')?.value,
    h = Number(p.find((x) => x.type === 'hour')?.value);
  return wd === 'Sat' || wd === 'Sun' || (wd === 'Fri' && h >= 12);
};
// journal : à quel filtre appartient une ligne
const kindOf = (m: string) =>
  /1\/\d/.test(m) ? 'rare' : /connecte/.test(m) ? 'co' : /revend|achète|bonus|pièces/.test(m) ? 'eco' : 'other';

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
            </small>
            {sv.weekend === 'on' || (sv.weekend === 'auto' && realWeekend()) ? (
              <em className={s.tag}>Week-end</em>
            ) : null}
          </button>
        ))}
        {list.data && !list.data.servers.length ? <p className="muted">Aucun serveur.</p> : null}
      </aside>
      {cur != null ? <ServerView key={cur} id={cur} onGone={() => setSel(null)} /> : null}
    </div>
  );
}

type SortK = 'online' | 'pseudo' | 'hours' | 'pulls' | 'coins' | 'best' | 'friends';
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
  const [prog, setProg] = useState<[number, number] | null>(null);
  const [pl, setPl] = useState<string | null>(null);
  const [sort, setSort] = useState<[SortK, 1 | -1]>(['online', -1]);
  const [find, setFind] = useState('');
  const [lf, setLf] = useState<'all' | 'rare' | 'co' | 'eco'>('all');
  const refresh = () => qc.invalidateQueries({ queryKey: ['sandbox'] });
  const run = async (k: string, f: () => Promise<unknown>, after?: () => void) => {
    setBusy(k);
    try {
      await f();
      await refresh();
      after?.();
    } catch (e) {
      toast(errorText(e, 'fr'), true);
    } finally {
      setBusy('');
    }
  };
  // génération par lots de 10 (chaque lot prend environ une seconde) : on voit la progression
  const generate = async () => {
    setBusy('gen');
    let done = 0;
    try {
      while (done < n) {
        setProg([done, n]);
        const k = Math.min(10, n - done);
        await sandboxApi.generate(id, k, h[0], Math.max(h[0], h[1]));
        done += k;
        await refresh();
      }
      toast(`${n} joueurs générés`);
    } catch (e) {
      toast(errorText(e, 'fr'), true);
    } finally {
      setProg(null);
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
  const weekendNow = d.weekend === 'on' || (d.weekend === 'auto' && realWeekend());
  const tot = d.players.reduce(
    (x, p) => ({ pulls: x.pulls + p.pulls, coins: x.coins + p.coins, best: Math.max(x.best, p.best ?? 0) }),
    {
      pulls: 0,
      coins: 0,
      best: 0,
    },
  );
  const [sk, sd] = sort;
  const val = (p: P): number | string =>
    sk === 'pseudo' ? p.pseudo.toLowerCase() : sk === 'online' ? Number(p.online) : (p[sk] ?? 0);
  const rows = d.players
    .filter((p) => !find || p.pseudo.toLowerCase().includes(find.toLowerCase()))
    .sort((x, y) => (val(x) > val(y) ? sd : val(x) < val(y) ? -sd : 0));
  const th = (k: SortK, label: string) => (
    <th>
      <button
        type="button"
        className={s.sortBtn}
        aria-pressed={sk === k}
        onClick={() => setSort([k, sk === k ? (sd === 1 ? -1 : 1) : -1])}
      >
        {label} {sk === k ? (sd === 1 ? '↑' : '↓') : ''}
      </button>
    </th>
  );
  const log = d.log.filter((l) => lf === 'all' || kindOf(l.msg) === lf);
  return (
    <div className={s.main}>
      <section className={`${a.box} ${s.head}`}>
        <div>
          <h3>{d.name}</h3>
          <small className="muted">vit tant que cette fiche est ouverte ou que tu joues dedans</small>
        </div>
        <Button variant="gold" loading={busy === 'me'} onClick={() => void enter(() => sandboxApi.me(id), 'me')}>
          Jouer dans ce serveur
        </Button>
      </section>

      {/* chiffres clés */}
      <div className={s.stats}>
        {(
          [
            ['Joueurs', fmt(d.players.length)],
            ['En ligne', fmt(d.online)],
            ['Tirages', fmt(tot.pulls)],
            ['Pièces', fmt(tot.coins)],
            ['Meilleur jeton', tot.best ? `1/${fmt(tot.best)}` : '—'],
          ] as const
        ).map(([k, v]) => (
          <div key={k} className={s.stat}>
            <small>{k}</small>
            <b className={k === 'En ligne' && d.online ? s.on : undefined}>{v}</b>
          </div>
        ))}
      </div>

      <div className={s.cols}>
        {/* événements du serveur */}
        <section className={a.box}>
          <h3>Événements</h3>
          <div className={`${s.event} ${weekendNow ? s.eventOn : ''}`}>
            <img className="px" src="/img/potions/luck-50.png" alt="" />
            <div>
              <b>Week-end boosté</b>
              <span className={weekendNow ? s.pillOn : s.pill}>{weekendNow ? 'Actif maintenant' : 'Inactif'}</span>
              <ul>
                <li>Revente ×1,2</li>
                <li>Recharge 25 % plus rapide</li>
                <li>Mutations ×2</li>
              </ul>
              <Segmented<Mode>
                value={d.weekend}
                label="Week-end boosté"
                options={[
                  ['auto', 'Comme le vrai jeu'],
                  ['on', 'Toujours actif'],
                  ['off', 'Coupé'],
                ]}
                onChange={(m) =>
                  void run(
                    'w',
                    () => sandboxApi.setWeekend(id, m),
                    () =>
                      toast(
                        m === 'on'
                          ? 'Week-end activé sur ce serveur'
                          : m === 'off'
                            ? 'Week-end coupé sur ce serveur'
                            : 'Week-end comme le vrai jeu',
                      ),
                  )
                }
              />
              <small className="muted">
                {d.weekend === 'auto'
                  ? 'Du vendredi 12 h au dimanche minuit.'
                  : 'Les joueurs du serveur le voient tout de suite.'}
              </small>
            </div>
          </div>
        </section>

        {/* générer des joueurs */}
        <section className={a.box}>
          <h3>Ajouter des joueurs</h3>
          <div className={s.gen}>
            <input
              className={a.input}
              type="number"
              min={1}
              max={200}
              value={n}
              onChange={(e) => setN(Math.max(1, Math.min(200, Number(e.target.value) || 1)))}
              aria-label="Nombre de joueurs"
            />
            <span className="muted">joueurs, entre</span>
            <input
              className={a.input}
              type="number"
              min={0}
              max={500}
              value={h[0]}
              onChange={(e) => setH([Math.max(0, Number(e.target.value) || 0), h[1]])}
              aria-label="Heures minimum"
            />
            <span className="muted">et</span>
            <input
              className={a.input}
              type="number"
              min={0}
              max={500}
              value={h[1]}
              onChange={(e) => setH([h[0], Math.max(0, Number(e.target.value) || 0)])}
              aria-label="Heures maximum"
            />
            <span className="muted">h de jeu</span>
          </div>
          <div className={s.gen}>
            <Button variant="primary" size="sm" loading={busy === 'gen'} onClick={() => void generate()}>
              Générer
            </Button>
            {prog ? (
              <span className={s.prog}>
                <i style={{ width: `${(prog[0] / prog[1]) * 100}%` }} />
              </span>
            ) : null}
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
      </div>

      <div className={s.cols}>
        {/* joueurs, triables */}
        <section className={a.box}>
          <div className={s.boxHead}>
            <h3>Joueurs</h3>
            <input className={a.input} placeholder="Chercher" value={find} onChange={(e) => setFind(e.target.value)} />
          </div>
          <div className={s.tableWrap}>
            <table className={`${a.table} ${s.ptable}`}>
              <thead>
                <tr>
                  {th('online', '')}
                  {th('pseudo', 'Joueur')}
                  {th('hours', 'Heures')}
                  {th('pulls', 'Tirages')}
                  {th('coins', 'Pièces')}
                  {th('best', 'Meilleur')}
                  {th('friends', 'Amis')}
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className={s.prow} onClick={() => setPl(p.id)}>
                    <td>
                      <i className={p.online ? s.dotOn : s.dot} />
                    </td>
                    <td>
                      <b>{p.pseudo}</b> {p.mine ? <em className={s.tag}>toi</em> : null}
                    </td>
                    <td>{fmt(p.hours)}</td>
                    <td>{fmt(p.pulls)}</td>
                    <td>{fmt(p.coins)}</td>
                    <td>{p.best ? `1/${fmt(p.best)}` : '—'}</td>
                    <td>{fmt(p.friends)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ce qui se passe */}
        <section className={a.box}>
          <div className={s.boxHead}>
            <h3>Ce qui se passe</h3>
            <Segmented<typeof lf>
              value={lf}
              label="Filtre du journal"
              options={[
                ['all', 'Tout'],
                ['rare', 'Jetons rares'],
                ['co', 'Connexions'],
                ['eco', 'Pièces'],
              ]}
              onChange={setLf}
            />
          </div>
          <ul className={s.log}>
            {log.map((l) => (
              <li key={l.id}>
                <time>{time(l.at)}</time> {l.pseudo ? <b>{l.pseudo}</b> : null} {l.msg}
              </li>
            ))}
            {!log.length ? <li className="muted">Rien pour l’instant.</li> : null}
          </ul>
        </section>
      </div>

      <Modal open={!!pl} onClose={() => setPl(null)} wide title="Joueur">
        {pl ? <PlayerView key={pl} id={pl} busy={busy} run={run} enter={enter} onGone={() => setPl(null)} /> : null}
      </Modal>
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
  const tiles = [
    ['Pièces', fmt(p.coins)],
    ['Tirages en stock', `${p.stock} / ${p.stock_max}`],
    ['Recharge', `${p.regen_s} s`],
    ['Jetons gardés', fmt(p.owned)],
    ['Collection', `${p.collection} jetons`],
    ['Cosmétiques', fmt(p.cosmetics)],
    ['Heures', fmt(p.hours)],
    ['Série du jour', `${p.streak} j`],
  ] as const;
  return (
    <div className={s.one}>
      <div className={s.oneHead}>
        {j ? <img className="px" src={texOf(j)} alt="" width={64} height={64} /> : null}
        <div>
          <h3>
            <i className={p.online ? s.dotOn : s.dot} /> {p.pseudo}
          </h3>
          <small className="muted">
            {p.online ? 'en ligne' : 'hors ligne'}
            {p.best
              ? ` · meilleur : ${p.best.jeton}${p.best.variant ? ` ${VAR[p.best.variant] ?? ''}` : ''} 1/${fmt(p.best.odds)}`
              : ''}
          </small>
        </div>
      </div>
      <div className={s.tiles}>
        {tiles.map(([k, v]) => (
          <div key={k} className={s.stat}>
            <small>{k}</small>
            <b>{v}</b>
          </div>
        ))}
      </div>
      {p.bot ? (
        <div className={s.chips}>
          <span>se connecte {Math.round(p.bot.act * 100)} %</span>
          <span>séances de {p.bot.sess} min</span>
          <span>revend {Math.round(p.bot.sell * 100)} %</span>
          <span>achète {Math.round(p.bot.buy * 100)} %</span>
        </div>
      ) : null}
      <div className={s.chips}>
        {p.friends.length ? p.friends.map((f) => <span key={f}>{f}</span>) : <span className="muted">aucun ami</span>}
      </div>
      <div className={s.gen}>
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
          Nouveau profil
        </Button>
        <input
          className={a.input}
          type="number"
          min={0}
          max={500}
          value={hours}
          onChange={(e) => setHours(Math.max(0, Math.min(500, Number(e.target.value) || 0)))}
          aria-label="Heures de jeu du nouveau profil"
        />
        <span className="muted">h</span>
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
