import type { CSSProperties } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { errorText, passApi } from '@/api';
import { glowVars, jetonOf, texOf } from '@/data/jetons';
import { powerInfo } from '@/data/kit';
import { sfx } from '@/engines/sound.js';
import { useAuth } from '@/lib/auth';
import { useJn } from '@/lib/names';
import { useSettings } from '@/lib/settings';
import { useT } from '@/i18n/useT';
import { Button } from '@/ui/Button';
import { toast } from '@/ui/toast';
import s from './Starter.module.css';

type StarterData = {
  pending: boolean;
  choices: string[];
  quest: { pull: boolean; shop: boolean; ring: boolean; done: boolean } | null;
};

// Nouveau joueur : choisir son jeton de départ (1 parmi 3), puis la quête tuto (pull → boutique → Ring) qui rapporte 500 pièces
export function Starter() {
  const t = useT();
  const jn = useJn();
  const lang = useSettings((x) => x.lang);
  const uid = useAuth((x) => x.user?.id);
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['starter', uid],
    enabled: !!uid,
    queryFn: async () => (await passApi.starter()) as unknown as StarterData,
  });
  const d = q.data;
  if (!d || (!d.pending && (!d.quest || d.quest.done))) return null;
  const after = (st: unknown) => {
    qc.setQueryData(['me', uid], st);
    void q.refetch();
    void qc.invalidateQueries({ queryKey: ['inv'] });
  };
  const pick = async (name: string) => {
    try {
      after(await passApi.starterPick(name));
      sfx.upgrade();
      toast(t('ui.st_picked', { n: jn(name) }));
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
  if (d.pending)
    return (
      <section className={s.box} aria-labelledby="st-t">
        <h2 id="st-t">{t('ui.st_pick')}</h2>
        <ul className={s.choices}>
          {d.choices.map((name) => {
            const j = jetonOf(name),
              k = powerInfo(name, lang);
            return (
              <li key={name} style={glowVars(j) as CSSProperties}>
                <button type="button" onClick={() => void pick(name)}>
                  <img className="px" src={texOf(j)} alt="" />
                  <b>{jn(name)}</b>
                  <small className={s.pw} style={{ color: k.col }}>
                    {k.name}
                  </small>
                  <small>{k.desc}</small>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    );
  const st = d.quest;
  if (!st) return null;
  const steps = [
    ['pull', st.pull],
    ['shop', st.shop],
    ['ring', st.ring],
  ] as const;
  const all = steps.every(([, ok]) => ok);
  return (
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
  );
}
