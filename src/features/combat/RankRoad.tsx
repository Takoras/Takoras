import { useRef, useState, type CSSProperties } from 'react';
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
// (doodle, il flotte et se balance), son nom en grosses lettres qui ondulent, puis une barre en cases pixel
// qui s'allument jusqu'à ton Elo, avec le petit badge de chaque division planté au-dessus.
// Les flèches font défiler les rangs : le nouveau arrive de côté, en vitesse, et rebondit en place.
const TIERS = RCFG.RANKS.map((r) => ({ k: r.k, col: r.col, steps: ROAD.filter((x) => x.k === r.k) }));
const N = TIERS.length;
const START = 1000;
const CELLS = 8; // cases de la barre entre deux crans
// richesse du fond selon le rang (même échelle que la rareté des jetons)
const BG_ODDS = [1, 60, 300, 1000, 5000, 10_000, 100_000, 1_000_000];

export function RankRoad({ elo }: { elo: number }) {
  const t = useT();
  const name = useRankName();
  const lang = useSettings((x) => x.lang);
  const fmt = (n: number) => n.toLocaleString(locale(lang));
  const cur = rankOf(elo);
  const here = TIERS.findIndex((x) => x.k === cur.k);
  const [view, setView] = useState(here);
  const [dir, setDir] = useState(0); // d'où arrive le rang affiché (-1 gauche, 1 droite, 0 au chargement)
  const panel = useRef<HTMLElement>(null);
  const hero = useRef<HTMLDivElement>(null);
  const emblem = useRef<HTMLDivElement>(null);
  // tout le panneau se balance un peu au survol ; le badge aussi, à chaque rang affiché
  useSwing(panel, 0.08);
  useSwingAll(hero, `.${s.emblem}`, 0.3, view);

  const tier = TIERS[view] ?? TIERS[0];
  if (!tier) return null;
  const next = TIERS[view + 1]?.steps[0];
  // les crans : les divisions du rang, puis la 1re division du rang suivant (le but)
  const marks: Rank[] = [...tier.steps, ...(next ? [next] : [])];
  const at = (r: Rank) => Math.max(r.min, START);
  // nombre de cases allumées : morceau par morceau entre deux crans, jusqu'à ton Elo
  const segs = Math.max(1, marks.length - 1);
  const total = segs * CELLS;
  const lit = (() => {
    if (marks.length < 2) return elo >= at(marks[0] as Rank) ? total : 0;
    for (let i = 0; i < marks.length - 1; i++) {
      const a = at(marks[i] as Rank),
        b = at(marks[i + 1] as Rank);
      if (elo < b) return Math.floor((i + Math.max(0, (elo - a) / (b - a))) * CELLS);
    }
    return total;
  })();
  const shown: Rank = view === here ? cur : (tier.steps[0] as Rank);
  const title = view === here ? name(cur) : t(`arena.r_${tier.k}` as 'arena.r_wood');
  const go = (d: number) => {
    sfx.click();
    setDir(d);
    setView((v) => Math.max(0, Math.min(N - 1, v + d)));
  };

  return (
    <section
      ref={panel}
      className={s.panel}
      style={{ '--rc': tier.col, '--dir': dir } as CSSProperties}
      aria-labelledby="road-t"
    >
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

      {/* badge + nom : ils arrivent de côté à chaque changement de rang */}
      <div ref={hero} className={`${s.hero} ${dir ? s.moving : ''}`} key={tier.k}>
        {dir ? <i className={s.speed} aria-hidden /> : null}
        <div ref={emblem} className={s.emblem}>
          <span className={s.bob}>
            <RankBadge r={shown} size={220} />
          </span>
        </div>
        <b className={s.name} aria-label={title}>
          {[...title].map((c, i) => (
            <span key={i} style={{ '--l': i } as CSSProperties} aria-hidden>
              {c === ' ' ? '\u00a0' : c}
            </span>
          ))}
        </b>
      </div>

      {/* la barre : des cases pixel qui s'allument une à une, un petit badge planté sur chaque cran */}
      <div className={s.track} key={`b-${tier.k}`}>
        <div className={s.cells} style={{ '--n': total } as CSSProperties}>
          {Array.from({ length: total }, (_, i) => (
            <i
              key={i}
              className={i < lit ? s.cellOn : i === lit && view === here ? s.cellNow : undefined}
              style={{ '--c': i } as CSSProperties}
            />
          ))}
        </div>
        {marks.map((r, i) => {
          const on = elo >= at(r);
          const goal = i === marks.length - 1 && !!next;
          return (
            <div
              key={r.idx}
              className={`${s.mark} ${on ? s.on : ''} ${goal ? s.goal : ''} ${r.idx === cur.idx ? s.now : ''}`}
              style={{ '--x': marks.length > 1 ? i / (marks.length - 1) : 0.5, '--k': i } as CSSProperties}
            >
              <span className={s.pin}>
                <span className={s.pb}>
                  <RankBadge r={r} size={goal ? 58 : 46} />
                </span>
                {goal ? <small>{t(`arena.r_${r.k}` as 'arena.r_wood')}</small> : null}
              </span>
              <span className={s.elo}>{fmt(r.min > 0 ? r.min : START)}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
