import { useEffect, useState, type CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { hexRGB, MYSTERE, SERIES, texOf, vImg } from '@/data/jetons';
import { useJn } from '@/lib/names';
import { useOnline } from '@/lib/online';
import { locale, useSettings } from '@/lib/settings';
import { useT } from '@/i18n/useT';
import { openUI } from '@/app/ui-store';
import { openPatchnotes } from '@/features/beta/store';
import { Button } from '@/ui/Button';
import { tables } from '@/api';
import { Live } from '../home/Feeds';
import { openInfo } from '../info/store';
import s from './Landing.module.css';

// Accueil des visiteurs (pas connectés) : une section par écran, sobre (aplats, bordures 1 px, pas de dégradés).
// Hero → En direct → le jeton expliqué (blueprint) → Pulls / Collection / Combat / Classement → ouverture auto → pied de page.
export function Landing() {
  const t = useT();
  const online = useOnline((x) => x.n);
  const play = () => openUI('account');
  return (
    <div className={s.page}>
      <section className={s.hero}>
        <img className={`px ${s.logo}`} src="/img/logo.png" alt="" width={96} height={96} />
        <h1>{t('ui.land_title')}</h1>
        <p className={s.lead}>{t('ui.land_lead')}</p>
        <div className={s.ctas}>
          <Button variant="primary" onClick={play}>
            {t('ui.land_play')}
          </Button>
          <Button onClick={openInfo}>{t('ui.odds_info')}</Button>
          {online ? <span className={s.online}>● {t('ui.online', { n: online })}</span> : null}
        </div>
      </section>

      <section className={s.live}>
        <Live />
      </section>

      <Blueprint />

      <Steps />

      <AutoDemo />

      <section className={s.final}>
        <h2>{t('ui.land_final')}</h2>
        <Button variant="primary" onClick={play}>
          {t('ui.land_play')}
        </Button>
      </section>

      <footer className={s.foot}>
        <span>© Takoras</span>
        <button type="button" onClick={openPatchnotes}>
          {t('ui.pn_title')}
        </button>
        <a href="#credits">{t('ui.land_credits')}</a>
        <span className="muted">{t('ui.land_legal')}</span>
        <Credits />
      </footer>
    </div>
  );
}

// Le jeton au centre, ses infos autour, comme un plan technique (pas de titre)
function Blueprint() {
  const t = useT();
  const jn = useJn();
  const j = SERIES.Takoras?.find((x) => x.name === 'Néphéris') ?? SERIES.Takoras?.[0];
  if (!j) return null;
  const notes: [string, string][] = [
    [t('ui.land_bp_rarity'), '1/100 000'],
    [t('ui.land_bp_mut'), t('ui.land_bp_mut_v')],
    [t('ui.land_bp_stats'), t('ui.land_bp_stats_v')],
    [t('ui.land_bp_power'), t('ui.land_bp_power_v')],
  ];
  return (
    <section className={s.blueprint} style={{ '--g': hexRGB(j.glow) } as CSSProperties}>
      <div className={s.bpStage}>
        <img className={`px ${s.bpToken}`} src={texOf(j)} alt="" />
        {notes.map(([k, v], i) => (
          <span key={k} className={`${s.note} ${s[`n${i}`]}`}>
            <small>{k}</small>
            <b>{v}</b>
          </span>
        ))}
      </div>
      <div className={s.bpText}>
        <p className="eyebrow">#014</p>
        <h2>{jn(j.name)}</h2>
        <p className="muted">{t('ui.land_bp_txt')}</p>
      </div>
    </section>
  );
}

// Pulls → Collection → Combat → Classement : une étape par écran
function Steps() {
  const t = useT();
  const list = SERIES.Takoras ?? [];
  const steps = [
    { k: 'pull', img: [MYSTERE] },
    { k: 'collec', img: list.slice(0, 6).map((j) => texOf(j)) },
    { k: 'combat', img: list.filter((j) => ['Mobu', 'Carmin', 'Vyolis'].includes(j.name)).map((j) => texOf(j)) },
    { k: 'board', img: [1, 7, 13, 18].map((n) => `/img/ranks/rank${n}.png`) },
  ] as const;
  return (
    <>
      {steps.map((st, i) => (
        <section key={st.k} className={s.step}>
          <span className={s.stepN}>0{i + 1}</span>
          <div className={s.stepImgs}>
            {st.img.map((src) => (
              <img key={src} className="px" src={src} alt="" />
            ))}
          </div>
          <div>
            <h2>{t(`ui.land_s_${st.k}` as 'ui.land_s_pull')}</h2>
            <p className="muted">{t(`ui.land_s_${st.k}_txt` as 'ui.land_s_pull_txt')}</p>
          </div>
        </section>
      ))}
    </>
  );
}

// Démo de l'ouverture auto : les jetons défilent vite, ça s'arrête sur un rare, puis ça repart tout seul
function AutoDemo() {
  const t = useT();
  const jn = useJn();
  const lang = useSettings((x) => x.lang);
  const list = SERIES.Takoras ?? [];
  const [k, setK] = useState(0);
  const [stop, setStop] = useState(false);
  const seq = [0, 1, 0, 2, 1, 0, 3, 1, 0, 2, 7]; // le dernier est rare (1/1 000) : arrêt
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(
      () =>
        setK((x) => {
          const n = (x + 1) % seq.length;
          setStop(n === seq.length - 1);
          return n;
        }),
      stop ? 2200 : 260,
    );
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- la séquence est fixe
  }, [stop]);
  const j = list[seq[k] ?? 0];
  if (!j) return null;
  return (
    <section className={s.auto}>
      <div className={`${s.autoCoin} ${stop ? s.autoStop : ''}`} style={{ '--g': hexRGB(j.glow) } as CSSProperties}>
        <img className={vImg(stop ? 'gold' : '')} src={texOf(j)} alt="" />
        <b>{stop ? `⏸ ${jn(j.name)} · 1/${(j.odds * 20).toLocaleString(locale(lang))}` : `×${k + 1}`}</b>
      </div>
      <div>
        <h2>{t('ui.land_auto')}</h2>
        <p className="muted">{t('ui.land_auto_txt')}</p>
      </div>
    </section>
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
      <p className="muted">{t('ui.land_credits_txt')}</p>
    </div>
  );
}
