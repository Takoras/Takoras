import { useEffect, useState, type CSSProperties } from 'react';
import { Link } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api';
import { BANNER_IMG } from '@/data/items';
import { hexRGB, jetonOf, SERIES, texOf } from '@/data/jetons';
import { useJn } from '@/lib/names';
import { locale } from '@/lib/settings';
import { Button } from '@/ui/Button';
import { confirm } from '@/ui/confirm';
import { useNow } from '@/features/eco/eco';
import { act, day, dt, fmt, ITEMS } from './shared';
import s from './Admin.module.css';

type Row = {
  id: string;
  pseudo: string | null;
  coins: number;
  stock: number;
  stock_max: number;
  pulls: number;
  best_odds: number;
  created_at: string;
  banned: boolean;
};
type Player = {
  pseudo: string | null;
  is_admin: boolean;
  email: string | null;
  created_at: string;
  coins: number;
  stock: number;
  stock_max: number;
  potions: { m: number; n: number }[] | null;
  luck: number;
  fast_until: string | null;
  banner: string | null;
  banned: boolean;
  tester: boolean;
  items: { item: string; qty: number }[];
  recent: { jeton: string; odds: number; at: string; sold: boolean }[];
};
type Inv = { id: number; jeton: string; odds: number; locked: boolean; showcased: boolean };
const COLS: [keyof Row, string][] = [
  ['pseudo', 'Pseudo'],
  ['coins', 'Pièces'],
  ['stock', 'Pulls'],
  ['pulls', 'Tirages'],
  ['best_odds', 'Meilleur'],
  ['created_at', 'Inscrit'],
];

// Joueurs : tableau triable + recherche, et la fiche du joueur choisi
export function Players() {
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [sort, setSort] = useState<{ k: keyof Row; d: 1 | -1 }>({ k: 'created_at', d: -1 });
  const [sel, setSel] = useState<string | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);
  const list = useQuery({
    queryKey: ['adm-players', debounced],
    queryFn: async () => (await adminApi.players(debounced)) as Row[],
  });
  const rows = [...(list.data ?? [])].sort((a, b) => {
    const x = a[sort.k] ?? 0,
      y = b[sort.k] ?? 0;
    return (x > y ? 1 : x < y ? -1 : 0) * sort.d;
  });
  return (
    <div className={s.split}>
      <div className={s.listCol}>
        <input
          className={s.input}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Chercher un pseudo…"
          aria-label="Chercher un joueur"
        />
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                {COLS.map(([k, l]) => (
                  <th key={k} aria-sort={sort.k === k ? (sort.d > 0 ? 'ascending' : 'descending') : 'none'}>
                    <button type="button" onClick={() => setSort({ k, d: sort.k === k ? (-sort.d as 1 | -1) : -1 })}>
                      {l}
                      {sort.k === k ? (sort.d > 0 ? ' ▲' : ' ▼') : ''}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className={sel === p.id ? s.on : undefined} onClick={() => setSel(p.id)}>
                  <td>
                    <button type="button" className={s.rowBtn} onClick={() => setSel(p.id)}>
                      {p.pseudo || '(sans pseudo)'}
                    </button>
                    {p.banned ? ' ⛔' : ''}
                  </td>
                  <td>{fmt(p.coins)}</td>
                  <td>
                    {p.stock}/{p.stock_max}
                  </td>
                  <td>{fmt(p.pulls)}</td>
                  <td>{p.best_odds ? `1/${fmt(p.best_odds)}` : '—'}</td>
                  <td>{day(p.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.data && !rows.length ? <p className="muted">Aucun joueur</p> : null}
        </div>
      </div>
      <div className={s.detailCol}>
        {sel ? <PlayerCard id={sel} /> : <p className="muted">Choisis un joueur dans la liste.</p>}
      </div>
    </div>
  );
}

function PlayerCard({ id }: { id: string }) {
  const p = useQuery({
    queryKey: ['adm-player', id],
    queryFn: async () => (await adminApi.player(id)) as unknown as Player,
  });
  const P = p.data;
  if (!P)
    return (
      <p className="muted" aria-busy>
        …
      </p>
    );
  // recréé quand les données du joueur changent : les champs repartent des bonnes valeurs
  return <PlayerBody key={`${id}|${P.pseudo}|${JSON.stringify(P.items)}`} id={id} P={P} />;
}

function PlayerBody({ id, P }: { id: string; P: Player }) {
  const jn = useJn();
  const qc = useQueryClient();
  const now = useNow(60_000);
  const inv = useQuery({ queryKey: ['adm-inv', id], queryFn: async () => (await adminApi.inventory(id)) as Inv[] });
  const [coins, setCoins] = useState('');
  const [pulls, setPulls] = useState('');
  const [pseudo, setPseudo] = useState(P.pseudo ?? '');
  const [qty, setQty] = useState<Record<string, number>>(() => Object.fromEntries(P.items.map((x) => [x.item, x.qty])));
  const [msgs, setMsgs] = useState<
    { id: number; created_at: string; from_pseudo: string; to_pseudo: string; body: string }[] | null
  >(null);
  const name = P.pseudo || 'ce joueur';
  const after = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['adm-player', id] }),
      qc.invalidateQueries({ queryKey: ['adm-inv', id] }),
      qc.invalidateQueries({ queryKey: ['adm-players'] }),
      qc.invalidateQueries({ queryKey: ['me'] }),
    ]);
  };
  const give = async (c: number, pl: number) => {
    if (
      await act(
        () => adminApi.give(id, c, pl),
        `${name} : ${c ? `${c > 0 ? '+' : ''}${fmt(c)} pièces ` : ''}${pl ? `${pl > 0 ? '+' : ''}${pl} pulls` : ''}`,
      )
    )
      await after();
  };
  const fast = P.fast_until && Date.parse(P.fast_until) > now;
  // collection regroupée par jeton
  const groups = Object.values(
    (inv.data ?? []).reduce<Record<string, { jeton: string; odds: number; all: Inv[]; locked: number; sc: number }>>(
      (g, x) => {
        const e = (g[x.jeton] ??= { jeton: x.jeton, odds: x.odds, all: [], locked: 0, sc: 0 });
        e.all.push(x);
        if (x.locked) e.locked++;
        if (x.showcased) e.sc++;
        return g;
      },
      {},
    ),
  ).sort((a, b) => b.odds - a.odds);
  const collOp = async (g: (typeof groups)[number], op: 'rm1' | 'rmall' | 'lock' | 'unlock') => {
    if (op === 'rmall' && !(await confirm(`Retirer les ${g.all.length} ${jn(g.jeton)} de ${name} ?`, { danger: true })))
      return;
    const pick =
      op === 'rm1' ? [[...g.all].sort((a, b) => +a.locked + +a.showcased - (+b.locked + +b.showcased))[0]] : g.all;
    const ids = pick.filter((x): x is Inv => !!x).map((x) => x.id);
    const ok =
      op === 'rm1' || op === 'rmall'
        ? await act(
            () => adminApi.removePulls(id, ids),
            `${jn(g.jeton)} : ${op === 'rm1' ? '1 retiré' : 'tout retiré'}`,
          )
        : await act(
            () => adminApi.lockPulls(id, ids, op === 'lock'),
            `${jn(g.jeton)} : ${op === 'lock' ? 'verrouillé' : 'déverrouillé'}`,
          );
    if (ok) await after();
  };
  return (
    <div className={s.card}>
      <div className={s.banner}>
        {P.banner && BANNER_IMG[P.banner] ? <img className="px" src={BANNER_IMG[P.banner]} alt="" /> : null}
      </div>
      <div className={s.who}>
        <div>
          <h2>
            {P.pseudo || '(sans pseudo)'} {P.is_admin ? <span className={s.tag}>admin</span> : null}
            {P.tester ? <span className={s.tag}>testeur</span> : null}
            {P.banned ? <span className={`${s.tag} ${s.red}`}>⛔ banni</span> : null}
          </h2>
          <small className="muted">
            {P.email ?? ''} · inscrit le {day(P.created_at)}
          </small>
        </div>
        {P.pseudo ? (
          <Link className={s.link} to={`/profil/${encodeURIComponent(P.pseudo)}`}>
            Voir le profil
          </Link>
        ) : null}
      </div>
      <dl className={s.mini}>
        <div>
          <dt>pièces</dt>
          <dd>{fmt(P.coins)}</dd>
        </div>
        <div>
          <dt>pulls</dt>
          <dd>
            {P.stock}/{P.stock_max}
          </dd>
        </div>
        <div>
          <dt>potions</dt>
          <dd>
            {P.potions?.length
              ? `×${Number(P.luck).toFixed(1)} · ${P.potions.map((x) => `×${x.m}(${x.n})`).join(' ')}`
              : '—'}
          </dd>
        </div>
        <div>
          <dt>sablier jusqu’à</dt>
          <dd>
            {fast && P.fast_until
              ? new Date(P.fast_until).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' })
              : '—'}
          </dd>
        </div>
      </dl>

      <section className={s.box}>
        <h3>
          Pièces et pulls <small className="muted">(nombre négatif pour retirer)</small>
        </h3>
        <form
          className={s.row}
          onSubmit={(e) => {
            e.preventDefault();
            const c = Math.trunc(+coins || 0),
              pl = Math.trunc(+pulls || 0);
            if (c || pl) void give(c, pl);
          }}
        >
          <input
            className={s.input}
            type="number"
            value={coins}
            onChange={(e) => setCoins(e.target.value)}
            placeholder="Pièces"
            aria-label="Pièces"
          />
          <input
            className={s.input}
            type="number"
            value={pulls}
            onChange={(e) => setPulls(e.target.value)}
            placeholder="Pulls"
            aria-label="Pulls"
          />
          <Button type="submit" variant="primary" size="sm">
            Donner
          </Button>
        </form>
        <div className={s.quick}>
          {[1000, 10000, 100000].map((c) => (
            <Button key={c} size="sm" onClick={() => void give(c, 0)}>
              +{fmt(c)}
            </Button>
          ))}
          {[5, 10].map((n) => (
            <Button key={n} size="sm" onClick={() => void give(0, n)}>
              +{n} pulls
            </Button>
          ))}
        </div>
      </section>

      <section className={s.box}>
        <h3>Donner un jeton</h3>
        <div className={s.jetons}>
          {(SERIES.Takoras ?? []).map((j) => (
            <button
              key={j.name}
              type="button"
              style={{ '--g': hexRGB(j.glow) } as CSSProperties}
              title={`${jn(j.name)} · 1/${fmt(j.odds)}`}
              onClick={async () => {
                if (await act(() => adminApi.giveJeton(id, j.name), `${jn(j.name)} donné à ${name}`)) await after();
              }}
            >
              <img className="px" src={texOf(j)} alt="" />
              <small>{jn(j.name)}</small>
            </button>
          ))}
        </div>
      </section>

      <section className={s.box}>
        <h3>Donner un objet</h3>
        <div className={s.quick}>
          {ITEMS.map(([it, l]) => (
            <Button
              key={it}
              size="sm"
              onClick={async () => {
                if (await act(() => adminApi.giveItem(id, it), `${l} donné à ${name}`)) await after();
              }}
            >
              {l}
            </Button>
          ))}
        </div>
      </section>

      <section className={`${s.box} ${s.mod}`}>
        <h3>Modération</h3>
        <form
          className={s.row}
          onSubmit={async (e) => {
            e.preventDefault();
            if (await act(() => adminApi.setPseudo(id, pseudo.trim()), `Renommé en ${pseudo.trim()}`)) await after();
          }}
        >
          <input
            className={s.input}
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value)}
            maxLength={16}
            aria-label="Nouveau pseudo"
          />
          <Button type="submit" size="sm">
            Renommer
          </Button>
        </form>
        <div className={s.quick}>
          {P.is_admin ? null : (
            <Button
              size="sm"
              variant={P.banned ? 'ghost' : 'danger'}
              onClick={async () => {
                const ban = !P.banned;
                if (
                  ban &&
                  !(await confirm(`Bannir ${name} ? Il ne pourra plus ouvrir, acheter, vendre ni écrire.`, {
                    danger: true,
                  }))
                )
                  return;
                if (await act(() => adminApi.ban(id, ban), `${name} ${ban ? 'banni' : 'débanni'}`)) await after();
              }}
            >
              {P.banned ? '✅ Débannir' : '⛔ Bannir'}
            </Button>
          )}
          <Button
            size="sm"
            onClick={async () => {
              if (
                await act(
                  () => adminApi.setTester(id, !P.tester),
                  `${name} ${P.tester ? 'n’est plus testeur' : 'est maintenant testeur'}`,
                )
              )
                await after();
            }}
          >
            {P.tester ? '🧪 Retirer testeur' : '🧪 Rendre testeur'}
          </Button>
          <Button
            size="sm"
            onClick={async () => {
              if (!(await confirm(`Vider la vitrine et la bio de ${name} ?`, { danger: true }))) return;
              if (await act(() => adminApi.clearShowcase(id), 'Vitrine et bio vidées')) await after();
            }}
          >
            🧹 Vider vitrine + bio
          </Button>
          <Button size="sm" onClick={async () => setMsgs((await adminApi.messages(id)) as typeof msgs)}>
            💬 Voir ses messages
          </Button>
        </div>
        {msgs ? (
          <ul className={s.msgs}>
            {msgs.map((m) => (
              <li key={m.id}>
                <small className="muted">{dt(m.created_at)}</small>
                <b>
                  {m.from_pseudo || '?'} → {m.to_pseudo || '?'}
                </b>
                <p>{m.body}</p>
                <Button
                  size="sm"
                  variant="danger"
                  aria-label="Supprimer le message"
                  onClick={async () => {
                    if (!(await confirm('Supprimer ce message ?', { danger: true }))) return;
                    if (await act(() => adminApi.deleteMessage(m.id), 'Message supprimé'))
                      setMsgs(msgs.filter((x) => x.id !== m.id));
                  }}
                >
                  🗑
                </Button>
              </li>
            ))}
            {msgs.length ? null : <li className="muted">Aucun message</li>}
          </ul>
        ) : null}
      </section>

      <section className={s.box}>
        <h3>
          Collection <small className="muted">(🔒 verrouillés · 📌 en vitrine)</small>
        </h3>
        <ul className={s.coll}>
          {groups.map((g) => (
            <li key={g.jeton}>
              <img className="px" src={texOf(jetonOf(g.jeton))} alt="" />
              <span>
                <b>{jn(g.jeton)}</b> <small className="muted">1/{fmt(g.odds)}</small>
              </span>
              <span className={s.cn}>
                ×{g.all.length}
                {g.locked ? ` · 🔒${g.locked}` : ''}
                {g.sc ? ` · 📌${g.sc}` : ''}
              </span>
              <Button size="sm" onClick={() => void collOp(g, 'rm1')} aria-label={`Retirer 1 ${jn(g.jeton)}`}>
                −1
              </Button>
              <Button size="sm" variant="danger" onClick={() => void collOp(g, 'rmall')}>
                Tout retirer
              </Button>
              <Button
                size="sm"
                onClick={() => void collOp(g, g.locked === g.all.length ? 'unlock' : 'lock')}
                aria-label={g.locked === g.all.length ? 'Déverrouiller' : 'Verrouiller'}
              >
                {g.locked === g.all.length ? '🔓' : '🔒'}
              </Button>
            </li>
          ))}
          {inv.data && !groups.length ? <li className="muted">Aucun jeton</li> : null}
        </ul>
      </section>

      <section className={s.box}>
        <h3>Objets</h3>
        <div className={s.items}>
          {ITEMS.filter(([it]) => !it.startsWith('b_')).map(([it, l]) => (
            <label key={it}>
              {l}
              <input
                className={s.input}
                type="number"
                min={0}
                value={qty[it] ?? 0}
                onChange={(e) => setQty({ ...qty, [it]: Math.max(0, Math.trunc(+e.target.value || 0)) })}
              />
            </label>
          ))}
        </div>
        <div className={s.quick}>
          <Button
            size="sm"
            variant="primary"
            onClick={async () => {
              for (const [it] of ITEMS.filter(([x]) => !x.startsWith('b_')))
                if (!(await act(() => adminApi.setItems(id, it, qty[it] ?? 0), ''))) return;
              await act(async () => undefined, 'Objets enregistrés');
              await after();
            }}
          >
            Enregistrer les quantités
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={async () => {
              if (!(await confirm(`Vider tous les objets de ${name} ?`, { danger: true }))) return;
              for (const [it] of ITEMS.filter(([x]) => !x.startsWith('b_')))
                if (!(await act(() => adminApi.setItems(id, it, 0), ''))) return;
              await act(async () => undefined, 'Objets vidés');
              await after();
            }}
          >
            Vider tous ses objets
          </Button>
        </div>
      </section>

      <section className={s.box}>
        <h3>Derniers tirages</h3>
        <ul className={s.recent}>
          {P.recent.map((r, i) => (
            <li key={i}>
              <span>
                {jn(r.jeton)} <small className="muted">1/{fmt(r.odds)}</small>
              </span>
              <small className="muted">
                {dt(r.at)}
                {r.sold ? ' · vendu' : ''}
              </small>
            </li>
          ))}
          {P.recent.length ? null : <li className="muted">Aucun</li>}
        </ul>
      </section>

      <Button
        variant="danger"
        block
        onClick={async () => {
          if (!(await confirm(`Remettre ${name} à zéro ? (tirages, pièces, stock, effets effacés)`, { danger: true })))
            return;
          if (await act(() => adminApi.reset(id), `${name} remis à zéro`)) await after();
        }}
      >
        Remettre {name} à zéro
      </Button>
    </div>
  );
}
