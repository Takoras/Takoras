import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { adminApi, errorText } from '@/api';
import { useMe } from '@/api/queries';
import { useAuth } from '@/lib/auth';
import { qc } from '@/lib/queryClient';
import { useSettings } from '@/lib/settings';
import { flyCoins } from '@/ui/fx';
import { toast } from '@/ui/toast';
import s from './DebugPanel.module.css';

type Act = [label: string, run: () => unknown];

// Menu debug des admins : Ctrl+Q sur n'importe quelle page. Des actions de test pour la page ouverte
// (passe, boutique, inventaire…) et des raccourcis communs. Tout agit seulement sur TON compte.
export function DebugPanel() {
  const me = useMe();
  const uid = useAuth((x) => x.user?.id);
  const lang = useSettings((x) => x.lang);
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const admin = !!me.data?.admin;

  useEffect(() => {
    if (!admin) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && !e.altKey && e.key.toLowerCase() === 'q') {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === 'Escape') setOpen(false);
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [admin]);

  if (!admin || !open) return null;

  // une action serveur, puis tout ce qui est affiché se recharge (solde, passe, boutique, objets…)
  const srv =
    (action: string, n = 0, item?: string) =>
    async () => {
      const r = (await adminApi.debug(action, n, item)) as { state?: object };
      if (r?.state && uid) qc.setQueryData(['me', uid], (o: object | undefined) => ({ ...o, ...r.state }));
      await qc.invalidateQueries();
    };
  const center = () => new DOMRect(innerWidth / 2 - 60, innerHeight / 2 - 60, 120, 120);

  const page: [string, Act[]] | null = pathname.startsWith('/pass')
    ? [
        'Passe',
        [
          ['Passe complet (premium + 50 paliers)', srv('bp_max')],
          ['Retirer le passe (tout à zéro)', srv('bp_reset')],
          ['+1 000 XP (un palier)', srv('bp_xp', 1000)],
          ['+300 XP', srv('bp_xp', 300)],
          ['−1 000 XP', srv('bp_xp', -1000)],
          ['Premium oui / non', srv('bp_premium')],
          ['Remettre les récompenses à récupérer', srv('bp_unclaim')],
        ],
      ]
    : pathname.startsWith('/shop')
      ? [
          'Boutique',
          [
            ['Recacher les cases du jour', srv('shop_hide')],
            ['Tester le vol des pièces', () => flyCoins(center(), 3, () => undefined)],
          ],
        ]
      : pathname.startsWith('/inventory')
        ? [
            'Inventaire',
            [
              ['+3 potions ×2', srv('item', 3, 'potion2')],
              ['+1 potion ×10', srv('item', 1, 'potion10')],
              ['+1 potion ×100', srv('item', 1, 'potion100')],
              ['+1 sablier', srv('item', 1, 'hourglass')],
              ['Sablier actif +60 min', srv('fast', 60)],
              ['Retirer tous les effets', srv('fx_clear')],
            ],
          ]
        : pathname === '/'
          ? [
              'Accueil',
              [
                ['Récompense du jour à nouveau', srv('daily_reset')],
                ['Tirages au max', srv('pulls_full')],
                ['Retirer tous les effets', srv('fx_clear')],
              ],
            ]
          : null;

  const common: Act[] = [
    ['+10 000 pièces', srv('coins', 10000)],
    ['+1 000 pièces', srv('coins', 1000)],
    ['Pièces à 0', srv('coins_set', 0)],
    ['+50 tirages', srv('pulls', 50)],
    ['Tirages à 0', srv('pulls', -1000)],
  ];

  const run = async (f: Act[1]) => {
    if (busy) return;
    setBusy(true);
    try {
      await f();
    } catch (e) {
      toast(errorText(e, lang), true);
    } finally {
      setBusy(false);
    }
  };
  const group = (title: string, acts: Act[]) => (
    <section>
      <h3>{title}</h3>
      <div className={s.btns}>
        {acts.map(([l, f]) => (
          <button key={l} type="button" disabled={busy} onClick={() => void run(f)}>
            {l}
          </button>
        ))}
      </div>
    </section>
  );

  return (
    <aside className={s.panel} aria-label="Debug">
      <header>
        <b>Debug</b>
        <small>Ctrl+Q</small>
        <button type="button" className={s.x} onClick={() => setOpen(false)} aria-label="Fermer">
          ×
        </button>
      </header>
      {page ? group(page[0], page[1]) : null}
      {group('Partout', common)}
    </aside>
  );
}
