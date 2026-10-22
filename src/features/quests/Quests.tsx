import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { errorText, questApi } from '@/api';
import { useQuests } from '@/api/queries';
import { ITEM_IMG, hms } from '@/data/items';
import { useAuth } from '@/lib/auth';
import { locale, useSettings } from '@/lib/settings';
import { useT } from '@/i18n/useT';
import { sfx } from '@/engines/sound.js';
import { moDissolve } from '@/engines/motion.js';
import { Button } from '@/ui/Button';
import { toast } from '@/ui/toast';
import { useNow } from '../eco/eco';
import s from './Quests.module.css';

// Pluie de pièces du bouton vers le solde (en haut)
function coinRain(from: HTMLElement, n: number) {
  const coin = document.querySelector<HTMLImageElement>('header img[src$="piece.png"]');
  if (!coin) return;
  const r = from.getBoundingClientRect();
  for (let i = 0; i < n; i++)
    setTimeout(
      () =>
        moDissolve(
          coin,
          { left: r.left + r.width * (0.15 + i * 0.23) - 18, top: r.top - 8, width: 36, height: 36 } as DOMRect,
          0.8,
        ),
      i * 100,
    );
}

// Bonus du jour (série de jours) + 3 quêtes du jour, sur l'accueil
export function Quests() {
  const t = useT();
  const lang = useSettings((x) => x.lang);
  const uid = useAuth((x) => x.user?.id);
  const q = useQuests();
  const qc = useQueryClient();
  const now = useNow();
  const done = useRef<Set<string> | null>(null);
  const data = q.data;
  // une quête vient d'être terminée (le serveur l'a comptée) : petite notif
  useEffect(() => {
    if (!data) return;
    const finished = new Set(data.quests.filter((x) => x.value >= x.target && !x.claimed).map((x) => x.id));
    if (done.current)
      [...finished]
        .filter((id) => !done.current?.has(id))
        .forEach(() => {
          sfx.regen();
          toast(t('ui.q_done'));
        });
    done.current = finished;
  }, [data, t]);
  if (!uid || !data) return null;
  const n = (v: number) => v.toLocaleString(locale(lang));
  const left = Math.max(0, data.reset_in - Math.round((now - data.at) / 1000));
  const refresh = (st: unknown) => {
    qc.setQueryData(['me', uid], st);
    void qc.invalidateQueries({ queryKey: ['quests'] });
  };
  const claimDaily = async (el: HTMLElement) => {
    try {
      const r = (await questApi.claimDaily()) as { amount: number; streak: number; state: unknown };
      coinRain(el, 4);
      sfx.upgrade();
      toast(t('ui.daily_got', { n: n(r.amount), s: r.streak }));
      refresh(r.state);
    } catch (e) {
      sfx.deny();
      toast(errorText(e, lang), true);
    }
  };
  const claim = async (id: string, el: HTMLElement) => {
    try {
      refresh(await questApi.claimQuest(id));
      coinRain(el, 3);
      sfx.upgrade();
      toast(t('ui.q_got'));
    } catch (e) {
      sfx.deny();
      toast(errorText(e, lang), true);
    }
  };
  const d = data.daily;
  return (
    <section className={s.box} aria-labelledby="q-t">
      {d ? (
        <div className={`${s.daily} ${d.available ? s.on : ''}`} id="daily">
          <div>
            <b>{t('ui.daily_title')}</b>
            <small className="muted">
              {d.available ? t('ui.daily_streak', { n: d.next_streak }) : t('ui.daily_tomorrow', { n: n(d.tomorrow) })}
            </small>
          </div>
          {d.available ? (
            <Button variant="gold" size="sm" onClick={(e) => void claimDaily(e.currentTarget)}>
              +{n(d.amount)} <img className="px" src="/img/piece.png" alt="" width={14} height={14} />
            </Button>
          ) : (
            <span className={s.check} aria-label="OK">
              ✓
            </span>
          )}
        </div>
      ) : null}
      <div className={s.head}>
        <h2 id="q-t">{t('ui.q_title')}</h2>
        <small className="muted">{t('ui.q_reset', { t: hms(left) })}</small>
      </div>
      <ul className={s.list}>
        {data.quests.map((x) => {
          const ok = x.value >= x.target,
            item = x.item ? ITEM_IMG[x.item] : undefined;
          return (
            <li key={x.id} className={`${ok ? s.ok : ''} ${x.claimed ? s.claimed : ''}`}>
              <div className={s.top}>
                <span>{t(`ui.q_${x.stat}` as Parameters<typeof t>[0], { n: x.target })}</span>
                <span className={s.rew}>
                  {x.coins ? (
                    <>
                      {n(x.coins)} <img className="px" src="/img/piece.png" alt="" width={12} height={12} />
                    </>
                  ) : null}
                  {item ? (
                    <img
                      className="px"
                      src={item.src}
                      alt={x.item ?? ''}
                      width={18}
                      height={18}
                      style={item.tint ? ({ '--df': item.tint } as React.CSSProperties) : undefined}
                    />
                  ) : null}
                  {x.qty > 1 ? `×${x.qty}` : ''}
                </span>
              </div>
              <div
                className={s.bar}
                role="progressbar"
                aria-valuenow={x.value}
                aria-valuemin={0}
                aria-valuemax={x.target}
                aria-label={t('ui.q_title')}
              >
                <i style={{ width: `${Math.min(100, (x.value / x.target) * 100)}%` }} />
                <b>
                  {Math.min(x.value, x.target)}/{x.target}
                </b>
              </div>
              {x.claimed ? (
                <span className={s.check} aria-label="OK">
                  ✓
                </span>
              ) : ok ? (
                <Button variant="primary" size="sm" onClick={(e) => void claim(x.id, e.currentTarget)}>
                  {t('ui.q_claim')}
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
