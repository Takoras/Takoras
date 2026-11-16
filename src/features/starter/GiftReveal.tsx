import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Key } from '@/i18n';
import { useT } from '@/i18n/useT';
import { sfx } from '@/engines/sound.js';
import { reducedFx } from '@/lib/settings';
import { flyCoins, flyIcons } from '@/ui/fx';
import { useSwing } from '@/ui/useSwing';
import s from './GiftReveal.module.css';

// Cadeau de départ reçu : il tombe au milieu de l'écran et se balance (environ 5 s, ou un clic pour passer), puis il
// s'envole vers l'inventaire (les pièces vers le solde) et l'écran s'efface. `onGone` : appelé quand il est parti.
export function GiftReveal({ gift, img, onGone }: { gift: string; img: string; onGone: () => void }) {
  const t = useT();
  const art = useRef<HTMLImageElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [out, setOut] = useState(false);
  useSwing(box, 0.6);
  useEffect(() => {
    sfx.upgrade();
  }, []);
  const leave = () => {
    if (out) return;
    setOut(true);
    const r = art.current?.getBoundingClientRect();
    if (r && !reducedFx()) {
      if (gift === 'coins') flyCoins(r, 6, () => sfx.pop());
      else flyIcons(r, img, 1, '[data-inv-target]', () => sfx.pop(), 48);
    }
    setTimeout(onGone, reducedFx() ? 0 : 450);
  };
  useEffect(() => {
    const id = setTimeout(leave, 5000);
    return () => clearTimeout(id);
  });
  return createPortal(
    <button type="button" className={`${s.veil} ${out ? s.out : ''}`} aria-label={t('ui.st_g_title')} onClick={leave}>
      <div ref={box} className={s.card}>
        <small>{t('ui.st_g_title')}</small>
        <img ref={art} className={`px ${s.art} ${out ? s.artGone : ''}`} src={img} alt="" />
        <b>{t(`ui.st_g_${gift}` as Key)}</b>
        <span>{t(`ui.st_g_${gift}_d` as Key)}</span>
        <i className={s.timer} />
      </div>
    </button>,
    document.body,
  );
}
