import { useEffect, useState } from 'react';
import { useMe } from '@/api/queries';
import { useSettings } from '@/lib/settings';
import s from './BoostChip.module.css';

// Étiquette en haut à droite pendant un bonus : week-end boosté (vendredi 12 h → dimanche minuit) ou recharge rapide des
// 24 premières heures. Survol ou toucher : la liste des bonus et le temps qui reste.
const TXT = {
  fr: {
    we: 'Week-end',
    weList: ['Revente ×1,2', 'Recharge plus rapide', 'Mutations ×2'],
    nb: 'Recharge rapide',
    nbList: ['Un tirage toutes les 30 s'],
    left: 'encore {t}',
  },
  en: {
    we: 'Weekend',
    weList: ['Selling ×1.2', 'Faster recharge', 'Mutations ×2'],
    nb: 'Fast recharge',
    nbList: ['One pull every 30 s'],
    left: '{t} left',
  },
};
const dur = (sec: number, lang: string) => {
  const d = Math.floor(sec / 86400),
    h = Math.floor(sec / 3600) % 24,
    m = Math.floor(sec / 60) % 60;
  const j = lang === 'en' ? 'd' : 'j';
  return d ? `${d} ${j} ${h} h` : h ? `${h} h ${String(m).padStart(2, '0')}` : `${Math.max(1, m)} min`;
};

export function BoostChip() {
  const lang = useSettings((x) => x.lang);
  const T = TXT[lang === 'en' ? 'en' : 'fr'];
  const me = useMe();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  const gone = Math.max(0, Math.floor((now - me.dataUpdatedAt) / 1000));
  const we = Math.max(0, Number(me.data?.weekend_left ?? 0) - gone);
  const nb = Math.max(0, Number(me.data?.newbie_left ?? 0) - gone);
  const chip = we > 0 ? { k: 'we', name: T.we, list: T.weList, left: we } : nb > 0 ? { k: 'nb', name: T.nb, list: T.nbList, left: nb } : null;
  if (!chip) return null;
  return (
    <span className={`${s.wrap} ${chip.k === 'we' ? s.we : s.nb}`}>
      <button type="button" className={s.chip}>
        {chip.name}
      </button>
      <span className={s.pop} role="tooltip">
        {chip.list.map((l) => (
          <b key={l}>{l}</b>
        ))}
        <small>{T.left.replace('{t}', dur(chip.left, lang))}</small>
      </span>
    </span>
  );
}
