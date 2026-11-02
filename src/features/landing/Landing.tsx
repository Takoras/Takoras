import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MYSTERE, SERIES, texOf, vImg, glowVars, tierKey, type Jeton } from '@/data/jetons';
import { useJn } from '@/lib/names';
import { locale, useSettings } from '@/lib/settings';
import { useT } from '@/i18n/useT';
import { openUI } from '@/app/ui-store';
import { openPatchnotes } from '@/features/beta/store';
import { tables } from '@/api';
import { Live } from '../home/Feeds';
import { openInfo } from '../info/store';
import { Sticker } from './Sticker';
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

      <section className={s.back} aria-labelledby="land-final">
        <AutoDemo />
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
        <span>{t('ui.land_legal')}</span>
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
          <Sticker
            tilt={-3}
            big
            label={t('ui.land_slot', { n: star + 1, name: jn(STAR) })}
          >
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
  const idx = Math.max(0, list.findIndex((x) => x.name === STAR));
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
      <div className={s.cardArt} style={glowVars(j) as CSSProperties}>
        <img className="px" src={texOf(j)} alt="" draggable={false} />
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

// Démo de l'ouverture auto : la pochette défile vite et s'arrête sur une rare.
// Elle ne tourne que quand elle est à l'écran.
function AutoDemo() {
  const t = useT();
  const jn = useJn();
  const lang = useSettings((x) => x.lang);
  const list = SERIES[SERIE] ?? [];
  const box = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(0);
  const [seen, setSeen] = useState(false);
  const rare = list.length - 1 >= 7 ? 7 : list.length - 1;
  const seq = [0, 1, 0, 2, 1, 0, 3, 1, 0, 2, rare];
  const stop = k === seq.length - 1;

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setSeen(!!e?.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!seen || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setTimeout(() => setK((x) => (x + 1) % seq.length), stop ? 2400 : 240);
    return () => clearTimeout(id);
  }, [k, seen, stop, seq.length]);

  const j = list[seq[k] ?? 0];
  if (!j) return null;
  return (
    <div ref={box} className={`${s.pack} ${stop ? s.packStop : ''}`} style={glowVars(j, stop ? 'gold' : '') as CSSProperties}>
      <img className={vImg(stop ? 'gold' : '')} src={texOf(j)} alt="" draggable={false} />
      <b aria-live="off">{stop ? `${jn(j.name)} · 1/${fmt(j.odds * 20, lang)}` : `×${k + 1}`}</b>
      <span className={s.packTxt}>
        <b>{t('ui.land_auto')}</b>
        {t('ui.land_auto_txt')}
      </span>
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
