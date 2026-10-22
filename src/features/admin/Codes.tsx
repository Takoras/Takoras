import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api';
import { Button } from '@/ui/Button';
import { confirm } from '@/ui/confirm';
import { toast } from '@/ui/toast';
import { useNow } from '@/features/eco/eco';
import { act, dt, fmt, itemLabel, ITEMS } from './shared';
import s from './Admin.module.css';

type Code = {
  code: string;
  coins: number;
  pulls: number;
  items: { item: string; qty: number }[];
  max_uses: number | null;
  uses: number;
  expires_at: string | null;
  active: boolean;
};
const empty = { code: '', coins: '', pulls: '', max: '', exp: '', items: [] as { item: string; qty: number }[] };
const rand = () =>
  Array.from({ length: 8 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');

// Codes promo : créer / modifier (pièces, pulls, objets, utilisations max, expiration), activer, copier, supprimer
export function Codes() {
  const qc = useQueryClient();
  const now = useNow(30_000);
  const list = useQuery({
    queryKey: ['adm-codes'],
    queryFn: async () => ((await adminApi.codes()) as unknown as Code[]) ?? [],
  });
  const [f, setF] = useState(empty);
  const [editing, setEditing] = useState(false);
  const [item, setItem] = useState(ITEMS[0]?.[0] ?? 'potion1');
  const [qty, setQty] = useState(1);
  const refresh = () => qc.invalidateQueries({ queryKey: ['adm-codes'] });
  const edit = (c: Code) => {
    setEditing(true);
    setF({
      code: c.code,
      coins: String(c.coins || ''),
      pulls: String(c.pulls || ''),
      max: String(c.max_uses || ''),
      items: [...c.items],
      exp: c.expires_at
        ? new Date(Date.parse(c.expires_at) - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
        : '',
    });
  };
  const save = async () => {
    const coins = Math.trunc(+f.coins || 0),
      pulls = Math.trunc(+f.pulls || 0);
    if (!f.code.trim()) return toast('Mets un code', true);
    if (!coins && !pulls && !f.items.length) return toast('Mets au moins une récompense', true);
    const ok = await act(
      () =>
        adminApi.codeSave({
          p_code: f.code.trim().toUpperCase(),
          p_coins: coins,
          p_pulls: pulls,
          p_items: f.items,
          p_max: Math.trunc(+f.max || 0),
          p_expires: f.exp ? new Date(f.exp).toISOString() : null,
        }),
      `Code ${f.code.trim().toUpperCase()} enregistré`,
    );
    if (ok) {
      setF(empty);
      setEditing(false);
      await refresh();
    }
  };
  return (
    <div className={s.stack}>
      <section className={s.box}>
        <h3>{editing ? `Modifier ${f.code}` : 'Nouveau code'}</h3>
        <div className={s.row}>
          <input
            className={s.input}
            value={f.code}
            disabled={editing}
            onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })}
            placeholder="CODE"
            maxLength={24}
            aria-label="Code"
          />
          {editing ? null : (
            <Button size="sm" onClick={() => setF({ ...f, code: rand() })}>
              🎲 Au hasard
            </Button>
          )}
        </div>
        <div className={s.row}>
          <input
            className={s.input}
            type="number"
            value={f.coins}
            onChange={(e) => setF({ ...f, coins: e.target.value })}
            placeholder="Pièces"
            aria-label="Pièces"
          />
          <input
            className={s.input}
            type="number"
            value={f.pulls}
            onChange={(e) => setF({ ...f, pulls: e.target.value })}
            placeholder="Pulls"
            aria-label="Pulls"
          />
          <input
            className={s.input}
            type="number"
            value={f.max}
            onChange={(e) => setF({ ...f, max: e.target.value })}
            placeholder="Utilisations max (vide = illimité)"
            aria-label="Utilisations max"
          />
          <input
            className={s.input}
            type="datetime-local"
            value={f.exp}
            onChange={(e) => setF({ ...f, exp: e.target.value })}
            aria-label="Expiration"
          />
        </div>
        <div className={s.row}>
          <select
            className={s.input}
            value={item}
            onChange={(e) => setItem(e.target.value)}
            aria-label="Objet à ajouter"
          >
            {ITEMS.map(([id, l]) => (
              <option key={id} value={id}>
                {l}
              </option>
            ))}
          </select>
          <input
            className={s.input}
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(Math.max(1, Math.trunc(+e.target.value || 1)))}
            aria-label="Quantité"
          />
          <Button
            size="sm"
            onClick={() => {
              const ex = f.items.find((x) => x.item === item);
              setF({
                ...f,
                items: ex
                  ? f.items.map((x) => (x.item === item ? { ...x, qty: x.qty + qty } : x))
                  : [...f.items, { item, qty }],
              });
            }}
          >
            + Ajouter l’objet
          </Button>
        </div>
        <div className={s.quick}>
          {f.items.map((x, i) => (
            <span key={x.item} className={s.tag}>
              {itemLabel(x.item)} ×{x.qty}{' '}
              <button
                type="button"
                aria-label="Retirer l’objet"
                onClick={() => setF({ ...f, items: f.items.filter((_, k) => k !== i) })}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
        <div className={s.row}>
          <Button variant="primary" size="sm" onClick={() => void save()}>
            Enregistrer
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setF(empty);
              setEditing(false);
            }}
          >
            Nouveau
          </Button>
        </div>
      </section>
      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead>
            <tr>
              <th>Code</th>
              <th>Récompense</th>
              <th>Utilisé</th>
              <th>Expire</th>
              <th>Actif</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {(list.data ?? []).map((c) => {
              const expired = !!c.expires_at && Date.parse(c.expires_at) < now,
                gone = expired || (!!c.max_uses && c.uses >= c.max_uses);
              const rew =
                [
                  c.coins ? `${fmt(c.coins)} pièces` : '',
                  c.pulls ? `${c.pulls} pulls` : '',
                  ...c.items.map((x) => itemLabel(x.item) + (x.qty > 1 ? ` ×${x.qty}` : '')),
                ]
                  .filter(Boolean)
                  .join(' · ') || '—';
              return (
                <tr key={c.code} className={!c.active || gone ? s.off : undefined}>
                  <td>
                    <b className={s.code}>{c.code}</b>
                  </td>
                  <td>{rew}</td>
                  <td>
                    {c.uses}
                    {c.max_uses ? `/${c.max_uses}` : ''}
                  </td>
                  <td>{c.expires_at ? `${dt(c.expires_at)}${expired ? ' (expiré)' : ''}` : '—'}</td>
                  <td>
                    <input
                      type="checkbox"
                      checked={c.active}
                      aria-label={`${c.code} actif`}
                      onChange={async (e) => {
                        if (
                          await act(
                            () => adminApi.codeToggle(c.code, e.target.checked),
                            `${c.code} ${e.target.checked ? 'activé' : 'désactivé'}`,
                          )
                        )
                          await refresh();
                      }}
                    />
                  </td>
                  <td className={s.btns}>
                    <Button
                      size="sm"
                      aria-label={`Copier ${c.code}`}
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(c.code);
                          toast('Code copié');
                        } catch {
                          toast(c.code);
                        }
                      }}
                    >
                      📋
                    </Button>
                    <Button size="sm" aria-label={`Modifier ${c.code}`} onClick={() => edit(c)}>
                      ✏️
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      aria-label={`Supprimer ${c.code}`}
                      onClick={async () => {
                        if (!(await confirm(`Supprimer le code ${c.code} ?`, { danger: true }))) return;
                        if (await act(() => adminApi.codeDelete(c.code), 'Code supprimé')) await refresh();
                      }}
                    >
                      🗑
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {list.data && !list.data.length ? <p className="muted">Aucun code pour l’instant</p> : null}
      </div>
    </div>
  );
}
