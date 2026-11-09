import { type CSSProperties } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { MYSTERE, SERIES, texOf, glowVars, tierKey, type Jeton } from '@/data/jetons';
import { useJn } from '@/lib/names';
import { locale, useSettings } from '@/lib/settings';
import { useT } from '@/i18n/useT';
import { openUI } from '@/app/ui-store';
import { openPatchnotes } from '@/features/beta/store';
import { tables } from '@/api';
import { Live } from '../home/Feeds';
import { openInfo } from '../info/store';
import { Sticker } from './Sticker';
import { CardStack } from '@/ui/CardStack';
import { ExpandCard } from '@/ui/ExpandCard';
import { GlassIconReveal } from '@/ui/GlassReveal';
import { SerieName } from '@/ui/SerieName';
import '@fontsource/archivo-black';
import '@fontsource-variable/archivo';
import s from './Landing.module.css';

const SERIE = 'Takoras';
const STAR = 'Néphéris'; // la vignette mise en avant (grande, brillante)
// Cases déjà « collées » sur la double page d'accueil (exemple d'un album en cours, pas de faux chiffres)
const FILLED = new Set(['Mobu', 'Pikko', 'Givre', 'Carmin', 'Nyx', STAR]);
// Petite inclinaison fixe par case : l'album a l'air rempli à la main, sans hasard au rendu
const TILT = [-2.5, 1.5, -1, 2, -1.5, 1, 2.5, -2, 1.5, -1, 2, -2.5, 1, -1.5, 2, -1, 1.5];

const fmt = (n: number, lang: Parameters<typeof locale>[0]) => n.toLocaleString(locale(lang));

// Accueil des visiteurs : un album à vignettes ouvert. Page gauche = le jeu en une phrase et Jouer,
// page droite = les vignettes de la série. Puis une double page « comment ça marche », puis la quatrième de couverture.
export function Landing() {
  const t = useT();
  const play = () => openUI('account');
  const list = SERIES[SERIE] ?? [];

  return (
    <div className={s.page}>
      <section className={s.spread} aria-labelledby="land-title">
        <div className={`${s.leaf} ${s.left}`}>
          <p className={s.running}>{t('ui.land_album', { s: SERIE })}</p>
          <div className={s.pitch}>
            <h1 id="land-title">{t('ui.land_title')}</h1>
            <p className={s.lead}>{t('ui.land_lead')}</p>
            <div className={s.ctas}>
              <button type="button" className={s.play} onClick={play}>
                {t('ui.land_play')}
              </button>
              <button type="button" className={s.link} onClick={openInfo}>
                {t('ui.odds_info')}
              </button>
            </div>
          </div>
        </div>
        <div className={`${s.leaf} ${s.right}`}>
          <Slots list={list} />
        </div>
      </section>

      <div className={s.liveBand}>
        <Live />
      </div>

      <section className={s.spread} aria-labelledby="land-how">
        <div className={`${s.leaf} ${s.left}`}>
          <h2 id="land-how" className={s.h2}>
            {t('ui.land_how')}
          </h2>
          <Steps />
        </div>
        <div className={`${s.leaf} ${s.right}`}>
          <Blueprint />
        </div>
      </section>

      <section className={s.spread} aria-labelledby="land-rares">
        <div className={`${s.leaf} ${s.left}`}>
          <h2 id="land-rares" className={s.h2}>
            {t('ui.land_rares')}
          </h2>
          <Rares />
        </div>
        <div className={`${s.leaf} ${s.right}`}>
          <h2 className={s.h2}>{t('ui.land_series')}</h2>
          <SeriesCards />
        </div>
      </section>

      <section className={s.back} aria-labelledby="land-final">
        <div className={s.backText}>
          <h2 id="land-final" className={s.h2}>
            {t('ui.land_final')}
          </h2>
          <button type="button" className={s.play} onClick={play}>
            {t('ui.land_play')}
          </button>
        </div>
      </section>

      <footer className={s.foot}>
        <span>© Takoras</span>
        <button type="button" onClick={openPatchnotes}>
          {t('ui.pn_title')}
        </button>
        <a href="#credits">{t('ui.land_credits')}</a>
        <Link to="/legal">{t('ui.legal_notice')}</Link>
        <Link to="/terms">{t('ui.terms')}</Link>
        <Link to="/privacy">{t('ui.privacy')}</Link>
        <Credits />
      </footer>
    </div>
  );
}

// Les 12 premières cases de la série, numérotées comme dans un vrai album
function Slots({ list }: { list: Jeton[] }) {
  const t = useT();
  const jn = useJn();
  const lang = useSettings((x) => x.lang);
  const star = list.findIndex((j) => j.name === STAR);
  // grille de 4 × 3 : 8 cases + la vignette vedette en 2 × 2
  const shown = list.slice(0, 8);
  return (
    <ol className={s.slots}>
      {shown.map((j, i) => (
        <Slot key={j.name} j={j} n={i + 1} tilt={TILT[i] ?? 0} />
      ))}
      {star >= 0 && list[star] ? (
        <li className={s.starSlot}>
          <Sticker tilt={-3} big label={t('ui.land_slot', { n: star + 1, name: jn(STAR) })}>
            <span className={s.gloss} style={glowVars(list[star]) as CSSProperties}>
              <img className="px" src={texOf(list[star])} alt="" draggable={false} />
            </span>
            <span className={s.cap}>
              <b>{jn(STAR)}</b>
              <small>1/{fmt(list[star].odds, lang)}</small>
            </span>
          </Sticker>
          <span className={s.num}>{String(star + 1).padStart(3, '0')}</span>
        </li>
      ) : null}
    </ol>
  );
}

function Slot({ j, n, tilt }: { j: Jeton; n: number; tilt: number }) {
  const t = useT();
  const jn = useJn();
  const filled = FILLED.has(j.name);
  return (
    <li className={`${s.slot} ${s[tierKey(j.odds)] ?? ''}`}>
      {filled ? (
        <Sticker tilt={tilt} label={t('ui.land_slot', { n, name: jn(j.name) })}>
          <img className="px" src={texOf(j)} alt="" draggable={false} />
        </Sticker>
      ) : (
        <span className={s.empty} role="img" aria-label={t('ui.land_empty', { n })} />
      )}
      <span className={s.num}>{String(n).padStart(3, '0')}</span>
    </li>
  );
}

// Tirages → Collection → Ring → Classement, en une colonne qu'on lit d'un coup
function Steps() {
  const t = useT();
  const list = SERIES[SERIE] ?? [];
  const steps = [
    { k: 'pull', img: [MYSTERE] },
    { k: 'collec', img: list.slice(0, 3).map((j) => texOf(j)) },
    { k: 'combat', img: list.filter((j) => ['Mobu', 'Carmin', 'Vyolis'].includes(j.name)).map((j) => texOf(j)) },
    { k: 'board', img: [1, 7, 13].map((n) => `/img/ranks/rank${n}.png`) },
  ] as const;
  return (
    <ul className={s.steps}>
      {steps.map((st) => (
        <li key={st.k}>
          <span className={s.stepImgs}>
            {st.img.map((src) => (
              <img key={src} className="px" src={src} alt="" draggable={false} />
            ))}
          </span>
          <span>
            <b>{t(`ui.land_s_${st.k}` as 'ui.land_s_pull')}</b>
            <span className={s.stepTxt}>{t(`ui.land_s_${st.k}_txt` as 'ui.land_s_pull_txt')}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

// La fiche d'une vignette, comme au dos d'une carte : rareté, mutations, stats, pouvoir
function Blueprint() {
  const t = useT();
  const jn = useJn();
  const lang = useSettings((x) => x.lang);
  const list = SERIES[SERIE] ?? [];
  const idx = Math.max(
    0,
    list.findIndex((x) => x.name === STAR),
  );
  const j = list[idx];
  if (!j) return null;
  const rows: [string, string][] = [
    [t('ui.land_bp_rarity'), `1/${fmt(j.odds, lang)}`],
    [t('ui.land_bp_mut'), t('ui.land_bp_mut_v')],
    [t('ui.land_bp_stats'), t('ui.land_bp_stats_v')],
    [t('ui.land_bp_power'), t('ui.land_bp_power_v')],
  ];
  return (
    <div className={s.card}>
      {/* le jeton se révèle dans du verre liquide (clic = rejouer) ; sans WebGL, le sprite seul */}
      <div className={s.cardArt} style={glowVars(j) as CSSProperties}>
        <GlassIconReveal
          className={s.glass}
          logo={texOf(j)}
          label={jn(j.name)}
          look="dark"
          pixel
          originalColors
          keepPlate
          loop={false}
          background="#1e1e28"
          plateColor="#17171f"
          logoScale={0.8}
          tuning={{ present: 2.2 }}
        />
      </div>
      <div className={s.cardBody}>
        <h3>
          {jn(j.name)} <span className={s.cardNum}>{String(idx + 1).padStart(3, '0')}</span>
        </h3>
        <dl>
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <p className={s.stepTxt}>{t('ui.land_bp_txt')}</p>
      </div>
    </div>
  );
}

// Les 3 jetons les plus rares de la série, en pile : le plus rare devant
function Rares() {
  const t = useT();
  const jn = useJn();
  const lang = useSettings((x) => x.lang);
  const list = SERIES[SERIE] ?? [];
  const top = [...list].sort((a, b) => a.odds - b.odds).slice(-3);
  return (
    <CardStack
      className={s.rares}
      cards={top.map((j) => ({
        icon: <img className="px" src={texOf(j)} alt="" draggable={false} />,
        title: jn(j.name),
        description: t('ui.land_rares_odds', { n: fmt(j.odds, lang) }),
        date: `N° ${String(list.indexOf(j) + 1).padStart(3, '0')}`,
        color: j.glow,
      }))}
    />
  );
}

// Une carte par série : elle penche vers la souris et se déplie sur sa page (vignettes + la plus rare au centre)
function SeriesCards() {
  const t = useT();
  const jn = useJn();
  const lang = useSettings((x) => x.lang);
  return (
    <div className={s.seriesCards}>
      {Object.entries(SERIES).map(([name, list]) => {
        const sorted = [...list].sort((a, b) => a.odds - b.odds);
        const star = sorted[sorted.length - 1];
        if (!star) return null;
        return (
          <ExpandCard
            key={name}
            label={name}
            icon={<img className="px" src={texOf(star)} alt="" draggable={false} />}
            badge={t('ui.land_series_count', { n: list.length })}
            title={<SerieName name={name} h="1.6em" />}
            detail={t('ui.land_series_star', { name: jn(star.name), n: fmt(star.odds, lang) })}
            sprites={sorted
              .slice(0, -1)
              .slice(0, 6)
              .map((j) => texOf(j))}
            star={texOf(star)}
            color={star.glow}
          />
        );
      })}
    </div>
  );
}

// Crédits : chaque musique, son, police avec sa licence (table « credits »)
function Credits() {
  const t = useT();
  const q = useQuery({
    queryKey: ['credits'],
    queryFn: async () => (await tables.credits()).data ?? [],
    staleTime: 3_600_000,
  });
  return (
    <div id="credits" className={s.credits}>
      <b>{t('ui.land_credits')}</b>
      {q.isPending ? (
        <p>…</p>
      ) : (
        <ul>
          {(q.data ?? []).map((c) => (
            <li key={c.id}>
              {c.title} · {c.author} ·{' '}
              {c.url ? (
                <a href={c.url} rel="noreferrer noopener" target="_blank">
                  {c.license}
                </a>
              ) : (
                c.license
              )}
            </li>
          ))}
        </ul>
      )}
      <p>{t('ui.land_credits_txt')}</p>
    </div>
  );
}
