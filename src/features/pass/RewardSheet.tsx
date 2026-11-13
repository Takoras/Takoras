import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { hexRGB } from '@/data/jetons';
import { reducedFx } from '@/lib/settings';
import { useT } from '@/i18n/useT';
import { Button } from '@/ui/Button';
import { Modal } from '@/ui/Modal';
import { PixelBg } from '@/ui/PixelBg';
import { spring } from '@/ui/spring';
import { useSwing } from '@/ui/useSwing';
import js from '../inventory/JetonSheet.module.css';
import tc from '@/ui/TokenCards.module.css';
import s from './RewardSheet.module.css';

// Fiche d'une récompense du passe : même DA que la fiche d'un jeton (fond pixel à la couleur de la récompense,
// la récompense en grand au centre avec rayons et lueur, encadrés penchés qui se balancent), même ouverture
// (la carte se déplie avec un rebond, penche sous la souris) et même fermeture (elle se replie).
export type RewardInfo = {
  tier: number;
  prem: boolean;
  title: string;
  img: string;
  /** image large (bannière) ou ronde (photo de profil) */
  shape?: 'wide' | 'round';
  desc: string;
  state: string;
  got: boolean;
  can: boolean;
  /** couleur de la récompense (hexa) et sa valeur (pour la richesse du fond) */
  color: string;
  odds: number;
};

export function RewardSheet({
  info,
  busy,
  onClaim,
  onClose,
}: {
  info: RewardInfo | null;
  busy: boolean;
  onClaim: () => void;
  onClose: () => void;
}) {
  const t = useT();
  const card = useRef<HTMLDivElement>(null);
  const coin = useRef<HTMLDivElement>(null);
  const idBox = useRef<HTMLDivElement>(null);
  const rsBox = useRef<HTMLDivElement>(null);
  useSwing(idBox, 0.25);
  useSwing(rsBox, 0.25);
  const [closing, setClosing] = useState(false);
  const shut = useRef(0);
  const key = info ? `${info.tier}-${info.prem}` : '';
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
  // dépli avec rebond, inclinaison qui suit la souris ; repli sans rebond à la fermeture
  useEffect(() => {
    const el = card.current;
    if (!el || !key) return;
    let a = 0,
      b = 0,
      w = 0;
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
      rx.set(-Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height / 2))) * 4);
      ry.set(Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width / 2))) * 4);
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
  }, [key]);
  useEffect(() => {
    if (!closing) return;
    const id = setTimeout(() => (card.current as (HTMLDivElement & { fold?: () => void }) | null)?.fold?.(), 60);
    return () => clearTimeout(id);
  }, [closing]);
  // la récompense penche sous le doigt, avec un reflet (comme le jeton)
  const tilt = (e: React.PointerEvent) => {
    const c = coin.current;
    if (!c || reducedFx()) return;
    const r = c.getBoundingClientRect(),
      x = (e.clientX - r.left) / r.width - 0.5,
      y = (e.clientY - r.top) / r.height - 0.5;
    c.style.transform = `perspective(600px) rotateX(${(-y * 30).toFixed(1)}deg) rotateY(${(x * 30).toFixed(1)}deg) scale(1.04)`;
  };
  const untilt = () => coin.current?.style.removeProperty('transform');

  const vars = info
    ? ({ '--g': hexRGB(info.color), '--ga': 1, '--pw': hexRGB(info.color), '--tc': info.color } as CSSProperties)
    : undefined;
  return (
    <Modal open={!!info} onClose={close} wide noX bare fading={closing}>
      {info ? (
        <div key={key} ref={card} className={`${js.sheet} ${closing ? js.closing : ''}`} style={vars}>
          <PixelBg className={js.pxbg} odds={info.odds} glow={info.color} center={coin} still={reducedFx()} />
          <button type="button" className={js.x} onClick={close} aria-label={t('ui.close')}>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
              <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </button>
          <div className={js.stage}>
            {/* à gauche : gratuit / premium, le nom de la récompense, son palier en pastille */}
            <div ref={idBox} className={`${tc.card} ${tc.id} ${js.id} ${js.box}`}>
              <span className={`${s.tag} ${info.prem ? s.gold : ''}`}>
                {info.prem ? t('ui.bp_prem_short') : t('ui.bp_free')}
              </span>
              <h2 className={`${tc.name} ${s.title}`}>{info.title}</h2>
              <span className={tc.rarity}>{t('ui.bp_tier_n', { n: info.tier })}</span>
            </div>
            {/* au centre : la récompense en grand, qui flotte, avec rayons et lueur */}
            <div className={js.center}>
              <i className={js.rays} aria-hidden />
              <i className={js.aura} aria-hidden />
              <span className={js.sparks} aria-hidden>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <i key={i} />
                ))}
              </span>
              <span className={js.pin}>
                <div ref={coin} className={`${js.coin} ${s.art}`} onPointerMove={tilt} onPointerLeave={untilt}>
                  <img className={`px ${info.shape ? s[info.shape] : ''}`} src={info.img} alt="" />
                </div>
              </span>
              <i className={js.floor} aria-hidden />
            </div>
            {/* à droite : ce que c'est, et où on en est */}
            <div className={js.power}>
              <div ref={rsBox} className={`${tc.card} ${js.rs} ${js.box} ${s.about}`}>
                <p>{info.desc}</p>
                <p className={`${s.state} ${info.got ? s.ok : info.can ? s.ready : ''}`}>{info.state}</p>
              </div>
            </div>
          </div>
          <div className={js.actions}>
            {info.can ? (
              <Button variant="primary" loading={busy} onClick={onClaim}>
                {t('ui.bp_claim')}
              </Button>
            ) : null}
            <Button onClick={close}>{t('ui.back')}</Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
