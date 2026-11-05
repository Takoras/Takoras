import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { RCFG } from '@/engines/ring-config.js';
import { sfx } from '@/engines/sound.js';
import { useT } from '@/i18n/useT';
import { locale, reducedFx, useSettings } from '@/lib/settings';
import { PixelBg } from '@/ui/PixelBg';
import { useSwing, useSwingAll } from '@/ui/useSwing';
import { RankBadge, useRankName } from './Ranked';
import { rankOf, ROAD, type Rank } from './rankedApi';
import s from './RankRoad.module.css';

// Panneau des rangs, en bas du combat. Le fond est celui des fiches jeton (bandes pixel, rayons, poussière,
// étoiles, anneaux) : plus le rang est haut, plus il est chargé. Au milieu, le badge du rang en très grand
// (doodle, il flotte et se balance), son nom en grosses lettres qui ondulent, puis une barre qui se remplit
// jusqu'à ton Elo, avec le petit badge de chaque division posé dessus et son Elo dessous.
// Les flèches changent de rang comme on change de série à l'accueil : tout le contenu part d'un côté
// jusqu'à sortir du cadre pendant que le rang suivant arrive de l'autre.
const TIERS = RCFG.RANKS.map((r) => ({ k: r.k, col: r.col, steps: ROAD.filter((x) => x.k === r.k) }));
const N = TIERS.length;
const START = 1000;
const SLIDE_MS = 900;
const SWEEP_FROM = TIERS.findIndex((x) => x.k === 'emerald'); // rangs dont le nom a un reflet qui passe
// richesse du fond selon le rang (même échelle que la rareté des jetons)
const BG_ODDS = [1, 60, 300, 1000, 5000, 10_000, 100_000, 1_000_000];

export function RankRoad({ elo }: { elo: number }) {
  const t = useT();
  const cur = rankOf(elo);
  const here = TIERS.findIndex((x) => x.k === cur.k);
  const [view, setView] = useState(here);
  const [out, setOut] = useState<{ i: number; dir: number } | null>(null); // le rang qui s'en va
  const [dir, setDir] = useState(0);
  const panel = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const emblem = useRef<HTMLDivElement>(null);
  const tm = useRef(0);
  // tout le panneau se balance un peu au survol ; le badge aussi, à chaque rang affiché
  useSwing(panel, 0.03);
  useSwingAll(stage, `.${s.in} .${s.emblem}`, 0.3, view);
  useEffect(() => () => clearTimeout(tm.current), []);

  const tier = TIERS[view] ?? TIERS[0];
  if (!tier) return null;
  const go = (d: number) => {
    const to = Math.max(0, Math.min(N - 1, view + d));
    if (to === view) return;
    sfx.click();
    clearTimeout(tm.current);
    if (!reducedFx()) {
      setOut({ i: view, dir: d });
      tm.current = window.setTimeout(() => setOut(null), SLIDE_MS);
    }
    setDir(d);
    setView(to);
  };

  return (
    <section ref={panel} className={s.panel} style={{ '--rc': tier.col } as CSSProperties} aria-labelledby="road-t">
      {/* le fond des fiches jeton ; la couleur glisse d'un rang à l'autre */}
      <PixelBg className={s.bg} odds={BG_ODDS[view] ?? 1} glow={tier.col} center={emblem} still={reducedFx()} />
      <h2 id="road-t" className={s.title}>
        {t('arena.road')}
      </h2>

      {view > 0 ? (
        <button type="button" className={`${s.arrow} ${s.prev}`} onClick={() => go(-1)} aria-label="‹">
          ‹
        </button>
      ) : null}
      {view < N - 1 ? (
        <button type="button" className={`${s.arrow} ${s.next}`} onClick={() => go(1)} aria-label="›">
          ›
        </button>
      ) : null}

      {/* le rang qui part et celui qui arrive glissent ensemble, dans la même case ; le rang qui part garde
          sa clé : c'est le même élément qui s'en va (rien n'est recréé au clic, donc pas de saccade) */}
      <div ref={stage} className={s.stage} style={{ '--ms': `${SLIDE_MS}ms` } as CSSProperties}>
        {out ? <Slide key={`s-${out.i}`} i={out.i} elo={elo} className={s.out ?? ''} dir={out.dir} /> : null}
        <Slide
          key={`s-${view}`}
          i={view}
          elo={elo}
          className={`${s.in} ${dir ? s.arrive : ''}`}
          dir={dir}
          emblem={emblem}
        />
      </div>
    </section>
  );
}

// Le contenu d'un rang : badge, nom, barre des divisions
function Slide({
  i,
  elo,
  className,
  dir,
  emblem,
}: {
  i: number;
  elo: number;
  className: string;
  dir: number;
  emblem?: RefObject<HTMLDivElement | null>;
}) {
  const t = useT();
  const name = useRankName();
  const lang = useSettings((x) => x.lang);
  const fmt = (n: number) => n.toLocaleString(locale(lang));
  const cur = rankOf(elo);
  const here = TIERS.findIndex((x) => x.k === cur.k);
  const tier = TIERS[i];
  if (!tier) return null;
  const next = TIERS[i + 1]?.steps[0];
  // les crans : les divisions du rang, puis la 1re division du rang suivant (le but)
  const marks: Rank[] = [...tier.steps, ...(next ? [next] : [])];
  const at = (r: Rank) => Math.max(r.min, START);
  // remplissage : morceau par morceau entre deux crans, jusqu'à ton Elo
  const fill = (() => {
    if (marks.length < 2) return elo >= at(marks[0] as Rank) ? 1 : 0;
    for (let k = 0; k < marks.length - 1; k++) {
      const a = at(marks[k] as Rank),
        b = at(marks[k + 1] as Rank);
      if (elo < b) return Math.max(0, (k + Math.max(0, (elo - a) / (b - a))) / (marks.length - 1));
    }
    return 1;
  })();
  const shown: Rank = i === here ? cur : (tier.steps[0] as Rank);
  const title = i === here ? name(cur) : t(`arena.r_${tier.k}` as 'arena.r_wood');

  return (
    <div
      className={`${s.slide} ${className}`}
      style={{ '--dir': dir, '--rc': tier.col } as CSSProperties}
      aria-hidden={!emblem}
    >
      <div className={s.hero}>
        <div ref={emblem} className={s.emblem}>
          <span className={s.bob}>
            <RankBadge r={shown} size={220} />
          </span>
        </div>
        {/* à partir d'Émeraude, un reflet de lumière balaie le nom */}
        <b className={`${s.name} ${i >= SWEEP_FROM ? s.sweep : ''}`} aria-label={title}>
          {[...title].map((c, k) => (
            <span key={k} data-c={c === ' ' ? '\u00a0' : c} style={{ '--l': k } as CSSProperties} aria-hidden>
              {c === ' ' ? ' ' : c}
            </span>
          ))}
        </b>
      </div>

      {/* la barre : d'un seul tenant, remplie jusqu'à ton Elo ; chaque division posée dessus */}
      <div className={s.track}>
        <div className={s.bar}>
          <i className={s.fill} style={{ '--p': fill } as CSSProperties} />
        </div>
        {marks.map((r, k) => {
          const on = elo >= at(r);
          const goal = k === marks.length - 1 && !!next;
          return (
            <div
              key={r.idx}
              className={`${s.mark} ${on ? s.on : ''} ${goal ? s.goal : ''} ${r.idx === cur.idx ? s.now : ''}`}
              style={{ '--x': marks.length > 1 ? k / (marks.length - 1) : 0.5, '--k': k } as CSSProperties}
            >
              {goal ? <small className={s.goalName}>{t(`arena.r_${r.k}` as 'arena.r_wood')}</small> : null}
              <span className={s.pb}>
                <RankBadge r={r} size={goal ? 56 : 44} />
              </span>
              <span className={s.elo}>{fmt(r.min > 0 ? r.min : START)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
