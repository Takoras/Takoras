import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { combatApi } from '@/api';
import { hexRGB, MYSTERE, SERIES, texOf } from '@/data/jetons';
import { ROLES, roleOf } from '@/data/kit';
import { useJn } from '@/lib/names';
import { locale, useSettings } from '@/lib/settings';
import { useT } from '@/i18n/useT';
import { cKey, lvlOf, type InvData } from '../inventory/inv';
import { RankBadge } from './Ranked';
import { rankOf } from './rankedApi';
import { TokenSheet } from './TokenSheet';
import s from './Combat.module.css';

// Bestiaire du combat : tous les jetons, leur rôle et leur pouvoir. Ceux que tu n'as jamais eus restent des « ? ».
export function CombatDex({ inv }: { inv: InvData | undefined }) {
  const t = useT();
  const jn = useJn();
  const lang = useSettings((x) => x.lang);
  const [open, setOpen] = useState<string | null>(null);
  const list = SERIES.Takoras ?? [];
  const known = (name: string) => (inv?.coll.get(cKey('Takoras', name))?.total ?? 0) > 0;
  return (
    <section className={s.dex} aria-labelledby="dex-t">
      <h2 id="dex-t">
        {t('arena.dex')}{' '}
        <small className="muted">
          {list.filter((j) => known(j.name)).length}/{list.length}
        </small>
      </h2>
      <ul>
        {list.map((j) => {
          const k = known(j.name),
            role = ROLES[roleOf(j.name)];
          return (
            <li key={j.name}>
              <button
                type="button"
                disabled={!k}
                onClick={() => setOpen(j.name)}
                style={{ '--g': k ? hexRGB(j.glow) : '113, 113, 122' } as CSSProperties}
                aria-label={k ? jn(j.name) : '?'}
              >
                <img className="px" src={k ? texOf(j) : MYSTERE} alt="" width={44} height={44} />
                <b>{k ? jn(j.name) : '?'}</b>
                <small style={k ? { color: role.col } : undefined}>{k ? `${role.ico} ${role[lang]}` : '?'}</small>
              </button>
            </li>
          );
        })}
      </ul>
      {open ? <TokenSheet name={open} lvl={lvlOf(inv, 'Takoras', open)} onClose={() => setOpen(null)} /> : null}
    </section>
  );
}

// Classement Elo (top 10) dans la page Combat
export function EloTop() {
  const t = useT();
  const lang = useSettings((x) => x.lang);
  const q = useQuery({ queryKey: ['ranked-top', 10], queryFn: () => combatApi.rankedTop(10), staleTime: 60_000 });
  const rows = q.data ?? [];
  return (
    <section className={s.eloTop} aria-labelledby="elotop-t">
      <h2 id="elotop-t">🏆 {t('arena.eloTop10')}</h2>
      {rows.length ? (
        <ol>
          {rows.map((r, i) => {
            const rk = rankOf(r.elo);
            return (
              <li key={r.pseudo} style={{ '--rc': rk.col } as CSSProperties}>
                <span className={s.topPos}>{i + 1}</span>
                <RankBadge r={rk} size={22} />
                <Link to={`/profil/${encodeURIComponent(r.pseudo)}`}>{r.pseudo}</Link>
                <b>{r.elo.toLocaleString(locale(lang))}</b>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="muted">{q.isPending ? '…' : t('arena.eloEmpty')}</p>
      )}
      <Link to="/classement" className={s.topAll}>
        {t('arena.aroundAll')} →
      </Link>
    </section>
  );
}
