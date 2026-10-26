import { useEffect, useState, type CSSProperties } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useMe } from '@/api/queries';
import { combatApi } from '@/api';
import { hexRGB, jetonOf, texOf, vImg } from '@/data/jetons';
import { ROLES, roleOf, powerInfo } from '@/data/kit';
import { RCFG } from '@/engines/ring-config.js';
import { sfx } from '@/engines/sound.js';
import { openUI } from '@/app/ui-store';
import { useAuth } from '@/lib/auth';
import { useJn } from '@/lib/names';
import { useSettings } from '@/lib/settings';
import { Rich } from '@/i18n/Rich';
import { useDict, useT } from '@/i18n/useT';
import { Button } from '@/ui/Button';
import { toast } from '@/ui/toast';
import { VTag } from '@/ui/VTag';
import { lvlOf, useInventory } from '../inventory/inv';
import { CombatDex, EloTop } from './CombatSide';
import { botTeam, useDeck, type Member } from './team';
import { call, fetchMatch, toLocal, useRanked, watchMatch, type RankedMe } from './rankedApi';
import { RankAround, RankCard, RankRoad, SearchModal } from './Ranked';
import rs from './Ranked.module.css';
import { TeamEditor } from './TeamEditor';
import { TokenSheet } from './TokenSheet';
import s from './Combat.module.css';

// Le Ring (canvas, sons, effets) n'est téléchargé qu'au lancement d'une partie
const ring = () => import('@/engines/ring.js');
let loaded: Awaited<ReturnType<typeof ring>> | null = null;
const loadRing = async () => {
  loaded ??= await ring();
  // Tests de bout en bout : accès à l'état du Ring, seulement sur le serveur de développement
  if (import.meta.env.DEV) (window as unknown as { __ring?: typeof loaded }).__ring = loaded;
  return loaded;
};

// Une des 5 maps au hasard à chaque partie
const randomMap = () => RCFG.MAPS[Math.floor(Math.random() * RCFG.MAPS.length)]?.id;

// Lance le tuto du Ring (sans compte possible)
export const playTuto = async (onEnd?: () => void) => {
  sfx.click();
  (await loadRing()).startRingTuto(() => onEnd?.());
};

// Page Combat : rang, JOUER (classé), Entraînement contre l'IA, équipe de 3 jetons, aide, route des rangs.
// Le tuto du Ring est obligatoire avant le premier match (classé comme entraînement).
export default function Combat() {
  const t = useT();
  const dict = useDict();
  const user = useAuth((x) => x.user);
  const me = useMe();
  const inv = useInventory();
  const deck = useDeck();
  const ranked = useRanked();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [sheet, setSheet] = useState<Member | null>(null);
  // Quitter la page ferme le Ring (plus de boucle d'animation ni d'écouteur qui traîne)
  useEffect(
    () => () => {
      if (loaded?.RNG.st) loaded.closeRing();
    },
    [],
  );

  if (!user)
    return (
      <section className={s.empty}>
        <h1>{t('arena.title')}</h1>
        <p className="muted">{t('arena.needLogin')}</p>
        <div className={s.row}>
          <Button variant="primary" onClick={() => openUI('account')}>
            {t('ui.login')}
          </Button>
          <Button onClick={() => void playTuto()}>🎓 {t('arena.tryTuto')}</Button>
        </div>
      </section>
    );

  const team = deck.data ?? [null, null, null];
  const full = team.every(Boolean);
  const lvl = (u: Member) => lvlOf(inv.data, u.serie, u.name);
  const rk = ranked.data;
  const elo = rk?.elo ?? RCFG.ELO.start;
  const tutoOk = !!rk?.tuto_done;
  const slots = dict.arena.slots;
  const refresh = () => void qc.invalidateQueries({ queryKey: ['ranked'] });

  // Tuto obligatoire : sans bouton « Passer » ; fini = le classé et l'entraînement sont débloqués
  const firstTuto = async () => {
    sfx.click();
    (await loadRing()).startRingTuto(() => refresh(), {
      must: true,
      // tuto fini : on referme l'arène et JOUER est tout de suite débloqué (sans attendre le serveur)
      onDone: () => {
        qc.setQueryData<RankedMe>(['ranked', user.id], (d) => (d ? { ...d, tuto_done: true } : d));
        setTimeout(() => loaded?.closeRing(), 900);
        void combatApi
          .rankedTutoDone()
          .then(() => toast(t('arena.tutoDoneToast')))
          .catch(() => toast(t('arena.errNet'), true))
          .finally(refresh);
      },
    });
  };

  // Entre dans un match classé (nouveau ou en cours) : l'écran se cale sur le serveur et suit le match en direct
  const enterMatch = async (id: string) => {
    const [R, m] = await Promise.all([loadRing(), fetchMatch(id)]);
    if (!m || m.status !== 'live' || !user) return refresh();
    const meSide = m.p1 === user.id ? 0 : 1;
    const bodies = (m.state as { bodies: { side: number; name: string; lvl: number; variant: string }[] }).bodies;
    const teams = [0, 1].map((sd) => bodies.filter((b) => b.side === sd)) as [typeof bodies, typeof bodies];
    const online = {
      me: meSide as 0 | 1,
      state: m.state,
      turn: m.turn,
      deadline: toLocal(m.deadline),
      toLocal,
      shoot: (shot: unknown) => void call('shoot', { match: id, turn: online.turn, shot }),
      tick: () => void call('tick', { match: id }),
      forfeit: () => void call('forfeit', { match: id }).then(refresh),
    };
    let stop = () => {};
    R.startRing(teams, {
      names: m.names,
      online,
      onEnd: (r) => {
        stop();
        refresh();
        if (r === 'again') setSearching(true);
      },
    });
    stop = watchMatch(id, (row) => R.ringOnline(row));
    R.ringOnline(m);
  };
  const searchError = (code: string) => {
    setSearching(false);
    sfx.deny();
    const key =
      code === 'tuto_required'
        ? 'arena.errTuto'
        : code === 'deck_size'
          ? 'arena.errDeck'
          : code === 'deck_budget'
            ? 'arena.errBudget'
            : 'arena.errNet';
    toast(t(key), true);
    refresh();
  };

  const train = async () => {
    const R = await loadRing();
    const mine = team.filter((u): u is Member => !!u).map((u) => ({ name: u.name, lvl: lvl(u), variant: u.variant }));
    sfx.click();
    R.startRing([mine, botTeam(mine.map((u) => u.lvl))], {
      names: [me.data?.pseudo ?? R.rt('you'), R.rt('bot')],
      ai: 'smart', // prédit ton tir, esquive au bord du vide
      map: randomMap(),
      onEnd: (r) => {
        if (r === 'again') void train();
      },
    });
  };

  return (
    <section className={s.page}>
      <div className={s.colMain}>
        <RankCard me={rk} />
        <h1 className="visually-hidden">{t('arena.title')}</h1>
        {ranked.isPending ? null : !tutoOk ? (
          <div className={rs.lock}>
            <h2>🔒 {t('arena.tutoLock')}</h2>
            <p className="muted">{t('arena.tutoLockTxt')}</p>
            <Button variant="primary" onClick={() => void firstTuto()}>
              {t('arena.tutoStart')}
            </Button>
          </div>
        ) : (
          <>
            {rk?.live ? (
              <button type="button" className={s.play} onClick={() => void enterMatch(rk.live ?? '')}>
                <b>⚔️ {t('arena.resume')}</b>
              </button>
            ) : (
              <button
                type="button"
                className={s.play}
                disabled={!full}
                onClick={() => {
                  sfx.click();
                  setSearching(true);
                }}
              >
                <b>⚔️ {t('arena.play')}</b>
                <small>{t('arena.playRanked')}</small>
              </button>
            )}
            <Button block disabled={!full} onClick={() => void train()}>
              🤖 {t('arena.train')}
            </Button>
          </>
        )}
        {full ? null : <small className={`muted ${s.need}`}>{t('arena.need3')}</small>}

        {tutoOk ? <RankAround elo={elo} /> : null}

        <section className={s.team} aria-labelledby="team-t">
          <header>
            <h2 id="team-t">{t('arena.team')}</h2>
            <Button
              size="sm"
              onClick={() => {
                sfx.click();
                setEditing(true);
              }}
            >
              ✏️ {t('arena.edit')}
            </Button>
          </header>
          <ul>
            {team.map((u, i) =>
              u ? (
                <li key={i}>
                  <TeamCard
                    u={u}
                    pos={slots[i] ?? ''}
                    lvl={lvl(u)}
                    onOpen={() => {
                      sfx.click();
                      setSheet(u);
                    }}
                  />
                </li>
              ) : (
                <li key={i}>
                  <button
                    type="button"
                    className={`${s.slot} ${s.emptySlot}`}
                    onClick={() => {
                      sfx.click();
                      setEditing(true);
                    }}
                  >
                    <span className={s.pos}>{slots[i]}</span>
                    <b aria-hidden>＋</b>
                    <small>{t('arena.pick')}</small>
                  </button>
                </li>
              ),
            )}
          </ul>
        </section>

        <details className={s.help}>
          <summary>{t('arena.howTitle')}</summary>
          <p className="muted">
            <Rich text={t('arena.howText')} />
          </p>
          <Button size="sm" onClick={() => void playTuto()}>
            🎓 {t('arena.tuto')}
          </Button>
        </details>

        <RankRoad elo={elo} />
      </div>
      <aside className={s.colSide}>
        <EloTop />
        <CombatDex inv={inv.data} />
      </aside>

      {searching ? (
        <SearchModal
          elo={elo}
          onClose={() => setSearching(false)}
          onError={searchError}
          onMatch={(id) => {
            setSearching(false);
            refresh();
            void enterMatch(id);
          }}
        />
      ) : null}
      {editing && inv.data ? (
        <TeamEditor groups={inv.data.groups} levels={inv.data} team={team} onClose={() => setEditing(false)} />
      ) : null}
      {sheet ? (
        <TokenSheet
          name={sheet.name}
          serie={sheet.serie}
          variant={sheet.variant}
          lvl={lvl(sheet)}
          onClose={() => setSheet(null)}
        />
      ) : null}
    </section>
  );
}

// Mini carte d'un jeton de l'équipe : image, élément, niveau, pouvoir
function TeamCard({ u, pos, lvl, onOpen }: { u: Member; pos: string; lvl: number; onOpen: () => void }) {
  const t = useT();
  const jn = useJn();
  const lang = useSettings((x) => x.lang);
  const j = jetonOf(u.name, u.serie),
    el = ROLES[roleOf(u.name)],
    k = powerInfo(u.name, lang);
  return (
    <button
      type="button"
      className={s.slot}
      onClick={onOpen}
      style={{ '--g': hexRGB(j.glow), '--el': el.col } as CSSProperties}
    >
      <span className={s.pos}>{pos}</span>
      <span className={s.el} title={el[lang]} aria-label={el[lang]}>
        {el.ico}
      </span>
      <img className={vImg(u.variant)} src={texOf(j)} alt="" />
      {u.variant ? (
        <span className={s.vtag}>
          <VTag v={u.variant} />
        </span>
      ) : null}
      <b>{jn(u.name)}</b>
      <small>
        {t('arena.lvl')} {lvl}
      </small>
      <small className={s.ab} style={{ '--c': k.col } as CSSProperties}>
        ✦ {k.name}
      </small>
    </button>
  );
}
