import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi, publicApi } from '@/api';
import { hms, itemImg, itemText, type ShopItem } from '@/data/items';
import { useNow } from '@/features/eco/eco';
import { Button } from '@/ui/Button';
import { confirm } from '@/ui/confirm';
import { act, fmt } from './shared';
import s from './Admin.module.css';

type Row = ShopItem & { price: number; base_price: number; stock: number; sold: number; active: boolean };

// Boutique : prix, stock de la période en cours, en vente ou non ; tirer un nouveau stock
export function ShopAdmin() {
  const qc = useQueryClient();
  const now = useNow();
  const list = useQuery({ queryKey: ['adm-shop'], queryFn: async () => (await adminApi.shop()) as unknown as Row[] });
  const today = useQuery({
    queryKey: ['shop'],
    queryFn: async () => ({ ...((await publicApi.shopToday()) as unknown as { reset_in: number }), at: Date.now() }),
  });
  const left = today.data ? Math.max(0, today.data.reset_in - Math.round((now - today.data.at) / 1000)) : 0;
  const refresh = () =>
    Promise.all([qc.invalidateQueries({ queryKey: ['adm-shop'] }), qc.invalidateQueries({ queryKey: ['shop'] })]);
  return (
    <div className={s.stack}>
      <div className={s.row}>
        <p className="muted">
          Nouveau stock dans <b>{hms(left)}</b>
        </p>
        <Button
          size="sm"
          onClick={async () => {
            if (
              !(await confirm(
                'Tirer un nouveau stock maintenant ? (les achats de la période sont remis à zéro pour tout le monde)',
                { danger: true },
              ))
            )
              return;
            if (await act(() => adminApi.shopReroll(), 'Nouveau stock tiré')) await refresh();
          }}
        >
          🎲 Nouveau stock
        </Button>
      </div>
      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead>
            <tr>
              <th />
              <th>Objet</th>
              <th>Prix</th>
              <th>Stock (période)</th>
              <th>Vendus</th>
              <th>En vente</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {(list.data ?? []).map((it) => (
              <ShopRow key={it.id} it={it} onSaved={refresh} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ShopRow({ it, onSaved }: { it: Row; onSaved: () => Promise<unknown> }) {
  const [price, setPrice] = useState(it.price);
  const [stock, setStock] = useState(it.stock);
  const [active, setActive] = useState(it.active);
  const img = itemImg(it);
  return (
    <tr className={active ? undefined : s.off}>
      <td>
        <img
          className={`px ${s.ic}`}
          src={img.src}
          alt=""
          style={img.tint ? ({ '--df': img.tint } as React.CSSProperties) : undefined}
        />
      </td>
      <td>
        <b>{itemText(it, 'fr')[0]}</b>
        <br />
        <small className="muted">{it.id}</small>
      </td>
      <td>
        <input
          className={s.input}
          type="number"
          min={0}
          value={price}
          onChange={(e) => setPrice(Math.max(0, Math.trunc(+e.target.value)))}
          aria-label={`Prix de ${it.id}`}
        />
        <br />
        <small className="muted">
          normal : {fmt(it.base_price)}
          {it.price !== it.base_price ? ' · modifié' : ''}
        </small>
      </td>
      <td>
        <input
          className={s.input}
          type="number"
          min={0}
          value={stock}
          onChange={(e) => setStock(Math.max(0, Math.trunc(+e.target.value)))}
          aria-label={`Stock de ${it.id}`}
        />
      </td>
      <td>{it.sold}</td>
      <td>
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          aria-label={`${it.id} en vente`}
        />
      </td>
      <td>
        <Button
          size="sm"
          variant="primary"
          onClick={async () => {
            if (
              await act(
                () => adminApi.shopSet({ p_item: it.id, p_price: price, p_active: active, p_stock: stock }),
                `${it.id} mis à jour`,
              )
            )
              await onSaved();
          }}
        >
          OK
        </Button>
      </td>
    </tr>
  );
}
