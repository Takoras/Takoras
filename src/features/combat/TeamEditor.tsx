import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { combatApi, errorText } from '@/api';
import { glowVars, jetonOf, MYSTERE, SERIES, TEMPLATE, texOf, vImg } from '@/data/jetons';
import { RCFG } from '@/engines/ring-config.js';
import { sfx } from '@/engines/sound.js';
import { useAuth } from '@/lib/auth';
import { useJn } from '@/lib/names';
import { reducedFx, useSettings } from '@/lib/settings';
import { useT } from '@/i18n/useT';
import { Modal } from '@/ui/Modal';
import { MutationStamp } from '@/ui/MutationStamp';
import { toast } from '@/ui/toast';
import { lvlOf, seriesList, type Group, type InvData } from '../inventory/inv';
import { baseVariant, ownedTokens, ownKey, VRANK, type Owned, type Team } from './team';
import { TokenSheet } from './TokenSheet';
import iv from '../inventory/Inventory.module.css';
import s from './TeamEditor.module.css';

// Choisir son équipe, en simple :
// - en haut, les 3 places (toucher ✕ = retirer ; les tampons = choisir la mutation qu'on possède) ;
// - en dessous, la liste de ses jetons, chacun avec son pouvoir expliqué en une phrase ; toucher = ajouter / retirer.
// Prévu pour plusieurs séries : un onglet par série, et une série « à venir » (modèle de jeton) en attendant.
export function TeamEditor({
  groups,
  levels,
  team: start,
  focus,
  onClose,
}: {
  groups: Group[];
  levels: InvData;
  team: Team;
  focus?: number;
  onClose: () => void;
}) {
  const t = useT();
  const jn = useJn();
  const lang = useSettings((x) => x.lang);
  const uid = useAuth((x) => x.user?.id);
  const qc = useQueryClient();
  const all = ownedTokens(groups);
  const by = new Map(all.map((o) => [o.k, o]));
  const series = seriesList();
  const [team, setTeam] = useState<Team>(() =>
    start.map((u) => (u && by.has(ownKey(u.serie, u.name)) ? { ...u } : null)),
  );
  const [serie, setSerie] = useState(series[0] ?? 'Takoras');
  const [info, setInfo] = useState<Owned | null>(null);
  // place visée : le prochain jeton choisi la remplace (toucher une place pour la viser)
  const [target, setTarget] = useState<number | null>(focus ?? null);
  const slotsRef = useRef<HTMLUListElement>(null);
  const inTeam = new Set(team.filter(Boolean).map((u) => ownKey(u?.serie ?? '', u?.name ?? '')));
  // toute la série, du plus commun au plus rare ; ceux qu'on n'a pas sont des « ? »
  const vis = [...(SERIES[serie] ?? [])].sort((a, b) => a.odds - b.odds);
  const lvl = (o: { serie: string; name: string }) => lvlOf(levels, o.serie, o.name);
  const vName = (v: string) => (v ? t(`ui.v_${v as 'gold'}`) : t('arena.normal'));

  const toggle = (o: Owned, pick?: string) => {
    const had = team.findIndex((u) => u && ownKey(u.serie, u.name) === o.k);
    if (had >= 0) {
      sfx.click();
      return setTeam(team.map((u, i) => (i === had ? null : u)));
    }
    const free = target ?? team.findIndex((u) => !u);
    if (free < 0) {
      sfx.deny();
      return toast(t('arena.teamFull'), true);
    }
    // la meilleure mutation possédée par défaut
    const v = pick ?? Object.keys(o.vars).sort((a, b) => (VRANK[b] ?? 0) - (VRANK[a] ?? 0))[0] ?? baseVariant(o);
    sfx.upgrade();
    setTarget(null);
    setTeam(
      team.map((u, i) =>
        i === free ? { id: o.vars[v] ?? 0, serie: o.serie, name: o.name, odds: o.odds, variant: v } : u,
      ),
    );
    if (!reducedFx())
      requestAnimationFrame(() =>
        slotsRef.current?.children[free]?.animate([{ transform: 'scale(.9)', opacity: 0.4 }, { transform: 'none' }], {
          duration: 180,
          easing: 'cubic-bezier(.2, .8, .2, 1)',
        }),
      );
  };
  // Enregistrée toute seule à chaque changement (plus de bouton « Valider l'équipe » qu'on oubliait).
  // Si on ferme la fenêtre avant la fin du petit délai, l'équipe est enregistrée tout de suite.
  const pending = useRef<Team | null>(null);
  const push = useRef(async (tm: Team) => {
    pending.current = null;
    try {
      await combatApi.setDeck(tm.filter(Boolean).map((u) => u?.id ?? 0));
      qc.setQueryData(['deck', uid], tm);
      void qc.invalidateQueries({ queryKey: ['inv'] }); // les jetons de l'équipe sont protégés de la vente
    } catch (e) {
      sfx.deny();
      toast(errorText(e, lang), true);
    }
  });
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    pending.current = team;
    const tm = setTimeout(() => void push.current(team), 250);
    return () => clearTimeout(tm);
  }, [team]);
  useEffect(
    () => () => {
      if (pending.current) void push.current(pending.current);
    },
    [],
  );

  return (
    <Modal open onClose={onClose} title={t('arena.team')} wide>
      <ul ref={slotsRef} className={s.slots}>
        {team.map((u, i) => {
          if (!u)
            return (
              <li key={i} className={`${s.empty} ${target === i ? s.aim : ''}`}>
                <button type="button" className={s.pickSlot} onClick={() => setTarget(i)} aria-pressed={target === i}>
                  {i + 1}
                </button>
              </li>
            );
          const j = jetonOf(u.name, u.serie),
            o = by.get(ownKey(u.serie, u.name)),
            vars = o ? Object.keys(o.vars).sort((a, b) => (VRANK[a] ?? 0) - (VRANK[b] ?? 0)) : [u.variant];
          return (
            <li key={i} style={glowVars(j, u.variant) as CSSProperties} className={target === i ? s.aim : undefined}>
              <button
                type="button"
                className={s.rm}
                onClick={() => {
                  sfx.click();
                  setTeam(team.map((x, k) => (k === i ? null : x)));
                }}
                aria-label={`${t('arena.remove')} ${jn(u.name)}`}
              >
                ✕
              </button>
              <button
                type="button"
                className={s.pickSlot}
                onClick={() => setTarget(target === i ? null : i)}
                aria-pressed={target === i}
                aria-label={t('arena.swap')}
              >
                <img className={vImg(u.variant)} src={texOf(j)} alt="" />
              </button>
              <b>{jn(u.name)}</b>
              {vars.length > 1 ? (
                <div className={s.muts} role="radiogroup" aria-label={t('arena.version')}>
                  {vars.map((v) => (
                    <button
                      key={v || 'none'}
                      type="button"
                      role="radio"
                      aria-checked={u.variant === v}
                      aria-label={vName(v)}
                      title={vName(v)}
                      onClick={() => {
                        if (!o || u.variant === v) return;
                        sfx.click();
                        setTeam(team.map((x, k) => (k === i && x ? { ...x, variant: v, id: o.vars[v] ?? x.id } : x)));
                      }}
                    >
                      {v ? <MutationStamp v={v} size="sm" /> : <i className={s.plain} />}
                    </button>
                  ))}
                </div>
              ) : null}
              <small>
                {vName(u.variant)}
                {u.variant ? ` +${Math.round(((RCFG.MUTATION[u.variant] ?? 1) - 1) * 100)} %` : ''}
              </small>
            </li>
          );
        })}
      </ul>

      <div className={s.tabs} role="tablist" aria-label={t('arena.serie')}>
        {series.map((sr) => (
          <button key={sr} type="button" role="tab" aria-selected={sr === serie} onClick={() => setSerie(sr)}>
            {sr}
          </button>
        ))}
        {/* les prochaines séries arriveront ici */}
        <button type="button" role="tab" aria-selected={false} disabled className={s.soon}>
          <img className="px" src={TEMPLATE} alt="" width={18} height={18} />
          {t('arena.serieSoon')}
        </button>
      </div>

      {vis.length ? (
        <ul className={`${iv.grid} ${s.list}`}>
          {vis.map((j) => {
            const o = by.get(ownKey(serie, j.name)),
              on = !!o && inTeam.has(o.k);
            // même style que le bestiaire : le jeton posé librement ; pas possédé = « ? » sans rien d'autre
            if (!o)
              return (
                <li key={j.name} className={`${iv.card} ${iv.unk}`} style={{ '--g': '113, 113, 122' } as CSSProperties}>
                  <span className={iv.cardBtn} aria-label="?">
                    <img className="px" src={MYSTERE} alt="" />
                    <b>???</b>
                  </span>
                </li>
              );
            return (
              <li key={j.name} className={`${iv.card} ${on ? s.on : ''}`} style={glowVars(j) as CSSProperties}>
                <button type="button" className={iv.cardBtn} onClick={() => setInfo(o)} aria-label={jn(o.name)}>
                  {on ? <span className={s.inTeam}>{t('ui.in_deck')}</span> : null}
                  <img className="px" src={texOf(j)} alt="" />
                  <b>{jn(o.name)}</b>
                  <small className={s.vrow}>
                    {Object.keys(o.vars)
                      .filter(Boolean)
                      .map((v) => (
                        <MutationStamp key={v} v={v} size="xs" />
                      ))}
                  </small>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="muted">{t('arena.none')}</p>
      )}
      {info ? (
        <PickSheet
          o={info}
          lvl={lvl(info)}
          inTeam={inTeam.has(info.k)}
          onClose={() => setInfo(null)}
          onPick={(v) => {
            if (inTeam.has(info.k)) toggle(info);
            else toggle(info, v);
            setInfo(null);
          }}
        />
      ) : null}
    </Modal>
  );
}

// Fiche d'un jeton dans l'éditeur : on choisit la mutation (les 3 tampons, ceux qu'on n'a pas sont grisés), puis « Ajouter »
function PickSheet({
  o,
  lvl,
  inTeam,
  onClose,
  onPick,
}: {
  o: Owned;
  lvl: number;
  inTeam: boolean;
  onClose: () => void;
  onPick: (v: string) => void;
}) {
  const t = useT();
  const best = Object.keys(o.vars).sort((a, b) => (VRANK[b] ?? 0) - (VRANK[a] ?? 0))[0] ?? baseVariant(o);
  const [v, setV] = useState(best);
  const vName = (x: string) => (x ? t(`ui.v_${x as 'gold'}`) : t('arena.normal'));
  return (
    <TokenSheet
      name={o.name}
      serie={o.serie}
      variant={v}
      lvl={lvl}
      onClose={onClose}
      extra={
        inTeam ? null : (
          <div className={s.pickMuts} role="radiogroup" aria-label={t('arena.version')}>
            {['', 'gold', 'celeste', 'ombre'].map((x) => {
              const has = x in o.vars;
              return (
                <button
                  key={x || 'none'}
                  type="button"
                  role="radio"
                  aria-checked={v === x}
                  disabled={!has}
                  title={vName(x)}
                  aria-label={vName(x)}
                  onClick={() => {
                    sfx.click();
                    setV(x);
                  }}
                >
                  {x ? <MutationStamp v={x} size="md" /> : <i className={s.plain} />}
                  <small>{vName(x)}</small>
                </button>
              );
            })}
          </div>
        )
      }
      action={{
        label: inTeam ? t('arena.remove') : t('arena.add'),
        primary: !inTeam,
        onClick: () => onPick(v),
      }}
    />
  );
}
