import { burstAt } from '@/lib/pfx';
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { errorText, questApi } from '@/api';
import { useQuests } from '@/api/queries';
import { ITEM_IMG, hms } from '@/data/items';
import { useAuth } from '@/lib/auth';
import { locale, useSettings } from '@/lib/settings';
import { useT } from '@/i18n/useT';
import { sfx } from '@/engines/sound.js';
import { flyCoins } from '@/ui/fx';
import { celebrateItem } from '@/ui/rewardFx';
import { Button } from '@/ui/Button';
import { toast } from '@/ui/toast';
import { useNow } from '../eco/eco';
import s from './Quests.module.css';
import { Bump } from '@/ui/motion';
import { useSwingAll } from '@/ui/useSwing';

// quêtes dont le texte change au singulier (« Vends un jeton », pas « Vends 1 jetons »)
const ONE = new Set(['pulls', 'rares', 'sold', 'bought']);

// Pièces du bouton vers le solde : le même vol que partout (ui/fx.ts), et un objet gagné file vers l'inventaire
function coinRain(from: HTMLElement, n: number) {
  flyCoins(from.getBoundingClientRect(), n, () => undefined);
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
  const [just, setJust] = useState(''); // ce qu'on vient de récupérer : il claque
  const data = q.data;
  const rows = useRef<HTMLUListElement>(null);
  useSwingAll(rows, 'li', 0.3, data);
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
      coinRain(el, 4); // avant la mise à jour du solde : pas de deuxième vol
      setJust('daily');
      burstAt(el, '#f5cd52', 1.2);
      sfx.upgrade();
      toast(t('ui.daily_got', { n: n(r.amount), s: r.streak }));
      refresh(r.state);
    } catch (e) {
      sfx.deny();
      toast(errorText(e, lang), true);
    }
  };
  const claim = async (id: string, el: HTMLElement, item?: string) => {
    try {
      const st = await questApi.claimQuest(id);
      coinRain(el, 3);
      setJust(id);
      if (item && ITEM_IMG[item]) celebrateItem(ITEM_IMG[item].src);
      refresh(st);
      burstAt(el, '#4ade80');
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
        <div className={`${s.daily} ${d.available ? s.on : ''} ${just === 'daily' ? s.just : ''}`} id="daily">
          <div>
            <b>{t('ui.daily_title')}</b>
            <small className="muted">
              {d.available ? t('ui.daily_streak', { n: d.next_streak }) : t('ui.daily_tomorrow', { n: n(d.tomorrow) })}
            </small>
          </div>
          {d.available ? (
            <Button variant="gold" size="sm" onClick={(e) => void claimDaily(e.currentTarget)}>
              +{n(d.amount)} <img className="px" src="/img/coin.png" alt="" width={14} height={14} />
            </Button>
          ) : (
            <Bump v={d.available} kind="stamp" className={s.check} label="OK">
              ✓
            </Bump>
          )}
        </div>
      ) : null}
      <div className={s.head}>
        <h2 id="q-t">{t('ui.q_title')}</h2>
        <small className="muted">{t('ui.q_reset', { t: hms(left) })}</small>
      </div>
      <ul ref={rows} className={s.list}>
        {/* plus de combat : les quêtes de combat ne sont plus affichées */}
        {data.quests
          .filter((x) => x.stat !== 'battles' && x.stat !== 'wins')
          .map((x, i) => {
            const ok = x.value >= x.target,
              item = x.item ? ITEM_IMG[x.item] : undefined;
            return (
              <li
                key={x.id}
                style={{ '--i': i } as React.CSSProperties}
                className={`${ok ? s.ok : ''} ${x.claimed ? s.claimed : ''} ${just === x.id ? s.just : ''}`}
              >
                <div className={s.top}>
                  <span>
                    {t(`ui.q_${x.stat}${x.target === 1 && ONE.has(x.stat) ? '_1' : ''}` as Parameters<typeof t>[0], {
                      n: x.target,
                    })}
                  </span>
                  <span className={s.rew}>
                    {x.coins ? (
                      <>
                        {n(x.coins)} <img className="px" src="/img/coin.png" alt="" width={16} height={16} />
                      </>
                    ) : null}
                    {/* objet : même écriture que les pièces (le nombre, puis l'image) */}
                    {item ? (
                      <>
                        ×{x.qty || 1}{' '}
                        <img
                          className="px"
                          src={item.src}
                          alt={x.item ?? ''}
                          width={16}
                          height={16}
                          style={item.tint ? ({ '--df': item.tint } as React.CSSProperties) : undefined}
                        />
                      </>
                    ) : null}
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
                  <Bump v={x.claimed} kind="stamp" className={s.check} label="OK">
                    ✓
                  </Bump>
                ) : ok ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={(e) => void claim(x.id, e.currentTarget, x.item ?? undefined)}
                  >
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
