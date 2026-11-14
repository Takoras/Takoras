import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { hexRGB, jetonOf, MYSTERE, texOf, texScale, vImg, vOdds, glowVars, type Variant } from '@/data/jetons';
import { useJn } from '@/lib/names';
import { reducedFx } from '@/lib/settings';
import { useT } from '@/i18n/useT';
import { Modal } from '@/ui/Modal';
import { spring } from '@/ui/spring';
import { PixelBg } from '@/ui/PixelBg';
import { useSwing } from '@/ui/useSwing';
import { TokenId } from '@/ui/TokenCards';
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
  mystery,
  found,
  facts,
  pick,
  onShow,
  single,
  onClose,
  children,
}: {
  name: string | null;
  serie?: string;
  variant?: string;
  locked?: boolean;
  /** jeton qu'on ne doit pas dévoiler (collection d'un autre joueur) : « ? » et « ??? », comme dans la grille */
  mystery?: boolean;
  found?: Partial<Record<string, boolean | number>>;
  facts?: ReactNode;
  pick?: (v: string) => void;
  /** la mutation montrée change (bestiaire : les boutons de vente suivent) */
  onShow?: (v: string) => void;
  /** une seule version du jeton (meilleur tirage du profil) : pas de tampons pour changer de mutation */
  single?: boolean;
  onClose: () => void;
  children?: ReactNode;
}) {
  const t = useT();
  const jn = useJn();
  const coin = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  // les boîtes de texte flottent et se balancent au passage de la souris, comme les blocs de l'accueil
  const idBox = useRef<HTMLDivElement>(null);
  const rsBox = useRef<HTMLDivElement>(null);
  useSwing(idBox, 0.25);
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
  const j = jetonOf(name ?? '', serie);
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
  // jeton pas encore découvert : on le montre quand même en aperçu (son dessin, ses stats, son pouvoir),
  // avec une étiquette « pas encore découvert » ; seules les mutations trouvées et les infos du joueur sont cachées
  // jeton mystère : ni sa couleur ni son fond ne doivent le trahir (gris neutre, fond le plus simple)
  const glow = mystery ? '#71717a' : j.glow;
  const vars = {
    ...glowVars({ glow, odds: mystery ? 1 : j.odds }, mystery ? '' : pv),
    '--ga': mystery ? 0 : 1,
    '--pw': hexRGB(glow),
    ...(pv && !mystery ? { '--g': VCOL[pv as Variant] } : {}),
  } as unknown as CSSProperties;
  return (
    <Modal open={!!name} onClose={close} wide noX bare fading={closing}>
      {name ? (
        <div key={name} ref={card} className={`${s.sheet} ${closing ? s.closing : ''}`} style={vars}>
          {/* le fond pixel art de l'ouverture : plus le jeton est rare, plus il est chargé */}
          <PixelBg
            className={s.pxbg}
            odds={mystery ? 1 : vOdds(j.odds, pv)}
            glow={mystery ? glow : pv && pv in VHEX ? VHEX[pv as Variant] : j.glow}
            center={coin}
            still={reducedFx()}
          />
          <button type="button" className={s.x} onClick={close} aria-label={t('ui.close')}>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
              <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </button>
          <div className={s.stage}>
            {/* même fiche que la révélation du tirage : logo de la série, nom, chance en pastille */}
            <TokenId
              ref={idBox}
              className={`${s.id} ${s.box}`}
              serie={serie ?? 'Takoras'}
              name={mystery ? '???' : jn(j.name)}
              odds={mystery ? null : vOdds(j.odds, pv)}
            >
              {locked ? <p className={s.unknownTag}>{t('ui.bst_unknown_tag')}</p> : null}
              {facts && !locked ? <ul className={s.facts}>{facts}</ul> : null}
            </TokenId>
            <div className={s.center}>
              <i className={s.rays} aria-hidden />
              <i className={s.aura} aria-hidden />
              {
                <span className={s.sparks} aria-hidden>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <i key={i} />
                  ))}
                </span>
              }
              <span className={s.pin}>
                <div
                  ref={coin}
                  // « jm-coin » : la pièce entière (dessin + reflet) est agrandie ici, pas l'image seule (lib/gridCss.ts)
                  className={`${s.coin} jm-coin`}
                  onPointerMove={tilt}
                  onPointerLeave={untilt}
                  style={!mystery && texScale(j) !== 1 ? { scale: String(texScale(j)) } : undefined}
                >
                  <Face cls={locked ? 'px' : vImg(pv)} src={mystery ? MYSTERE : texOf(j)} alt={mystery ? '???' : jn(j.name)} />
                  {locked ? null : (
                    <i
                      className={s.glare}
                      style={{ maskImage: `url(${texOf(j)})`, WebkitMaskImage: `url(${texOf(j)})` }}
                    />
                  )}
                </div>
              </span>
              <i className={s.floor} aria-hidden />
              {/* une seule version (meilleur tirage) : son tampon seul, pour garder la même fiche qu'ailleurs */}
              {single && !locked ? (
                <div className={s.stamps} aria-hidden>
                  {pv ? (
                    <span className={s.stamp} aria-pressed>
                      <span style={{ backgroundImage: `url(/img/stamps/${pv}.png)` }} />
                    </span>
                  ) : (
                    <span className={`${s.stamp} ${s.off}`} style={{ visibility: 'hidden' }}>
                      <span />
                    </span>
                  )}
                </div>
              ) : null}
              {locked || single ? null : (
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
                          onShow?.(nv);
                        }}
                      >
                        <span style={{ backgroundImage: `url(/img/stamps/${v}.png)` }} />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
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
    const id = setTimeout(() => setOld(null), 500);
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
