import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { RCFG } from '@/engines/ring-config.js';
import { sfx } from '@/engines/sound.js';
import { useT } from '@/i18n/useT';
import { locale, useSettings } from '@/lib/settings';
import { Modal } from '@/ui/Modal';
import { useSwingAll } from '@/ui/useSwing';
import { RankBadge, useRankName } from './Ranked';
import { rankOf, ROAD, type Rank } from './rankedApi';
import s from './RankRoad.module.css';

// Route des rangs en escalier : une marche par rang, de plus en plus haute, qui flotte comme le podium de l'accueil.
// Le badge du rang est posé dessus, en grand. Rangs pas encore atteints : badge en silhouette (on le découvre
// au survol). Toucher une marche ouvre la fiche du rang (comme la fiche d'un jeton) avec ses divisions.
const TIERS = RCFG.RANKS.map((r) => ({ k: r.k, col: r.col, steps: ROAD.filter((x) => x.k === r.k) }));
type Tier = (typeof TIERS)[number];

export function RankRoad({ elo }: { elo: number }) {
  const t = useT();
  const name = useRankName();
  const lang = useSettings((x) => x.lang);
  const fmt = (n: number) => n.toLocaleString(locale(lang));
  const cur = rankOf(elo);
  const here = TIERS.findIndex((x) => x.k === cur.k);
  const [open, setOpen] = useState<number | null>(null);
  const list = useRef<HTMLOListElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  // les badges se balancent au passage de la souris, accrochés par le haut
  useSwingAll(list, `.${s.badge}`, 0.5);
  // téléphone : l'escalier défile jusqu'à ta marche
  useEffect(() => {
    const sc = scroller.current;
    const li = list.current?.children[here] as HTMLElement | undefined;
    if (sc && li && sc.scrollWidth > sc.clientWidth)
      sc.scrollLeft = li.offsetLeft - sc.clientWidth / 2 + li.offsetWidth / 2;
  }, [here]);

  const label = (x: Tier) => t(`arena.r_${x.k}` as 'arena.r_wood');
  const minOf = (x: Tier) => x.steps[0]?.min ?? 0;
  const eloTxt = (x: Tier) => (minOf(x) > 0 ? `${fmt(minOf(x))}+` : `< ${fmt(minOf(TIERS[1] ?? x))}`);
  const o = open !== null ? TIERS[open] : undefined;

  return (
    <section className={s.road} aria-labelledby="road-t">
      <h2 id="road-t">{t('arena.road')}</h2>
      <div ref={scroller} className={s.scroll}>
        <ol ref={list} className={s.stairs}>
          {TIERS.map((x, i) => {
            const state = i < here ? s.passed : i === here ? s.here : s.locked;
            const shown: Rank = i === here ? cur : (x.steps[0] ?? cur);
            return (
              <li
                key={x.k}
                className={state}
                style={{ '--rc': x.col, '--i': i } as CSSProperties}
                aria-current={i === here ? 'step' : undefined}
              >
                <button
                  type="button"
                  className={s.stepBtn}
                  onClick={() => {
                    sfx.click();
                    setOpen(i);
                  }}
                  aria-label={`${label(x)} · ${eloTxt(x)}`}
                >
                  {i === here ? <em className={s.you}>{t('arena.you')}</em> : null}
                  <span className={s.badge}>
                    <RankBadge r={shown} size={i === here ? 96 : 76} />
                  </span>
                  {/* la marche : un bloc pixel à la couleur du rang, avec sa tranche */}
                  <span className={s.block}>
                    <b>{i === here ? name(cur) : label(x)}</b>
                    <small>{eloTxt(x)}</small>
                    {x.steps.length > 1 ? (
                      <span className={s.pips} aria-hidden>
                        {x.steps.map((r) => (
                          <i
                            key={r.idx}
                            className={r.idx < cur.idx ? s.pipDone : r.idx === cur.idx ? s.pipNow : undefined}
                          />
                        ))}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      {/* fiche d'un rang : le badge en grand et ses divisions */}
      {o ? (
        <Modal open onClose={() => setOpen(null)} title={label(o)}>
          <div className={s.sheet} style={{ '--rc': o.col } as CSSProperties}>
            <div className={s.sheetBadge}>
              <RankBadge r={open === here ? cur : (o.steps[0] ?? cur)} size={150} />
            </div>
            <ol className={s.divs}>
              {o.steps.map((r, k) => {
                const st = r.idx < cur.idx ? s.dDone : r.idx === cur.idx ? s.dNow : s.dLocked;
                return (
                  <li key={r.idx} className={st} style={{ '--k': k } as CSSProperties}>
                    <RankBadge r={r} size={48} />
                    <b>{name(r)}</b>
                    <small>
                      {r.idx === cur.idx ? `${t('arena.you')} · ` : ''}
                      {r.min > 0 ? `${fmt(r.min)}+` : `< ${fmt(r.max ?? 0)}`}
                    </small>
                  </li>
                );
              })}
            </ol>
          </div>
        </Modal>
      ) : null}
    </section>
  );
}
