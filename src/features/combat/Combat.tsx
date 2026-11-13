import { useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useSwing } from '@/ui/useSwing';
import { useNavigate } from 'react-router';
import { jetonOf, texOf, vImg, vOdds, glowVars } from '@/data/jetons';
import { RCFG } from '@/engines/ring-config.js';
import { sfx } from '@/engines/sound.js';
import { openUI } from '@/app/ui-store';
import { useAuth } from '@/lib/auth';
import { useJn } from '@/lib/names';
import { useSettings } from '@/lib/settings';
import { useT } from '@/i18n/useT';
import { Button } from '@/ui/Button';
import { Segmented } from '@/ui/Segmented';
import { MutationStamp } from '@/ui/MutationStamp';
import { useInventory } from '../inventory/inv';
import { useDeck, type Member } from './team';
import { useRanked } from './rankedApi';
import { RankAround, RankCard } from './Ranked';
import { RankRoad } from './RankRoad';
import { useStaggerIn } from '@/ui/useStaggerIn';
import { TeamEditor } from './TeamEditor';
import { JetonModal } from '../inventory/JetonModal';
import s from './Combat.module.css';

// Page Combat : rang, JOUER (le Duel au tour par tour), équipe de 3 jetons, classement autour de soi, route des rangs.
export default function Combat() {
  const t = useT();
  const user = useAuth((x) => x.user);
  const inv = useInventory();
  const deck = useDeck();
  const ranked = useRanked();
  const nav = useNavigate();
  // équipe : null = fermé, sinon la place visée (-1 = aucune)
  const [editing, setEditing] = useState<number | null>(null);
  const [ptab, setPtab] = useState<'play' | 'rank'>('play');
  const [sheet, setSheet] = useState<{ u: Member; i: number } | null>(null);
  const editFrom = (i: number) => setEditing(i);
  // la page attend son rang et son équipe, puis ses blocs apparaissent l'un après l'autre (plus de saut au chargement)
  const pageRef = useRef<HTMLElement>(null);
  useStaggerIn(
    pageRef,
    `.${s.heroFloat}, .${s.playMain}, .${s.subRow} > *, .${s.lockBox}, .${s.sat}, .${s.sat} li, .${s.roadRow}`,
    !ranked.isPending && !deck.isPending,
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
          <Button onClick={() => void nav('/duel')}>{t('arena.train')}</Button>
        </div>
      </section>
    );

  const team = deck.data ?? [null, null, null];
  const full = team.every(Boolean);
  const rk = ranked.data;
  const elo = rk?.elo ?? RCFG.ELO.start;
  const play = () => {
    sfx.click();
    void nav('/duel');
  };

  return (
    <section ref={pageRef} className={`${s.page} ${s['t_' + ptab]}`}>
      <h1 className="visually-hidden">{t('arena.title')}</h1>
      {/* téléphone / tablette : 2 onglets au lieu d'une longue page */}
      <div className={s.mtabs}>
        <Segmented
          value={ptab}
          onChange={setPtab}
          label={t('arena.title')}
          options={[
            ['play', t('arena.tab_play')],
            ['rank', t('arena.tab_rank')],
          ]}
        />
      </div>
      {/* comme l'accueil : le rang flotte au centre avec JOUER ; l'équipe et le classement flottent autour */}
      <div className={s.stage}>
        <div className={s.center}>
          {/* le rang flotte et se balance au survol, comme tout le reste */}
          <Float className={s.heroFloat} tilt={0.8} fl={7.5}>
            <div className={s.heroWrap}>
              <RankCard me={rk} />
            </div>
          </Float>
          <div className={s.playCol} data-tour="fight">
            <Float className={s.playMain} tilt={-1.2} fl={5.5}>
              <button type="button" className={s.play} disabled={!full} onClick={play}>
                <b>{t('arena.play')}</b>
              </button>
            </Float>
          </div>
        </div>

        <Sat className={s.satTeam}>
          <TeamList
            team={team}
            onEdit={(i) => {
              sfx.click();
              editFrom(i);
            }}
            onEditAll={() => editFrom(-1)}
            onInfo={(u, i) => {
              sfx.click();
              setSheet({ u, i });
            }}
          />
        </Sat>

        <Sat className={s.satBoard}>
          <RankAround elo={elo} />
        </Sat>
      </div>
      <div className={s.roadRow}>
        <RankRoad elo={elo} />
      </div>

      {editing !== null && inv.data ? (
        <TeamEditor
          groups={inv.data.groups}
          levels={inv.data}
          team={team}
          focus={editing >= 0 ? editing : undefined}
          onClose={() => setEditing(null)}
        />
      ) : null}
      {sheet ? (
        <JetonModal
          name={sheet.u.name}
          serie={sheet.u.serie}
          variant={sheet.u.variant}
          found={{ [sheet.u.variant]: true }}
          onClose={() => setSheet(null)}
        >
          <Button
            variant="primary"
            onClick={() => {
              const i = sheet.i;
              setSheet(null);
              editFrom(i);
            }}
          >
            {t('arena.swap')}
          </Button>
        </JetonModal>
      ) : null}
    </section>
  );
}

// Bloc satellite (comme l'accueil) : il penche un peu, flotte et se balance au passage de la souris
function Sat({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useSwing(ref, 0.06);
  return (
    <div ref={ref} className={`${s.sat} ${className ?? ''}`}>
      {children}
    </div>
  );
}

// Bouton qui flotte doucement et se balance un peu (comme Ouvrir sur l'accueil)
function Float({
  className,
  tilt,
  fl,
  children,
}: {
  className?: string;
  tilt: number;
  fl: number;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useSwing(ref, 0.1);
  return (
    <div
      ref={ref}
      className={`${s.float} ${className ?? ''}`}
      style={{ '--tilt': `${tilt}deg`, '--fl': `${fl}s` } as CSSProperties}
    >
      {children}
    </div>
  );
}

type TeamVProps = {
  team: (Member | null)[];
  onEdit: (i: number) => void;
  onEditAll: () => void;
  onInfo: (u: Member, i: number) => void;
};

// Ton équipe : une grande case par jeton (numéro, jeton, nom, sa chance) ; toucher la case = le changer,
// « i » = sa fiche
function TeamList({ team, onEdit, onEditAll, onInfo }: TeamVProps) {
  const t = useT();
  const jn = useJn();
  const lang = useSettings((x) => x.lang);
  return (
    <section className={s.team} aria-labelledby="team-t">
      <header className={s.teamHead}>
        <h2 id="team-t">{t('arena.team')}</h2>
        <Button size="sm" onClick={onEditAll}>
          {t('arena.edit')}
        </Button>
      </header>
      <ol className={s.teamList}>
        {team.map((u, i) => {
          if (!u)
            return (
              <li key={i}>
                <button type="button" data-slot={i} className={`${s.teamRow} ${s.teamEmpty}`} onClick={() => onEdit(i)}>
                  <span className={s.teamN}>{i + 1}</span>
                  <span className={s.teamPlus} aria-hidden>
                    ＋
                  </span>
                  <span className={s.teamTxt}>
                    <b>{t('arena.pick')}</b>
                  </span>
                </button>
              </li>
            );
          const j = jetonOf(u.name, u.serie);
          const name = jn(u.name);
          return (
            <li key={i}>
              <div className={s.teamRow} data-slot={i} style={glowVars(j, u.variant) as CSSProperties}>
                {/* toute la case change le jeton (bouton posé dessous) ; seul « i » ouvre la fiche */}
                <button
                  type="button"
                  className={s.teamHit}
                  onClick={() => onEdit(i)}
                  aria-label={`${name} · ${t('arena.swap')}`}
                />
                <span className={s.teamN}>{i + 1}</span>
                <img className={vImg(u.variant)} src={texOf(j)} alt="" />
                <span className={s.teamTxt}>
                  <b>
                    {name}
                    {u.variant ? <MutationStamp v={u.variant} size="sm" /> : null}
                  </b>
                  <small>1/{Math.round(vOdds(j.odds, u.variant)).toLocaleString(lang)}</small>
                </span>
                <button
                  type="button"
                  className={s.teamInfo}
                  onClick={() => onInfo(u, i)}
                  aria-label={t('arena.details', { n: name })}
                >
                  i
                </button>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
