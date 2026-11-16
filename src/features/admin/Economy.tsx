import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/api';
import { Segmented } from '@/ui/Segmented';
import { fmt } from './shared';
import s from './Admin.module.css';

// Suivi de l'économie (hors admins) : combien de pièces les joueurs gagnent et dépensent par heure de jeu, d'où elles
// viennent et où elles partent, et les soldes actuels. Repère : si le gain par heure dépasse durablement la dépense,
// les joueurs s'enrichissent (plus d'objectif) ; s'il est bien en dessous, ils manquent de pièces.
type Day = { d: string; gain: number; spend: number; admin: number; hours: number; players: number };
type Eco = {
  days: Day[];
  sources: { src: string; total: number; n: number }[];
  balance: { median: number; p90: number; players: number };
};
// nom lisible de la fonction du site qui a bougé les pièces
const SRC: Record<string, string> = {
  sell_pulls: 'Revente de jetons',
  take_pulls: 'Revente auto (500 exemplaires)',
  take_pulls_serie: 'Tirages payants (Bodako)',
  claim_achievement: 'Succès',
  claim_quest: 'Quêtes du jour',
  claim_weekly: 'Missions de la semaine',
  claim_daily: 'Bonus du jour',
  bp_claim: 'Passe',
  bp_claim_all: 'Passe',
  starter_quest_claim: 'Quête de départ',
  buy_item: 'Achats boutique',
  reveal_slot: 'Cases révélées',
  upgrade_stock: 'Améliorations',
  redeem_code: 'Codes promo',
  upgrade_regen: 'Améliorations',
  level_up: 'Améliorations',
  '?': 'Avant le suivi',
};
const label = (k: string) => (k.startsWith('admin') ? `Admin (${k})` : (SRC[k] ?? k));
const per = (n: number, h: number) => (h > 0 ? fmt(Math.round(n / h)) : '—');

export function Economy() {
  const [days, setDays] = useState<'7' | '14' | '30'>('14');
  const q = useQuery({
    queryKey: ['admin-eco', days],
    queryFn: async () => (await adminApi.economy(Number(days))) as unknown as Eco,
  });
  const d = q.data;
  const tot = d?.days.reduce((a, x) => ({ gain: a.gain + x.gain, spend: a.spend + x.spend, hours: a.hours + x.hours }), {
    gain: 0,
    spend: 0,
    hours: 0,
  });
  return (
    <div className={s.ptab}>
      <section className={s.box}>
        <h3>
          Vue d’ensemble <small className="muted">(hors admins)</small>
        </h3>
        <Segmented
          value={days}
          label="Période"
          options={[
            ['7', '7 jours'],
            ['14', '14 jours'],
            ['30', '30 jours'],
          ]}
          onChange={setDays}
        />
        {!d || !tot ? (
          <p className="muted" aria-busy>
            …
          </p>
        ) : (
          <table className={s.table}>
            <tbody>
              <tr>
                <td>Gagné par heure de jeu</td>
                <td>{per(tot.gain, tot.hours)}</td>
              </tr>
              <tr>
                <td>Dépensé par heure de jeu</td>
                <td>{per(tot.spend, tot.hours)}</td>
              </tr>
              <tr>
                <td>Reste par heure de jeu</td>
                <td>{per(tot.gain - tot.spend, tot.hours)}</td>
              </tr>
              <tr>
                <td>Solde médian · 90 % des joueurs ont moins de</td>
                <td>
                  {fmt(Math.round(d.balance.median))} · {fmt(Math.round(d.balance.p90))}
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </section>
      <section className={s.box}>
        <h3>Par jour</h3>
        {d?.days.length ? (
          <table className={s.table}>
            <thead>
              <tr>
                <th>Jour</th>
                <th>Joueurs</th>
                <th>Heures</th>
                <th>Gagné</th>
                <th>Dépensé</th>
                <th>Gagné / h</th>
                <th>Dépensé / h</th>
                <th>Donné par l’admin</th>
              </tr>
            </thead>
            <tbody>
              {[...d.days].reverse().map((x) => (
                <tr key={x.d}>
                  <td>{new Date(x.d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</td>
                  <td>{fmt(x.players)}</td>
                  <td>{fmt(Math.round(x.hours * 10) / 10)}</td>
                  <td>{fmt(x.gain)}</td>
                  <td>{fmt(x.spend)}</td>
                  <td>{per(x.gain, x.hours)}</td>
                  <td>{per(x.spend, x.hours)}</td>
                  <td>{fmt(x.admin)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted">{d ? 'Rien sur cette période.' : '…'}</p>
        )}
      </section>
      <section className={s.box}>
        <h3>D’où viennent et où partent les pièces</h3>
        {d?.sources.length ? (
          <table className={s.table}>
            <thead>
              <tr>
                <th>Source</th>
                <th>Total</th>
                <th>Opérations</th>
              </tr>
            </thead>
            <tbody>
              {d.sources.map((x) => (
                <tr key={x.src}>
                  <td>{label(x.src)}</td>
                  <td className={x.total < 0 ? 'muted' : undefined}>{fmt(x.total)}</td>
                  <td>{fmt(x.n)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted">{d ? 'Rien sur cette période.' : '…'}</p>
        )}
      </section>
    </div>
  );
}
