import { useState, type CSSProperties } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi, publicApi } from '@/api';
import { hms, itemImg, itemText, type ShopItem } from '@/data/items';
import { useNow } from '@/features/eco/eco';
import { Button } from '@/ui/Button';
import { confirm } from '@/ui/confirm';
import { CosmeticPreview, isCosmetic } from '@/ui/Cosmetics';
import { act, fmt } from './shared';
import s from './ShopAdmin.module.css';

type Row = ShopItem & {
  price: number;
  base_price: number;
  period_price?: number;
  stock: number;
  sold: number;
  active: boolean;
  featured?: boolean;
  off?: number | null;
  forced?: boolean;
  pass_only?: boolean;
};

// Boutique (admin) : une carte par objet, tout s'enregistre tout seul.
// En vente (interrupteur), stock de la période (− / +), prix avec réductions rapides, objet à la une.
const CATS: [string, string, (r: Row) => boolean][] = [
  ['all', 'Tout', () => true],
  ['potion', '🧪 Potions', (r) => r.kind === 'potion'],
  ['bonus', '⏳ Bonus', (r) => r.kind === 'instant' || r.kind === 'hourglass'],
  ['cosm', '✨ Cosmétiques', (r) => isCosmetic(r.kind)],
  ['look', '🖼️ Photos & bannières', (r) => r.kind === 'avatar' || r.kind === 'banner'],
];
const OFFS = [10, 25, 50, 75];

export function ShopAdmin() {
  const qc = useQueryClient();
  const now = useNow();
  const [cat, setCat] = useState('all');
  const [onlyOn, setOnlyOn] = useState(false);
  const list = useQuery({ queryKey: ['adm-shop'], queryFn: async () => (await adminApi.shop()) as unknown as Row[] });
  const today = useQuery({
    queryKey: ['shop'],
    queryFn: async () => ({ ...((await publicApi.shopToday()) as unknown as { reset_in: number }), at: Date.now() }),
  });
  const left = today.data ? Math.max(0, today.data.reset_in - Math.round((now - today.data.at) / 1000)) : 0;
  const refresh = () =>
    Promise.all([qc.invalidateQueries({ queryKey: ['adm-shop'] }), qc.invalidateQueries({ queryKey: ['shop'] })]);
  const rows = list.data ?? [];
  const f = CATS.find(([k]) => k === cat)?.[2] ?? (() => true);
  const shown = rows.filter((r) => f(r) && (!onlyOn || (r.active && r.stock > 0)));
  const feat = rows.find((r) => r.featured);
  const onSale = rows.filter((r) => r.active && r.stock > 0).length;

  const feature = async (id: string | null, pct?: number) => {
    if (await act(() => adminApi.shopFeature(id, pct ?? 30), '')) await refresh();
  };

  return (
    <div className={s.page}>
      {/* le haut : période, stock du jour, objet à la une */}
      <div className={s.top}>
        <div className={s.box}>
          <small>Nouveau stock dans</small>
          <b className={s.big}>{hms(left)}</b>
          <span className="muted">{onSale} objets en vente aujourd’hui</span>
          <Button
            size="sm"
            onClick={async () => {
              if (
                !(await confirm(
                  'Tirer un nouveau stock maintenant ? Les réglages de stock et de prix de la période sont effacés et les achats remis à zéro pour tout le monde.',
                  { danger: true },
                ))
              )
                return;
              if (await act(() => adminApi.shopReroll(), '')) await refresh();
            }}
          >
            🎲 Nouveau stock
          </Button>
        </div>
        <div className={`${s.box} ${s.featBox}`}>
          <small>À la une {feat?.forced ? '· choisi par toi' : '· tiré au hasard'}</small>
          {feat ? (
            <div className={s.feat}>
              <Art it={feat} />
              <div>
                <b>{itemText(feat, 'fr')[0]}</b>
                <span>
                  <s>{fmt(feat.period_price ?? feat.base_price)}</s> → <b>{fmt(feat.price)}</b> · −{feat.off} %
                </span>
                <div className={s.chips}>
                  {OFFS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      aria-pressed={feat.off === p}
                      onClick={() => void feature(feat.id, p)}
                    >
                      −{p} %
                    </button>
                  ))}
                  {feat.forced ? (
                    <button type="button" onClick={() => void feature(null)}>
                      🎲 Au hasard
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <p className="muted">Aucun objet à la une (rien en stock).</p>
          )}
        </div>
      </div>

      {/* filtres */}
      <div className={s.filters}>
        <div className={s.chips}>
          {CATS.map(([k, l, ff]) => (
            <button key={k} type="button" aria-pressed={cat === k} onClick={() => setCat(k)}>
              {l} <i>{rows.filter(ff).length}</i>
            </button>
          ))}
        </div>
        <label className={s.check}>
          <input type="checkbox" checked={onlyOn} onChange={(e) => setOnlyOn(e.target.checked)} />
          Seulement ce qui est en vente
        </label>
      </div>

      {!list.data ? (
        <p className="muted">Chargement…</p>
      ) : (
        <ul className={s.grid}>
          {shown.map((it, i) => (
            // la clé change quand le serveur renvoie un autre prix ou stock : la carte reprend ses valeurs
            <Card
              key={`${it.id}|${it.period_price ?? it.price}|${it.stock}`}
              it={it}
              i={i}
              onSaved={refresh}
              onFeature={(p) => void feature(it.id, p)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function Art({ it }: { it: Row }) {
  if (isCosmetic(it.kind))
    return (
      <span className={s.art}>
        <CosmeticPreview id={it.id} label="Aa" />
      </span>
    );
  const img = itemImg(it);
  return (
    <span className={`${s.art} ${img.wide ? s.wide : ''}`}>
      <img className="px" src={img.src} alt="" style={img.tint ? ({ '--df': img.tint } as CSSProperties) : undefined} />
    </span>
  );
}

function Card({
  it,
  i,
  onSaved,
  onFeature,
}: {
  it: Row;
  i: number;
  onSaved: () => Promise<unknown>;
  onFeature: (pct: number) => void;
}) {
  const base = it.period_price ?? it.price;
  const [price, setPrice] = useState(base);
  const [stock, setStock] = useState(it.stock);
  const [saved, setSaved] = useState(false);
  const save = async (p: Partial<{ price: number; stock: number; active: boolean }>) => {
    const ok = await act(
      () =>
        adminApi.shopSet({
          p_item: it.id,
          p_price: p.price ?? price,
          p_active: p.active ?? it.active,
          p_stock: p.stock ?? stock,
        }),
      '',
    );
    if (ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 1200);
      await onSaved();
    }
  };
  const [name, desc] = itemText(it, 'fr');
  if (it.pass_only)
    return (
      <li className={`${s.card} ${s.locked}`} style={{ '--i': i } as CSSProperties}>
        <Art it={it} />
        <b>{name}</b>
        <span className={s.tag}>🔒 Exclusif du passe : jamais en boutique</span>
      </li>
    );
  const pct = it.base_price ? Math.round((1 - price / it.base_price) * 100) : 0;
  return (
    <li className={`${s.card} ${it.active && stock > 0 ? '' : s.off}`} style={{ '--i': i } as CSSProperties}>
      <div className={s.head}>
        <Art it={it} />
        <label className={s.switch} title={it.active ? 'En vente' : 'Retiré de la boutique'}>
          <input
            type="checkbox"
            checked={it.active}
            onChange={(e) => void save({ active: e.target.checked })}
            aria-label={`${it.id} en vente`}
          />
          <i aria-hidden />
        </label>
        {it.featured ? <span className={s.une}>À la une −{it.off} %</span> : null}
        {saved ? <span className={s.ok}>✓</span> : null}
      </div>
      <b className={s.name}>{name}</b>
      <small className={s.desc}>{desc}</small>

      {/* stock de la période */}
      <div className={s.line}>
        <span>Stock aujourd’hui</span>
        <div className={s.stepper}>
          <button type="button" onClick={() => void save({ stock: Math.max(0, stock - 1) })} aria-label="Moins">
            −
          </button>
          <input
            type="number"
            min={0}
            value={stock}
            onChange={(e) => setStock(Math.max(0, Math.trunc(+e.target.value)))}
            onBlur={() => stock !== it.stock && void save({ stock })}
            onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
            aria-label={`Stock de ${it.id}`}
          />
          <button type="button" onClick={() => void save({ stock: stock + 1 })} aria-label="Plus">
            +
          </button>
        </div>
      </div>
      <small className={s.sold}>{it.sold} vendu(s) cette période</small>

      {/* prix */}
      <div className={s.line}>
        <span>Prix</span>
        <div className={s.price}>
          <input
            type="number"
            min={1}
            value={price}
            onChange={(e) => setPrice(Math.max(1, Math.trunc(+e.target.value)))}
            onBlur={() => price !== base && void save({ price })}
            onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
            aria-label={`Prix de ${it.id}`}
          />
          <img className="px" src="/img/piece.png" alt="" width={16} height={16} />
        </div>
      </div>
      <div className={s.chips}>
        {OFFS.slice(0, 3).map((p) => {
          const v = Math.max(1, Math.round((it.base_price * (100 - p)) / 100));
          return (
            <button key={p} type="button" aria-pressed={price === v} onClick={() => void save({ price: v })}>
              −{p} %
            </button>
          );
        })}
        <button
          type="button"
          aria-pressed={price === it.base_price}
          onClick={() => void save({ price: it.base_price })}
        >
          Normal
        </button>
      </div>
      <small className={s.sold}>
        normal {fmt(it.base_price)}
        {pct > 0 ? ` · réduit de ${pct} %` : pct < 0 ? ` · +${-pct} %` : ''}
        {it.featured ? ` · payé ${fmt(it.price)} avec la une` : ''}
      </small>
      {!it.featured && it.active && stock > 0 ? (
        <button type="button" className={s.feature} onClick={() => onFeature(30)}>
          ⭐ Mettre à la une
        </button>
      ) : null}
    </li>
  );
}
