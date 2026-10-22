import { useEffect, useState, type CSSProperties } from 'react';
import { useMe } from '@/api/queries';
import { hexRGB, jetonOf, texOf, vImg } from '@/data/jetons';
import { ELS, elOf, powerInfo } from '@/data/kit';
import { RCFG } from '@/engines/ring-config.js';
import { sfx } from '@/engines/sound.js';
import { openUI } from '@/app/ui-store';
import { useAuth } from '@/lib/auth';
import { useJn } from '@/lib/names';
import { locale, useSettings } from '@/lib/settings';
import { fr } from '@/i18n/fr';
import { en } from '@/i18n/en';
import { Rich } from '@/i18n/Rich';
import { useT } from '@/i18n/useT';
import { Button } from '@/ui/Button';
import { VTag } from '@/ui/VTag';
import { lvlOf, useInventory } from '../inventory/inv';
import { botTeam, rankOf, useDeck, type Member } from './team';
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

// Lance le tuto du Ring (sans compte possible)
export const playTuto = async (onEnd?: () => void) => {
  sfx.click();
  (await loadRing()).startRingTuto(() => onEnd?.());
};

// Page Combat : rang, JOUER (classé, bientôt), Entraînement contre l'IA, équipe de 3 jetons, aide
export default function Combat() {
  const t = useT();
  const lang = useSettings((x) => x.lang);
  const user = useAuth((x) => x.user);
  const me = useMe();
  const inv = useInventory();
  const deck = useDeck();
  const [editing, setEditing] = useState(false);
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
  const elo = RCFG.ELO.start,
    rk = rankOf(elo);
  const slots = (lang === 'en' ? en : fr).arena.slots;

  const train = async () => {
    const R = await loadRing();
    if (!R.ringTutoSeen()) return R.startRingTuto(() => undefined);
    const mine = team.filter((u): u is Member => !!u).map((u) => ({ name: u.name, lvl: lvl(u), variant: u.variant }));
    sfx.click();
    R.startRing([mine, botTeam(mine.map((u) => u.lvl))], {
      names: [me.data?.pseudo ?? R.rt('you'), R.rt('bot')],
      ai: 'normal',
      onEnd: (r) => {
        if (r === 'again') void train();
      },
    });
  };

  return (
    <section className={s.page}>
      <div className={s.rank}>
        <span className={s.rankIco} aria-hidden>
          {rk?.ico}
        </span>
        <div>
          <small>{t('arena.rank')}</small>
          <b>{t(`arena.r_${rk?.k ?? 'bronze'}` as 'arena.r_bronze')}</b>
        </div>
        <div className={s.elo}>
          <b>{elo.toLocaleString(locale(lang))}</b>
          <small>Elo</small>
        </div>
      </div>
      <h1 className="visually-hidden">{t('arena.title')}</h1>
      <button type="button" className={s.play} disabled>
        <b>⚔️ {t('arena.play')}</b>
        <small>{t('arena.rankedSoon')}</small>
      </button>
      <Button block disabled={!full} onClick={() => void train()}>
        🤖 {t('arena.train')}
      </Button>
      {full ? null : <small className={`muted ${s.need}`}>{t('arena.need3')}</small>}

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
    el = ELS[elOf(u.name)],
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
      <b>
        {jn(u.name)}
        <VTag v={u.variant} />
      </b>
      <small>
        {t('arena.lvl')} {lvl}
      </small>
      <small className={s.ab} style={{ '--c': k.col } as CSSProperties}>
        ✦ {k.name}
      </small>
    </button>
  );
}
