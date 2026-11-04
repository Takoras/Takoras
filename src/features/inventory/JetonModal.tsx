import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { StatIcon } from '@/ui/StatIcon';
import { hexRGB, jetonOf, MYSTERE, texOf, texScale, vImg, vOdds, glowVars, type Variant } from '@/data/jetons';
import { powerInfo, RING_MAX, ringStats } from '@/data/kit';
import { useJn } from '@/lib/names';
import { locale, reducedFx, useSettings } from '@/lib/settings';
import { useT } from '@/i18n/useT';
import { Modal } from '@/ui/Modal';
import { PowerDemo } from '../combat/PowerDemo';
import { Tween } from '@/ui/Tween';
import { spring } from '@/ui/spring';
import { PixelBg } from '@/ui/PixelBg';
import { useSwing } from '@/ui/useSwing';
import s from './JetonSheet.module.css';

const VS = ['gold', 'celeste', 'ombre'] as const;

// La fiche s'ouvre comme une carte qui se déplie (même mouvement que la carte « Les séries » de la présentation) :
// petite carte au centre qui s'agrandit en ressort, la page d'album se trace derrière, le jeton tombe au milieu
// en rebondissant, puis le nom, le pouvoir, les stats et les tampons apparaissent un par un. Toute la carte penche
// vers la souris. À la fermeture elle se replie avant de disparaître.
// Fiche d'un jeton, façon vitrine : le jeton en grand au centre (aura qui tourne, étincelles, il penche sous le doigt),
// son nom et ce que tu en as à gauche, son pouvoir à droite, et les 3 tampons de mutation en dessous
// (grisés si pas encore trouvés ; toucher un tampon trouvé montre le jeton dans cette mutation).
// `facts` : petites lignes sous le nom (« Tu en as 4 »…). `children` : les boutons en bas (vendre…).
// `pick` : au lieu de seulement montrer, toucher un tampon le CHOISIT (vitrine du profil).
export function JetonModal({
  name,
  serie,
  variant = '',
  locked,
  found,
  facts,
  pick,
  demo,
  onClose,
  children,
}: {
  name: string | null;
  serie?: string;
  variant?: string;
  locked?: boolean;
  found?: Partial<Record<string, boolean | number>>;
  facts?: ReactNode;
  pick?: (v: string) => void;
  /** montre la vidéo d'exemple du pouvoir (éditeur d'équipe) */
  demo?: boolean;
  onClose: () => void;
  children?: ReactNode;
}) {
  const t = useT();
  const jn = useJn();
  const lang = useSettings((x) => x.lang);
  const coin = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  // les boîtes de texte flottent et se balancent au passage de la souris, comme les blocs de l'accueil
  const idBox = useRef<HTMLDivElement>(null);
  const pwBox = useRef<HTMLDivElement>(null);
  const rsBox = useRef<HTMLDListElement>(null);
  useSwing(idBox, 0.25);
  useSwing(pwBox, 0.25);
  useSwing(rsBox, 0.25);
  const [closing, setClosing] = useState(false);
  const shut = useRef<number>(0);
  // replier la carte, puis fermer pour de vrai
  const close = () => {
    if (shut.current) return;
    setClosing(true);
    shut.current = window.setTimeout(
      () => {
        shut.current = 0;
        setClosing(false);
        onClose();
      },
      reducedFx() ? 0 : 330,
    );
  };
  useEffect(() => () => clearTimeout(shut.current), []);
  // ressorts : dépli vif avec un rebond (raideur 520, amortissement 24), inclinaison (300, 30)
  useEffect(() => {
    const el = card.current;
    if (!el || !name) return;
    let a = 0,
      b = 0,
      w = 0;
    // le rebond se voit à l'échelle de la carte (le clip, lui, ne peut pas dépasser la carte)
    const paint = () =>
      (el.style.transform = `perspective(1000px) rotateX(${a.toFixed(2)}deg) rotateY(${b.toFixed(2)}deg) scale(${(0.9 + 0.1 * w).toFixed(4)})`);
    const u = spring(
      (v) => {
        w = v;
        el.style.setProperty('--u', String(Math.max(0, v)));
        paint();
      },
      { stiffness: 520, damping: 24 },
    );
    const rx = spring((v) => ((a = v), paint()), { stiffness: 300, damping: 30 });
    const ry = spring((v) => ((b = v), paint()), { stiffness: 300, damping: 30 });
    if (reducedFx()) u.jump(1);
    else u.set(1);
    const move = (e: globalThis.PointerEvent) => {
      if (e.pointerType !== 'mouse' || reducedFx()) return;
      const r = el.getBoundingClientRect();
      const mx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2),
        my = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      rx.set(-Math.max(-1, Math.min(1, my)) * 4);
      ry.set(Math.max(-1, Math.min(1, mx)) * 4);
    };
    const leave = () => {
      rx.set(0);
      ry.set(0);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    (el as HTMLDivElement & { fold?: () => void }).fold = () => {
      rx.set(0);
      ry.set(0);
      // repli rapide sans rebond : il se pose
      const fold = spring(
        (v) => {
          w = v;
          el.style.setProperty('--u', String(Math.max(0, v)));
          paint();
        },
        { stiffness: 420, damping: 40, from: 1 },
      );
      u.stop();
      fold.set(0);
    };
    return () => {
      u.stop();
      rx.stop();
      ry.stop();
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
    };
  }, [name]);
  useEffect(() => {
    // fermeture = l'ouverture à l'envers : les blocs partent (CSS), le jeton remonte, puis la carte se replie
    if (!closing) return;
    const id = setTimeout(() => (card.current as (HTMLDivElement & { fold?: () => void }) | null)?.fold?.(), 60);
    return () => clearTimeout(id);
  }, [closing]);
  // mutation montrée : celle du jeton, ou celle du tampon touché (pour ce jeton seulement)
  const [over, setOver] = useState<{ n: string | null; v: string } | null>(null);
  const pv = over && over.n === name ? over.v : variant;
  const setPv = (v: string) => setOver({ n: name, v });
  const fmt = (n: number) => n.toLocaleString(locale(lang));
  const j = jetonOf(name ?? '', serie);
  const k = powerInfo(j.name, lang),
    rs = ringStats(j.name, 1, pv);
  const tilt = (e: PointerEvent) => {
    const c = coin.current;
    if (!c || reducedFx()) return;
    const r = c.getBoundingClientRect(),
      x = (e.clientX - r.left) / r.width - 0.5,
      y = (e.clientY - r.top) / r.height - 0.5;
    c.style.transform = `perspective(600px) rotateX(${(-y * 40).toFixed(1)}deg) rotateY(${(x * 40).toFixed(1)}deg) scale(1.04)`;
    c.style.setProperty('--mx', `${((x + 0.5) * 100).toFixed(1)}%`);
    c.style.setProperty('--my', `${((y + 0.5) * 100).toFixed(1)}%`);
    c.style.setProperty('--gl', '1');
  };
  const untilt = () => {
    coin.current?.style.removeProperty('transform');
    coin.current?.style.setProperty('--gl', '0');
  };
  const stats = [
    ['mass', t('ring.mass'), rs.mass, RING_MAX.mass, (n: number) => n.toFixed(2)],
    ['power', t('ring.powerS'), rs.power, RING_MAX.power, (n: number) => fmt(Math.round(n))],
    ['size', t('ring.size'), rs.r, RING_MAX.r, (n: number) => String(Math.round(n))],
  ] as const;
  const vars = (locked
    ? { '--g': '113, 113, 122', '--ga': 0 }
    : {
        ...glowVars(j, pv),
        '--ga': 1,
        '--pw': hexRGB(k.col),
        ...(pv ? { '--g': VCOL[pv as Variant] } : {}),
      }) as unknown as CSSProperties;
  return (
    <Modal open={!!name} onClose={close} wide noX bare fading={closing}>
      {name ? (
        <div key={name} ref={card} className={`${s.sheet} ${closing ? s.closing : ''}`} style={vars}>
          {/* le fond pixel art de l'ouverture : plus le jeton est rare, plus il est chargé */}
          <PixelBg
            className={s.pxbg}
            odds={locked ? 1 : vOdds(j.odds, pv)}
            glow={locked ? '#71717a' : pv && pv in VHEX ? VHEX[pv as Variant] : j.glow}
            center={coin}
            still={reducedFx()}
          />
          <button type="button" className={s.x} onClick={close} aria-label={t('ui.close')}>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
              <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </button>
          <div className={s.stage}>
            <div ref={idBox} className={`${s.id} ${s.box}`}>
              <h2>{locked ? '???' : jn(j.name)}</h2>
              <span className={s.line} aria-hidden />
              <p className={s.odds}>{locked ? '1/?' : `1/${fmt(vOdds(j.odds, pv))}`}</p>
              {facts && !locked ? <ul className={s.facts}>{facts}</ul> : null}
              {/* vidéo d'exemple du pouvoir (éditeur d'équipe) : dans la colonne de gauche, qui a la place */}
              {demo && !locked ? (
                <div className={s.demo}>
                  <PowerDemo name={j.name} />
                </div>
              ) : null}
            </div>
            <div className={s.center}>
              <i className={s.rays} aria-hidden />
              <i className={s.aura} aria-hidden />
              {locked ? null : (
                <span className={s.sparks} aria-hidden>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <i key={i} />
                  ))}
                </span>
              )}
              <span className={s.pin}>
                <div
                  ref={coin}
                  className={s.coin}
                  onPointerMove={tilt}
                  onPointerLeave={untilt}
                  style={texScale(j) !== 1 ? { scale: String(texScale(j)) } : undefined}
                >
                  <Face
                    cls={locked ? 'px' : vImg(pv)}
                    src={locked ? MYSTERE : texOf(j)}
                    alt={locked ? '' : jn(j.name)}
                  />
                  {locked ? null : (
                    <i
                      className={s.glare}
                      style={{ maskImage: `url(${texOf(j)})`, WebkitMaskImage: `url(${texOf(j)})` }}
                    />
                  )}
                </div>
              </span>
              <i className={s.floor} aria-hidden />
              {locked ? null : (
                <div className={s.stamps} role="group" aria-label={t('ui.bst_variants')}>
                  {VS.map((v) => {
                    const has = pick ? found?.[v] !== false && found?.[v] !== 0 : !!found?.[v];
                    return (
                      <button
                        key={v}
                        type="button"
                        className={`${s.stamp} ${has ? '' : s.off}`}
                        aria-pressed={pv === v}
                        disabled={!has}
                        title={t(`ui.v_${v}`)}
                        aria-label={t(`ui.v_${v}`)}
                        onClick={() => {
                          const nv = pv === v ? '' : v;
                          setPv(nv);
                          pick?.(nv);
                        }}
                      >
                        <span style={{ backgroundImage: `url(/img/stamps/${v}.png)` }} />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            {locked ? (
              <p className={`muted ${s.unknown}`}>{t('ui.bst_unknown')}</p>
            ) : (
              <div className={s.power}>
                {k.pw !== 'none' ? (
                  <div ref={pwBox} className={`${s.box} ${s.pwBox}`}>
                    <small>{k.when}</small>
                    <b>{k.name}</b>
                    <p>{k.desc}</p>
                  </div>
                ) : null}
                <dl ref={rsBox} className={`${s.rs} ${s.box}`}>
                  {stats.map(([ico, l, v, max, txt]) => (
                    <div key={l} title={l} style={{ '--sc': STAT_COL[ico] } as CSSProperties}>
                      <dt>
                        <StatIcon k={ico} />
                        <span>{l}</span>
                      </dt>
                      <dd>
                        <span className={s.bar}>
                          <i style={{ width: `${Math.min(100, (v / max) * 100)}%` }} />
                        </span>
                        <b>
                          <Tween value={v} format={txt} />
                        </b>
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
          {children ? <div className={s.actions}>{children}</div> : null}
        </div>
      ) : null}
    </Modal>
  );
}

// Face du jeton : changer de mutation fond l'ancienne face dans la nouvelle (pas de remplacement sec),
// avec une petite respiration du jeton
function Face({ cls, src, alt }: { cls: string; src: string; alt: string }) {
  const [cur, setCur] = useState({ cls, src });
  const [old, setOld] = useState<{ cls: string; src: string; k: number } | null>(null);
  if (cls !== cur.cls || src !== cur.src) {
    setOld({ ...cur, k: (old?.k ?? 0) + 1 });
    setCur({ cls, src });
  }
  useEffect(() => {
    if (!old) return;
    const id = setTimeout(() => setOld(null), 600);
    return () => clearTimeout(id);
  }, [old]);
  return (
    <span className={`${s.face} ${old ? s.breath : ''}`}>
      {/* le fondu est sur un span : les images de mutation ont déjà leur propre animation (art.css) */}
      {old ? (
        <span className={s.faceOut} aria-hidden>
          <img className={old.cls} src={old.src} alt="" />
        </span>
      ) : null}
      <span className={old ? s.faceIn : undefined}>
        <img className={cur.cls} src={cur.src} alt={alt} />
      </span>
    </span>
  );
}

// Une couleur par stat (même code partout : fiche, éditeur d'équipe)
export const STAT_COL = { mass: '96, 165, 250', power: '251, 113, 133', size: '74, 222, 128' } as const;

// Couleur du fond selon la mutation montrée
const VHEX: Record<Variant, string> = { gold: '#facc15', celeste: '#bac8ff', ombre: '#8b5cf6' };

// Couleur de l'aura selon la mutation montrée
const VCOL: Record<Variant, string> = { gold: '250, 204, 21', celeste: '186, 200, 255', ombre: '139, 92, 246' };
