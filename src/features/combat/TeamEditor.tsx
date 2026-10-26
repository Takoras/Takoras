import { useRef, useState, type CSSProperties } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { combatApi, errorText } from '@/api';
import { jetonOf, texOf, vImg, glowVars } from '@/data/jetons';
import { ROLES, roleOf, powerInfo, RING_MAX, ringStats, type Role } from '@/data/kit';
import { RCFG } from '@/engines/ring-config.js';
import { sfx } from '@/engines/sound.js';
import { useAuth } from '@/lib/auth';
import { useJn } from '@/lib/names';
import { reducedFx, useSettings } from '@/lib/settings';
import { useDict, useT } from '@/i18n/useT';
import { Button } from '@/ui/Button';
import { Modal } from '@/ui/Modal';
import { toast } from '@/ui/toast';
import { lvlOf, seriesList, type Group, type InvData } from '../inventory/inv';
import { baseVariant, ownedTokens, ownKey, VRANK, type Owned, type Team } from './team';
import { StatIcon } from '@/ui/StatIcon';
import { TokenSheet } from './TokenSheet';
import s from './Combat.module.css';

const ROLE_ORDER: ('all' | Role)[] = ['all', 'fighter', 'tank', 'support'];

// Modifier l'équipe : ta collection en grille, toucher = ajouter / retirer.
// En haut : les 3 places (toucher la pastille = changer de version). Plus de budget : n'importe quels 3 jetons.
export function TeamEditor({
  groups,
  levels,
  team: start,
  onClose,
}: {
  groups: Group[];
  levels: InvData;
  team: Team;
  onClose: () => void;
}) {
  const t = useT();
  const jn = useJn();
  const lang = useSettings((x) => x.lang);
  const dict = useDict();
  const uid = useAuth((x) => x.user?.id);
  const qc = useQueryClient();
  const all = ownedTokens(groups);
  const by = new Map(all.map((o) => [o.k, o]));
  const series = seriesList().filter((sr) => all.some((u) => u.serie === sr));
  const [team, setTeam] = useState<Team>(() =>
    start.map((u) => (u && by.has(ownKey(u.serie, u.name)) ? { ...u } : null)),
  );
  const [serie, setSerie] = useState(series[0] ?? 'Takoras');
  const [el, setEl] = useState<'all' | Role>('all');
  // version montrée (comme les onglets du bestiaire) : Normal, Doré, Céleste, Ombre
  const [ver, setVer] = useState<string>('');
  const [info, setInfo] = useState<Owned | null>(null);
  const [busy, setBusy] = useState(false);
  const slotsRef = useRef<HTMLUListElement>(null);
  const slots = dict.arena.slots;
  const inTeam = new Set(team.filter(Boolean).map((u) => ownKey(u?.serie ?? '', u?.name ?? '')));
  const vis = all
    .filter((u) => u.serie === serie && u.vars[ver] !== undefined && (el === 'all' || roleOf(u.name) === el))
    .sort((a, b) => b.odds - a.odds);
  const lvl = (o: { serie: string; name: string }) => lvlOf(levels, o.serie, o.name);

  const toggle = (o: Owned) => {
    const had = team.findIndex((u) => u && ownKey(u.serie, u.name) === o.k);
    if (had >= 0) {
      sfx.click();
      return setTeam(team.map((u, i) => (i === had ? null : u)));
    }
    const free = team.findIndex((u) => !u);
    if (free < 0) {
      sfx.deny();
      return toast(t('arena.teamFull'), true);
    }
    const v = o.vars[ver] !== undefined ? ver : baseVariant(o);
    sfx.upgrade();
    setTeam(
      team.map((u, i) =>
        i === free ? { id: o.vars[v] ?? 0, serie: o.serie, name: o.name, odds: o.odds, variant: v } : u,
      ),
    );
    if (!reducedFx())
      requestAnimationFrame(() =>
        slotsRef.current?.children[free]?.animate(
          [{ transform: 'scale(.6)', opacity: 0.3 }, { transform: 'scale(1.08)' }, { transform: 'none' }],
          { duration: 320, easing: 'cubic-bezier(.2, 1.3, .4, 1)' },
        ),
      );
  };
  const save = async () => {
    setBusy(true);
    try {
      await combatApi.setDeck(team.filter(Boolean).map((u) => u?.id ?? 0));
      qc.setQueryData(['deck', uid], team);
      void qc.invalidateQueries({ queryKey: ['inv'] }); // les jetons de l'équipe sont protégés de la vente
      sfx.upgrade();
      onClose();
    } catch (e) {
      sfx.deny();
      toast(errorText(e, lang), true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={t('arena.team')} wide>
      <ul ref={slotsRef} className={s.teSlots}>
        {team.map((u, i) => {
          if (!u)
            return (
              <li key={i} className={s.teEmpty}>
                <b aria-hidden>＋</b>
                <small>{slots[i]}</small>
              </li>
            );
          const j = jetonOf(u.name, u.serie),
            o = by.get(ownKey(u.serie, u.name));
          return (
            <li key={i} style={glowVars(j, u?.variant) as CSSProperties}>
              <button
                type="button"
                className={s.teRm}
                onClick={() => {
                  sfx.click();
                  setTeam(team.map((x, k) => (k === i ? null : x)));
                }}
                aria-label={`${t('arena.remove')} ${jn(u.name)}`}
              >
                ✕
              </button>
              <img className={vImg(u.variant)} src={texOf(j)} alt="" />
              <b>{jn(u.name)}</b>
              {/* Versions possédées : une pastille par version, toucher = la prendre */}
              <div className={s.vers} role="radiogroup" aria-label={t('arena.version')}>
                {(o ? Object.keys(o.vars).sort((a, b) => (VRANK[a] ?? 0) - (VRANK[b] ?? 0)) : [u.variant]).map((v) => (
                  <button
                    key={v || 'none'}
                    type="button"
                    role="radio"
                    aria-checked={u.variant === v}
                    aria-label={v ? t(`ui.v_${v as 'gold'}`) : t('arena.normal')}
                    title={v ? t(`ui.v_${v as 'gold'}`) : t('arena.normal')}
                    className={`${s.sw} ${s[`sw_${v || 'none'}`] ?? ''}`}
                    onClick={() => {
                      if (!o || u.variant === v) return;
                      sfx.click();
                      setTeam(team.map((x, k) => (k === i && x ? { ...x, variant: v, id: o.vars[v] ?? x.id } : x)));
                    }}
                  />
                ))}
              </div>
              <small className={s.vLabel}>
                {u.variant ? t(`ui.v_${u.variant as 'gold'}`) : t('arena.normal')}
                {u.variant ? <b> +{Math.round(((RCFG.MUTATION[u.variant] ?? 1) - 1) * 100)} %</b> : null}
              </small>
            </li>
          );
        })}
      </ul>
      <div className={s.filters}>
        <div className={s.verTabs} role="tablist" aria-label={t('arena.version')}>
          {(['', 'gold', 'celeste', 'ombre'] as const).map((v) => (
            <button
              key={v || 'none'}
              type="button"
              role="tab"
              aria-selected={ver === v}
              onClick={() => {
                sfx.click();
                setVer(v);
              }}
            >
              <i className={`${s.sw} ${s[`sw_${v || 'none'}`] ?? ''}`} aria-hidden />
              {v ? t(`ui.v_${v}`) : t('arena.normal')}
              <small>{all.filter((o) => o.serie === serie && o.vars[v] !== undefined).length}</small>
            </button>
          ))}
        </div>
        {series.length > 1 ? (
          <div className={s.chipsRow} role="group" aria-label={t('ui.bestiary')}>
            {series.map((sr) => (
              <button
                key={sr}
                type="button"
                aria-pressed={sr === serie}
                onClick={() => {
                  setSerie(sr);
                  setEl('all');
                }}
              >
                {sr}
              </button>
            ))}
          </div>
        ) : null}
        <div className={s.chipsRow} role="group" aria-label={t('arena.role')}>
          {ROLE_ORDER.map((e) => (
            <button
              key={e}
              type="button"
              aria-pressed={el === e}
              onClick={() => {
                sfx.click();
                setEl(e);
              }}
            >
              {e === 'all' ? t('ui.all') : `${ROLES[e].ico} ${ROLES[e][lang]}`}
            </button>
          ))}
        </div>
      </div>
      {vis.length ? (
        <ul className={s.teGrid}>
          {vis.map((o) => {
            const j = jetonOf(o.name, o.serie),
              E = ROLES[roleOf(o.name)],
              k = powerInfo(o.name, lang),
              on = inTeam.has(o.k),
              L = lvl(o),
              rs = ringStats(o.name, L, ver);
            return (
              <li
                key={o.k}
                className={on ? s.sel : undefined}
                style={{ ...glowVars(j), '--el': E.col } as CSSProperties}
              >
                <button type="button" className={s.teCard} aria-pressed={on} onClick={() => toggle(o)}>
                  <span className={s.tpLv}>
                    {t('arena.lvl')}
                    {L}
                  </span>
                  <img className={vImg(ver)} src={texOf(j)} alt="" />
                  <b>{jn(o.name)}</b>
                  <small className={s.role} style={{ '--el': E.col } as CSSProperties}>
                    {E.ico} {E[lang]}
                  </small>
                  <small className={s.ab} style={{ '--c': k.col } as CSSProperties}>
                    ✦ {k.name}
                  </small>
                  <span className={s.stats}>
                    {(
                      [
                        ['mass', rs.mass, RING_MAX.mass],
                        ['power', rs.power, RING_MAX.power],
                        ['size', rs.r, RING_MAX.r],
                      ] as const
                    ).map(([key, v, max]) => (
                      <span key={key}>
                        <StatIcon k={key} />
                        <i>
                          <b style={{ width: `${Math.min(100, (v / max) * 100)}%` }} />
                        </i>
                      </span>
                    ))}
                  </span>
                  {on ? (
                    <span className={s.ok} aria-hidden>
                      ✓
                    </span>
                  ) : null}
                </button>
                <button
                  type="button"
                  className={s.info}
                  onClick={() => {
                    sfx.click();
                    setInfo(o);
                  }}
                  aria-label={`ⓘ ${jn(o.name)}`}
                >
                  ⓘ
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="muted">{t('arena.none')}</p>
      )}
      <div className={s.foot}>
        <Button variant="primary" loading={busy} onClick={() => void save()}>
          {t('arena.saveTeam')}
        </Button>
      </div>
      {info ? (
        <TokenSheet
          name={info.name}
          serie={info.serie}
          variant={baseVariant(info)}
          lvl={lvl(info)}
          onClose={() => setInfo(null)}
        />
      ) : null}
    </Modal>
  );
}
