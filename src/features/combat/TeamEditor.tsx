import { useRef, useState, type CSSProperties } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { combatApi, errorText } from '@/api';
import { glowVars, jetonOf, TEMPLATE, texOf, vImg } from '@/data/jetons';
import { powerInfo } from '@/data/kit';
import { RCFG } from '@/engines/ring-config.js';
import { sfx } from '@/engines/sound.js';
import { useAuth } from '@/lib/auth';
import { useJn } from '@/lib/names';
import { reducedFx, useSettings } from '@/lib/settings';
import { useT } from '@/i18n/useT';
import { Button } from '@/ui/Button';
import { Modal } from '@/ui/Modal';
import { MutationStamp } from '@/ui/MutationStamp';
import { toast } from '@/ui/toast';
import { lvlOf, seriesList, type Group, type InvData } from '../inventory/inv';
import { baseVariant, ownedTokens, ownKey, VRANK, type Owned, type Team } from './team';
import s from './TeamEditor.module.css';

// Choisir son équipe, en simple :
// - en haut, les 3 places (toucher ✕ = retirer ; les tampons = choisir la mutation qu'on possède) ;
// - en dessous, la liste de ses jetons, chacun avec son pouvoir expliqué en une phrase ; toucher = ajouter / retirer.
// Prévu pour plusieurs séries : un onglet par série, et une série « à venir » (modèle de jeton) en attendant.
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
  const uid = useAuth((x) => x.user?.id);
  const qc = useQueryClient();
  const all = ownedTokens(groups);
  const by = new Map(all.map((o) => [o.k, o]));
  const series = seriesList();
  const [team, setTeam] = useState<Team>(() =>
    start.map((u) => (u && by.has(ownKey(u.serie, u.name)) ? { ...u } : null)),
  );
  const [serie, setSerie] = useState(series[0] ?? 'Takoras');
  const [busy, setBusy] = useState(false);
  const slotsRef = useRef<HTMLUListElement>(null);
  const inTeam = new Set(team.filter(Boolean).map((u) => ownKey(u?.serie ?? '', u?.name ?? '')));
  const vis = all.filter((u) => u.serie === serie).sort((a, b) => b.odds - a.odds);
  const lvl = (o: { serie: string; name: string }) => lvlOf(levels, o.serie, o.name);
  const vName = (v: string) => (v ? t(`ui.v_${v as 'gold'}`) : t('arena.normal'));

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
    // la meilleure mutation possédée par défaut
    const v = Object.keys(o.vars).sort((a, b) => (VRANK[b] ?? 0) - (VRANK[a] ?? 0))[0] ?? baseVariant(o);
    sfx.upgrade();
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
      <ul ref={slotsRef} className={s.slots}>
        {team.map((u, i) => {
          if (!u)
            return (
              <li key={i} className={s.empty}>
                <span>{i + 1}</span>
              </li>
            );
          const j = jetonOf(u.name, u.serie),
            o = by.get(ownKey(u.serie, u.name)),
            vars = o ? Object.keys(o.vars).sort((a, b) => (VRANK[a] ?? 0) - (VRANK[b] ?? 0)) : [u.variant];
          return (
            <li key={i} style={glowVars(j, u.variant) as CSSProperties}>
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
              <img className={vImg(u.variant)} src={texOf(j)} alt="" />
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
        <ul className={s.list}>
          {vis.map((o) => {
            const j = jetonOf(o.name, o.serie),
              k = powerInfo(o.name, lang),
              on = inTeam.has(o.k);
            return (
              <li key={o.k} style={glowVars(j) as CSSProperties}>
                <button
                  type="button"
                  className={`${s.row} ${on ? s.on : ''}`}
                  aria-pressed={on}
                  onClick={() => toggle(o)}
                >
                  <img className="px" src={texOf(j)} alt="" />
                  <span className={s.txt}>
                    <b>
                      {jn(o.name)}{' '}
                      <small>
                        {t('arena.lvl')}
                        {lvl(o)}
                      </small>
                      {Object.keys(o.vars)
                        .filter(Boolean)
                        .map((v) => (
                          <MutationStamp key={v} v={v} size="xs" />
                        ))}
                    </b>
                    <span className={s.pw} style={{ '--c': k.col } as CSSProperties}>
                      {k.name}
                      {k.when ? <small> · {k.when}</small> : null}
                    </span>
                    <small className={s.desc}>{k.desc}</small>
                  </span>
                  <span className={s.check} aria-hidden>
                    {on ? '✓' : '+'}
                  </span>
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
    </Modal>
  );
}
