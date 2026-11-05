import { useRef, useState, type CSSProperties } from 'react';
import { RCFG } from '@/engines/ring-config.js';
import { sfx } from '@/engines/sound.js';
import { useT } from '@/i18n/useT';
import { locale, useSettings } from '@/lib/settings';
import { useSwing } from '@/ui/useSwing';
import { RankBadge, useRankName } from './Ranked';
import { rankOf, ROAD, type Rank } from './rankedApi';
import s from './RankRoad.module.css';

// Panneau des rangs, en bas du combat : le badge du rang en très grand au milieu, son nom dessous en grosses
// lettres, puis une barre qui va de sa 1re division au rang suivant ; sur chaque cran, le petit badge de la
// division est planté sur un poteau, et son Elo est écrit dessous. La barre se remplit jusqu'à ton Elo.
// Les flèches parcourent tous les rangs (on arrive sur le tien). Fond : le badge du rang en motif discret.
const TIERS = RCFG.RANKS.map((r) => ({ k: r.k, col: r.col, steps: ROAD.filter((x) => x.k === r.k) }));
const N = TIERS.length;
const START = 1000;

export function RankRoad({ elo }: { elo: number }) {
  const t = useT();
  const name = useRankName();
  const lang = useSettings((x) => x.lang);
  const fmt = (n: number) => n.toLocaleString(locale(lang));
  const cur = rankOf(elo);
  const here = TIERS.findIndex((x) => x.k === cur.k);
  const [view, setView] = useState(here);
  const emblem = useRef<HTMLDivElement>(null);
  useSwing(emblem, 0.3);

  const tier = TIERS[view] ?? TIERS[0];
  if (!tier) return null;
  const next = TIERS[view + 1]?.steps[0];
  // les crans : les divisions du rang, puis la 1re division du rang suivant (le but)
  const marks: Rank[] = [...tier.steps, ...(next ? [next] : [])];
  const at = (r: Rank) => Math.max(r.min, START);
  // remplissage : morceau par morceau entre deux crans, jusqu'à ton Elo
  const fill = (() => {
    if (marks.length < 2) return elo >= (marks[0]?.min ?? 0) ? 1 : 0;
    for (let i = 0; i < marks.length - 1; i++) {
      const a = at(marks[i] as Rank),
        b = at(marks[i + 1] as Rank);
      if (elo < b) return Math.max(0, (i + Math.max(0, (elo - a) / (b - a))) / (marks.length - 1));
    }
    return 1;
  })();
  const locked = view > here;
  const shown: Rank = view === here ? cur : (tier.steps[0] as Rank);
  // motif du fond : le badge du rang (sprite) répété, très discret
  const pat = `/img/ranks/rank${Math.min(18, (tier.steps[0]?.idx ?? 0) + 1)}.png`;
  const go = (d: number) => {
    sfx.click();
    setView((v) => Math.max(0, Math.min(N - 1, v + d)));
  };

  return (
    <section
      className={`${s.panel} ${locked ? s.locked : ''}`}
      style={{ '--rc': tier.col, '--pat': `url(${pat})` } as CSSProperties}
      aria-labelledby="road-t"
    >
      <h2 id="road-t" className={s.title}>
        {t('arena.road')}
      </h2>

      <button
        type="button"
        className={`${s.arrow} ${s.prev}`}
        onClick={() => go(-1)}
        disabled={view <= 0}
        aria-label="‹"
      >
        ‹
      </button>
      <button
        type="button"
        className={`${s.arrow} ${s.next}`}
        onClick={() => go(1)}
        disabled={view >= N - 1}
        aria-label="›"
      >
        ›
      </button>

      {/* le badge en très grand, et le nom du rang en grosses lettres dessous ; ils repartent à chaque rang */}
      <div className={s.hero} key={tier.k}>
        <div ref={emblem} className={s.emblem}>
          {view === here ? <em className={s.you}>{t('arena.you')}</em> : null}
          <RankBadge r={shown} size={220} />
        </div>
        <b className={s.name}>{view === here ? name(cur) : t(`arena.r_${tier.k}` as 'arena.r_wood')}</b>
      </div>

      {/* la barre des divisions */}
      <div className={s.track} key={`b-${tier.k}`} style={{ '--n': marks.length } as CSSProperties}>
        <div className={s.bar}>
          <i className={s.fill} style={{ '--p': fill } as CSSProperties} />
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
