import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { errorText, passApi } from '@/api';
import { sfx } from '@/engines/sound.js';
import { useAuth } from '@/lib/auth';
import { useSettings } from '@/lib/settings';
import type { Key } from '@/i18n';
import { useT } from '@/i18n/useT';
import { Button } from '@/ui/Button';
import { toast } from '@/ui/toast';
import { GiftReveal } from './GiftReveal';
import { useSwingAll } from '@/ui/useSwing';
import s from './Starter.module.css';
import { Swap } from '@/ui/Swap';

type StarterData = {
  pending: boolean;
  choices: string[];
  quest: { pull: boolean; shop: boolean; ring: boolean; done: boolean } | null;
};

// Nouveau joueur : choisir son cadeau de départ (chance, tirages, pièces ou un cosmétique), puis la quête tuto
// (un tirage → la boutique) qui rapporte 500 pièces. Les cadeaux penchent et se balancent comme les rayons de la boutique.
const GIFT_IMG: Record<string, string> = {
  luck: '/img/potions/luck-2.png',
  pulls: '/img/items/hourglass.png',
  coins: '/img/coin.png',
  cosm: '/img/avatars/eyes.png',
};
export function Starter() {
  const t = useT();
  const listRef = useRef<HTMLUListElement>(null);
  // cadeau en cours d'affichage (et l'état du compte à appliquer quand il s'envole : les pièces arrivent à ce moment)
  const [got, setGot] = useState<{ g: string; st: unknown } | null>(null);
  const lang = useSettings((x) => x.lang);
  const uid = useAuth((x) => x.user?.id);
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['starter', uid],
    enabled: !!uid,
    queryFn: async () => (await passApi.starter()) as unknown as StarterData,
  });
  const d = q.data;
  useSwingAll(listRef, 'button', 0.5, d?.pending ? 1 : 0, 70);
  const reveal = got ? (
    <GiftReveal
      gift={got.g}
      img={GIFT_IMG[got.g] ?? ''}
      onGone={() => {
        qc.setQueryData(['me', uid], got.st);
        void q.refetch();
        void qc.invalidateQueries({ queryKey: ['inv'] });
        setGot(null);
      }}
    />
  ) : null;
  if (got) return reveal;
  if (!d) return null;
  // cadeau → quête → terminé : un fondu, et la boîte se replie au lieu de disparaître d'un coup
  const step = d.pending ? 'gift' : d.quest && !d.quest.done ? 'quest' : null;
  const after = (st: unknown) => {
    qc.setQueryData(['me', uid], st);
    void q.refetch();
    void qc.invalidateQueries({ queryKey: ['inv'] });
  };
  const pick = async (g: string) => {
    try {
      const r = (await passApi.starterGift(g)) as unknown as { state: unknown };
      setGot({ g, st: r.state });
    } catch (e) {
      sfx.deny();
      toast(errorText(e, lang), true);
    }
  };
  const claim = async () => {
    try {
      after(await passApi.starterQuest());
      sfx.upgrade();
      toast(t('ui.st_quest_got'));
    } catch (e) {
      sfx.deny();
      toast(errorText(e, lang), true);
    }
  };
  const st = d.quest;
  const steps = st
    ? ([
        ['pull', st.pull],
        ['shop', st.shop],
      ] as const)
    : [];
  const all = steps.every(([, ok]) => ok);
  return (
    <Swap k={step}>
      {step === 'gift' ? (
        <section className={s.box} aria-labelledby="st-t">
          <h2 id="st-t">{t('ui.st_pick')}</h2>
          <ul ref={listRef} className={s.gifts}>
            {d.choices.map((g) => (
              <li key={g}>
                <button type="button" onClick={() => void pick(g)}>
                  <img className="px" src={GIFT_IMG[g]} alt="" />
                  <b>{t(`ui.st_g_${g}` as Key)}</b>
                  <small>{t(`ui.st_g_${g}_d` as Key)}</small>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : step === 'quest' ? (
        <section className={s.box} aria-labelledby="stq-t">
          <h2 id="stq-t">{t('ui.st_quest')}</h2>
          <ol className={s.steps}>
            {steps.map(([k, ok]) => (
              <li key={k} className={ok ? s.ok : undefined}>
                <span aria-hidden>{ok ? '✓' : ''}</span>
                {t(`ui.st_q_${k}`)}
              </li>
            ))}
          </ol>
          <Button variant="primary" size="sm" disabled={!all} onClick={() => void claim()}>
            {t('ui.st_quest_claim')}
          </Button>
        </section>
      ) : null}
    </Swap>
  );
}
