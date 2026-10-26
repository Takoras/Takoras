import { Link } from 'react-router';
import { useHistory, useLive, useMe } from '@/api/queries';
import { useOnline } from '@/lib/online';
import { jetonOf, texOf, vOdds, VARIANTS } from '@/data/jetons';
import { useAuth } from '@/lib/auth';
import { useJn } from '@/lib/names';
import { locale, useSettings } from '@/lib/settings';
import { useT } from '@/i18n/useT';
import { Avatar } from '@/ui/Avatar';
import { VTag } from '@/ui/VTag';
import { useNow } from '../eco/eco';
import s from './Home.module.css';

function useAgo() {
  const t = useT();
  const now = useNow(60_000);
  return (iso: string) => {
    const m = Math.floor((now - Date.parse(iso)) / 60000);
    if (m < 1) return t('ui.just_now');
    return t('ui.ago', { n: m < 60 ? `${m} min` : m < 1440 ? `${Math.floor(m / 60)} h` : `${Math.floor(m / 1440)} j` });
  };
}
const vCls = (v?: string | null) => (v && v in VARIANTS ? `px v-${v}` : 'px');

// Mes 6 derniers tirages
export function History() {
  const t = useT();
  const jn = useJn();
  const ago = useAgo();
  const lang = useSettings((x) => x.lang);
  const user = useAuth((x) => x.user);
  const h = useHistory();
  const rows = user ? (h.data ?? []).slice(0, 6) : [];
  return (
    <section className={s.panel} aria-labelledby="hist-t">
      <h2 id="hist-t" className={s.panelT}>
        {t('ui.history')}
      </h2>
      {rows.length ? (
        <ul className={s.hist}>
          {rows.map((r) => {
            const j = jetonOf(r.jeton, r.serie);
            return (
              <li key={r.created_at + r.jeton}>
                <img
                  className={vCls(r.variant)}
                  src={texOf(j)}
                  alt=""
                  width={28}
                  height={28}
                  style={{ '--df': `drop-shadow(0 0 4px ${j.glow})` } as React.CSSProperties}
                />
                <div>
                  <b>{jn(r.jeton)}</b>
                  <VTag v={r.variant} />
                  <small className="muted">
                    {ago(r.created_at)}
                    {r.luck && r.luck > 1
                      ? ` · ×${r.luck.toLocaleString(locale(lang), { maximumFractionDigits: 2 })}`
                      : ''}
                  </small>
                </div>
                <span className="muted">1/{r.odds.toLocaleString(locale(lang))}</span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="muted">{t('ui.hist_empty')}</p>
      )}
    </section>
  );
}

// En direct : bandeau qui défile avec les beaux tirages des joueurs
export function Live() {
  const t = useT();
  const jn = useJn();
  const lang = useSettings((x) => x.lang);
  const me = useMe();
  const live = useLive();
  const online = useOnline((x) => x.n);
  // Seulement les vrais beaux tirages : plus rare que 1/5 000, ou une mutation (Doré et plus) qui vaut plus de 1/1 000
  const rows = (live.data ?? []).filter((r) => r.odds > 5000 || (!!r.variant && vOdds(r.odds, r.variant) > 1000));
  if (!rows.length && !online) return null;
  const loop = rows.length >= 6 ? [...rows, ...rows] : rows; // contenu doublé pour un défilement sans saut
  return (
    <section className={s.live} aria-label={t('ui.live')}>
      <div className={s.liveHead}>
        <span className={s.dot} aria-hidden />
        {t('ui.live')}
        {online ? <span className={s.online}>· {t('ui.online', { n: online })}</span> : null}
      </div>
      <div className={s.ticker}>
        <ul className={`${s.track} ${rows.length >= 6 ? s.scroll : ''}`}>
          {loop.map((r, i) => {
            const j = jetonOf(r.jeton, r.serie),
              mine = r.pseudo === me.data?.pseudo;
            return (
              <li key={i} aria-hidden={i >= rows.length || undefined}>
                <Avatar pseudo={r.pseudo} size={24} />
                <span>
                  {mine ? <b>{t('ui.you')}</b> : <Link to={`/profil/${encodeURIComponent(r.pseudo)}`}>{r.pseudo}</Link>}{' '}
                  <span className="muted">{t('ui.got')}</span> {jn(r.jeton)}
                  <VTag v={r.variant} />{' '}
                  <span className="muted">· 1/{vOdds(r.odds, r.variant).toLocaleString(locale(lang))}</span>
                </span>
                <img className={vCls(r.variant)} src={texOf(j)} alt="" width={22} height={22} />
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
